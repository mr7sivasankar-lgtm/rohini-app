import express from 'express';
import webpush from 'web-push';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

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
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save push subscription
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) {
            return res.status(400).json({ success: false, message: 'No subscription provided' });
        }
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('[Push] Subscribe error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/push/unsubscribe — clear push subscription
router.post('/unsubscribe', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
        res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
