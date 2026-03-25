import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protect, adminOnly, sellerOrAdmin } from '../middleware/auth.js';
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
            sort, minPrice, maxPrice, sizes, colors, inStock, sellerId
        } = req.query;

        const query = { isActive: true };

        if (sellerId) query.seller = sellerId;
        if (category) query.category = category;
        if (gender) query.gender = gender;
        if (featured) query.featured = true;
        
        // Advanced Filters
        if (minPrice || maxPrice) {
            query.sellingPrice = {};
            if (minPrice) query.sellingPrice.$gte = Number(minPrice);
            if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
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
        if (sort === 'price_asc') sortObj = { sellingPrice: 1 };
        else if (sort === 'price_desc') sortObj = { sellingPrice: -1 };
        else if (sort === 'popularity') sortObj = { bestSeller: -1, trending: -1, createdAt: -1 };

        const products = await Product.find(query)
            .populate('category', 'name gender')
            .populate('subcategory', 'name')
            .populate('seller', 'shopName')
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
router.post('/', sellerOrAdmin, uploadMultiple, async (req, res) => {
    try {
        const productData = JSON.parse(req.body.data);

        // Determine seller: If uploaded by a seller, set to their ID.
        // If uploaded by an admin, the admin must provide the seller ID in the form data.
        if (req.seller) {
            productData.seller = req.seller._id;
        } else if (req.user && req.user.role === 'admin' && !productData.seller) {
            return res.status(400).json({ success: false, message: 'Admin must specify a seller when creating a product' });
        }

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
// @access  Private/Admin or Seller
router.put('/:id', sellerOrAdmin, uploadMultiple, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Ensure sellers can only update their own products
        if (req.seller && product.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
        }

        const productData = JSON.parse(req.body.data);

        // Security: Prevent sellers from changing the product's owner
        if (req.seller) {
            delete productData.seller;
        }

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
// @route   PUT /api/products/:id/toggle
// @desc    Toggle product active (visible/hidden) status
// @access  Private/Admin or Seller
router.put('/:id/toggle', sellerOrAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Sellers can only toggle their own products
        if (req.seller && product.seller?.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
        }

        // Use findByIdAndUpdate to skip schema validation
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: !product.isActive },
            { new: true, runValidators: false }
        );

        res.status(200).json({
            success: true,
            message: `Product ${updated.isActive ? 'shown to' : 'hidden from'} customers`,
            data: updated
        });
    } catch (error) {
        console.error('Toggle product status error:', error);
        res.status(500).json({ success: false, message: 'Error updating product status' });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product — soft delete for sellers, hard delete for admin (pass ?hard=true)
// @access  Private/Admin or Seller
router.delete('/:id', sellerOrAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Sellers can only delete their own products
        if (req.seller && product.seller?.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
        }

        // Admin can hard-delete; sellers soft-delete
        const isAdmin = !req.seller && req.user?.role === 'admin';
        if (isAdmin && req.query.hard === 'true') {
            await Product.findByIdAndDelete(req.params.id);
            return res.status(200).json({ success: true, message: 'Product permanently deleted' });
        }

        // Soft delete — use update to skip validators
        await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { runValidators: false }
        );

        res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

export default router;
