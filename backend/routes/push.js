import express from 'express';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { protect } from '../middleware/auth.js';
import { sellerProtect } from '../routes/sellers.js';
import { protectDelivery } from '../routes/delivery.js';

const router = express.Router();

// GET /api/push/vapid-public-key — legacy compatibility, return VAPID key if present
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// ── Customer ──────────────────────────────────────────────────────────────────
// POST /api/push/fcm-token
router.post('/fcm-token', protect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'No token provided' });
        
        await User.findByIdAndUpdate(req.user._id, { fcmToken: token });
        res.json({ success: true, message: 'Customer FCM token registered' });
    } catch (err) {
        console.error('[Push] Customer token register error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/push/subscribe (legacy compatibility)
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription, token } = req.body;
        const updateData = {};
        if (subscription) updateData.pushSubscription = subscription;
        if (token) updateData.fcmToken = token;
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No subscription or token provided' });
        }

        await User.findByIdAndUpdate(req.user._id, updateData);
        res.json({ success: true, message: 'Customer push subscription updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: null, fcmToken: null });
        res.json({ success: true, message: 'Unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Seller ────────────────────────────────────────────────────────────────────
// POST /api/push/fcm-token/seller
router.post('/fcm-token/seller', sellerProtect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'No token provided' });
        
        await Seller.findByIdAndUpdate(req.seller._id, { fcmToken: token });
        res.json({ success: true, message: 'Seller FCM token registered' });
    } catch (err) {
        console.error('[Push] Seller token register error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/push/subscribe/seller (legacy compatibility)
router.post('/subscribe/seller', sellerProtect, async (req, res) => {
    try {
        const { subscription, token } = req.body;
        const updateData = {};
        if (subscription) updateData.pushSubscription = subscription;
        if (token) updateData.fcmToken = token;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No subscription or token provided' });
        }

        await Seller.findByIdAndUpdate(req.seller._id, updateData);
        res.json({ success: true, message: 'Seller push subscription updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe/seller', sellerProtect, async (req, res) => {
    try {
        await Seller.findByIdAndUpdate(req.seller._id, { pushSubscription: null, fcmToken: null });
        res.json({ success: true, message: 'Seller unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Delivery Partner ──────────────────────────────────────────────────────────
// POST /api/push/fcm-token/partner
router.post('/fcm-token/partner', protectDelivery, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'No token provided' });
        
        await DeliveryPartner.findByIdAndUpdate(req.partner._id, { fcmToken: token });
        res.json({ success: true, message: 'Partner FCM token registered' });
    } catch (err) {
        console.error('[Push] Partner token register error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/push/subscribe/partner (legacy compatibility)
router.post('/subscribe/partner', protectDelivery, async (req, res) => {
    try {
        const { subscription, token } = req.body;
        const updateData = {};
        if (subscription) updateData.pushSubscription = subscription;
        if (token) updateData.fcmToken = token;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No subscription or token provided' });
        }

        await DeliveryPartner.findByIdAndUpdate(req.partner._id, updateData);
        res.json({ success: true, message: 'Partner push subscription updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe/partner', protectDelivery, async (req, res) => {
    try {
        await DeliveryPartner.findByIdAndUpdate(req.partner._id, { pushSubscription: null, fcmToken: null });
        res.json({ success: true, message: 'Partner unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
