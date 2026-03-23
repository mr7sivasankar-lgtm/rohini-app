import express from 'express';
import webpush from 'web-push';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { protect } from '../middleware/auth.js';
import { sellerProtect } from '../middleware/sellerAuth.js';
import { protectDelivery } from '../middleware/deliveryAuth.js';

const router = express.Router();

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@rohiniapp.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('[WebPush] VAPID keys not configured — push notifications disabled.');
}

// GET /api/push/vapid-public-key — send public key to browser
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// ── Customer ──────────────────────────────────────────────────────────────────
// POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) return res.status(400).json({ success: false, message: 'No subscription provided' });
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
        res.json({ success: true, message: 'Customer subscribed to push notifications' });
    } catch (err) {
        console.error('[Push] Customer subscribe error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
        res.json({ success: true, message: 'Unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Seller ────────────────────────────────────────────────────────────────────
// POST /api/push/subscribe/seller
router.post('/subscribe/seller', sellerProtect, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) return res.status(400).json({ success: false, message: 'No subscription provided' });
        await Seller.findByIdAndUpdate(req.seller._id, { pushSubscription: subscription });
        res.json({ success: true, message: 'Seller subscribed to push notifications' });
    } catch (err) {
        console.error('[Push] Seller subscribe error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe/seller', sellerProtect, async (req, res) => {
    try {
        await Seller.findByIdAndUpdate(req.seller._id, { pushSubscription: null });
        res.json({ success: true, message: 'Seller unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Delivery Partner ──────────────────────────────────────────────────────────
// POST /api/push/subscribe/partner
router.post('/subscribe/partner', protectDelivery, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) return res.status(400).json({ success: false, message: 'No subscription provided' });
        await DeliveryPartner.findByIdAndUpdate(req.partner._id, { pushSubscription: subscription });
        res.json({ success: true, message: 'Partner subscribed to push notifications' });
    } catch (err) {
        console.error('[Push] Partner subscribe error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/unsubscribe/partner', protectDelivery, async (req, res) => {
    try {
        await DeliveryPartner.findByIdAndUpdate(req.partner._id, { pushSubscription: null });
        res.json({ success: true, message: 'Partner unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
