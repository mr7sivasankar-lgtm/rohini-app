import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';

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
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const stats = {
            total: await Order.countDocuments(),
            placed: await Order.countDocuments({ status: 'Placed' }),
            accepted: await Order.countDocuments({ status: 'Accepted' }),
            packed: await Order.countDocuments({ status: 'Packed' }),
            outForDelivery: await Order.countDocuments({ status: 'Out for Delivery' }),
            delivered: await Order.countDocuments({ status: 'Delivered' }),
            cancelled: await Order.countDocuments({ status: 'Cancelled' }),
            returnRequests: await Order.countDocuments({ 'items.status': 'Return Requested' }),
            exchangeRequests: await Order.countDocuments({ 'items.status': 'Exchange Requested' }),
            returned: await Order.countDocuments({ 'items.status': 'Returned' }),
            exchanged: await Order.countDocuments({ 'items.status': 'Exchanged' })
        };

        res.status(200).json({
            success: true,
            data: orders,
            stats
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});

// @route   PUT /api/orders/admin/:id/status
// @desc    Update order status (admin)
// @access  Private/Admin
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status, note } = req.body;

        const validStatuses = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

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

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note
        });

        await order.save();

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

        // Handle stock refunds for admin approvals
        if (status === 'Returned' && item.status !== 'Returned') {
            const productId = item.product?._id || item.product;
            if (productId) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        } // Exchanges usually mean they send the old one back and we send a new one, net 0 stock impact.

        item.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Item status updated to ${status}`,
            data: order
        });
    } catch (error) {
        console.error('Update item status error:', error);
        res.status(500).json({ success: false, message: 'Error updating item status' });
    }
});

// ========== DYNAMIC ROUTE (must be LAST) ==========

// @route   PUT /api/orders/:id/item-action
// @desc    Customer request to Cancel/Return/Exchange an item
// @access  Private
router.put('/:id/item-action', protect, async (req, res) => {
    try {
        const { itemId, action, reason } = req.body;
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
            
            // Refund stock immediately for cancellations
            const productId = item.product?._id || item.product;
            if (productId) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        } else if (action === 'return') {
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Item can only be returned after delivery.' });
            }
            item.status = 'Return Requested';
        } else if (action === 'exchange') {
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Item can only be exchanged after delivery.' });
            }
            item.status = 'Exchange Requested';
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
