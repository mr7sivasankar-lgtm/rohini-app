import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { autoAssignDeliveryPartner } from './delivery.js';

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { items, shippingAddress, contactInfo, deliveryFee = 50 } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items in order'
            });
        }

        if (!shippingAddress || !contactInfo) {
            return res.status(400).json({
                success: false,
                message: 'Please provide shipping address and contact information'
            });
        }

        // Verify stock and calculate total
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            const itemPrice = product.discount > 0 ?
                product.price * (1 - product.discount / 100) :
                product.price;

            subtotal += itemPrice * item.quantity;

            console.log(`[Order Creation Debug] Extracted productCode: "${product.productCode}" for product "${product.name}"`);

            orderItems.push({
                product: product._id,
                name: product.name,
                productCode: product.productCode || '',
                image: product.images[0],
                price: itemPrice,
                quantity: item.quantity,
                size: item.size,
                color: item.color
            });

            // Reduce stock
            product.stock -= item.quantity;
            await product.save();
        }

        const total = subtotal + deliveryFee;

        // Create order
        const order = await Order.create({
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            contactInfo,
            subtotal,
            deliveryFee,
            total,
            paymentMethod: 'COD'
        });

        // Clear user's cart
        const user = await User.findById(req.user._id);
        user.cart = [];
        await user.save();

        await order.populate('user', 'name phone email');

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    }
});

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('deliveryPartner', 'name phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});

// ========== ADMIN ROUTES (must be BEFORE /:id) ==========

// @route   GET /api/orders/admin/all
// @desc    Get all orders (admin)
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('user', 'name phone email')
            .populate('deliveryPartner', 'name phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Define 'Today' timeframe
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 7 Days Ago timeframe for charts
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        // Calculate "Today" stats
        const ordersTodayCount = await Order.countDocuments({ createdAt: { $gte: today } });
        
        // Revenue Today (Count only delivered or placed/accepted orders that aren't cancelled/returned)
        const revenueTodayRecords = await Order.aggregate([
            { $match: { 
                createdAt: { $gte: today },
                status: { $nin: ['Cancelled', 'Returned', 'Return Picked Up', 'Return Accepted'] }
            }},
            { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
        ]);
        const revenueToday = revenueTodayRecords.length > 0 ? revenueTodayRecords[0].totalRevenue : 0;

        const deliveredToday = await Order.countDocuments({ 
            status: 'Delivered', 
            updatedAt: { $gte: today } 
        });

        const cancelledTodayCount = await Order.countDocuments({ 
            status: 'Cancelled', 
            updatedAt: { $gte: today } 
        });

        const pendingCount = await Order.countDocuments({ status: { $in: ['Placed', 'Accepted'] } });

        // Calculate Chart Data (Last 7 Days)
        const dailyStats = await Order.aggregate([
            { $match: { 
                createdAt: { $gte: sevenDaysAgo },
                status: { $nin: ['Cancelled', 'Returned'] }
            }},
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Top Selling Products (Lifetime or Recent)
        const topProducts = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Returned'] } } },
            { $unwind: "$items" },
            { $group: {
                _id: "$items.productCode",
                name: { $first: "$items.name" },
                totalSold: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            }},
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // This Week timeframe
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 6);

        // --- Business Performance: Revenue Stats ---
        const revenueExcluded = ['Cancelled', 'Returned', 'Return Picked Up', 'Return Accepted'];

        const revenueThisWeekRecords = await Order.aggregate([
            { $match: { createdAt: { $gte: weekStart }, status: { $nin: revenueExcluded } } },
            { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
        ]);
        const revenueThisWeek = revenueThisWeekRecords[0]?.totalRevenue || 0;

        const totalRevenueRecords = await Order.aggregate([
            { $match: { status: { $nin: revenueExcluded } } },
            { $group: { _id: null, totalRevenue: { $sum: "$total" }, orderCount: { $sum: 1 } } }
        ]);
        const totalRevenue = totalRevenueRecords[0]?.totalRevenue || 0;
        const totalRevenueOrders = totalRevenueRecords[0]?.orderCount || 1;
        const avgOrderValue = totalRevenue / totalRevenueOrders;

        // --- Product Insights ---
        const totalProducts = await Product.countDocuments();
        const outOfStock = await Product.countDocuments({ stock: 0 });
        const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 5 } });
        const activeProducts = totalProducts - outOfStock;

        // --- Customer Insights ---
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: today }, role: { $ne: 'admin' } });

        // Repeat customers = users with more than 1 order
        const repeatCustomersPipeline = await Order.aggregate([
            { $group: { _id: "$user", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: "repeatCustomers" }
        ]);
        const repeatCustomers = repeatCustomersPipeline[0]?.repeatCustomers || 0;

        const stats = {
            // Today snapshot
            total: await Order.countDocuments(),
            ordersToday: ordersTodayCount,
            revenueToday: revenueToday,
            pending: pendingCount,
            outForDelivery: await Order.countDocuments({ status: 'Out for Delivery' }),
            deliveredToday: deliveredToday,
            cancelledToday: cancelledTodayCount,
            returnRequests: await Order.countDocuments({ 'items.status': 'Return Requested' }),
            exchangeRequests: await Order.countDocuments({ 'items.status': 'Exchange Requested' }),
            // Totals
            totalCancelled: await Order.countDocuments({ status: 'Cancelled' }),
            totalReturned: await Order.countDocuments({ 'items.status': 'Returned' }),
            totalExchanged: await Order.countDocuments({ 'items.status': 'Exchanged' }),
            // Business Performance
            revenueThisWeek,
            totalRevenue,
            avgOrderValue,
            // Product Insights
            totalProducts,
            activeProducts,
            lowStock,
            outOfStock,
            // Customer Insights
            totalUsers,
            newUsersToday,
            repeatCustomers
        };

        const charts = {
            daily: dailyStats,
            topProducts: topProducts.filter(p => p._id)
        };

        res.status(200).json({
            success: true,
            data: orders,
            stats,
            charts
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching orders',
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// @route   PUT /api/orders/admin/:id/status
// @desc    Update order status (admin)
// @access  Private/Admin
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status, note } = req.body;

        const validStatuses = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Exchange Requested', 'Exchange Approved', 'Exchange Completed', 'Exchange Rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Restore stock if the order represents a new 'Cancelled' state
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            console.log(`[Order Cancel] Refunding stock for order ID ${order._id}`);
            for (const item of order.items) {
                if (item.status !== 'Cancelled') {
                    item.status = 'Cancelled';
                    item.cancelledBy = 'Admin';
                    item.cancelledAt = new Date();
                }
                const productId = item.product?._id || item.product;
                console.log(`[Order Cancel] Checking item: ${item.name}, item.product: ${productId}`);
                if (!productId) continue;
                
                const product = await Product.findById(productId);
                if (product) {
                    console.log(`[Order Cancel] Found product ${product.name}. Old stock: ${product.stock}. Refunding +${item.quantity}`);
                    product.stock += item.quantity;
                    await product.save();
                    console.log(`[Order Cancel] New stock saved: ${product.stock}`);
                } else {
                    console.log(`[Order Cancel] Failed to find Product ID: ${productId} in database!`);
                }
            }
        } else if (order.status === 'Cancelled' && status !== 'Cancelled') {
            // If they un-cancel it (e.g. back to Placed), reduce stock again
            console.log(`[Order Un-Cancel] Removing stock for order ID ${order._id}`);
            for (const item of order.items) {
                const productId = item.product?._id || item.product;
                if (!productId) continue;

                const product = await Product.findById(productId);
                if (product) {
                    console.log(`[Order Un-Cancel] Found product ${product.name}. Old stock: ${product.stock}. Withdrawing -${item.quantity}`);
                    product.stock -= item.quantity;
                    if (product.stock < 0) product.stock = 0; // Prevent negative stock
                    await product.save();
                    console.log(`[Order Un-Cancel] New stock saved: ${product.stock}`);
                }
            }
        }

        if (status === 'Exchange Approved' && order.status === 'Exchange Requested') {
            const exchangedItems = order.items.filter(i => i.status === 'Exchange Requested');
            if (exchangedItems.length > 0) {
                const exCount = await Order.countDocuments({ orderId: { $regex: new RegExp(`^${order.orderId}-EX`) } });
                const newOrderId = `${order.orderId}-EX${exCount + 1}`;
                
                const replacementItems = exchangedItems.map(item => ({
                    product: item.product,
                    name: item.name,
                    productCode: item.productCode,
                    image: item.image,
                    price: 0,
                    quantity: item.quantity,
                    size: item.exchangeSize || item.size,
                    color: item.exchangeColor || item.color,
                    status: 'Active'
                }));
                
                const replacementOrder = new Order({
                    orderId: newOrderId,
                    user: order.user,
                    items: replacementItems,
                    shippingAddress: order.shippingAddress,
                    contactInfo: order.contactInfo,
                    subtotal: 0,
                    deliveryFee: 0,
                    total: 0,
                    paymentMethod: order.paymentMethod,
                    status: 'Placed'
                });
                
                await replacementOrder.save();
                
                for (const item of exchangedItems) {
                    item.status = 'Exchanged';
                }
            }
        } else if (status === 'Exchange Rejected' && order.status === 'Exchange Requested') {
            const exchangedItems = order.items.filter(i => i.status === 'Exchange Requested');
            for (const item of exchangedItems) {
                item.status = 'Exchange Rejected';
            }
        }

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note
        });

        await order.save();

        // Auto-assign delivery partner when order becomes Packed
        if (status === 'Packed' && !order.deliveryPartner) {
            autoAssignDeliveryPartner(order._id).catch(e => console.error('[AutoAssign] Failed:', e.message));
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated',
            data: order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
});

