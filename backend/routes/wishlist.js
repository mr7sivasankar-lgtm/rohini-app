import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/wishlist
// @desc    Get user wishlist
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('wishlist', 'name images price discount stock');

        res.status(200).json({
            success: true,
            data: user.wishlist
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist'
        });
    }
});

// @route   POST /api/wishlist
// @desc    Add product to wishlist
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide product ID'
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const user = await User.findById(req.user._id);

        // Check if already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        user.wishlist.push(productId);
        await user.save();
        await user.populate('wishlist', 'name images price discount stock');

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist',
            data: user.wishlist
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist'
        });
    }
});

// @route   DELETE /api/wishlist/:productId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.wishlist = user.wishlist.filter(
            id => id.toString() !== req.params.productId
        );

        await user.save();
        await user.populate('wishlist', 'name images price discount stock');

        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist',
            data: user.wishlist
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from wishlist'
        });
    }
});

export default router;
