import express from 'express';
import Offer from '../models/Offer.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sellerProtect } from '../middleware/sellerAuth.js';
import { sendPush } from '../utils/notify.js';

const router = express.Router();

// Helper: check if seller subscription is active
async function isSellerSubscriptionActive(sellerId) {
    const seller = await Seller.findById(sellerId).select('subscriptionStatus subscriptionExpiryDate');
    if (!seller) return false;
    if (seller.subscriptionStatus !== 'ACTIVE') return false;
    if (!seller.subscriptionExpiryDate || seller.subscriptionExpiryDate < new Date()) return false;
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/offers — customer creates an offer
router.post('/', protect, async (req, res) => {
    try {
        const { productId, quantity, offeredUnitPrice, selectedSize, selectedColor } = req.body;

        // Validation
        if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
        if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: 'Invalid quantity' });
        if (!offeredUnitPrice || offeredUnitPrice <= 0) return res.status(400).json({ success: false, message: 'Offered price must be greater than 0' });

        // Fetch product
        const product = await Product.findById(productId).populate('seller');
        if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found or unavailable' });
        if (!product.allowOffers) return res.status(400).json({ success: false, message: 'This product does not accept offers' });
        if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

        // Check seller subscription
        const sellerActive = await isSellerSubscriptionActive(product.seller._id);
        if (!sellerActive) return res.status(400).json({ success: false, message: 'Seller is currently unavailable. Cannot create offer.' });

        // Backend recalculates total — never trust client total
        const totalOfferAmount = Math.round(offeredUnitPrice * quantity * 100) / 100;

        // Offer expires in 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const offer = await Offer.create({
            product: product._id,
            seller: product.seller._id,
            customer: req.user._id,
            quantity,
            originalUnitPrice: product.sellingPrice,
            offeredUnitPrice: Math.round(offeredUnitPrice),
            totalOfferAmount,
            expiresAt,
            selectedSize: selectedSize || '',
            selectedColor: selectedColor || '',
            roundNumber: 1,
            maxRounds: 3,
            messages: [{
                from: 'customer',
                price: Math.round(offeredUnitPrice),
                action: 'OFFER'
            }]
        });

        // Notify seller
        try {
            const seller = await Seller.findById(product.seller._id);
            const customer = await User.findById(req.user._id).select('name');
            if (seller?.fcmToken || seller?.pushSubscription) {
                await sendPush(seller.fcmToken || seller.pushSubscription, {
                    title: '🤝 New Offer Received!',
                    body: `${customer?.name || 'A customer'} offered ₹${Math.round(offeredUnitPrice)} for ${product.name} (Qty: ${quantity})`,
                    icon: '/icons/icon-192.png',
                    tag: `offer-${offer._id}`,
                    url: '/dashboard'
                });
            }
        } catch (notifErr) {
            console.error('[Push] New offer notify error:', notifErr.message);
        }

        res.status(201).json({ success: true, data: offer, message: 'Offer sent successfully' });
    } catch (err) {
        console.error('[Offer] Create error:', err.message);
        res.status(500).json({ success: false, message: 'Error creating offer' });
    }
});

