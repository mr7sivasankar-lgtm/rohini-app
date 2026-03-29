import express from 'express';
import jwt from 'jsonwebtoken';

import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import WalletTransaction from '../models/WalletTransaction.js';
import PartnerStatusLog from '../models/PartnerStatusLog.js';
import { sendPush } from '../utils/notify.js';
import { uploadSingle } from '../middleware/upload.js';
import sendOTP from '../utils/sms.js';

const router = express.Router();



// ── Middleware ──────────────────────────────────────────────────────────────
export const protectDelivery = async (req, res, next) => {
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

// POST /api/delivery/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60000);

        // Check if partner already exists
        let partner = await DeliveryPartner.findOne({ phone }).select('+otp +otpExpiry');
        if (partner) {
            partner.otp = otp;
            partner.otpExpiry = otpExpiry;
            await partner.save();
        } else {
            // Pre-create with placeholder so OTP can be saved
            partner = await DeliveryPartner.create({
                phone,
                name: 'Delivery Partner',
                otp,
                otpExpiry,
                isVerified: false,
                isProfileComplete: false,
            });
        }

        const smsSent = await sendOTP(phone, otp);
        if (!smsSent) return res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' });

        res.json({
            success: true,
            message: 'OTP sent successfully',
            data: { phone, ...(process.env.NODE_ENV !== 'production' ? { otp } : {}) }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/delivery/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

        const partner = await DeliveryPartner.findOne({ phone }).select('+otp +otpExpiry');
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        if (!partner.otp || partner.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
        }
        if (partner.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        const isNewPartner = !partner.isProfileComplete;

        partner.isVerified = true;
        partner.otp = undefined;
        partner.otpExpiry = undefined;
        await partner.save();

        const token = jwt.sign({ id: partner._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: isNewPartner ? 'OTP verified. Please complete your profile.' : 'Login successful',
            data: {
                token,
                isNewPartner,
                partner: {
                    _id: partner._id,
                    name: partner.name,
                    phone: partner.phone,
                    vehicleType: partner.vehicleType,
                    vehicleNumber: partner.vehicleNumber,
                    isOnline: partner.isOnline,
                    city: partner.city,
                    pincode: partner.pincode,
                    isProfileComplete: partner.isProfileComplete,
                    status: partner.status,
                    isActive: partner.isActive,
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/delivery/register
router.post('/register', async (req, res) => {
    try {
        const { 
            name, phone, vehicleType, vehicleNumber, 
            address, city, state, pincode, location,
            email, dob, gender, aadhaarNumber, panNumber,
            bankAccountName, bankAccountNumber, bankIfsc, bankName
        } = req.body;

        // For OTP flow: partner record was pre-created in send-otp. Find and update it.
        let partner = await DeliveryPartner.findOne({ phone });
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Please verify OTP first before registering.' });
        }

        // Update profile details
        if (name) partner.name = name.trim();
        if (vehicleType) partner.vehicleType = vehicleType;
        if (vehicleNumber) partner.vehicleNumber = vehicleNumber.trim();
        if (address) partner.address = address.trim();
        if (city) partner.city = city.trim();
        if (state) partner.state = state.trim();
        if (pincode) partner.pincode = pincode.trim();
        if (location && location.coordinates && location.coordinates.length === 2 && location.coordinates[0] !== 0) {
            partner.location = { type: 'Point', coordinates: location.coordinates };
        }
        if (email) partner.email = email.trim();
        if (dob) partner.dob = dob;
        if (gender) partner.gender = gender;
        if (aadhaarNumber) partner.aadhaarNumber = aadhaarNumber.trim();
        if (panNumber) partner.panNumber = panNumber.trim().toUpperCase();
        if (bankAccountName) partner.bankAccountName = bankAccountName.trim();
        if (bankAccountNumber) partner.bankAccountNumber = bankAccountNumber.trim();
        if (bankIfsc) partner.bankIfsc = bankIfsc.trim().toUpperCase();
        if (bankName) partner.bankName = bankName.trim();

        partner.isProfileComplete = true;
        partner.isVerified = true;
        await partner.save();

        const token = jwt.sign({ id: partner._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ success: true, message: 'Registered successfully', data: { token, partner: { _id: partner._id, name: partner.name, phone: partner.phone, vehicleType: partner.vehicleType, vehicleNumber: partner.vehicleNumber, isOnline: partner.isOnline, city: partner.city, pincode: partner.pincode, isProfileComplete: partner.isProfileComplete, status: partner.status, isActive: partner.isActive } } });
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
        res.json({ success: true, data: { token, partner: { _id: partner._id, name: partner.name, phone: partner.phone, vehicleType: partner.vehicleType, vehicleNumber: partner.vehicleNumber, isOnline: partner.isOnline, city: partner.city, pincode: partner.pincode } } });
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
// POST /api/delivery/upload-image — upload profile/document images to Cloudinary
router.post('/upload-image', protectDelivery, uploadSingle, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
        res.status(200).json({ success: true, url: req.file.path });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error uploading image' });
    }
});

// PUT /api/delivery/profile
router.put('/profile', protectDelivery, async (req, res) => {
    try {
        const { 
            name, vehicleType, vehicleNumber, 
            email, dob, gender, aadhaarNumber, panNumber,
            bankAccountName, bankAccountNumber, bankIfsc, bankName 
        } = req.body;
        
        const updateData = { name, vehicleType, vehicleNumber };
        if (email !== undefined) updateData.email = email.trim();
        if (dob !== undefined) updateData.dob = dob;
        if (gender !== undefined) updateData.gender = gender;
        if (aadhaarNumber !== undefined) updateData.aadhaarNumber = aadhaarNumber.trim();
        if (panNumber !== undefined) updateData.panNumber = panNumber.trim().toUpperCase();
        if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName.trim();
        if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber.trim();
        if (bankIfsc !== undefined) updateData.bankIfsc = bankIfsc.trim().toUpperCase();
        if (bankName !== undefined) updateData.bankName = bankName.trim();
        // Document image URLs
        const { profileImage, documentAadhaar, documentPan, documentDrivingLicense, documentRC, address, city, state, pincode, location } = req.body;
        if (profileImage !== undefined) updateData.profileImage = profileImage;
        if (documentAadhaar !== undefined) updateData.documentAadhaar = documentAadhaar;
        if (documentPan !== undefined) updateData.documentPan = documentPan;
        if (documentDrivingLicense !== undefined) updateData.documentDrivingLicense = documentDrivingLicense;
        if (documentRC !== undefined) updateData.documentRC = documentRC;
        if (address !== undefined) updateData.address = address.trim();
        if (city !== undefined) updateData.city = city.trim();
        if (state !== undefined) updateData.state = state.trim();
        if (pincode !== undefined) updateData.pincode = pincode.trim();
        if (location && location.coordinates) updateData.location = { type: 'Point', coordinates: location.coordinates };

        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.partner._id,
            updateData,
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
        // Log status change for history tracking
        await PartnerStatusLog.create({ partner: req.partner._id, isOnline, timestamp: new Date() });
        res.json({ success: true, data: { isOnline: partner.isOnline } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/delivery/location — update delivery partner's live GPS coordinates
router.put('/location', protectDelivery, async (req, res) => {
    try {
        const { coordinates } = req.body; // [lng, lat]
        if (!coordinates || coordinates.length !== 2) {
            return res.status(400).json({ success: false, message: 'Invalid coordinates' });
        }
        await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
            location: { type: 'Point', coordinates }
        });
        res.json({ success: true });
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
        const { deliveryStatus, paymentCollectedVia } = req.body;

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
                'Picked Up': null, // Do not modify main order status yet
                'Out for Delivery': 'Out for Delivery',
                'Delivered': 'Delivered'
            };
            
            if (statusMap[deliveryStatus]) {
                order.status = statusMap[deliveryStatus];
            }
            order.statusHistory.push({ status: deliveryStatus, timestamp: new Date(), note: 'Updated by delivery partner' });

            if (deliveryStatus === 'Delivered') {
                order.deliveredAt = new Date();
                // Save how payment was actually collected at the door
                if (paymentCollectedVia && ['Cash', 'UPI', 'Card', 'Online'].includes(paymentCollectedVia)) {
                    order.paymentCollectedVia = paymentCollectedVia;
                }
                
                // === CENTRAL PAYMENTS WALLET SETTLEMENT ===
                if (order.walletSettlementStatus === 'Pending') {
                    // 1. Credit Seller
                    const seller = await Seller.findById(order.seller);
                    if (seller) {
                        seller.walletBalance += (order.sellerEarning || 0);
                        await seller.save();
                        
                        await WalletTransaction.create({
                            userType: 'Seller',
                            userId: seller._id,
                            amount: (order.sellerEarning || 0),
                            type: 'Order Earning',
                            status: 'Success',
                            orderId: order._id,
                            description: `Earnings credited for Order ${order.orderId}`,
                            balanceAfter: seller.walletBalance
                        });
                    }

                    // 2. Credit Delivery Partner
                    const partnerToCredit = await DeliveryPartner.findById(req.partner._id);
                    if (partnerToCredit) {
                        partnerToCredit.walletBalance += (order.deliveryEarning || 0);
                        partnerToCredit.activeOrdersCount = Math.max(0, partnerToCredit.activeOrdersCount - 1);
                        partnerToCredit.totalDeliveries += 1;
                        await partnerToCredit.save();

                        await WalletTransaction.create({
                            userType: 'DeliveryPartner',
                            userId: partnerToCredit._id,
                            amount: (order.deliveryEarning || 0),
                            type: 'Delivery Earning',
                            status: 'Success',
                            orderId: order._id,
                            description: `Delivery fee credited for Order ${order.orderId}`,
                            balanceAfter: partnerToCredit.walletBalance
                        });
                    }

                    order.walletSettlementStatus = 'Settled';
                } else {
                    // Fallback for edge cases (if settlement happened earlier/failed gracefully)
                    await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
                        $inc: { activeOrdersCount: -1, totalDeliveries: 1 }
                    });
                }
            }
        }

        await order.save();

        // ── Notify Customer: delivery status update ──
        try {
            const customer = await User.findById(order.user);
            if (customer?.pushSubscription) {
                const msgMap = {
                    'Picked Up':      { title: '🛕 Order Picked Up!',    body: 'Your order has been collected from the seller.' },
                    'Out for Delivery':{ title: '📦 Out for Delivery!', body: 'Your order is on the way to you.' },
                    'Delivered':      { title: '✅ Order Delivered!',   body: 'Your order has been delivered. Enjoy!' },
                };
                const msg = msgMap[deliveryStatus];
                if (msg) {
                    await sendPush(customer.pushSubscription, {
                        ...msg,
                        icon: '/icons/icon-192.png',
                        vibrate: deliveryStatus === 'Delivered' ? [200, 100, 200] : undefined,
                        tag: `delivery-status-${order._id}`,
                        url: `/orders/${order._id}`
                    });
                }
            }
        } catch (notifErr) {
            console.error('[Push] Customer delivery-status notify error:', notifErr.message);
        }

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

// GET /api/delivery/admin/partners/:id/status-history
router.get('/admin/partners/:id/status-history', async (req, res) => {
    try {
        const logs = await PartnerStatusLog.find({ partner: req.params.id })
            .sort({ timestamp: -1 })
            .limit(100);

        // Build session list: pair each log with the previous one to compute duration
        const reversed = [...logs].reverse(); // oldest first
        const sessions = reversed.map((log, i) => {
            const nextLog = reversed[i + 1];
            const endTime = nextLog ? new Date(nextLog.timestamp) : null;
            const startTime = new Date(log.timestamp);
            const durationMs = endTime ? endTime - startTime : null;
            return {
                isOnline: log.isOnline,
                startTime: log.timestamp,
                endTime: endTime,
                durationMs,
                isCurrent: !nextLog
            };
        });

        // Compute totals
        const totalOnlineMs = sessions
            .filter(s => s.isOnline && s.durationMs !== null)
            .reduce((sum, s) => sum + s.durationMs, 0);
        const totalOfflineMs = sessions
            .filter(s => !s.isOnline && s.durationMs !== null)
            .reduce((sum, s) => sum + s.durationMs, 0);

        res.json({
            success: true,
            data: {
                sessions: sessions.reverse(), // newest first for display
                totalOnlineMs,
                totalOfflineMs
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

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

// PUT /api/delivery/admin/partners/:id/approve — admin explicitly approve or reject partner
router.put('/admin/partners/:id/approve', async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        const updateData = { status };
        // If approved, technically they can start working. Admin can manually deactivate later.
        if (status === 'Approved') updateData.isActive = true;
        if (status === 'Rejected') updateData.isActive = false;

        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );
        res.json({ success: true, data: partner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 5;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ── Broadcast Endpoints ──────────────────────────────────────────────────────

// GET /api/delivery/broadcasts
router.get('/broadcasts', protectDelivery, async (req, res) => {
    try {
        const partner = req.partner;
        if (!partner.isOnline) return res.json({ success: true, data: [] });

        const pLat = partner.location?.coordinates?.[1];
        const pLng = partner.location?.coordinates?.[0];
        
        // Find unassigned NORMAL orders (Ready for Pickup / Packed)
        const normalOrders = await Order.find({
            deliveryStatus: '',
            deliveryPartner: null,
            status: { $in: ['Ready for Pickup', 'Packed'] }
        }).populate('seller', 'shopName shopAddress location phone');

        // Find unassigned RETURN PICKUP orders
        // (order status is still 'Delivered' but deliveryType is 'Return Pickup')
        const returnOrders = await Order.find({
            deliveryStatus: '',
            deliveryPartner: null,
            deliveryType: 'Return Pickup',
            'items.status': 'Return Approved'
        }).populate('seller', 'shopName shopAddress location phone');

        const allOrders = [...normalOrders, ...returnOrders];
        const broadcasts = [];
        const now = new Date();

        for (const order of allOrders) {
            const isReturn = order.deliveryType === 'Return Pickup';

            const sLat = order.seller?.location?.coordinates?.[1] || order.sellerLocation?.lat;
            const sLng = order.seller?.location?.coordinates?.[0] || order.sellerLocation?.lng;
            const cLat = order.shippingAddress?.latitude;
            const cLng = order.shippingAddress?.longitude;

            // For normal: pickup = shop, dropoff = customer
            // For return: pickup = customer, dropoff = shop
            let pickupLat = isReturn ? cLat  : sLat;
            let pickupLng = isReturn ? cLng  : sLng;
            let dropoffLat = isReturn ? sLat  : cLat;
            let dropoffLng = isReturn ? sLng  : cLng;

            let pickupKm = 5;
            let deliveryKm = 5;

            if (pLat && pLng && pickupLat && pickupLng) {
                pickupKm = getDistanceFromLatLonInKm(pLat, pLng, pickupLat, pickupLng);
            }
            if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
                deliveryKm = getDistanceFromLatLonInKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
            }

            const timeSinceBroadcast = order.broadcastedAt ? (now - order.broadcastedAt) / 1000 : 0;

            if (pickupKm <= 10 || timeSinceBroadcast > 120 || !pLat) {
                broadcasts.push({
                    _id: order._id,
                    orderId: order.orderId,
                    deliveryType: order.deliveryType || 'Normal',
                    // Pickup info depends on order type
                    pickupLabel: isReturn ? 'Customer Address' : (order.sellerShopName || order.seller?.shopName),
                    pickupAddress: isReturn
                        ? order.shippingAddress?.fullAddress
                        : (order.sellerShopAddress || order.seller?.shopAddress),
                    dropoffLabel: isReturn ? (order.sellerShopName || order.seller?.shopName) : 'Customer',
                    dropoffAddress: isReturn
                        ? (order.sellerShopAddress || order.seller?.shopAddress)
                        : order.shippingAddress?.fullAddress,
                    // Legacy fields for backward compat
                    sellerShopName: order.sellerShopName || order.seller?.shopName,
                    sellerShopAddress: order.sellerShopAddress || order.seller?.shopAddress,
                    pickupKm: parseFloat(pickupKm.toFixed(1)),
                    deliveryKm: parseFloat(deliveryKm.toFixed(1)),
                    deliveryFee: order.deliveryFee || 20,
                    totalAmount: order.totalAmount,
                    timeSinceBroadcast,
                    itemsSummary: order.items?.length > 0
                        ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
                        : 'Items'
                });
            }
        }

        res.json({ success: true, data: broadcasts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// POST /api/delivery/broadcasts/:id/accept
router.post('/broadcasts/:id/accept', protectDelivery, async (req, res) => {
    try {
        const partner = req.partner;
        const orderId = req.params.id;

        // Atomic update to prevent race conditions
        const order = await Order.findOneAndUpdate(
            { _id: orderId, deliveryStatus: '' },
            { 
                deliveryPartner: partner._id,
                deliveryStatus: 'Assigned',
                // Keep deliveryType as whatever it was
            },
            { new: true }
        );

        if (!order) {
            return res.status(400).json({ success: false, message: 'Order already accepted by another partner or no longer available.' });
        }

        await DeliveryPartner.findByIdAndUpdate(partner._id, {
            $inc: { activeOrdersCount: 1 }
        });

        res.json({ success: true, message: 'Order accepted successfully!', data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Utility: Broadcast ────────────────────────────────────────────────────────
export const broadcastOrder = async (orderId, deliveryType = 'Normal') => {
    try {
        await Order.findByIdAndUpdate(orderId, {
            broadcastedAt: new Date(),
            deliveryType: deliveryType
        });
        
        // Notify all online partners in general vicinity
        const partners = await DeliveryPartner.find({ isActive: true, isOnline: true });
        const assignedOrder = await Order.findById(orderId).populate('seller');
        
        for (const p of partners) {
            if (p.pushSubscription) {
                // Simple push
                try {
                    await sendPush(p.pushSubscription, {
                        title: '🔔 New Delivery Request!',
                        body: `Earn ₹${assignedOrder.deliveryFee || 20} - Pick up from ${assignedOrder?.sellerShopName || 'nearest shop'}`,
                        icon: '/icons/icon-192.png',
                        vibrate: [300, 100, 300],
                        url: '/'
                    });
                } catch(e) { /* ignore single push fail */ }
            }
        }
        console.log(`[Broadcast] Order ${orderId} broadcasted to ${partners.length} partners.`);
    } catch (err) {
        console.error('[Broadcast] Error:', err.message);
    }
};

export default router;
