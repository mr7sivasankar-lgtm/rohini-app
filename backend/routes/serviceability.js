import express from 'express';
import ServiceableArea from '../models/ServiceableArea.js';
import { protect, adminOnly } from '../middleware/auth.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';

// Helper: compute coverage status from counts
function computeCoverageStatus(sellers, deliveryPartners) {
    if (sellers === 0) return 'No Sellers';
    if (deliveryPartners === 0) return 'No Delivery Partners';
    if (sellers < 3 || deliveryPartners < 2) return 'Low Coverage';
    return 'Active';
}

const router = express.Router();

// ============================================================
// Haversine formula — distance between two lat/lng points in km
// ============================================================
function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================================
// PUBLIC: Check if a location is serviceable
// POST /api/serviceability/check
// Body: { latitude, longitude, pincode, city }
// ============================================================
router.post('/check', async (req, res) => {
    try {
        const { latitude, longitude, pincode, city } = req.body;

        const areas = await ServiceableArea.find({ isActive: true });

        if (areas.length === 0) {
            // If no areas are configured, allow all (default open)
            return res.json({ success: true, serviceable: true });
        }

        let serviceable = false;

        for (const area of areas) {
            if (area.type === 'pincode' && pincode) {
                if (area.pincode === pincode) {
                    serviceable = true;
                    break;
                }
            } else if (area.type === 'city' && city) {
                if (area.city.toLowerCase() === city.toLowerCase()) {
                    serviceable = true;
                    break;
                }
            } else if (area.type === 'radius' && latitude && longitude) {
                const distance = haversineDistance(
                    latitude, longitude,
                    area.latitude, area.longitude
                );
                if (distance <= area.radiusKm) {
                    serviceable = true;
                    break;
                }
            }
        }

        res.json({ success: true, serviceable });
    } catch (error) {
        console.error('Serviceability check error:', error);
        res.status(500).json({ success: false, message: 'Error checking serviceability' });
    }
});

// ============================================================
// PUBLIC: Geocode search (Photon API for fuzzy/typo-tolerant search)
// GET /api/serviceability/geocode/search?q=tirpati
// ============================================================
router.get('/geocode/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        let results = [];

        // Try Photon API first (fuzzy/typo-tolerant, same OSM data)
        try {
            const photonRes = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en&lat=20.5937&lon=78.9629`,
                { headers: { 'User-Agent': 'RohiniApp/1.0' } }
            );
            const photonData = await photonRes.json();

            if (photonData.features && photonData.features.length > 0) {
                results = photonData.features
                    .filter(f => {
                        const country = f.properties?.country;
                        return !country || country === 'India';
                    })
                    .map(f => {
                        const p = f.properties || {};
                        const coords = f.geometry?.coordinates || [];
                        return {
                            displayName: [p.name, p.city, p.state, p.country].filter(Boolean).join(', '),
                            latitude: coords[1] || 0,
                            longitude: coords[0] || 0,
                            locality: p.name || p.district || '',
                            city: p.city || p.county || p.state || '',
                            state: p.state || '',
                            pincode: p.postcode || ''
                        };
                    });
            }
        } catch (photonErr) {
            console.error('Photon API error, falling back to Nominatim:', photonErr.message);
        }

        // Fallback to Nominatim if Photon returned nothing
        if (results.length === 0) {
            const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},India&format=json&addressdetails=1&limit=5`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'RohiniApp/1.0' } }
            );
            const nomData = await nomRes.json();

            results = nomData.map(item => {
                const addr = item.address || {};
                return {
                    displayName: item.display_name,
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                    locality: addr.suburb || addr.neighbourhood || addr.village || addr.town || '',
                    city: addr.city || addr.state_district || addr.county || '',
                    state: addr.state || '',
                    pincode: addr.postcode || ''
                };
            });
        }

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Geocode search error:', error);
        res.status(500).json({ success: false, message: 'Error searching location' });
    }
});

