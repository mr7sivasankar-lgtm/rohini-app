import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/admin/all
// @desc    Get all users (admin)
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } })
            .select('-otp -otpExpiry -cart -wishlist')
            .sort({ createdAt: -1 });

        // Get order counts for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const orderCount = await Order.countDocuments({ user: user._id });
            return {
                ...user.toObject(),
                orderCount
            };
        }));

        const stats = {
            total: users.length,
            verified: users.filter(u => u.isVerified).length,
            blocked: users.filter(u => u.isBlocked).length,
            activeToday: users.filter(u =>
                u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length
        };

        res.json({
            success: true,
            data: usersWithStats,
            stats
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// @route   PUT /api/users/admin/:id/block
// @desc    Block/unblock user (admin)
// @access  Private/Admin
router.put('/admin/:id/block', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({
            success: true,
            message: user.isBlocked ? 'User blocked' : 'User unblocked',
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating user' });
    }
});

// @route   DELETE /api/users/admin/:id
// @desc    Delete user (admin)
// @access  Private/Admin
router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Also delete user's orders
        await Order.deleteMany({ user: user._id });
        await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User and their orders deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

export default router;