// @route   DELETE /api/orders/admin/:id
// @desc    Delete an order (admin)
// @access  Private/Admin
router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting order'
        });
    }
});

// @route   PUT /api/orders/admin/:id/item-status
// @desc    Update specific item status (admin)
// @access  Private/Admin
router.put('/admin/:id/item-status', protect, adminOnly, async (req, res) => {
    try {
        const { itemId, status } = req.body;
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        const now = new Date();

        // Stamp the right timestamp for each status transition
        const timestampMap = {
            'Return Approved':           () => { item.returnApprovedAt = now; },
            'Return Completed':          () => { item.returnCompletedAt = now; },
            'Return Rejected':           () => { item.returnRejectedAt = now; },
            'Exchange Approved':         () => { item.exchangeApprovedAt = now; },
            'Exchange Completed':        () => { item.exchangeCompletedAt = now; },
            'Exchange Rejected':         () => { item.exchangeRejectedAt = now; },
        };
        if (timestampMap[status]) timestampMap[status]();

        item.status = status;

        // Handle stock refunds when a return is formally completed.
        // Exchange completion does not change total stock since the identical item variant count (+1 old, -1 new) nets out to zero.
        if (status === 'Return Completed') {
            const productId = item.product?._id || item.product;
            if (productId) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        }

        await order.save();

        // Auto-assign a delivery partner for return pickups when admin approves
        if (status === 'Return Approved') {
            try {
                await autoAssignDeliveryPartner(order._id, 'Return Pickup');
                console.log(`[Return Auto-Assign] Return pickup task created for order ${order._id}`);
            } catch (assignErr) {
                console.error('[Return Auto-Assign] Failed to assign delivery partner:', assignErr.message);
            }
        }

        res.status(200).json({
            success: true,
            message: `Item status updated to ${status}`,
            data: order
        });
    } catch (error) {
        console.error('Update item status error:', error?.message || error);
        res.status(500).json({ success: false, message: error?.message || 'Error updating item status' });
    }
});

