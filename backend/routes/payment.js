import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import AdminConfig from '../models/AdminConfig.js';
import ServiceableArea from '../models/ServiceableArea.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { autoAssignDeliveryPartner } from './delivery.js';

const router = express.Router();

// Initialise Razorpay instance lazily so missing env vars don't crash at startup
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Haversine formula (same as orders.js)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 5;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Creates a Razorpay order to get a payment_order_id.
// Does NOT create a DB order yet — that happens after payment verification.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', protect, async (req, res) => {
    try {
        const { items, shippingAddress, contactInfo } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in order' });
        }

        // Fetch admin config for fee calculations
        const config = await AdminConfig.getConfig();
        const platformFee = config.platformFee || 10;
        const commissionPercentage = config.commissionPercentage || 20;
        const paymentGatewayPercentage = config.paymentGatewayPercentage || 2;

        // Calculate totals (mirror logic from POST /api/orders)
        let sellingPriceTotal = 0;
        let orderSeller = null;

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ success: false, message: `Product not found` });
            if (!orderSeller) orderSeller = product.seller;
            sellingPriceTotal += (product.sellingPrice || 0) * item.quantity;
        }

        // Delivery fee
        const Seller = (await import('../models/Seller.js')).default;
        const sellerObj = await Seller.findById(orderSeller);
        let sellerLocation = null;
        if (sellerObj?.location?.coordinates) {
            sellerLocation = { lng: sellerObj.location.coordinates[0], lat: sellerObj.location.coordinates[1] };
        }

        let calculatedDeliveryFee = config.baseDeliveryCharge ?? 20;
        if (shippingAddress?.latitude && shippingAddress?.longitude && sellerLocation) {
            const distanceKms = getDistanceFromLatLonInKm(
                shippingAddress.latitude, shippingAddress.longitude,
                sellerLocation.lat, sellerLocation.lng
            );
            if (distanceKms > (config.baseDeliveryDistance ?? 2)) {
                calculatedDeliveryFee += Math.ceil(distanceKms - (config.baseDeliveryDistance ?? 2)) * (config.deliveryChargePerKm ?? 5);
            }
        }
        const finalDeliveryFee = Math.round(calculatedDeliveryFee);
        const totalAmount = sellingPriceTotal + finalDeliveryFee + platformFee;

        // Create Razorpay order (amount must be in paise)
        const razorpay = getRazorpay();
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100), // paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
                customerId: req.user._id.toString(),
            }
        });

        res.json({
            success: true,
            data: {
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                currency: 'INR',
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (err) {
        console.error('[Payment] create-order error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Verifies Razorpay signature, then creates the actual DB order.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', protect, async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            // Original order payload
            items,
            shippingAddress,
            contactInfo
        } = req.body;

        // 1. Verify HMAC signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
        }

        // 2. Signature is valid — now create the DB order (same logic as POST /api/orders)
        const config = await AdminConfig.getConfig();
        const platformFee = config.platformFee || 10;
        const commissionPercentage = config.commissionPercentage || 20;
        const paymentGatewayPercentage = config.paymentGatewayPercentage || 2;

        let sellingPriceTotal = 0;
        let mrpTotal = 0;
        const orderItems = [];
        let orderSeller = null;

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ success: false, message: `Product not found` });

            if (!orderSeller) orderSeller = product.seller;

            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
            }

            const itemSellingPrice = product.sellingPrice || 0;
            const itemMrpPrice = product.mrpPrice || itemSellingPrice;
            sellingPriceTotal += itemSellingPrice * item.quantity;
            mrpTotal += itemMrpPrice * item.quantity;

            orderItems.push({
                product: product._id,
                name: product.name,
                productCode: product.productCode || '',
                image: product.images?.[0],
                sellingPrice: itemSellingPrice,
                mrpPrice: itemMrpPrice,
                quantity: item.quantity,
                size: item.size,
                color: item.color
            });

            product.stock -= item.quantity;
            await product.save();
        }

        // Delivery fee
        const Seller = (await import('../models/Seller.js')).default;
        const sellerObj = await Seller.findById(orderSeller);
        let sellerLocation = null;
        if (sellerObj?.location?.coordinates) {
            sellerLocation = { lng: sellerObj.location.coordinates[0], lat: sellerObj.location.coordinates[1] };
        }

        let calculatedDeliveryFee = config.baseDeliveryCharge ?? 20;
        if (shippingAddress?.latitude && shippingAddress?.longitude && sellerLocation) {
            const distanceKms = getDistanceFromLatLonInKm(
                shippingAddress.latitude, shippingAddress.longitude,
                sellerLocation.lat, sellerLocation.lng
            );
            if (distanceKms > (config.baseDeliveryDistance ?? 2)) {
                calculatedDeliveryFee += Math.ceil(distanceKms - (config.baseDeliveryDistance ?? 2)) * (config.deliveryChargePerKm ?? 5);
            }
        }
        const finalDeliveryFee = Math.round(calculatedDeliveryFee);

        const commissionAmount = Math.round(sellingPriceTotal * (commissionPercentage / 100));
        const sellerEarning = sellingPriceTotal - commissionAmount;
        const deliveryEarning = finalDeliveryFee;
        const totalAmount = sellingPriceTotal + finalDeliveryFee + platformFee;
        const paymentGatewayFee = Math.round(totalAmount * (paymentGatewayPercentage / 100));

        const order = await Order.create({
            user: req.user._id,
            seller: orderSeller,
            sellerShopName: sellerObj ? sellerObj.shopName : 'Shop',
            sellerShopAddress: sellerObj ? sellerObj.shopAddress : '',
            sellerLocation,
            items: orderItems,
            shippingAddress,
            contactInfo,
            mrpTotal,
            sellingPriceTotal,
            deliveryFee: finalDeliveryFee,
            platformFee,
            commissionAmount,
            sellerEarning,
            deliveryEarning,
            totalAmount,
            paymentGatewayFee,
            walletSettlementStatus: 'Pending',
            paymentMethod: 'Online',
            razorpayOrderId,
            razorpayPaymentId
        });

        // Clear the user's cart
        const user = await User.findById(req.user._id);
        if (user) { user.cart = []; await user.save(); }

        await order.populate('user', 'name phone email');

        res.status(201).json({
            success: true,
            message: 'Payment verified and order placed successfully',
            data: order
        });
    } catch (err) {
        console.error('[Payment] verify error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
