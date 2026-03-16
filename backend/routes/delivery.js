import express from 'express';
import jwt from 'jsonwebtoken';

import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = express.Router();



// ── Middleware ──────────────────────────────────────────────────────────────
const protectDelivery = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.partner = await DeliveryPartner.findById(decoded.id);
        if (!req.partner) return res.status(401).json({ success: false, message: 'Partner not found' });
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// ── Auth ────────────────────────────────────────────────────────────────────

// POST /api/delivery/register
router.post('/register', async (req, res) => {
    try {
        const { name, phone, password, vehicleType, vehicleNumber } = req.body;
        const exists = await DeliveryPartner.findOne({ phone });
        if (exists) return res.status(400).json({ success: false, message: 'Phone already registered' });

        const partner = await DeliveryPartner.create({ name, phone, password, vehicleType, vehicleNumber });
        const token = jwt.sign({ id: partner._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ success: true, message: 'Registered successfully', data: { token, partner: { _id: partner._id, name: partner.name, phone: partner.phone, vehicleType: partner.vehicleType, vehicleNumber: partner.vehicleNumber, isOnline: partner.isOnline } } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/delivery/login
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const partner = await DeliveryPartner.findOne({ phone }).select('+password');
        if (!partner || !(await partner.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid phone or password' });
        }
        if (!partner.isActive) return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });

        const token = jwt.sign({ id: partner._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, data: { token, partner: { _id: partner._id, name: partner.name, phone: partner.phone, vehicleType: partner.vehicleType, vehicleNumber: partner.vehicleNumber, isOnline: partner.isOnline } } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Profile ─────────────────────────────────────────────────────────────────

// GET /api/delivery/profile
router.get('/profile', protectDelivery, async (req, res) => {
    try {
        const partner = req.partner;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDeliveries = await Order.countDocuments({
            deliveryPartner: partner._id,
            deliveryStatus: 'Delivered',
            deliveredAt: { $gte: today }
        });

        res.json({ success: true, data: { ...partner.toObject(), todayDeliveries } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/delivery/profile
router.put('/profile', protectDelivery, async (req, res) => {
    try {
        const { name, vehicleType, vehicleNumber } = req.body;
        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.partner._id,
            { name, vehicleType, vehicleNumber },
            { new: true }
        );
        res.json({ success: true, data: partner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/delivery/profile/status — toggle online/offline
router.put('/profile/status', protectDelivery, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const partner = await DeliveryPartner.findByIdAndUpdate(req.partner._id, { isOnline }, { new: true });
        res.json({ success: true, data: { isOnline: partner.isOnline } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Stats ────────────────────────────────────────────────────────────────────

// GET /api/delivery/stats
router.get('/stats', protectDelivery, async (req, res) => {
    try {
        const partnerId = req.partner._id;
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const [assigned, pending, deliveredToday, returnPickups, exchangePickups] = await Promise.all([
            Order.countDocuments({ deliveryPartner: partnerId, deliveryStatus: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] } }),
            Order.countDocuments({ deliveryPartner: partnerId, deliveryStatus: { $in: ['Assigned', 'Picked Up'] } }),
            Order.countDocuments({ deliveryPartner: partnerId, deliveryStatus: 'Delivered', deliveredAt: { $gte: today } }),
            Order.countDocuments({ deliveryPartner: partnerId, deliveryType: 'Return Pickup', deliveryStatus: { $ne: 'Delivered' } }),
            Order.countDocuments({ deliveryPartner: partnerId, deliveryType: 'Exchange Pickup', deliveryStatus: { $ne: 'Delivered' } }),
        ]);

        res.json({ success: true, data: { assigned, pending, deliveredToday, returnPickups, exchangePickups } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Orders ───────────────────────────────────────────────────────────────────

// GET /api/delivery/orders — active assigned orders
router.get('/orders', protectDelivery, async (req, res) => {
    try {
        const orders = await Order.find({
            deliveryPartner: req.partner._id,
            deliveryStatus: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] }
        })
        .populate('user', 'name phone')
        .sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/delivery/orders/single/:id
router.get('/orders/single/:id', protectDelivery, async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.partner._id })
            .populate('user', 'name phone email');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/delivery/orders/:id/status — update delivery status
router.put('/orders/:id/status', protectDelivery, async (req, res) => {
    try {
        const { deliveryStatus } = req.body;

        const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.partner._id })
            .populate('items.product', 'stock');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const isReturnPickup = order.deliveryType === 'Return Pickup';

        // Return Pickup orders accept: 'Picked Up' (en-route to collect), 'Collected' (collected from customer)
        // Normal orders accept: 'Picked Up', 'Out for Delivery', 'Delivered'
        const validStatuses = isReturnPickup
            ? ['Picked Up', 'Collected']
            : ['Picked Up', 'Out for Delivery', 'Delivered'];

        if (!validStatuses.includes(deliveryStatus)) {
            return res.status(400).json({ success: false, message: `Invalid status for this order type. Valid: ${validStatuses.join(', ')}` });
        }

        order.deliveryStatus = deliveryStatus;

        if (isReturnPickup) {
            // Return Pickup: when collected, mark all Return Approved items as Return Completed
            if (deliveryStatus === 'Collected') {
                const now = new Date();
                for (const item of order.items) {
                    if (item.status === 'Return Approved') {
                        item.status = 'Return Completed';
                        item.returnCompletedAt = now;
                        // Restore stock
                        const Product = (await import('../models/Product.js')).default;
                        const product = await Product.findById(item.product?._id || item.product);
                        if (product) {
                            product.stock += item.quantity;
                            await product.save();
                        }
                    }
                }
                order.statusHistory.push({ status: 'Return Completed', timestamp: now, note: 'Return collected by delivery partner' });
                await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
                    $inc: { activeOrdersCount: -1, totalDeliveries: 1 }
                });
            } else {
                // Picked Up (heading to customer to collect)
                order.statusHistory.push({ status: 'Picked Up', timestamp: new Date(), note: 'Delivery partner en-route to collect return' });
            }
        } else {
            // Normal delivery
            const statusMap = {
                'Picked Up': 'Picked Up',
                'Out for Delivery': 'Out for Delivery',
                'Delivered': 'Delivered'
            };
            order.status = statusMap[deliveryStatus];
            order.statusHistory.push({ status: statusMap[deliveryStatus], timestamp: new Date(), note: 'Updated by delivery partner' });

            if (deliveryStatus === 'Delivered') {
                order.deliveredAt = new Date();
                await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
                    $inc: { activeOrdersCount: -1, totalDeliveries: 1 }
                });
            }
        }

        await order.save();


        res.json({ success: true, message: `Status updated to ${deliveryStatus}`, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/delivery/history — completed deliveries
router.get('/history', protectDelivery, async (req, res) => {
    try {
        const orders = await Order.find({
            deliveryPartner: req.partner._id,
            deliveryStatus: 'Delivered'
        })
        .populate('user', 'name phone')
        .sort({ deliveredAt: -1 })
        .limit(50);

        res.json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin – Partner Management ────────────────────────────────────────────────

// GET /api/delivery/admin/partners
router.get('/admin/partners', async (req, res) => {
    try {
        const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
        res.json({ success: true, data: partners });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/delivery/admin/partners/:id — admin edit partner
router.put('/admin/partners/:id', async (req, res) => {
    try {
        const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: partner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Utility: Auto-Assign ──────────────────────────────────────────────────────
export const autoAssignDeliveryPartner = async (orderId, deliveryType = 'Normal') => {
    try {
        const partner = await DeliveryPartner.findOne({ isActive: true })
            .sort({ activeOrdersCount: 1 });

        if (!partner) {
            console.log('[AutoAssign] No available delivery partners');
            return null;
        }

        await Order.findByIdAndUpdate(orderId, {
            deliveryPartner: partner._id,
            deliveryPartnerId: partner._id,
            deliveryStatus: 'Assigned',
            deliveryType: deliveryType
        });

        await DeliveryPartner.findByIdAndUpdate(partner._id, {
            $inc: { activeOrdersCount: 1 }
        });

        console.log(`[AutoAssign] Order ${orderId} assigned to partner ${partner.name} (type: ${deliveryType})`);
        return partner;
    } catch (err) {
        console.error('[AutoAssign] Error:', err.message);
        return null;
    }
};

export default router;
