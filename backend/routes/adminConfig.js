import express from 'express';
import AdminConfig from '../models/AdminConfig.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get system configuration (Public - needed for checkout calculations on frontend)
// @route   GET /api/config
// @access  Public
router.get('/', async (req, res) => {
    try {
        const config = await AdminConfig.getConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update system configuration
// @route   PUT /api/config
// @access  Private (Admin)
router.put('/', protect, adminOnly, async (req, res) => {
    try {
        let config = await AdminConfig.getConfig();
        
        if (req.body.commissionPercentage !== undefined) config.commissionPercentage = req.body.commissionPercentage;
        if (req.body.platformFee !== undefined) config.platformFee = req.body.platformFee;
        if (req.body.deliveryChargePerKm !== undefined) config.deliveryChargePerKm = req.body.deliveryChargePerKm;
        if (req.body.baseDeliveryCharge !== undefined) config.baseDeliveryCharge = req.body.baseDeliveryCharge;
        if (req.body.baseDeliveryDistance !== undefined) config.baseDeliveryDistance = req.body.baseDeliveryDistance;

        await config.save();
        res.json({ success: true, data: config, message: 'Configuration updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
