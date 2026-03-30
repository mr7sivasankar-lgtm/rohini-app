import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

// ─── Pending Approval Screen ─────────────────────────────────────────────────
function PendingApprovalScreen({ partner, onApproved }) {
    const { logout } = useAuth();
    const [checking, setChecking] = useState(false);
    const [rejected, setRejected] = useState(partner?.status === 'Rejected');

    // Poll every 15s to check if admin approved
    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const res = await api.get('/delivery/profile');
                const p = res.data.data;
                if (p.status === 'Approved' && p.isActive) {
                    clearInterval(poll);
                    onApproved(p);
                } else if (p.status === 'Rejected') {
                    setRejected(true);
                    clearInterval(poll);
                }
            } catch { /* silent */ }
        }, 15000);
        return () => clearInterval(poll);
    }, [onApproved]);

    const checkNow = async () => {
        setChecking(true);
        try {
            const res = await api.get('/delivery/profile');
            const p = res.data.data;
            if (p.status === 'Approved' && p.isActive) onApproved(p);
            else if (p.status === 'Rejected') setRejected(true);
        } catch { /* silent */ }
        finally { setChecking(false); }
    };

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #f0fdf4 100%)',
            padding: '32px 24px', fontFamily: "'Inter','Segoe UI',sans-serif",
            textAlign: 'center',
        }}>
            {/* Animated icon */}
            <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: rejected ? '#fef2f2' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, marginBottom: 28,
                boxShadow: rejected
                    ? '0 8px 32px rgba(239,68,68,0.15)'
                    : '0 8px 32px rgba(34,197,94,0.15)',
                border: rejected ? '2px solid #fecaca' : '2px solid #bbf7d0',
                animation: rejected ? 'none' : 'pendingPulse 2s ease-in-out infinite',
            }}>
                {rejected ? '❌' : '⏳'}
            </div>

            <style>{`
                @keyframes pendingPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(34,197,94,0.15); }
                    50% { transform: scale(1.05); box-shadow: 0 12px 40px rgba(34,197,94,0.25); }
                }
            `}</style>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: rejected ? '#dc2626' : '#166534', marginBottom: 10 }}>
                {rejected ? 'Application Rejected' : 'Application Submitted!'}
            </h1>

            <p style={{ fontSize: 15, color: '#374151', maxWidth: 320, lineHeight: 1.6, marginBottom: 28 }}>
                {rejected
                    ? 'Your application was not approved. Please contact support for more details.'
                    : "Our admin team is reviewing your profile. You'll get access as soon as it's approved — usually within 24 hours."}
            </p>

            {/* Status card */}
            <div style={{
                background: 'white', borderRadius: 16, padding: '20px 28px', width: '100%', maxWidth: 340,
                boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: 24,
                border: '1px solid #e2e8f0',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { label: 'Name', value: partner?.name },
                        { label: 'Phone', value: partner?.phone },
                        { label: 'Vehicle', value: `${partner?.vehicleType || '—'} ${partner?.vehicleNumber ? `· ${partner.vehicleNumber}` : ''}` },
                        { label: 'Status', value: partner?.status || 'Pending Approval',
                          color: rejected ? '#dc2626' : '#f59e0b' },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: row.color || '#111827' }}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {!rejected && (
                <button
                    onClick={checkNow}
                    disabled={checking}
                    style={{
                        width: '100%', maxWidth: 340, padding: '14px',
                        background: checking ? '#d1fae5' : '#22c55e',
                        color: 'white', border: 'none', borderRadius: 12,
                        fontSize: 15, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                        transition: 'all 0.2s', marginBottom: 12,
                    }}
                >
                    {checking ? '⏳ Checking...' : '🔄 Check Approval Status'}
                </button>
            )}

            <button
                onClick={logout}
                style={{
                    width: '100%', maxWidth: 340, padding: '12px',
                    background: 'none', border: '1.5px solid #e2e8f0',
                    color: '#6b7280', borderRadius: 12, fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                }}
            >
                Sign Out
            </button>

            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
                {rejected ? 'Contact support: support@rohini.app' : 'This page auto-refreshes every 15 seconds'}
            </p>
        </div>
    );
}

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

    // Approval gate — computed first (not a hook)
    const isApproved = !!(partner?.isActive && partner?.status === 'Approved');
    const handleApproved = useCallback((updatedPartner) => {
        if (updatePartner) updatePartner(updatedPartner);
    }, [updatePartner]);

    // ── ALL hooks must be called unconditionally (Rules of Hooks) ──
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
        if (!isApproved) return; // skip when not approved
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
        // On Android, we must request location permission at runtime (not just in manifest)
        const startGPS = () => {
            if (!navigator.geolocation) return;
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setDpPosition({ lat: latitude, lng: longitude });
                    api.put('/delivery/location', { coordinates: [longitude, latitude] }).catch(() => {});
                },
                (err) => console.warn('GPS:', err.message),
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
            );
            return watchId;
        };

        let watchId;
        // Try Capacitor Geolocation plugin first (handles Android runtime permission dialog)
        import('@capacitor/geolocation').then(({ Geolocation }) => {
            Geolocation.requestPermissions().then(({ location }) => {
                if (location === 'granted' || location === 'limited') {
                    watchId = startGPS();
                } else {
                    console.warn('Location permission denied by user');
                }
            }).catch(() => {
                // Fallback for browser/web — just start GPS directly
                watchId = startGPS();
            });
        }).catch(() => {
            // Capacitor not available (web dev mode) — start GPS directly
            watchId = startGPS();
        });

        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
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

    // ── Radar pulse overlay when GPS changes ──
    useEffect(() => {
        const map = googleMapRef.current;
        if (!mapReady || !map || !dpPosition) return;
        const { lat, lng } = dpPosition;

        // Remove old marker if it exists (switch to overlay)
        if (dpMarkerRef.current && dpMarkerRef.current.setMap) {
            dpMarkerRef.current.setMap(null);
            dpMarkerRef.current = null;
        }

        // Build a radar pulse OverlayView
        class RadarOverlay extends window.google.maps.OverlayView {
            constructor(position) {
                super();
                this._pos = position;
                this._div = null;
            }
            onAdd() {
                const div = document.createElement('div');
                div.style.cssText = 'position:absolute;width:0;height:0;';
                div.innerHTML = `
                    <style>
                        @keyframes radarPulse {
                            0%   { transform:translate(-50%,-50%) scale(0.3); opacity:0.9; }
                            100% { transform:translate(-50%,-50%) scale(3.5); opacity:0; }
                        }
                        .radar-ring { position:absolute; border-radius:50%;
                            width:40px; height:40px;
                            border:2px solid #22c55e;
                            top:0; left:0;
                            transform:translate(-50%,-50%) scale(0.3);
                            animation: radarPulse 1.8s ease-out infinite; }
                        .radar-ring:nth-child(2) { animation-delay:0.6s; }
                        .radar-ring:nth-child(3) { animation-delay:1.2s; }
                        .radar-dot { position:absolute; width:14px; height:14px;
                            background:#16a34a; border-radius:50%;
                            top:0; left:0; transform:translate(-50%,-50%);
                            border:2.5px solid white;
                            box-shadow:0 0 0 2px #22c55e, 0 2px 8px rgba(22,163,74,0.5); }
                    </style>
                    <div class='radar-ring'></div>
                    <div class='radar-ring'></div>
                    <div class='radar-ring'></div>
                    <div class='radar-dot'></div>
                `;
                this._div = div;
                this.getPanes().overlayMouseTarget.appendChild(div);
            }
            draw() {
                const proj = this.getProjection();
                if (!proj) return;
                const point = proj.fromLatLngToDivPixel(this._pos);
                if (point && this._div) {
                    this._div.style.left = point.x + 'px';
                    this._div.style.top  = point.y + 'px';
                }
            }
            onRemove() {
                if (this._div) { this._div.parentNode?.removeChild(this._div); this._div = null; }
            }
            updatePosition(newPos) {
                this._pos = newPos;
                this.draw();
            }
        }

        if (!dpMarkerRef.current) {
            const overlay = new RadarOverlay(new window.google.maps.LatLng(lat, lng));
            overlay.setMap(map);
            dpMarkerRef.current = overlay;
            map.setCenter({ lat, lng });
            map.setZoom(15);
        } else {
            dpMarkerRef.current.updatePosition(new window.google.maps.LatLng(lat, lng));
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
                return orders.filter(o =>
                    ['Delivered', 'Collected'].includes(o.deliveryStatus) &&
                    new Date(o.updatedAt).toDateString() === today
                );
            }
            case 'returnPickups': return orders.filter(o =>
                o.deliveryType === 'Return Pickup' &&
                !['Delivered', 'Collected'].includes(o.deliveryStatus)
            );
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

    // ── Approval gate — placed after ALL hooks ──
    if (!isApproved) {
        return <PendingApprovalScreen partner={partner} onApproved={handleApproved} />;
    }


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
