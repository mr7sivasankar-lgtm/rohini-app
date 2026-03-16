import express from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import { protect, adminOnly, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id, role: 'seller' }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Seller Middleware
const sellerProtect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'seller') {
                return res.status(401).json({ success: false, message: 'Not authorized as seller' });
            }
            req.seller = await Seller.findById(decoded.id);
            if (!req.seller) return res.status(401).json({ success: false, message: 'Seller not found' });
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Register a new seller
// @route   POST /api/sellers/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { shopName, ownerName, phone, password, shopAddress, latitude, longitude, businessCategory, gstNumber } = req.body;

        const sellerExists = await Seller.findOne({ phone });
        if (sellerExists) return res.status(400).json({ success: false, message: 'Seller phone already registered' });

        const seller = await Seller.create({
            shopName,
            ownerName,
            phone,
            password,
            shopAddress,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude] // GeoJSON format: Longitude first
            },
            businessCategory,
            gstNumber
        });

        if (seller) {
            res.status(201).json({
                success: true,
                message: 'Seller registered successfully. Waiting for admin approval.',
                data: {
                    _id: seller._id,
                    shopName: seller.shopName,
                    status: seller.status
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid seller data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Auth seller & get token
// @route   POST /api/sellers/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const seller = await Seller.findOne({ phone }).select('+password');

        if (seller && (await seller.matchPassword(password))) {
            res.json({
                success: true,
                data: {
                    _id: seller._id,
                    shopName: seller.shopName,
                    ownerName: seller.ownerName,
                    phone: seller.phone,
                    status: seller.status,
                    token: generateToken(seller._id)
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid phone or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get seller profile
// @route   GET /api/sellers/profile
// @access  Private (Seller)
router.get('/profile', sellerProtect, async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);
        if (seller) res.json({ success: true, data: seller });
        else res.status(404).json({ success: false, message: 'Seller not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update seller profile
// @route   PUT /api/sellers/profile
// @access  Private (Seller)
router.put('/profile', sellerProtect, async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);

        if (seller) {
            seller.shopName = req.body.shopName || seller.shopName;
            seller.ownerName = req.body.ownerName || seller.ownerName;
            seller.shopAddress = req.body.shopAddress || seller.shopAddress;
            seller.bannerImage = req.body.bannerImage || seller.bannerImage;
            seller.description = req.body.description || seller.description;
            if (req.body.isOpen !== undefined) seller.isOpen = req.body.isOpen;

            if (req.body.latitude && req.body.longitude) {
                seller.location.coordinates = [req.body.longitude, req.body.latitude];
            }

            if (req.body.password) {
                seller.password = req.body.password;
            }

            const updatedSeller = await seller.save();

            res.json({
                success: true,
                data: updatedSeller
            });
        } else {
            res.status(404).json({ success: false, message: 'Seller not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// -------------------------------------------------------------
// PUBLIC DISCOVERY APIS FOR CUSTOMER APP
// -------------------------------------------------------------

// @desc    Get nearby shops
// @route   GET /api/sellers/nearby?lat=&lng=&radius=
// @access  Public
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10000, limit = 20 } = req.query; // Default 10km radius

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Please provide latitude and longitude' });
        }

        const shops = await Seller.find({
            status: 'Approved',
            isOpen: true,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        }).limit(parseInt(limit));

        res.json({ success: true, data: shops });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get top rated shops
// @route   GET /api/sellers/top-rated
// @access  Public
router.get('/top-rated', async (req, res) => {
    try {
        const shops = await Seller.find({ status: 'Approved', isOpen: true })
            .sort({ rating: -1, numReviews: -1 })
            .limit(10);
        res.json({ success: true, data: shops });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get single shop profile
// @route   GET /api/sellers/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const shop = await Seller.findById(req.params.id);
        if (!shop || shop.status !== 'Approved') {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }
        res.json({ success: true, data: shop });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// -------------------------------------------------------------
// ADMIN APIS
// -------------------------------------------------------------

// @desc    Get all sellers (Admin)
// @route   GET /api/sellers/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const sellers = await Seller.find({}).sort({ createdAt: -1 });
        res.json({ success: true, data: sellers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update seller status (Approve/Reject)
// @route   PUT /api/sellers/admin/:id/status
// @access  Private (Admin)
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const seller = await Seller.findById(req.params.id);

        if (seller) {
            seller.status = status;
            await seller.save();
            res.json({ success: true, data: seller });
        } else {
            res.status(404).json({ success: false, message: 'Seller not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export { sellerProtect };
export default router;
