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

        // Use BigDataCloud free client-side reverse geocoding API
        // It's more forgiving with server IPs than Nominatim which heavily blocks cloud providers
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

        const response = await axios.get(url, { timeout: 10000 });

        if (response.data) {
            const data = response.data;
            
            // Map BigDataCloud properties to our app's structure
            const mappedAddress = {
                city: data.city || data.locality || data.principalSubdivision || '',
                state: data.principalSubdivision || '',
                pincode: data.postcode || '',
                address: [data.locality, data.city, data.principalSubdivision].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
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
