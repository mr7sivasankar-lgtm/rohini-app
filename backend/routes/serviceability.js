import express from 'express';
import ServiceableArea from '../models/ServiceableArea.js';
import { protect, adminOnly } from '../middleware/auth.js';

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
// ADMIN: List all serviceable areas
// GET /api/serviceability/areas
// ============================================================
router.get('/areas', protect, adminOnly, async (req, res) => {
    try {
        const areas = await ServiceableArea.find().sort({ createdAt: -1 });
        res.json({ success: true, data: areas });
    } catch (error) {
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
