import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/geocode/reverse?lat=12.3&lng=45.6
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        // OpenStreetMap Nominatim API (Free, but requires unique User-Agent)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'RohiniCustomerApp/1.0 (contact@rohini-app.com)'
            }
        });

        if (response.data && response.data.address) {
            const addr = response.data.address;

            // Map Nominatim address properties to our app's structure
            const mappedAddress = {
                city: addr.city || addr.town || addr.village || addr.county || '',
                state: addr.state || '',
                pincode: addr.postcode || '',
                address: [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ')
            };

            res.status(200).json({
                success: true,
                data: mappedAddress
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Location details not found'
            });
        }

    } catch (error) {
        console.error('Reverse Geocoding Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to detect location. Please enter details manually.'
        });
    }
});

export default router;
