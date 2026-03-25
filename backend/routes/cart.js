import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({ path: 'cart.product', select: 'name images sellingPrice mrpPrice discount stock colors sizes', populate: { path: 'seller', select: 'shopName location' } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user.cart
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart'
        });
    }
});

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Please provide product ID and quantity'
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }

        const user = await User.findById(req.user._id);

        // Enforce single-shop per cart
        if (user.cart.length > 0) {
            // Find the seller of the first item currently in the cart
            const firstCartItemProduct = await Product.findById(user.cart[0].product);
            
            // If the existing cart item's seller doesn't match the new product's seller, block it
            if (firstCartItemProduct && firstCartItemProduct.seller.toString() !== product.seller.toString()) {
                return res.status(400).json({
                    success: false,
                    message: `You already have items from another shop in your cart. Please clear your cart to add items from ${product.name}'s shop.`
                });
            }
        }

        // Check if item already in cart
        const existingItemIndex = user.cart.findIndex(
            item => item.product.toString() === productId &&
                item.size === size &&
                item.color === color
        );

        if (existingItemIndex > -1) {
            // Update quantity
            const newQuantity = user.cart[existingItemIndex].quantity + quantity;

            if (product.stock < newQuantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock'
                });
            }

            user.cart[existingItemIndex].quantity = newQuantity;
        } else {
            // Add new item
            user.cart.push({
                product: productId,
                quantity,
                size,
                color
            });
        }

        await user.save();
        await user.populate({ path: 'cart.product', select: 'name images sellingPrice mrpPrice discount stock colors sizes', populate: { path: 'seller', select: 'shopName location' } });

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            data: user.cart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to cart'
        });
    }
});

// @route   PUT /api/cart/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/:itemId', protect, async (req, res) => {
    try {
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        const user = await User.findById(req.user._id);
        const cartItem = user.cart.id(req.params.itemId);

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        const product = await Product.findById(cartItem.product);

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }

        cartItem.quantity = quantity;
        await user.save();
        await user.populate({ path: 'cart.product', select: 'name images sellingPrice mrpPrice discount stock colors sizes', populate: { path: 'seller', select: 'shopName location' } });

        res.status(200).json({
            success: true,
            message: 'Cart updated',
            data: user.cart
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating cart'
        });
    }
});

// @route   DELETE /api/cart/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/:itemId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.cart = user.cart.filter(item => item._id.toString() !== req.params.itemId);
        await user.save();
        await user.populate({ path: 'cart.product', select: 'name images sellingPrice mrpPrice discount stock colors sizes', populate: { path: 'seller', select: 'shopName location' } });

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: user.cart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from cart'
        });
    }
});

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.cart = [];
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Cart cleared'
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing cart'
        });
    }
});

export default router;
