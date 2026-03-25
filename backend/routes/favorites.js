import express from 'express';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const annotateShops = async (shops) => {
    return await Promise.all(shops.map(async shop => {
        const obj = shop.toObject ? shop.toObject() : shop;
        try {
            const lowestProduct = await Product.findOne({ seller: obj._id, isActive: true, stock: { $gt: 0 } })
                .sort({ sellingPrice: 1 })
                .populate('category', 'name')
                .lean();

            if (lowestProduct) {
                obj.startingPrice = lowestProduct.sellingPrice || lowestProduct.price;
                obj.startingCategory = lowestProduct.category ? lowestProduct.category.name : 'Items';
            }
        } catch (err) {
            console.error('Error fetching lowest product for favorite shop:', err);
        }
        return obj;
    }));
};

// @route   GET /api/favorites
// @desc    Get user favorite shops
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('favoriteShops', 'shopName shopAddress bannerImage shopLogo rating distanceText durationText');

        const annotatedShops = await annotateShops(user.favoriteShops);

        res.status(200).json({
            success: true,
            data: annotatedShops
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching favorite shops'
        });
    }
});

// @route   POST /api/favorites
// @desc    Add shop to favorites
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { sellerId } = req.body;

        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide seller ID'
            });
        }

        const seller = await Seller.findById(sellerId);

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        const user = await User.findById(req.user._id);

        // Check if already in favorites
        if (user.favoriteShops.includes(sellerId)) {
            return res.status(400).json({
                success: false,
                message: 'Shop already in favorites'
            });
        }

        user.favoriteShops.push(sellerId);
        await user.save();
        await user.populate('favoriteShops', 'shopName shopAddress bannerImage shopLogo rating distanceText durationText');

        const annotatedShops = await annotateShops(user.favoriteShops);

        res.status(200).json({
            success: true,
            message: 'Shop added to favorites',
            data: annotatedShops
        });
    } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to favorites'
        });
    }
});

// @route   DELETE /api/favorites/:sellerId
// @desc    Remove shop from favorites
// @access  Private
router.delete('/:sellerId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.favoriteShops = user.favoriteShops.filter(
            id => id.toString() !== req.params.sellerId
        );

        await user.save();
        await user.populate('favoriteShops', 'shopName shopAddress bannerImage shopLogo rating distanceText durationText');

        const annotatedShops = await annotateShops(user.favoriteShops);

        res.status(200).json({
            success: true,
            message: 'Shop removed from favorites',
            data: annotatedShops
        });
    } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from favorites'
        });
    }
});

export default router;
