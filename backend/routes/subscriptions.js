import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SellerSubscription from '../models/SellerSubscription.js';
import Seller from '../models/Seller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sellerProtect } from '../middleware/sellerAuth.js';
import { sendPush } from '../utils/notify.js';

const router = express.Router();

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys not configured');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Helper: compute expiry date based on plan
function computeExpiryDate(startDate, duration, durationType) {
    const expiry = new Date(startDate);
    if (durationType === 'DAY') expiry.setDate(expiry.getDate() + duration);
    else if (durationType === 'WEEK') expiry.setDate(expiry.getDate() + duration * 7);
    else if (durationType === 'MONTH') expiry.setMonth(expiry.getMonth() + duration);
    // Set to end of day
    expiry.setHours(23, 59, 59, 999);
    return expiry;
}

// ─── SEED default plan if none exists ────────────────────────────────────────
const seedDefaultPlan = async () => {
    try {
        const count = await SubscriptionPlan.countDocuments();
        if (count === 0) {
            await SubscriptionPlan.create({
                planId: 'DAILY',
                name: 'Daily Seller',
                price: 25,
                duration: 1,
                durationType: 'DAY',
                description: 'Daily access to Sifito customer network',
                isActive: true
            });
            console.log('[Subscription] Default DAILY plan seeded');
        }
    } catch (e) {
        // ignore duplicate
    }
};
seedDefaultPlan();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC / SELLER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/plans — active plans (seller/public)
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
        res.json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/subscriptions/seller/current — seller's current active subscription