// ========== DYNAMIC ROUTE (must be LAST) ==========

// @route   PUT /api/orders/:id/item-action
// @desc    Customer request to Cancel/Return/Exchange an item
// @access  Private
router.put('/:id/item-action', protect, async (req, res) => {
    try {
        const { itemId, action, reason, exchangeSize, exchangeColor } = req.body;
        const validActions = ['cancel', 'return', 'exchange'];
        
        if (!validActions.includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action request' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Security check
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        if (item.status !== 'Active') {
            return res.status(400).json({ success: false, message: `Item is already marked as ${item.status}` });
        }

        item.actionReason = reason || '';

        // Process based on action
        if (action === 'cancel') {
            if (order.status !== 'Placed' && order.status !== 'Accepted') {
                return res.status(400).json({ success: false, message: 'Order has already progressed beyond cancellation. Please return it instead.'});
            }
            item.status = 'Cancelled';
            item.cancelledBy = 'Customer';
            item.cancelledAt = new Date();
            
            // Refund stock immediately for cancellations
            const productId = item.product?._id || item.product;
            if (productId) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }

            // Auto-cancel the entire order if all items are now cancelled
            const allCancelled = order.items.every(i => i.status === 'Cancelled');
            if (allCancelled && order.status !== 'Cancelled') {
                order.status = 'Cancelled';
                order.statusHistory.push({
                    status: 'Cancelled',
                    timestamp: new Date(),
                    note: 'Auto-cancelled: all items were cancelled by customer.'
                });
            }
        } else if (action === 'return') {
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Only delivered items can be returned.'});
            }

            // Enforce 3-hour limit
            const deliveredStatus = order.statusHistory.find(s => s.status === 'Delivered');
            if (deliveredStatus) {
                const hoursSinceDelivery = (new Date() - new Date(deliveredStatus.timestamp)) / (1000 * 60 * 60);
                if (hoursSinceDelivery >= 3) {
                    return res.status(403).json({ success: false, message: 'Return window expired. Returns are only allowed within 3 hours of delivery.'});
                }
            }

            item.status = 'Return Requested';
            item.returnRequestedAt = new Date();
        } else if (action === 'exchange') {
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Only delivered items can be exchanged.'});
            }

            // Enforce 3-hour limit
            const deliveredStatus = order.statusHistory.find(s => s.status === 'Delivered');
            if (deliveredStatus) {
                const hoursSinceDelivery = (new Date() - new Date(deliveredStatus.timestamp)) / (1000 * 60 * 60);
                if (hoursSinceDelivery >= 3) {
                    return res.status(403).json({ success: false, message: 'Exchange window expired. Exchanges are only allowed within 3 hours of delivery.'});
                }
            }

            item.status = 'Exchange Requested';
            item.exchangeRequestedAt = new Date();
            item.exchangeSize = exchangeSize || '';
            item.exchangeColor = exchangeColor || '';

            if (order.status !== 'Exchange Requested') {
                order.status = 'Exchange Requested';
                order.statusHistory.push({
                    status: 'Exchange Requested',
                    timestamp: new Date(),
                    note: 'Customer requested an exchange for one or more items.'
                });
            }
        }

        await order.save();
        res.status(200).json({
            success: true,
            message: `Item ${action} processed successfully!`,
            data: order
        });

    } catch (error) {
        console.error('Item action error:', error);
        res.status(500).json({ success: false, message: 'Error processing item request' });
    }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name phone email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Ensure user owns this order or is admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order'
        });
    }
});

export default router;