// ============================================================
// PUBLIC: Reverse geocode (proxy to Nominatim to avoid CORS)
// GET /api/serviceability/geocode/reverse?lat=...&lon=...
// ============================================================
router.get('/geocode/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'lat and lon required' });
        }

        let addr = null;

        // Try 1: Photon API (Osm-based, high rate limits, includes street/suburb)
        try {
            const url1 = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`;
            const response1 = await fetch(url1, { headers: { 'User-Agent': 'RohiniApp/1.0' } });
            if (response1.ok) {
                const photonData = await response1.json();
                if (photonData.features && photonData.features.length > 0) {
                    const props = photonData.features[0].properties;
                    if (props.name || props.city || props.street) {
                        const parts = [props.name, props.street, props.district, props.city].filter(Boolean);
                        addr = {
                            displayName: parts.join(', ') || 'Selected Location',
                            locality: props.district || props.name || '',
                            city: props.city || props.county || props.state || '',
                            state: props.state || '',
                            pincode: props.postcode || ''
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Photon reverse failed:', e.message);
        }

        // Try 2: BigDataCloud free client-side reverse geocode
        if (!addr) {
            try {
                const url2 = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
                const response2 = await fetch(url2);
                if (response2.ok) {
                    const data2 = await response2.json();
                    if (data2.city || data2.locality) {
                        addr = {
                            displayName: [data2.locality, data2.city, data2.principalSubdivision].filter(Boolean).join(', '),
                            locality: data2.locality || '',
                            city: data2.city || data2.principalSubdivision || '',
                            state: data2.principalSubdivision || '',
                            pincode: data2.postcode || ''
                        };
                    }
                }
            } catch (e) {
                console.error('BigDataCloud failed:', e.message);
            }
        }

        // Try 2: Nominatim OSM
        if (!addr) {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
                    {
                        headers: {
                            'Accept-Language': 'en',
                            'User-Agent': 'RohiniApp/1.0'
                        }
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    const osma = data.address || {};
                    addr = {
                        displayName: data.display_name,
                        locality: osma.suburb || osma.neighbourhood || osma.village || osma.town || '',
                        city: osma.city || osma.state_district || osma.county || '',
                        state: osma.state || '',
                        pincode: osma.postcode || ''
                    };
                }
            } catch (e) {
                console.error('OSM Fallback failed:', e.message);
            }
        }

        // Final Fallback
        if (!addr) {
            const fltLat = parseFloat(lat);
            const fltLon = parseFloat(lon);
            addr = {
                displayName: `GPS: ${isNaN(fltLat) ? lat : fltLat.toFixed(4)}, ${isNaN(fltLon) ? lon : fltLon.toFixed(4)}`,
                locality: 'Selected Location',
                city: 'Unknown Area',
                state: '',
                pincode: ''
            };
        }

        res.json({
            success: true,
            data: addr
        });

    } catch (error) {
        console.error('Critical reverse geocode error:', error);
        // Never return 500 so frontend doesn't crash visually
        res.status(200).json({ 
            success: true, 
            data: { 
                displayName: 'Location Detected',
                locality: 'Detected Area',
                city: 'Detected City',
                state: '',
                pincode: ''
            } 
        });
    }
});

// ============================================================
// ADMIN: Coverage summary (platform-wide stats)
// GET /api/serviceability/areas/coverage-summary
// ============================================================
router.get('/areas/coverage-summary', protect, adminOnly, async (req, res) => {
    try {
        const areas = await ServiceableArea.find();
        const totalAreas = areas.length;
        const activeAreas = areas.filter(a => a.isActive).length;
        const inactiveAreas = totalAreas - activeAreas;
        const totalSellers = await Seller.countDocuments({ status: 'Approved' });
        const totalDPs = await DeliveryPartner.countDocuments({ isActive: true });
        res.json({ success: true, data: { totalAreas, activeAreas, inactiveAreas, totalSellers, totalDPs } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching coverage summary' });
    }
});

// ============================================================
// ADMIN: All registered sellers + DPs with location info
// GET /api/serviceability/areas/coverage-entities
// ============================================================
router.get('/areas/coverage-entities', protect, adminOnly, async (req, res) => {
    try {
        const sellers = await Seller.find(
            {},
            { shopName: 1, ownerName: 1, city: 1, state: 1, pincode: 1, status: 1, createdAt: 1, shopCategory: 1, phone: 1 }
        ).sort({ createdAt: -1 }).lean();

        const dps = await DeliveryPartner.find(
            {},
            { name: 1, phone: 1, city: 1, pincode: 1, isActive: 1, isOnline: 1, createdAt: 1 }
        ).sort({ createdAt: -1 }).lean();

        res.json({ success: true, data: { sellers, deliveryPartners: dps } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching entities' });
    }
});


// ============================================================
// ADMIN: List all serviceable areas WITH coverage stats
// GET /api/serviceability/areas
// ============================================================
router.get('/areas', protect, adminOnly, async (req, res) => {
    try {
        const areas = await ServiceableArea.find().sort({ createdAt: -1 });

        // Fetch only Approved sellers and active delivery partners for counting
        const sellers = await Seller.find({ status: 'Approved' }, { city: 1, pincode: 1, state: 1 }).lean();
        const dps = await DeliveryPartner.find({ isActive: true }, { city: 1, pincode: 1 }).lean();

        const enriched = areas.map(area => {
            const obj = area.toObject();
            let sellerCount = 0;
            let dpCount = 0;

            if (area.type === 'city') {
                const areaCity = (area.city || '').toLowerCase().trim();
                const areaName = (area.name || '').toLowerCase().trim();
                sellerCount = sellers.filter(s => {
                    const sCity = (s.city || '').toLowerCase().trim();
                    return sCity === areaCity || sCity === areaName;
                }).length;
                dpCount = dps.filter(d => {
                    const dCity = (d.city || '').toLowerCase().trim();
                    return dCity === areaCity || dCity === areaName;
                }).length;
            } else if (area.type === 'pincode') {
                const areaPincode = (area.pincode || '').trim();
                const areaName = (area.name || '').toLowerCase().trim();
                // Match by pincode OR by city name (fallback for sellers who filled city but not pincode)
                sellerCount = sellers.filter(s => {
                    const sPincode = (s.pincode || '').trim();
                    const sCity = (s.city || '').toLowerCase().trim();
                    return (sPincode && sPincode === areaPincode) || sCity === areaName;
                }).length;
                dpCount = dps.filter(d => {
                    const dPincode = (d.pincode || '').trim();
                    const dCity = (d.city || '').toLowerCase().trim();
                    return (dPincode && dPincode === areaPincode) || dCity === areaName;
                }).length;
            } else {
                // For radius type — count all (rough estimate)
                sellerCount = sellers.length;
                dpCount = dps.length;
            }

            obj.sellerCount = sellerCount;
            obj.dpCount = dpCount;
            obj.coverageStatus = computeCoverageStatus(sellerCount, dpCount);
            return obj;
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ success: false, message: 'Error fetching areas' });
    }
});

// ============================================================
// ADMIN: Add a new serviceable area
// POST /api/serviceability/areas
// ============================================================
router.post('/areas', protect, adminOnly, async (req, res) => {
    try {
        const { type, name, city, state, pincode, latitude, longitude, radiusKm } = req.body;

        if (!type || !name) {
            return res.status(400).json({ success: false, message: 'Type and name are required' });
        }

        if (type === 'pincode' && !pincode) {
            return res.status(400).json({ success: false, message: 'Pincode is required for pincode type' });
        }
        if (type === 'city' && !city) {
            return res.status(400).json({ success: false, message: 'City is required for city type' });
        }
        if (type === 'radius' && (!latitude || !longitude)) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required for radius type' });
        }

        const area = await ServiceableArea.create({
            type, name, city, state, pincode, latitude, longitude,
            radiusKm: radiusKm || 5
        });

        res.status(201).json({ success: true, data: area });
    } catch (error) {
        console.error('Add area error:', error);
        res.status(500).json({ success: false, message: 'Error adding area' });
    }
});

// ============================================================
// ADMIN: Update a serviceable area (toggle active, edit)
// PUT /api/serviceability/areas/:id
// ============================================================
router.put('/areas/:id', protect, adminOnly, async (req, res) => {
    try {
        const area = await ServiceableArea.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!area) {
            return res.status(404).json({ success: false, message: 'Area not found' });
        }

        res.json({ success: true, data: area });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating area' });
    }
});

// ============================================================
// ADMIN: Delete a serviceable area
// DELETE /api/serviceability/areas/:id
// ============================================================
router.delete('/areas/:id', protect, adminOnly, async (req, res) => {
    try {
        const area = await ServiceableArea.findByIdAndDelete(req.params.id);

        if (!area) {
            return res.status(404).json({ success: false, message: 'Area not found' });
        }

        res.json({ success: true, message: 'Area deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting area' });
    }
});

export default router;