router.get('/seller/current', sellerProtect, async (req, res) => {
    try {
        const now = new Date();
        const sub = await SellerSubscription.findOne({
            seller: req.seller._id,
            status: 'ACTIVE',
            expiryDate: { $gt: now }
        }).sort({ expiryDate: -1 });
        res.json({ success: true, data: sub || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/subscriptions/seller/history — seller's subscription history
router.get('/seller/history', sellerProtect, async (req, res) => {
    try {
        const subs = await SellerSubscription.find({ seller: req.seller._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: subs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/subscriptions/create-payment — create Razorpay order for subscription
router.post('/create-payment', sellerProtect, async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

        const plan = await SubscriptionPlan.findOne({ planId: planId.toUpperCase(), isActive: true });
        if (!plan) return res.status(404).json({ success: false, message: 'Subscription plan not found or inactive' });

        const razorpay = getRazorpay();
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(plan.price * 100), // paise
            currency: 'INR',
            receipt: `sub_${req.seller._id}_${Date.now()}`,
            notes: {
                sellerId: req.seller._id.toString(),
                planId: plan.planId
            }
        });

        res.json({
            success: true,
            data: {
                razorpayOrderId: razorpayOrder.id,
                amount: plan.price,
                currency: 'INR',
                keyId: process.env.RAZORPAY_KEY_ID,
                planId: plan.planId,
                planName: plan.name
            }
        });
    } catch (err) {
        console.error('[Subscription] create-payment error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/subscriptions/verify-payment — verify Razorpay + activate subscription
router.post('/verify-payment', sellerProtect, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planId) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
        }

        // 1. Verify HMAC signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
        }

        // 2. Idempotency: check if already processed
        const existing = await SellerSubscription.findOne({ razorpayPaymentId });
        if (existing) {
            return res.json({ success: true, data: existing, message: 'Subscription already activated' });
        }

        // 3. Fetch plan
        const plan = await SubscriptionPlan.findOne({ planId: planId.toUpperCase(), isActive: true });
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        // 4. Compute dates — if seller has active sub, extend from its expiry, else start now
        const now = new Date();
        const existingActive = await SellerSubscription.findOne({
            seller: req.seller._id,
            status: 'ACTIVE',
            expiryDate: { $gt: now }
        }).sort({ expiryDate: -1 });

        const startDate = existingActive ? new Date(existingActive.expiryDate.getTime() + 1000) : now;
        const expiryDate = computeExpiryDate(startDate, plan.duration, plan.durationType);

        // 5. Create subscription record
        const sub = await SellerSubscription.create({
            seller: req.seller._id,
            planId: plan.planId,
            planName: plan.name,
            amount: plan.price,
            startDate,
            expiryDate,
            status: 'ACTIVE',
            razorpayOrderId,
            razorpayPaymentId,
            paymentStatus: 'SUCCESS'
        });

        // 6. Update seller's cached subscription fields
        await Seller.findByIdAndUpdate(req.seller._id, {
            subscriptionStatus: 'ACTIVE',
            subscriptionPlanId: plan.planId,
            subscriptionExpiryDate: expiryDate
        });

        // 7. Notify seller
        try {
            const seller = await Seller.findById(req.seller._id);
            if (seller?.fcmToken || seller?.pushSubscription) {
                await sendPush(seller.fcmToken || seller.pushSubscription, {
                    title: '✅ Subscription Activated!',
                    body: `Your ${plan.name} (₹${plan.price}) is now ACTIVE until ${expiryDate.toLocaleDateString('en-IN')}.`,
                    icon: '/icons/icon-192.png',
                    tag: `subscription-activated-${sub._id}`,
                    url: '/dashboard'
                });
            }
        } catch (notifErr) {
            console.error('[Push] Subscription activated notify error:', notifErr.message);
        }

        res.status(201).json({ success: true, data: sub, message: 'Subscription activated successfully' });
    } catch (err) {
        console.error('[Subscription] verify-payment error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/admin/plans — all plans
router.get('/admin/plans', protect, adminOnly, async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
        res.json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/subscriptions/admin/plans — create plan
router.post('/admin/plans', protect, adminOnly, async (req, res) => {
    try {
        const { planId, name, price, duration, durationType, description, isActive } = req.body;
        if (!planId || !name || !price) {
            return res.status(400).json({ success: false, message: 'planId, name, and price are required' });
        }
        const plan = await SubscriptionPlan.create({ planId: planId.toUpperCase(), name, price, duration: duration || 1, durationType: durationType || 'DAY', description: description || '', isActive: isActive !== false });
        res.status(201).json({ success: true, data: plan });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, message: 'Plan ID already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/subscriptions/admin/plans/:id — update plan
router.put('/admin/plans/:id', protect, adminOnly, async (req, res) => {
    try {
        const { name, price, duration, durationType, description, isActive } = req.body;
        const plan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.id,
            { name, price, duration, durationType, description, isActive },
            { new: true, runValidators: true }
        );
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/subscriptions/admin/all — all seller subscriptions
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status) query.status = status;

        const subs = await SellerSubscription.find(query)
            .populate('seller', 'shopName ownerName phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await SellerSubscription.countDocuments(query);
        res.json({ success: true, data: subs, total });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/subscriptions/admin/stats — subscription revenue stats
router.get('/admin/stats', protect, adminOnly, async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [activeSellers, expiredSellers, todaySubs, totalRevenue, todayRevenue, monthRevenue] = await Promise.all([
            SellerSubscription.countDocuments({ status: 'ACTIVE', expiryDate: { $gt: now } }),
            Seller.countDocuments({ subscriptionStatus: 'EXPIRED' }),
            SellerSubscription.countDocuments({ createdAt: { $gte: startOfToday }, paymentStatus: 'SUCCESS' }),
            SellerSubscription.aggregate([{ $match: { paymentStatus: 'SUCCESS' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            SellerSubscription.aggregate([{ $match: { paymentStatus: 'SUCCESS', createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            SellerSubscription.aggregate([{ $match: { paymentStatus: 'SUCCESS', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
        ]);

        res.json({
            success: true,
            data: {
                activeSellers,
                expiredSellers,
                todayNewSubscriptions: todaySubs,
                todaySubscriptionRevenue: todayRevenue[0]?.total || 0,
                monthlySubscriptionRevenue: monthRevenue[0]?.total || 0,
                totalSubscriptionRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/subscriptions/admin/:id/status — admin suspend/cancel/extend
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['SUSPENDED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Admin can only SUSPEND or CANCEL a subscription' });
        }
        const sub = await SellerSubscription.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

        // Update seller cache if suspending/cancelling
        if (['SUSPENDED', 'CANCELLED'].includes(status)) {
            await Seller.findByIdAndUpdate(sub.seller, { subscriptionStatus: status });
        }
        res.json({ success: true, data: sub });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
