import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const DELIVERY_TYPE_LABELS = { Normal: '🚚 Normal', 'Return Pickup': '↩️ Return', 'Exchange Pickup': '🔄 Exchange' };
const STATUS_COLORS = { Assigned: '#f59e0b', 'Picked Up': '#22c55e', 'Out for Delivery': '#16a34a' };

export default function Dashboard() {
    const { partner, updatePartner } = useAuth();
    const navigate = useNavigate();

    const [isOnline, setIsOnline] = useState(partner?.isOnline || false);
    const [stats, setStats] = useState({ assigned: 0, pending: 0, deliveredToday: 0, returnPickups: 0, exchangePickups: 0 });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null); // null = All
    const [dpPosition, setDpPosition] = useState(null);

    // Leaflet refs
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const dpMarkerRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

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

    // ── Init Leaflet map ──
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
            dragging: true,
            attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        map.setView([20.5937, 78.9629], 5); // default India center

        mapRef.current = map;
        setMapReady(true);

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            dpMarkerRef.current = null;
            setMapReady(false);
        };
    }, []);

    // ── Update scooter marker when GPS changes ──
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map || !dpPosition) return;
        const { lat, lng } = dpPosition;

        const scooterIcon = L.divIcon({
            html: `<div class="dp-scooter-marker">🛵</div>`,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        if (!dpMarkerRef.current) {
            dpMarkerRef.current = L.marker([lat, lng], { icon: scooterIcon }).addTo(map);
            map.setView([lat, lng], 15);
        } else {
            dpMarkerRef.current.setLatLng([lat, lng]);
        }
    }, [mapReady, dpPosition]);

    // ── Locate-me button ──
    const handleLocateMe = () => {
        const map = mapRef.current;
        if (!map) return;
        if (dpPosition) {
            map.flyTo([dpPosition.lat, dpPosition.lng], 16, { animate: true, duration: 1.2 });
        } else {
            navigator.geolocation?.getCurrentPosition(
                (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true }),
                () => alert('Unable to get location. Please allow GPS access.')
            );
        }
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
            case 'returnPickups':   return orders.filter(o => o.deliveryType === 'Return Pickup');
            case 'exchangePickups': return orders.filter(o => o.deliveryType === 'Exchange Pickup');
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
        { key: 'exchangePickups', label: 'Exchange',  value: stats.exchangePickups, color: '#8b5cf6', icon: '🔄' },
    ];

    const SECTION_LABEL = {
        null:           'Active Deliveries',
        assigned:       'Assigned Orders',
        pending:        'Pending Orders',
        deliveredToday: 'Delivered Today',
        returnPickups:  'Return Pickups',
        exchangePickups:'Exchange Pickups',
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

            {/* ── Live Location Map ── */}
            <div className="dp-map-section">
                <div ref={mapContainerRef} className="dp-map" />

                {dpPosition && <div className="dp-map-badge">📍 Live Location</div>}

                {!dpPosition && (
                    <div className="dp-map-locating">
                        <span className="dp-map-locating-dot" />
                        Locating you…
                    </div>
                )}

                {/* Locate-me button */}
                <button className="dp-locate-btn" onClick={handleLocateMe}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" width="16" height="16">
                        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
                        <circle cx="12" cy="12" r="7"/>
                        <line x1="12" y1="2" x2="12" y2="5"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                        <line x1="2"  y1="12" x2="5"  y2="12"/>
                        <line x1="19" y1="12" x2="22" y2="12"/>
                    </svg>
                    Locate Me
                </button>
            </div>

            {/* ── Stats Tabs (below map) ── */}
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
                            <span className="tab-value" style={{ color: isActive ? tab.color : '#1e293b' }}>
                                {tab.value}
                            </span>
                            <span className="tab-label" style={{ color: isActive ? tab.color : '#64748b' }}>
                                {tab.label}
                            </span>
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
                                        <div
                                            className="delivery-type-badge"
                                            style={{ background: order.deliveryType === 'Normal' ? '#dcfce7' : '#fef3c7', color: order.deliveryType === 'Normal' ? '#16a34a' : '#b45309' }}
                                        >
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

        </div>
    );
}
