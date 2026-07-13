import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import SupportTicket from '../models/SupportTicket.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendPush } from '../utils/notify.js';

const router = express.Router();

// ── Unified Authorization Middleware for Customer, Seller, and Delivery Partner ──
const protectSupportUser = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let userObj = null;
        let userModel = 'User';

        if (decoded.role === 'seller') {
            userObj = await Seller.findById(decoded.id);
            userModel = 'Seller';
        } else {
            // Check if it's a delivery partner
            userObj = await DeliveryPartner.findById(decoded.id);
            if (userObj) {
                userModel = 'DeliveryPartner';
            } else {
                // Otherwise normal customer/admin user
                userObj = await User.findById(decoded.id);
                userModel = 'User';
            }
        }

        if (!userObj) return res.status(401).json({ success: false, message: 'User not found' });
        
        req.supportUser = userObj;
        req.supportUserModel = userModel;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// @route   POST /api/support
// @desc    Raise a new support ticket (Customer, Seller, or Delivery Partner)
// @access  Private (Unified)
router.post('/', protectSupportUser, async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (!subject || !description) {
            return res.status(400).json({ success: false, message: 'Subject and description are required' });
        }

        const ticket = await SupportTicket.create({
            user: req.supportUser._id,
            userModel: req.supportUserModel,
            subject,
            description,
            replies: []
        });

        // Optional: Send push notification to admin if they are registered (FCM admin not needed as admin polls, but let's log)
        console.log(`ℹ️ [Support] Ticket ${ticket.ticketId} raised by ${req.supportUserModel} "${req.supportUser.name || req.supportUser.shopName}"`);

        res.status(201).json({
            success: true,
            message: 'Support ticket raised successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Create support ticket error:', error);
        res.status(500).json({ success: false, message: 'Error raising support ticket' });
    }
});

// @route   GET /api/support/mine
// @desc    Get support tickets for the current logged-in user
// @access  Private (Unified)
router.get('/mine', protectSupportUser, async (req, res) => {
    try {
        const tickets = await SupportTicket.find({
            user: req.supportUser._id,
            userModel: req.supportUserModel
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('Get my support tickets error:', error);
        res.status(500).json({ success: false, message: 'Error fetching support tickets' });
    }
});

// @route   POST /api/support/:id/reply
// @desc    User replies to their support ticket
// @access  Private (Unified)
router.post('/:id/reply', protectSupportUser, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Ensure ownership
        if (ticket.user.toString() !== req.supportUser._id.toString() || ticket.userModel !== req.supportUserModel) {
            return res.status(403).json({ success: false, message: 'Not authorized to reply to this ticket' });
        }

        ticket.replies.push({
            senderType: 'User',
            senderName: req.supportUser.name || req.supportUser.shopName || 'User',
            message,
            createdAt: new Date()
        });

        // Set status back to 'Open' when user replies so Admin sees it needs attention
        ticket.status = 'Open';
        await ticket.save();

        res.json({ success: true, message: 'Reply sent successfully', data: ticket });
    } catch (error) {
        console.error('User reply error:', error);
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
});

// ── Admin Routes ──

// @route   GET /api/support/admin/all
// @desc    Get all support tickets for admin dashboard
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const tickets = await SupportTicket.find()
            .populate('user', 'name phone email shopName ownerName')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('Get all support tickets admin error:', error);
        res.status(500).json({ success: false, message: 'Error fetching support tickets' });
    }
});

// @route   POST /api/support/admin/:id/reply
// @desc    Admin replies to a support ticket
// @access  Private/Admin
router.post('/admin/:id/reply', protect, adminOnly, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        ticket.replies.push({
            senderType: 'Admin',
            senderName: 'Customer Support',
            message,
            createdAt: new Date()
        });

        ticket.status = 'In Progress';
        await ticket.save();

        // ── Notify User via FCM ──
        try {
            let recipientToken = null;

            if (ticket.userModel === 'User') {
                const user = await User.findById(ticket.user).select('+fcmToken');
                recipientToken = user?.fcmToken;
            } else if (ticket.userModel === 'Seller') {
                const seller = await Seller.findById(ticket.user).select('+fcmToken');
                recipientToken = seller?.fcmToken;
            } else if (ticket.userModel === 'DeliveryPartner') {
                const partner = await DeliveryPartner.findById(ticket.user).select('+fcmToken');
                recipientToken = partner?.fcmToken;
            }

            if (recipientToken) {
                await sendPush(recipientToken, {
                    title: '💬 New Support Message',
                    body: `Support: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
                    icon: '/icons/icon-192.png',
                    tag: `support-reply-${ticket._id}`,
                    url: `/support`
                });
            }
        } catch (pushErr) {
            console.error('[Support Push Notification Failed]:', pushErr.message);
        }

        res.json({ success: true, message: 'Reply sent successfully', data: ticket });
    } catch (error) {
        console.error('Admin reply error:', error);
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
});

// @route   PUT /api/support/admin/:id/status
// @desc    Admin updates support ticket status
// @access  Private/Admin
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        ticket.status = status;
        await ticket.save();

        res.json({ success: true, message: `Ticket status updated to ${status}`, data: ticket });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Error updating ticket status' });
    }
});

export default router;
