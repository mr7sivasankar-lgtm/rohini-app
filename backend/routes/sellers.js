import express from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import sendOTP from '../utils/sms.js';
import { upload, uploadSingle } from '../middleware/upload.js';

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

// @route   POST /api/sellers/upload-image
// @desc    Upload a single image (banner/logo) to Cloudinary
// @access  Private/Seller
router.post('/upload-image', sellerProtect, uploadSingle, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }
        res.status(200).json({ success: true, url: req.file.path });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ success: false, message: 'Error uploading image' });
    }
});

// @desc    Send OTP to seller phone for verification
// @route   POST /api/sellers/send-otp
// @access  Public
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Please provide phone number' });

        // Check if seller already registered
        const existing = await Seller.findOne({ phone });
        if (existing && existing.isPhoneVerified && existing.password) {
            return res.status(400).json({ success: false, message: 'Seller with this phone already registered. Please login.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes

        // Store OTP temporarily on seller doc (or create temp record)
        if (existing) {
            await Seller.findByIdAndUpdate(existing._id, { otp, otpExpiry }, { new: true });
        } else {
            // We don't create seller yet — just send OTP; store in memory via a temp object
            // Use a simple in-memory cache (Seller doc will be created on register)
        }

        // Send OTP
        const smsSent = await sendOTP(phone, otp);

        // In dev mode without Twilio, just log it
        console.log(`📱 Seller OTP for ${phone}: ${otp}`);

        res.json({ success: true, message: smsSent ? 'OTP sent successfully' : 'OTP logged to console (dev mode)', otp: process.env.NODE_ENV !== 'production' ? otp : undefined });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Verify OTP before registration
// @route   POST /api/sellers/verify-otp
// @access  Public  
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Check for an existing seller with this OTP
        const seller = await Seller.findOne({ phone }).select('+otp +otpExpiry');

        // For new sellers: OTP was sent & we stored it; for existing pending sellers check it
        if (seller) {
            if (!seller.otp || seller.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }
            if (seller.otpExpiry < Date.now()) {
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
            }
            await Seller.findByIdAndUpdate(seller._id, { isPhoneVerified: true, otp: null, otpExpiry: null });
        }
        // If no existing seller, OTP was stored in-session; frontend just verifies against what was returned (dev)
        // In production, store OTP in Redis/DB before verification

        res.json({ success: true, message: 'Phone verified successfully', data: { phone, verified: true } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Register a new seller
// @route   POST /api/sellers/register
// @access  Public
router.post('/register', upload.single('shopLogo'), async (req, res) => {
    try {
        const { shopName, ownerName, phone, password, shopAddress, latitude, longitude, shopCategory, gstNumber, openingTime, closingTime } = req.body;

        const sellerExists = await Seller.findOne({ phone });
        if (sellerExists && sellerExists.password) return res.status(400).json({ success: false, message: 'Seller phone already registered' });

        const locationData = (latitude && longitude)
            ? { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }
            : undefined;

        const sellerData = {
            shopName, ownerName, phone, password, shopAddress,
            shopCategory: shopCategory || 'Mixed Fashion Store',
            gstNumber, openingTime, closingTime,
            isPhoneVerified: true,
            ...(locationData && { location: locationData }),
            ...(req.file && { shopLogo: req.file.path }), // req.file.path holds the Cloudinary URL
        };

        let seller;
        if (sellerExists) {
            // Update the pending record
            seller = await Seller.findByIdAndUpdate(sellerExists._id, sellerData, { new: true });
        } else {
            seller = await Seller.create(sellerData);
        }

        res.status(201).json({
            success: true,
            message: 'Seller registered successfully. Waiting for admin approval.',
            data: {
                _id: seller._id,
                shopName: seller.shopName,
                status: seller.status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Auth seller & get token (password)
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

// @desc    Send OTP for seller login (passwordless)
// @route   POST /api/sellers/login-otp
// @access  Public
router.post('/login-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // If OTP not provided → send OTP
        if (!otp) {
            const seller = await Seller.findOne({ phone });
            if (!seller) {
                return res.status(404).json({ success: false, message: 'No seller account found with this phone number.' });
            }

            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60000);

            await Seller.findByIdAndUpdate(seller._id, { otp: generatedOtp, otpExpiry });

            const smsSent = await sendOTP(phone, generatedOtp);
            console.log(`📱 Seller Login OTP for ${phone}: ${generatedOtp}`);

            return res.json({
                success: true,
                message: smsSent ? 'OTP sent successfully' : 'OTP logged to console (dev mode)',
                otp: process.env.NODE_ENV !== 'production' ? generatedOtp : undefined
            });
        }

        // OTP provided → verify and login
        const seller = await Seller.findOne({ phone }).select('+otp +otpExpiry');
        if (!seller) {
            return res.status(404).json({ success: false, message: 'Seller not found' });
        }
        if (!seller.otp || seller.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        if (seller.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        // Clear OTP and return token
        await Seller.findByIdAndUpdate(seller._id, { otp: null, otpExpiry: null });

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

// @desc    Get all reviews for seller's products
// @route   GET /api/sellers/my/reviews
// @access  Private (Seller)
router.get('/my/reviews', sellerProtect, async (req, res) => {
    try {
        // Find all products owned by this seller
        const mongoose = await import('mongoose');
        const Product = mongoose.models.Product || mongoose.model('Product');
        const Review = mongoose.models.Review || (await import('../models/Review.js')).default;

        const products = await Product.find({ seller: req.seller._id }).select('_id name');
        const productIds = products.map(p => p._id);

        // Find all reviews for those products
        const reviews = await Review.find({ product: { $in: productIds } })
            .populate('user', 'name')
            .populate('product', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
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
            if (req.body.logoImage !== undefined) seller.logoImage = req.body.logoImage;
            // Handle both 'description' and 'shopDescription' field names
            seller.description = req.body.description || req.body.shopDescription || seller.description;
            // Handle both 'gstNumber' and 'gstin' field names
            if (req.body.gstNumber !== undefined) seller.gstNumber = req.body.gstNumber;
            if (req.body.gstin !== undefined) seller.gstNumber = req.body.gstin;
            if (req.body.isOpen !== undefined) seller.isOpen = req.body.isOpen;
            if (req.body.deliveryRadius !== undefined) seller.deliveryRadius = Number(req.body.deliveryRadius);
            if (req.body.minOrderAmount !== undefined) seller.minOrderAmount = Number(req.body.minOrderAmount);
            if (req.body.shopCategory) seller.shopCategory = req.body.shopCategory;
            if (req.body.openingTime) seller.openingTime = req.body.openingTime;
            if (req.body.closingTime) seller.closingTime = req.body.closingTime;

            if (req.body.location && req.body.location.coordinates) {
                seller.location.coordinates = req.body.location.coordinates;
                seller.location.type = 'Point';
            } else if (req.body.latitude && req.body.longitude) {
                seller.location.coordinates = [req.body.longitude, req.body.latitude];
                seller.location.type = 'Point';
            }

            if (req.body.password) {
                seller.password = req.body.password;
            }

            const updatedSeller = await seller.save();

            res.json({
                success: true,
                message: 'Profile updated successfully',
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

// Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @desc    Get nearby shops
// @route   GET /api/sellers/nearby?lat=&lng=&radius=
// @access  Public
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10000, limit = 20 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Please provide latitude and longitude' });
        }

        const customerLat = parseFloat(lat);
        const customerLng = parseFloat(lng);

        const shops = await Seller.find({
            status: 'Approved',
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [customerLng, customerLat]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        }).limit(parseInt(limit));

        // Annotate each shop with distance_km and delivery_mins
        const DELIVERY_SPEED_KMPH = 20;
        const annotated = shops.map(shop => {
            const obj = shop.toObject();
            if (shop.location && shop.location.coordinates && shop.location.coordinates.length === 2) {
                const [shopLng, shopLat] = shop.location.coordinates;
                const km = haversineKm(customerLat, customerLng, shopLat, shopLng);
                obj.distance_km = Math.round(km * 10) / 10;
                obj.delivery_mins = Math.ceil((km / DELIVERY_SPEED_KMPH) * 60);
            }
            return obj;
        });

        res.json({ success: true, data: annotated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get top rated shops (Admin Featured + Auto Qualifying)
// @route   GET /api/sellers/top-rated
// @access  Public
router.get('/top-rated', async (req, res) => {
    try {
        // 1. Get all manually featured shops
        const featuredShops = await Seller.find({
            status: 'Approved',
            isOpen: true,
            is_featured: true
        }).lean();

        // 2. Get auto-qualifying shops (Rating >= 4.0 and at least 5 reviews)
        const autoShops = await Seller.find({
            status: 'Approved',
            isOpen: true,
            is_featured: { $ne: true }, // Don't pull duplicates
            rating: { $gte: 4.0 },
            numReviews: { $gte: 5 }
        })
            .sort({ rating: -1, numReviews: -1 })
            .lean();

        // 3. Merge and limit to 6
        const mergedShops = [...featuredShops, ...autoShops].slice(0, 6);

        res.json({ success: true, data: mergedShops });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get single shop profile & increment profile views
// @route   GET /api/sellers/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const shop = await Seller.findByIdAndUpdate(
            req.params.id,
            { $inc: { profileViews: 1 } },
            { new: true }
        );
        
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
