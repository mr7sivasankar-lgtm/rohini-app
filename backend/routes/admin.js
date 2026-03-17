import express from 'express';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/admin/locations
// @desc    Get all user and seller locations for the admin map view
// @access  Private/Admin
router.get('/locations', protect, adminOnly, async (req, res) => {
    try {
        // Fetch users with valid saved addresses that have coordinates
        const users = await User.find({ 'addresses.latitude': { $exists: true, $ne: null } })
            .select('name phone email addresses');

        // Extract flattened locations from users
        const customerLocations = [];
        users.forEach(user => {
            user.addresses.forEach(addr => {
                if (addr.latitude && addr.longitude) {
                    customerLocations.push({
                        type: 'customer',
                        id: user._id,
                        name: user.name,
                        phone: user.phone,
                        addressText: addr.street || addr.fullAddress || `${addr.city}, ${addr.state}`,
                        lat: addr.latitude,
                        lng: addr.longitude
                    });
                }
            });
        });

        // Fetch sellers with coordinates
        const sellers = await Seller.find({ 'location.coordinates': { $exists: true, $ne: [] } })
            .select('shopName ownerName phone shopAddress location.coordinates status');

        const sellerLocations = sellers
            .filter(s => s.location && s.location.coordinates && s.location.coordinates.length === 2 && s.location.coordinates[0] !== 0)
            .map(seller => ({
                type: 'seller',
                id: seller._id,
                name: seller.shopName,
                ownerName: seller.ownerName,
                phone: seller.phone,
                addressText: seller.shopAddress,
                lat: seller.location.coordinates[1], // [lng, lat]
                lng: seller.location.coordinates[0],
                status: seller.status
            }));

        res.json({
            success: true,
            data: {
                customers: customerLocations,
                sellers: sellerLocations
            }
        });
    } catch (error) {
        console.error('Get admin locations error:', error);
        res.status(500).json({ success: false, message: 'Error fetching locations' });
    }
});

export default router;