// GET /api/offers/customer — customer's own offers
router.get('/customer', protect, async (req, res) => {
    try {
        const offers = await Offer.find({ customer: req.user._id })
            .populate('product', 'name images sellingPrice')
            .populate('seller', 'shopName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: offers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/offers/customer/:id — single offer detail
router.get('/customer/:id', protect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('product', 'name images sellingPrice allowOffers')
            .populate('seller', 'shopName');
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/offers/customer/:id/accept — customer accepts seller's counter offer
router.put('/customer/:id/accept', protect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (offer.status !== 'COUNTERED') {
            return res.status(400).json({ success: false, message: 'Offer is not in COUNTERED state' });
        }
        if (offer.expiresAt < new Date()) {
            offer.status = 'EXPIRED';
            await offer.save();
            return res.status(400).json({ success: false, message: 'Offer has expired' });
        }

        offer.status = 'CUSTOMER_ACCEPTED';
        offer.agreedUnitPrice = offer.offeredUnitPrice; // last counter price
        offer.messages.push({ from: 'customer', action: 'CUSTOMER_ACCEPTED', price: offer.agreedUnitPrice });
        await offer.save();

        // Notify seller
        try {
            const seller = await Seller.findById(offer.seller);
            if (seller?.fcmToken || seller?.pushSubscription) {
                await sendPush(seller.fcmToken || seller.pushSubscription, {
                    title: '✅ Counter Offer Accepted!',
                    body: `Customer accepted your counter offer of ₹${offer.agreedUnitPrice}`,
                    icon: '/icons/icon-192.png',
                    tag: `offer-accepted-${offer._id}`,
                    url: '/dashboard'
                });
            }
        } catch (e) { console.warn('[Push]', e.message); }

        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/offers/customer/:id/reject — customer rejects counter offer
router.put('/customer/:id/reject', protect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (offer.status !== 'COUNTERED') {
            return res.status(400).json({ success: false, message: 'Offer is not in COUNTERED state' });
        }
        offer.status = 'CUSTOMER_REJECTED';
        offer.messages.push({ from: 'customer', action: 'CUSTOMER_REJECTED' });
        await offer.save();
        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/offers/customer/:id/convert-to-order — convert accepted offer to order (returns order items for checkout)
router.get('/customer/:id/checkout-data', protect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('product', 'name images sellingPrice mrpPrice stock productCode seller')
            .populate('seller', 'shopName shopAddress location');
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['ACCEPTED', 'CUSTOMER_ACCEPTED'].includes(offer.status)) {
            return res.status(400).json({ success: false, message: 'Offer must be accepted before proceeding to checkout' });
        }
        if (offer.expiresAt < new Date()) {
            offer.status = 'EXPIRED';
            await offer.save();
            return res.status(400).json({ success: false, message: 'Offer has expired' });
        }
        // Verify seller still active
        const sellerActive = await isSellerSubscriptionActive(offer.seller._id);
        if (!sellerActive) return res.status(400).json({ success: false, message: 'Seller is currently unavailable' });

        const agreedPrice = offer.agreedUnitPrice || offer.offeredUnitPrice;

        res.json({
            success: true,
            data: {
                offerId: offer._id,
                offerStringId: offer.offerId,
                product: offer.product,
                seller: offer.seller,
                quantity: offer.quantity,
                agreedUnitPrice: agreedPrice,
                originalUnitPrice: offer.originalUnitPrice,
                totalAmount: agreedPrice * offer.quantity,
                selectedSize: offer.selectedSize,
                selectedColor: offer.selectedColor
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SELLER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/offers/seller — seller's incoming offers
router.get('/seller', sellerProtect, async (req, res) => {
    try {
        const { status } = req.query;
        const query = { seller: req.seller._id };
        if (status) query.status = status;

        // Auto-expire old offers
        await Offer.updateMany(
            { seller: req.seller._id, status: { $in: ['PENDING', 'COUNTERED'] }, expiresAt: { $lt: new Date() } },
            { status: 'EXPIRED' }
        );

        const offers = await Offer.find(query)
            .populate('product', 'name images sellingPrice')
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: offers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/offers/seller/:id — single offer
router.get('/seller/:id', sellerProtect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('product', 'name images sellingPrice')
            .populate('customer', 'name phone');
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/offers/seller/:id/accept — seller accepts customer offer
router.put('/seller/:id/accept', sellerProtect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['PENDING', 'CUSTOMER_ACCEPTED'].includes(offer.status)) {
            return res.status(400).json({ success: false, message: `Cannot accept offer in status: ${offer.status}` });
        }
        if (offer.expiresAt < new Date()) {
            offer.status = 'EXPIRED';
            await offer.save();
            return res.status(400).json({ success: false, message: 'Offer has expired' });
        }

        offer.status = 'ACCEPTED';
        offer.agreedUnitPrice = offer.offeredUnitPrice;
        offer.messages.push({ from: 'seller', action: 'ACCEPTED', price: offer.offeredUnitPrice });
        await offer.save();

        // Notify customer
        try {
            const customer = await User.findById(offer.customer);
            if (customer?.fcmToken || customer?.pushSubscription) {
                await sendPush(customer.fcmToken || customer.pushSubscription, {
                    title: '🎉 Offer Accepted!',
                    body: `Your offer of ₹${offer.agreedUnitPrice} has been accepted! Tap to buy now.`,
                    icon: '/icons/icon-192.png',
                    tag: `offer-accepted-${offer._id}`,
                    url: `/products/${offer.product}`
                });
            }
        } catch (e) { console.warn('[Push]', e.message); }

        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/offers/seller/:id/reject — seller rejects customer offer
router.put('/seller/:id/reject', sellerProtect, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
            return res.status(400).json({ success: false, message: `Cannot reject offer in status: ${offer.status}` });
        }

        offer.status = 'REJECTED';
        offer.messages.push({ from: 'seller', action: 'REJECTED' });
        await offer.save();

        // Notify customer
        try {
            const customer = await User.findById(offer.customer);
            if (customer?.fcmToken || customer?.pushSubscription) {
                await sendPush(customer.fcmToken || customer.pushSubscription, {
                    title: '❌ Offer Rejected',
                    body: `Your offer was rejected. Original price: ₹${offer.originalUnitPrice}`,
                    icon: '/icons/icon-192.png',
                    tag: `offer-rejected-${offer._id}`,
                    url: '/offers'
                });
            }
        } catch (e) { console.warn('[Push]', e.message); }

        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/offers/seller/:id/counter — seller sends counter offer
router.put('/seller/:id/counter', sellerProtect, async (req, res) => {
    try {
        const { counterPrice } = req.body;
        if (!counterPrice || counterPrice <= 0) {
            return res.status(400).json({ success: false, message: 'Counter price must be greater than 0' });
        }

        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
        if (offer.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['PENDING', 'CUSTOMER_REJECTED'].includes(offer.status)) {
            return res.status(400).json({ success: false, message: `Cannot counter offer in status: ${offer.status}` });
        }
        if (offer.roundNumber >= offer.maxRounds) {
            return res.status(400).json({ success: false, message: 'Maximum negotiation rounds reached' });
        }
        if (offer.expiresAt < new Date()) {
            offer.status = 'EXPIRED';
            await offer.save();
            return res.status(400).json({ success: false, message: 'Offer has expired' });
        }

        offer.status = 'COUNTERED';
        offer.roundNumber += 1;
        offer.offeredUnitPrice = Math.round(counterPrice); // seller's counter becomes new offer price
        offer.totalOfferAmount = Math.round(counterPrice) * offer.quantity;
        offer.messages.push({ from: 'seller', action: 'COUNTER', price: Math.round(counterPrice) });
        await offer.save();

        // Notify customer
        try {
            const customer = await User.findById(offer.customer);
            if (customer?.fcmToken || customer?.pushSubscription) {
                await sendPush(customer.fcmToken || customer.pushSubscription, {
                    title: '🔄 Seller Counter Offer',
                    body: `Seller countered with ₹${Math.round(counterPrice)} for ${offer.quantity} items`,
                    icon: '/icons/icon-192.png',
                    tag: `offer-counter-${offer._id}`,
                    url: '/offers'
                });
            }
        } catch (e) { console.warn('[Push]', e.message); }

        res.json({ success: true, data: offer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/offers/admin/all
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status) query.status = status;

        const offers = await Offer.find(query)
            .populate('product', 'name images sellingPrice')
            .populate('seller', 'shopName')
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Offer.countDocuments(query);
        res.json({ success: true, data: offers, total });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/offers/admin/stats
router.get('/admin/stats', protect, adminOnly, async (req, res) => {
    try {
        const statuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED_TO_ORDER'];
        const counts = await Promise.all(statuses.map(s => Offer.countDocuments({ status: s })));
        const stats = {};
        statuses.forEach((s, i) => { stats[s] = counts[i]; });
        stats.total = counts.reduce((a, b) => a + b, 0);
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
