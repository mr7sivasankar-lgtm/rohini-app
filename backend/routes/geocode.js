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

        let mappedAddress = null;

        // Try 1: Photon API (Osm-based, high rate limits, includes street/suburb)
        try {
            const url1 = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
            const response1 = await axios.get(url1, { 
                timeout: 6000,
                headers: { 'User-Agent': 'RohiniApp/1.0' }
            });
            
            if (response1.data && response1.data.features && response1.data.features.length > 0) {
                const props = response1.data.features[0].properties;
                if (props.name || props.city || props.street) {
                    const parts = [props.name, props.street, props.district, props.city].filter(Boolean);
                    mappedAddress = {
                        city: props.city || props.county || props.state || '',
                        state: props.state || '',
                        pincode: props.postcode || '',
                        address: parts.join(', ') || 'Selected Location'
                    };
                }
            }
        } catch (e) {
            console.error('Photon API failed:', e.message);
        }

        // Try 2: BigDataCloud free client-side reverse geocoding API
        if (!mappedAddress) {
            try {
                const url2 = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
                const response2 = await axios.get(url2, { timeout: 6000 });
                
                if (response2.data && (response2.data.city || response2.data.locality)) {
                    const data = response2.data;
                    mappedAddress = {
                        city: data.city || data.locality || data.principalSubdivision || '',
                        state: data.principalSubdivision || '',
                        pincode: data.postcode || '',
                        address: [data.locality, data.city, data.principalSubdivision].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
                    };
                }
            } catch (e) {
                console.error('BigDataCloud API failed:', e.message);
            }
        }

        // Try 2: Fallback to nominatim (with custom user agent) if first failed
        if (!mappedAddress) {
            try {
                const url2 = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
                const response2 = await axios.get(url2, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'RohiniCustomerApp/2.0 (fallback)' }
                });
                
                if (response2.data && response2.data.address) {
                    const addr = response2.data.address;
                    mappedAddress = {
                        city: addr.city || addr.town || addr.village || addr.county || '',
                        state: addr.state || '',
                        pincode: addr.postcode || '',
                        address: [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ')
                    };
                }
            } catch (e) {
                console.error('Nominatim API Fallback failed:', e.message);
            }
        }

        // Try 3: Absolute fallback so the frontend doesn't crash with a 500
        if (!mappedAddress) {
            console.warn('All reverse geocoding APIs failed. Using generic fallback.');
            mappedAddress = {
                city: 'Current Location',
                state: '',
                pincode: '',
                address: `Lat: ${parseFloat(lat).toFixed(3)}, Lng: ${parseFloat(lng).toFixed(3)}`
            };
        }

        res.status(200).json({
            success: true,
            data: mappedAddress
        });

    } catch (error) {
        console.error('Critical Reverse Geocoding Error:', error);
        // Even on critical failure, return a 200 with generic data so frontend doesn't break
        res.status(200).json({
            success: true,
            data: {
                city: 'Detected Location',
                state: '',
                pincode: '',
                address: 'GPS coordinates detected'
            }
        });
    }
});

export default router;
