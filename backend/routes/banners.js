import express from 'express';
import Banner from '../models/Banner.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/banners
// @desc    Get active banners
// @access  Public
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: banners
        });
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching banners'
        });
    }
});

// @route   POST /api/banners
// @desc    Create banner
// @access  Private/Admin
router.post('/', protect, adminOnly, uploadSingle, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        const bannerData = {
            ...req.body,
            image: req.file.path
        };

        const banner = await Banner.create(bannerData);

        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            data: banner
        });
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating banner'
        });
    }
});

// @route   PUT /api/banners/:id
// @desc    Update banner
// @access  Private/Admin
router.put('/:id', protect, adminOnly, uploadSingle, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        const updateData = req.file ?
            { ...req.body, image: req.file.path } :
            req.body;

        Object.assign(banner, updateData);
        await banner.save();

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            data: banner
        });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating banner'
        });
    }
});

// @route   DELETE /api/banners/:id
// @desc    Delete banner
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        await banner.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting banner'
        });
    }
});

export default router;
