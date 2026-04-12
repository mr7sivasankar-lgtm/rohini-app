import express from 'express';
import ServiceableArea from '../models/ServiceableArea.js';
import { protect, adminOnly } from '../middleware/auth.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Address from '../models/Address.js';
import User from '../models/User.js';


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
// ADMIN: Location Intelligence — cluster all entities by pincode
// GET /api/serviceability/areas/location-intelligence
// ============================================================
router.get('/areas/location-intelligence', protect, adminOnly, async (req, res) => {
    try {
        // Fetch all entities in parallel
        const [sellers, dps, addresses] = await Promise.all([
            Seller.find({}, {
                shopName: 1, ownerName: 1, phone: 1, city: 1, state: 1, pincode: 1,
                status: 1, createdAt: 1, shopCategory: 1,
                'location.coordinates': 1
            }).lean(),
            DeliveryPartner.find({}, {
                name: 1, phone: 1, city: 1, state: 1, pincode: 1,
                isActive: 1, isOnline: 1, createdAt: 1, vehicleType: 1, status: 1,
                'location.coordinates': 1
            }).lean(),
            Address.find({}, { userId: 1, city: 1, state: 1, pincode: 1 })
                .populate('userId', 'name phone createdAt').lean()
        ]);

        // ── Build cluster map keyed by pincode ──────────────────────────
        const clusterMap = {};

        const getOrCreate = (pincode, city, state) => {
            const key = (pincode || '').trim();
            if (!key) return null;
            if (!clusterMap[key]) {
                clusterMap[key] = {
                    pincode: key, city: city || '', state: state || '',
                    sellers: [], dps: [], userIds: new Set(), userList: []
                };
            }
            // Fill city/state from first entity that has it
            if (!clusterMap[key].city && city) clusterMap[key].city = city;
            if (!clusterMap[key].state && state) clusterMap[key].state = state;
            return clusterMap[key];
        };

        sellers.forEach(s => {
            const c = getOrCreate(s.pincode, s.city, s.state);
            if (c) c.sellers.push(s);
        });

        dps.forEach(d => {
            const c = getOrCreate(d.pincode, d.city, d.state);
            if (c) c.dps.push(d);
        });

        addresses.forEach(a => {
            const c = getOrCreate(a.pincode, a.city, a.state);
            if (c && a.userId) {
                const uid = (a.userId._id || a.userId).toString();
                if (!c.userIds.has(uid)) {
                    c.userIds.add(uid);
                    // Store user detail once per unique user
                    if (a.userId && typeof a.userId === 'object') {
                        c.userList.push({
                            _id:       a.userId._id,
                            name:      a.userId.name || '—',
                            phone:     a.userId.phone || '—',
                            createdAt: a.userId.createdAt
                        });
                    }
                }
            }
        });

        // ── Also fetch ServiceableArea entries to know admin service status per pincode ──
        const serviceableAreas = await ServiceableArea.find({ type: 'pincode' }, { pincode: 1, isActive: 1, name: 1 }).lean();
        const serviceAreaByPincode = {};
        serviceableAreas.forEach(a => { serviceAreaByPincode[a.pincode] = a; });

        // ── Enrich clusters with accurate city/town from India Post pincode API ──
        const uniquePincodes = Object.keys(clusterMap);

        const pincodeInfoMap = {};
        await Promise.all(uniquePincodes.map(async (pin) => {
            try {
                const resp = await fetch(
                    `https://api.postalpincode.in/pincode/${pin}`,
                    { headers: { 'User-Agent': 'RohiniApp/1.0' }, signal: AbortSignal.timeout(4000) }
                );
                if (!resp.ok) return;
                const json = await resp.json();
                if (json?.[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
                    const po = json[0].PostOffice[0];
                    pincodeInfoMap[pin] = {
                        city:  po.Division || po.District || po.Name || '',
                        taluk: po.Taluk || po.Block || '',   // town/taluk name
                        district: po.District || '',
                        state: po.State || '',
                        name:  po.Name || ''
                    };
                }
            } catch (_) { /* timeout or network — skip enrichment for this pin */ }
        }));

        // Apply enriched data to clusterMap
        for (const [pin, info] of Object.entries(pincodeInfoMap)) {
            if (clusterMap[pin]) {
                // Prefer: Taluk/District as city label (more specific than Division)
                const townName = info.taluk || info.district || info.city || '';
                if (townName) clusterMap[pin].city = townName;
                if (info.state) clusterMap[pin].state = info.state;
            }
        }

        // ── Score & enrich each cluster ─────────────────────────────────
        const clusters = Object.values(clusterMap).map(c => {
            const approvedSellers = c.sellers.filter(s => s.status === 'Approved').length;
            const pendingSellers  = c.sellers.filter(s => s.status === 'Pending Approval').length;
            const activeDPs  = c.dps.filter(d => d.isActive).length;
            const onlineDPs  = c.dps.filter(d => d.isOnline).length;
            const userCount  = c.userIds.size;

            // Coverage Score (0–100)
            let score = 0;
            if (approvedSellers > 0)                          score += 40;
            if (activeDPs > 0)                                score += 30;
            if (activeDPs > 0 && approvedSellers > 0 &&
                approvedSellers / activeDPs <= 3)             score += 20;
            if (userCount > 0)                                score += 10;

            // Status
            let status;
            if (score >= 90)             status = 'Active';
            else if (score >= 60)        status = 'Low Coverage';
            else if (approvedSellers === 0 && activeDPs === 0 && userCount === 0)
                                         status = 'Untapped';
            else if (approvedSellers === 0 && activeDPs > 0)
                                         status = 'No Sellers';
            else if (activeDPs === 0 && approvedSellers > 0)
                                         status = 'No Delivery Partners';
            else                         status = 'Low Coverage';

            // Auto-suggestions
            const suggestions = [];
            if (approvedSellers > 0 && activeDPs === 0)
                suggestions.push('⚠️ No delivery partner in this area — sellers cannot fulfill orders. Recruit a delivery partner here.');
            if (activeDPs > 0 && approvedSellers === 0)
                suggestions.push('⚠️ Delivery partner registered but no approved sellers — partner is idle. Onboard a seller here.');
            if (approvedSellers >= 3 && activeDPs <= 1)
                suggestions.push('📦 High seller load on ' + (activeDPs === 0 ? 'no' : 'only 1') + ' delivery partner — add 1–2 more partners.');
            if (userCount > 5 && approvedSellers === 0)
                suggestions.push('🎯 ' + userCount + ' users have registered addresses here — high demand area with no sellers. Recruit sellers urgently.');
            if (userCount > 10 && activeDPs === 0)
                suggestions.push('🚀 ' + userCount + ' users in this area with zero delivery coverage — prioritise adding delivery partners.');
            if (pendingSellers > 0)
                suggestions.push('🕐 ' + pendingSellers + ' seller application(s) pending approval — review and approve to activate coverage.');
            if (status === 'Untapped' && c.pincode)
                suggestions.push('💡 No entities in pincode ' + c.pincode + ' — consider outreach to sellers and delivery partners in this area.');
            if (status === 'Active')
                suggestions.push('✅ Coverage looks healthy — keep monitoring to sustain service quality.');

            // GPS distance between first seller and first DP (if coords available)
            let distanceKm = null;
            const sellerCoords = c.sellers.find(s => s.location?.coordinates?.length === 2)?.location?.coordinates;
            const dpCoords     = c.dps.find(d => d.location?.coordinates?.length === 2)?.location?.coordinates;
            if (sellerCoords && dpCoords) {
                distanceKm = Math.round(haversineDistance(
                    sellerCoords[1], sellerCoords[0],
                    dpCoords[1], dpCoords[0]
                ) * 10) / 10;
            }

            return {
                pincode: c.pincode,
                city: c.city || '—',
                state: c.state || '',
                sellers: {
                    total: c.sellers.length, approved: approvedSellers,
                    pending: pendingSellers, list: c.sellers
                },
                deliveryPartners: {
                    total: c.dps.length, active: activeDPs,
                    online: onlineDPs, list: c.dps
                },
                users:         { total: userCount, list: c.userList },
                coverageScore: score,
                status,
                suggestions,
                distanceKm
            };
        }).sort((a, b) => b.coverageScore - a.coverageScore || b.sellers.total - a.sellers.total);

        // ── Attach serviceArea status to each cluster ──
        clusters.forEach(c => {
            const sa = serviceAreaByPincode[c.pincode];
            c.serviceAreaStatus = sa ? (sa.isActive ? 'active' : 'inactive') : 'not-configured';
            c.serviceAreaId = sa?._id || null;
        });

        const summary = {
            totalClusters:   clusters.length,
            fullyActive:     clusters.filter(c => c.status === 'Active').length,
            needsAttention:  clusters.filter(c => c.status !== 'Active' && c.status !== 'Untapped').length,
            untapped:        clusters.filter(c => c.status === 'Untapped').length,
            totalUsers:      clusters.reduce((sum, c) => sum + c.users.total, 0)
        };

        res.json({ success: true, data: { clusters, summary } });
    } catch (error) {
        console.error('Location intelligence error:', error);
        res.status(500).json({ success: false, message: 'Error building location intelligence' });
    }
});

// ============================================================
// ADMIN: Activate / Deactivate service for a detected pincode cluster
// PATCH /api/serviceability/areas/cluster/:pincode
// Body: { action: 'activate' | 'deactivate', cityName: 'Tirupati' }
// ============================================================
router.patch('/areas/cluster/:pincode', protect, adminOnly, async (req, res) => {
    try {
        const { pincode } = req.params;
        const { action, cityName } = req.body;

        if (!['activate', 'deactivate'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action must be activate or deactivate' });
        }

        const isActive = action === 'activate';
        const label = cityName ? `${cityName} (${pincode})` : `Pincode ${pincode}`;

        // Upsert: create if not exists, update if exists
        const area = await ServiceableArea.findOneAndUpdate(
            { pincode: pincode.trim(), type: 'pincode' },
            {
                $set: {
                    isActive,
                    type: 'pincode',
                    pincode: pincode.trim(),
                },
                $setOnInsert: {
                    name: label,
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            data: area,
            message: `Service ${isActive ? 'activated' : 'deactivated'} for pincode ${pincode}`
        });
    } catch (error) {
        console.error('Cluster toggle error:', error);
        res.status(500).json({ success: false, message: 'Error updating cluster service status' });
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
