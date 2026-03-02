import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone number
// @access  Public
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone number'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES) * 60000);

        // Find or create user
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                phone,
                name: 'User', // Default name, can be updated later
                otp,
                otpExpiry
            });
        } else {
            user.otp = otp;
            user.otpExpiry = otpExpiry;
            await user.save();
        }

        // In production, send OTP via SMS service (Twilio/MSG91)
        // For development, just log it
        console.log(`OTP for ${phone}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                phone,
                // Remove this when real SMS is implemented!
                otp: otp
            }
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP'
        });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone number and OTP'
            });
        }

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if OTP is expired
        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Mark user as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying OTP'
        });
    }
});

// @route   POST /api/auth/admin-login
// @desc    Admin login with password
// @access  Public
router.post('/admin-login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone and password'
            });
        }

        // Check if it's the admin phone
        if (phone !== process.env.ADMIN_PHONE) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Simple password check (in production, use hashed passwords)
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Find or create admin user
        let admin = await User.findOne({ phone, role: 'admin' });

        if (!admin) {
            admin = await User.create({
                phone,
                name: 'Admin',
                role: 'admin',
                isVerified: true
            });
        }

        const token = generateToken(admin._id);

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            data: {
                token,
                user: {
                    id: admin._id,
                    name: admin.name,
                    phone: admin.phone,
                    role: admin.role
                }
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during admin login'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-otp -otpExpiry')
            .populate('wishlist', 'name images price discount')
            .populate('cart.product', 'name images price discount stock');

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data'
        });
    }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) {
            // Check if phone number is already taken by another user
            const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already in use'
                });
            }
            user.phone = phone;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

export default router;
