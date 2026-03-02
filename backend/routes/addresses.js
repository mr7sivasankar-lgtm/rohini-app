import express from 'express';
import Address from '../models/Address.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/addresses
// @desc    Get all addresses for logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const addresses = await Address.find({ userId: req.user._id })
            .sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: addresses
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch addresses'
        });
    }
});

// @route   POST /api/addresses
// @desc    Create new address
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, street, landmark, city, state, pincode, phone, addressType, isDefault } = req.body;

        // Validation
        if (!name || !street || !city || !state || !pincode || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const address = await Address.create({
            userId: req.user._id,
            name,
            street,
            landmark,
            city,
            state,
            pincode,
            phone,
            addressType: addressType || 'Home',
            isDefault: isDefault || false
        });

        res.status(201).json({
            success: true,
            data: address,
            message: 'Address added successfully'
        });
    } catch (error) {
        console.error('Error creating address:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create address'
        });
    }
});

// @route   PUT /api/addresses/:id
// @desc    Update address
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const { name, street, landmark, city, state, pincode, phone, addressType, isDefault } = req.body;

        // Update fields
        if (name) address.name = name;
        if (street) address.street = street;
        if (landmark !== undefined) address.landmark = landmark;
        if (city) address.city = city;
        if (state) address.state = state;
        if (pincode) address.pincode = pincode;
        if (phone) address.phone = phone;
        if (addressType) address.addressType = addressType;
        if (isDefault !== undefined) address.isDefault = isDefault;

        await address.save();

        res.json({
            success: true,
            data: address,
            message: 'Address updated successfully'
        });
    } catch (error) {
        console.error('Error updating address:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update address'
        });
    }
});

// @route   PUT /api/addresses/:id/default
// @desc    Set address as default
// @access  Private
router.put('/:id/default', protect, async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Set this address as default (pre-save hook will unset others)
        address.isDefault = true;
        await address.save();

        res.json({
            success: true,
            data: address,
            message: 'Default address updated'
        });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set default address'
        });
    }
});

// @route   DELETE /api/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        await address.deleteOne();

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
});

export default router;
