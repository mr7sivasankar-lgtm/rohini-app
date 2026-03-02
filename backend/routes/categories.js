import express from 'express';
import Category from '../models/Category.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { gender } = req.query;

        const query = { isActive: true };
        if (gender) query.gender = { $in: [gender, 'Both'] };

        const categories = await Category.find(query)
            .populate('parentCategory', 'name')
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
});

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parentCategory', 'name');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category'
        });
    }
});

// @route   POST /api/categories
// @desc    Create category
// @access  Private/Admin
router.post('/', protect, adminOnly, uploadSingle, async (req, res) => {
    try {
        const categoryData = req.file ?
            { ...req.body, image: `/uploads/${req.file.filename}` } :
            req.body;

        const category = await Category.create(categoryData);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category'
        });
    }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put('/:id', protect, adminOnly, uploadSingle, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const updateData = req.file ?
            { ...req.body, image: `/uploads/${req.file.filename}` } :
            req.body;

        Object.assign(category, updateData);
        await category.save();

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category'
        });
    }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.isActive = false;
        await category.save();

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category'
        });
    }
});

export default router;
