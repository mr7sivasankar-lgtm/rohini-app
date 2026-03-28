import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyCXNIpwQ6rNmeH6oLU0j7y1bMECzZ65BpA';
const DELIVERY_TYPE_LABELS = { Normal: '🚚 Normal', 'Return Pickup': '↩️ Return', 'Exchange Pickup': '🔄 Exchange' };
const STATUS_COLORS = { Assigned: '#f59e0b', 'Picked Up': '#22c55e', 'Out for Delivery': '#16a34a' };

/* ── Load Google Maps once ── */
let _gmLoaded = false, _gmLoading = false, _gmCbs = [];
function loadGM(cb) {
    if (_gmLoaded) return cb();
    _gmCbs.push(cb);
    if (_gmLoading) return;
    _gmLoading = true;
    window.__gmDashReady = () => { _gmLoaded = true; _gmLoading = false; _gmCbs.forEach(f => f()); _gmCbs = []; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&callback=__gmDashReady&loading=async`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
}

export default function Dashboard() {
    const { partner, updatePartner } = useAuth();
    const navigate = useNavigate();

    const [isOnline, setIsOnline] = useState(partner?.isOnline || false);
    const [stats, setStats] = useState({ assigned: 0, pending: 0, deliveredToday: 0, returnPickups: 0, exchangePickups: 0 });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null);
    const [dpPosition, setDpPosition] = useState(null);
    const [showRelocate, setShowRelocate] = useState(false);

    // Google Maps refs
    const mapContainerRef = useRef(null);
    const googleMapRef = useRef(null);
    const dpMarkerRef = useRef(null);
    const relocateMapRef = useRef(null);
    const relocateGMapRef = useRef(null);
    const relocateMarkerRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [relocatePos, setRelocatePos] = useState(null);
    const [relocateAddr, setRelocateAddr] = useState('');
    const [savingLocation, setSavingLocation] = useState(false);

    // ── Fetch stats + orders ──
    const fetchData = useCallback(async () => {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                api.get('/delivery/stats'),
                api.get('/delivery/orders'),
            ]);
            setStats(statsRes.data.data);
            setOrders(ordersRes.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ── GPS watch → update state + backend ──
    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setDpPosition({ lat: latitude, lng: longitude });
                api.put('/delivery/location', { coordinates: [longitude, latitude] }).catch(() => {});
            },
            (err) => console.warn('GPS:', err.message),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // ── Init Google Map ──
    useEffect(() => {
        if (!mapContainerRef.current || googleMapRef.current) return;
        loadGM(() => {
            if (!mapContainerRef.current || googleMapRef.current) return;
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat: 20.5937, lng: 78.9629 },
                zoom: 5,
                disableDefaultUI: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
            });
            googleMapRef.current = map;
            setMapReady(true);
        });
        return () => { googleMapRef.current = null; dpMarkerRef.current = null; setMapReady(false); };
    }, []);

    // ── Update scooter marker when GPS changes ──
    useEffect(() => {
        const map = googleMapRef.current;
        if (!mapReady || !map || !dpPosition) return;
        const { lat, lng } = dpPosition;

        const scooterIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"><text y="38" font-size="36">🛵</text></svg>`
            ),
            scaledSize: new window.google.maps.Size(42, 42),
            anchor: new window.google.maps.Point(21, 21),
        };

        if (!dpMarkerRef.current) {
            dpMarkerRef.current = new window.google.maps.Marker({
                position: { lat, lng },
                map,
                icon: scooterIcon,
                title: 'Your Location',
            });
            map.setCenter({ lat, lng });
            map.setZoom(15);
        } else {
            dpMarkerRef.current.setPosition({ lat, lng });
        }
    }, [mapReady, dpPosition]);

    // ── Relocate map modal ──
    useEffect(() => {
        if (!showRelocate || !relocateMapRef.current || relocateGMapRef.current) return;
        const startPos = dpPosition || { lat: 13.6288, lng: 79.4192 };

        loadGM(() => {
            if (!relocateMapRef.current || relocateGMapRef.current) return;
            const map = new window.google.maps.Map(relocateMapRef.current, {
                center: startPos,
                zoom: 16,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
            });

            const pinMarker = new window.google.maps.Marker({
                position: startPos,
                map,
                draggable: true,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                            <ellipse cx="20" cy="48" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
                            <path d="M20 2C12.27 2 6 8.27 6 16c0 10.5 14 32 14 32s14-21.5 14-32C34 8.27 27.73 2 20 2z" fill="#10b981" stroke="white" stroke-width="1.5"/>
                            <circle cx="20" cy="16" r="6" fill="white"/>
                            <circle cx="20" cy="16" r="3.5" fill="#10b981"/>
                        </svg>
                    `),
                    scaledSize: new window.google.maps.Size(40, 50),
                    anchor: new window.google.maps.Point(20, 50),
                }
            });

            const updatePos = async (lat, lng) => {
                setRelocatePos({ lat, lng });
                try {
                    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}`);
                    const data = await res.json();
                    if (data.status === 'OK' && data.results[0]) {
                        setRelocateAddr(data.results[0].formatted_address);
                    } else {
                        setRelocateAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    }
                } catch { setRelocateAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
            };

            pinMarker.addListener('dragend', () => {
                const p = pinMarker.getPosition();
                updatePos(p.lat(), p.lng());
            });
            map.addListener('click', (e) => {
                const lat = e.latLng.lat(); const lng = e.latLng.lng();
                pinMarker.setPosition({ lat, lng });
                updatePos(lat, lng);
            });

            relocateGMapRef.current = map;
            relocateMarkerRef.current = pinMarker;
            setRelocatePos(startPos);
            updatePos(startPos.lat, startPos.lng);
        });
    }, [showRelocate]);

    const handleLocateMe = () => {
        const map = googleMapRef.current;
        if (!map) return;
        if (dpPosition) {
            map.panTo({ lat: dpPosition.lat, lng: dpPosition.lng });
            map.setZoom(16);
        } else {
            navigator.geolocation?.getCurrentPosition(
                (pos) => { map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(16); },
                () => alert('Unable to get location. Please allow GPS access.')
            );
        }
    };

    const handleSaveRelocate = async () => {
        if (!relocatePos) return;
        setSavingLocation(true);
        try {
            await api.put('/delivery/location', { coordinates: [relocatePos.lng, relocatePos.lat] });
            setDpPosition(relocatePos);
            setShowRelocate(false);
            relocateGMapRef.current = null;
            relocateMarkerRef.current = null;
        } catch { alert('Failed to save location. Please try again.'); }
        finally { setSavingLocation(false); }
    };

    const toggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        try {
            await api.put('/delivery/profile/status', { isOnline: newStatus });
            if (updatePartner) updatePartner({ isOnline: newStatus });
        } catch { setIsOnline(!newStatus); }
    };

    // ── Filter orders per active tab ──
    const getFilteredOrders = () => {
        if (!activeFilter) return orders;
        switch (activeFilter) {
            case 'assigned':       return orders.filter(o => o.deliveryStatus === 'Assigned');
            case 'pending':        return orders.filter(o => ['Picked Up', 'Out for Delivery'].includes(o.deliveryStatus));
            case 'deliveredToday': {
                const today = new Date().toDateString();
                return orders.filter(o => o.deliveryStatus === 'Delivered' && new Date(o.updatedAt).toDateString() === today);
            }
            case 'returnPickups': return orders.filter(o => o.deliveryType === 'Return Pickup');
            default: return orders;
        }
    };

    const filteredOrders = getFilteredOrders();
    const statTabs = [
        { key: null,              label: 'All',       value: orders.length,         color: '#10b981', icon: '🚚' },
        { key: 'assigned',        label: 'Assigned',  value: stats.assigned,        color: '#f59e0b', icon: '📦' },
        { key: 'pending',         label: 'Pending',   value: stats.pending,         color: '#3b82f6', icon: '⏳' },
        { key: 'deliveredToday',  label: 'Delivered', value: stats.deliveredToday,  color: '#10b981', icon: '✅' },
        { key: 'returnPickups',   label: 'Returns',   value: stats.returnPickups,   color: '#ef4444', icon: '↩️' },
    ];
    const SECTION_LABEL = {
        null: 'Active Deliveries', assigned: 'Assigned Orders', pending: 'Pending Orders',
        deliveredToday: 'Delivered Today', returnPickups: 'Return Pickups',
    };

    return (
        <div className="dashboard-page">

            {/* ── Header ── */}
            <div className="dash-header">
                <div className="dash-greeting">
                    <div className="avatar">🚴</div>
                    <div>
                        <h2>Hey, {partner?.name?.split(' ')[0]}!</h2>
                        <p>Ready to deliver?</p>
                    </div>
                </div>
                <div className="status-toggle-wrap-dashboard">
                    <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{isOnline ? 'Online' : 'Offline'}</span>
                    <label className="toggle-dash">
                        <input type="checkbox" checked={isOnline} onChange={toggleStatus} />
                        <span className="slider-dash" />
                    </label>
                </div>
            </div>

            {/* ── Live Location Map (Google Maps) ── */}
            <div className="dp-map-section">
                <div ref={mapContainerRef} className="dp-map" />

                {dpPosition && <div className="dp-map-badge">📍 Live Location</div>}
                {!dpPosition && (
                    <div className="dp-map-locating">
                        <span className="dp-map-locating-dot" />
                        Locating you…
                    </div>
                )}

                {/* Locate Me button — prominent, top-right area of map */}
                <button
                    onClick={handleLocateMe}
                    style={{
                        position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#10b981', color: 'white', border: 'none',
                        padding: '8px 14px', borderRadius: '20px',
                        fontSize: '13px', fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(16,185,129,0.4)', cursor: 'pointer',
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                        <circle cx="12" cy="12" r="3" fill="white" stroke="none"/>
                        <circle cx="12" cy="12" r="7"/>
                        <line x1="12" y1="2" x2="12" y2="5"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                        <line x1="2"  y1="12" x2="5"  y2="12"/>
                        <line x1="19" y1="12" x2="22" y2="12"/>
                    </svg>
                    Locate Me
                </button>

                {/* Change Location button — bottom-left */}
                <button
                    onClick={() => setShowRelocate(true)}
                    style={{
                        position: 'absolute', bottom: '12px', left: '12px', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'white', border: '1px solid #e2e8f0',
                        padding: '8px 14px', borderRadius: '20px',
                        fontSize: '13px', fontWeight: 700, color: '#1e293b',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer',
                    }}
                >
                    📌 Change Location
                </button>
            </div>

            {/* ── Stats Tabs ── */}
            <div className="stats-tabs-row">
                {statTabs.map(tab => {
                    const isActive = activeFilter === tab.key;
                    return (
                        <button
                            key={String(tab.key)}
                            className={`stat-tab ${isActive ? 'stat-tab-active' : ''}`}
                            style={isActive ? { borderBottom: `3px solid ${tab.color}` } : {}}
                            onClick={() => setActiveFilter(tab.key)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-value" style={{ color: isActive ? tab.color : '#1e293b' }}>{tab.value}</span>
                            <span className="tab-label" style={{ color: isActive ? tab.color : '#64748b' }}>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Orders Section ── */}
            <div className="orders-section">
                <div className="section-header">
                    <h3>
                        {SECTION_LABEL[activeFilter]} &nbsp;
                        <span className="section-count">({filteredOrders.length})</span>
                    </h3>
                    <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : filteredOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>No {SECTION_LABEL[activeFilter]} right now</p>
                        <span>{activeFilter ? 'Tap "All" to see everything' : 'New orders will appear here automatically'}</span>
                    </div>
                ) : (
                    <div className="orders-list">
                        {filteredOrders.map(order => (
                            <div key={order._id} className="order-card" onClick={() => navigate(`/order/${order._id}`)}>
                                <div className="order-card-top">
                                    <div>
                                        <div className="order-id">#{order.orderId?.slice(-6)}</div>
                                        <div className="delivery-type-badge" style={{ background: order.deliveryType === 'Normal' ? '#dcfce7' : '#fef3c7', color: order.deliveryType === 'Normal' ? '#16a34a' : '#b45309' }}>
                                            {DELIVERY_TYPE_LABELS[order.deliveryType] || order.deliveryType}
                                        </div>
                                    </div>
                                    <div className="status-pill" style={{ background: STATUS_COLORS[order.deliveryStatus] || '#94a3b8' }}>
                                        {order.deliveryStatus}
                                    </div>
                                </div>
                                <div className="order-card-info">
                                    <div className="info-row"><span>👤</span><span>{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</span></div>
                                    <div className="info-row"><span>📍</span><span className="address-text">{order.shippingAddress?.fullAddress}, {order.shippingAddress?.city}</span></div>
                                    <div className="info-row"><span>📦</span><span>{order.items?.map(i => i.name).join(', ')}</span></div>
                                    <div className="info-row"><span>💰</span><span style={{ color: '#10b981', fontWeight: 700 }}>+₹{(order.deliveryEarning || 0).toFixed(0)}</span></div>
                                </div>
                                <div className="order-card-footer">
                                    <span className="tap-hint">Tap to view details →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Relocate Modal ── */}
            {showRelocate && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Header */}
                    <div style={{ background: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>📌 Update My Location</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tap or drag pin to set your position</div>
                        </div>
                        <button onClick={() => { setShowRelocate(false); relocateGMapRef.current = null; relocateMarkerRef.current = null; }}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>✕</button>
                    </div>

                    {/* Map */}
                    <div ref={relocateMapRef} style={{ flex: 1 }} />

                    {/* Bottom confirm tray */}
                    <div style={{ background: 'white', padding: '16px 20px', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Selected location:</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {relocateAddr || 'Detecting address...'}
                        </div>
                        <button
                            onClick={handleSaveRelocate}
                            disabled={savingLocation || !relocatePos}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                background: savingLocation ? '#94a3b8' : '#10b981',
                                color: 'white', fontWeight: 700, fontSize: 15, cursor: savingLocation ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {savingLocation ? '⏳ Saving...' : '✅ Confirm & Save Location'}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
