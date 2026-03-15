import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadMultiple, cloudinary } from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filters
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { 
            category, gender, search, featured, limit = 20, page = 1,
            sort, minPrice, maxPrice, sizes, colors, inStock
        } = req.query;

        const query = { isActive: true };

        if (category) query.category = category;
        if (gender) query.gender = gender;
        if (featured) query.featured = true;
        
        // Advanced Filters
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (sizes) {
            const sizesArray = sizes.split(',').map(s => s.trim());
            // Case-insensitive regex match for each size
            query.sizes = { $in: sizesArray.map(s => new RegExp(`^${s}$`, 'i')) };
        }
        if (colors) {
            const colorsArray = colors.split(',').map(c => c.trim());
            // Case-insensitive regex match for each color
            query.colors = { $in: colorsArray.map(c => new RegExp(`^${c}$`, 'i')) };
        }
        if (inStock === 'true') {
            query.stock = { $gt: 0 };
        }

        if (search) {
            // Split compound terms like "Kurtis & Tunics" into individual keywords
            const keywords = search
                .split(/[\s&,]+/)
                .map(w => w.trim())
                .filter(w => w.length >= 2);

            if (keywords.length > 0) {
                // Escape special regex chars
                const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Build fuzzy pattern: vowels interchangeable, trailing s optional, allow extra chars
                const makeFuzzy = (word) => {
                    let fuzzy = '';
                    for (let i = 0; i < word.length; i++) {
                        const ch = word[i].toLowerCase();
                        if ('aeiouy'.includes(ch)) {
                            fuzzy += '[aeiouy]';
                        } else {
                            fuzzy += escape(word[i]);
                            // Allow an optional vowel after consonants (handles missing vowels like "shrt" -> "shirt")
                            if (i < word.length - 1 && !'aeiouy'.includes(word[i + 1].toLowerCase())) {
                                fuzzy += '[aeiouy]?';
                            }
                        }
                    }
                    fuzzy += 's?'; // trailing s is optional
                    return fuzzy;
                };

                // Exact pattern for direct matches
                const exactPattern = keywords.map(k => escape(k)).join('|');
                const exactRegex = new RegExp(exactPattern, 'i');

                // Fuzzy pattern for typo-tolerant matches
                const fuzzyPattern = keywords.map(k => makeFuzzy(k)).join('|');
                const fuzzyRegex = new RegExp(fuzzyPattern, 'i');

                // Find categories matching either exact or fuzzy
                const matchingCategories = await Category.find({
                    $or: [{ name: exactRegex }, { name: fuzzyRegex }]
                }).select('_id');
                const categoryIds = matchingCategories.map(c => c._id);

                const orConditions = [
                    { name: exactRegex },
                    { name: fuzzyRegex },
                    { description: exactRegex },
                    { brand: exactRegex },
                    { brand: fuzzyRegex }
                ];

                // Also include products belonging to matching categories
                if (categoryIds.length > 0) {
                    orConditions.push({ category: { $in: categoryIds } });
                    orConditions.push({ subcategory: { $in: categoryIds } });
                }

                query.$or = orConditions;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Sorting Logic
        let sortObj = { createdAt: -1 }; // Default: Newest first
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };
        else if (sort === 'popularity') sortObj = { bestSeller: -1, trending: -1, createdAt: -1 };

        const products = await Product.find(query)
            .populate('category', 'name gender')
            .populate('subcategory', 'name')
            .limit(parseInt(limit))
            .skip(skip)
            .sort(sortObj);

        const total = await Product.countDocuments(query);

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name gender')
            .populate('subcategory', 'name');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product'
        });
    }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private/Admin
const debugLog = (msg) => {
    try { fs.appendFileSync(path.join(process.cwd(), 'test.log'), new Date().toISOString() + ' ' + msg + '\n'); } catch (e) { }
};

router.post('/', protect, adminOnly, (req, res, next) => {
    debugLog('Hit generic log middleware');
    next();
}, uploadMultiple, async (req, res) => {
    debugLog('Multer passed');
    try {
        debugLog('Parsing JSON');
        const productData = JSON.parse(req.body.data);
        debugLog('JSON Parsed');

        // Get uploaded image URLs from Cloudinary
        const images = req.files ? req.files.map(file => file.path) : [];

        const product = await Product.create({
            ...productData,
            images
        });

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        console.error('Create product error:', error);
        try {
            const logPath = path.join(process.cwd(), 'error.log');
            const logEntry = `\n[${new Date().toISOString()}] Error creating product:\n${error.stack}\nRequest Body Data: ${req.body.data}\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (err) {
            console.error('Failed to write to error log:', err);
        }
        res.status(500).json({
            success: false,
            message: 'Error creating product'
        });
    }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', protect, adminOnly, uploadMultiple, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const productData = JSON.parse(req.body.data);

        // Handle removed images - delete from Cloudinary
        if (productData.removedImages && productData.removedImages.length > 0) {
            for (const imgPath of productData.removedImages) {
                try {
                    // Extract Cloudinary public ID from URL
                    if (imgPath.includes('cloudinary.com')) {
                        const parts = imgPath.split('/');
                        const folderAndFile = parts.slice(parts.indexOf('upload') + 2).join('/');
                        const publicId = folderAndFile.replace(/\.[^.]+$/, '');
                        await cloudinary.uploader.destroy(publicId);
                    }
                } catch (err) {
                    console.error('Error deleting image from Cloudinary:', err);
                }
            }
            // Filter out removed images from existing product images
            product.images = product.images.filter(img => !productData.removedImages.includes(img));
            delete productData.removedImages;
        }

        // If new images uploaded, add them
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            productData.images = [...(product.images || []), ...newImages];
        } else if (!productData.removedImages) {
            // Keep existing images if no new ones uploaded and no removals
            productData.images = product.images;
        }

        // Clean removedImages from payload before saving
        delete productData.removedImages;

        Object.assign(product, productData);
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product (soft delete)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.isActive = false;
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
});

export default router;
