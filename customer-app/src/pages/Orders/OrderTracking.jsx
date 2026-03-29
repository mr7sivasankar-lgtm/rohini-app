import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import './OrderTracking.css';

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyCXNIpwQ6rNmeH6oLU0j7y1bMECzZ65BpA';
let _gmapsLoaded = false, _gmapsLoading = false, _gmapsCbs = [];
function loadGM(cb) {
    if (_gmapsLoaded) return cb();
    _gmapsCbs.push(cb);
    if (_gmapsLoading) return;
    _gmapsLoading = true;
    window.__gmOTReady = () => { _gmapsLoaded = true; _gmapsLoading = false; _gmapsCbs.forEach(f => f()); _gmapsCbs = []; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&callback=__gmOTReady&libraries=directions`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
}

// ─── Main Component ───
const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    // ─── State ───
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', item: null });
    const [actionReason, setActionReason] = useState('');
    const [actionExchangeSize, setActionExchangeSize] = useState('');
    const [actionExchangeColor, setActionExchangeColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // ─── Google Maps refs (not state — no re-renders) ───
    const mapContainerRef = useRef(null);
    const googleMapRef = useRef(null);
    const dpMarkerRef = useRef(null);
    const markersAddedRef = useRef(false);
    const routePolylineRef = useRef(null);

    // ─── Return window countdown ───
    const calculateTimeLeft = (deliveredTimestamp) => {
        const tick = () => {
            const diff = (new Date(deliveredTimestamp).getTime() + 3 * 3600000) - Date.now();
            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft('00:00:00');
            } else {
                setIsExpired(false);
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            }
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    };

    // ─── Fetch order ───
    const fetchOrder = async () => {
        try {
            const res = await api.get('/orders');
            if (res.data.success) {
                const found = res.data.data.find(o => o.orderId === orderId);
                setOrder(found);
                if (found?.status === 'Delivered') {
                    const ds = found.statusHistory?.find(s => s.status === 'Delivered');
                    if (ds) calculateTimeLeft(ds.timestamp);
                }
            }
        } catch (err) {
            console.error('Error fetching order:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [orderId]);

    // ─── Live polling ───
    useEffect(() => {
        if (!order?.deliveryPartner) return;
        if (!['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status)) return;
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [order?.status, order?.deliveryPartner]);

    // ─── Derived values ───
    // Show map as soon as a delivery partner is ASSIGNED (deliveryPartner exists + has location)
    const showMap = !!(
        order?.deliveryPartner &&
        order.deliveryPartner.location?.coordinates?.length >= 2
    );
    const dpLat = showMap ? order.deliveryPartner.location.coordinates[1] : null;
    const dpLng = showMap ? order.deliveryPartner.location.coordinates[0] : null;

    // ─── Google Maps: Init map ───
    useEffect(() => {
        if (!showMap || !mapContainerRef.current || googleMapRef.current) return;

        loadGM(() => {
            if (!mapContainerRef.current || googleMapRef.current) return;
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat: dpLat, lng: dpLng },
                zoom: 14,
                disableDefaultUI: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
                styles: [
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
                    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
                ]
            });
            googleMapRef.current = map;
            setMapReady(true);
        });

        return () => {
            googleMapRef.current = null;
            dpMarkerRef.current = null;
            markersAddedRef.current = false;
            routePolylineRef.current = null;
            setMapReady(false);
        };
    }, [showMap]);

    // Delivery person SVG marker (scooter + rider with bag, like reference image)
    const makeDeliveryMarkerIcon = (size = 56) => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.1}" viewBox="0 0 56 62">
  <!-- Shadow -->
  <ellipse cx="28" cy="59" rx="14" ry="3" fill="rgba(0,0,0,0.15)"/>
  <!-- Scooter body -->
  <rect x="10" y="36" width="36" height="12" rx="6" fill="#e53935"/>
  <!-- Front fender -->
  <path d="M40 36 Q50 36 50 44 Q50 48 44 48 L38 48 L38 36 Z" fill="#c62828"/>
  <!-- Rear body -->
  <path d="M10 36 Q6 36 6 44 Q6 48 12 48 L18 48 L18 36 Z" fill="#c62828"/>
  <!-- Wheels -->
  <circle cx="14" cy="49" r="6" fill="#333"/>
  <circle cx="14" cy="49" r="3" fill="#888"/>
  <circle cx="42" cy="49" r="6" fill="#333"/>
  <circle cx="42" cy="49" r="3" fill="#888"/>
  <!-- Delivery box/bag on rear -->
  <rect x="10" y="24" width="16" height="14" rx="3" fill="#1565c0"/>
  <rect x="12" y="26" width="12" height="3" rx="1" fill="#1976d2"/>
  <text x="18" y="36" text-anchor="middle" font-size="7" fill="white" font-weight="bold">ROHINI</text>
  <!-- Handlebar -->
  <rect x="37" y="29" width="2" height="9" rx="1" fill="#555"/>
  <rect x="33" y="29" width="8" height="2" rx="1" fill="#444"/>
  <!-- Seat -->
  <rect x="22" y="30" width="14" height="5" rx="3" fill="#880e0e"/>
  <!-- Rider body -->
  <ellipse cx="30" cy="22" rx="7" ry="9" fill="#1b5e20"/>
  <!-- Rider head -->
  <circle cx="30" cy="11" r="6" fill="#f9a825"/>
  <!-- Helmet -->
  <path d="M24 11 Q24 4 30 4 Q36 4 36 11 Q36 14 30 14 Q24 14 24 11Z" fill="#e53935"/>
  <rect x="25" y="12" width="10" height="2" rx="1" fill="#ffcdd2"/>
  <!-- Visor -->
  <path d="M26 10 Q30 8 34 10" stroke="white" stroke-width="1.5" fill="none"/>
  <!-- Arms -->
  <line x1="30" y1="20" x2="37" y2="27" stroke="#1b5e20" stroke-width="3" stroke-linecap="round"/>
</svg>`),
        scaledSize: new window.google.maps.Size(size, Math.round(size * 1.1)),
        anchor: new window.google.maps.Point(size / 2, Math.round(size * 1.0)),
    });

    const makeIcon = (emoji, size = 36) => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><text y="${size * 0.85}" font-size="${size * 0.85}">${emoji}</text></svg>`
        ),
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
    });

    // Home pin icon (green circle + house icon)
    const makeHomePinIcon = () => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <circle cx="20" cy="20" r="20" fill="#1b5e20"/>
  <path d="M20 7 L8 18 L12 18 L12 32 L17 32 L17 24 L23 24 L23 32 L28 32 L28 18 L32 18 Z" fill="white"/>
  <path d="M20 45 L14 32 L26 32 Z" fill="#1b5e20"/>
</svg>`),
        scaledSize: new window.google.maps.Size(40, 52),
        anchor: new window.google.maps.Point(20, 50),
    });

    // ─── Google Maps: Add / update markers + blue route ───
    useEffect(() => {
        const map = googleMapRef.current;
        if (!mapReady || !map || dpLat === null || dpLng === null) return;

        if (!markersAddedRef.current) {
            // ── First load: place all markers ──
            dpMarkerRef.current = new window.google.maps.Marker({
                position: { lat: dpLat, lng: dpLng },
                map,
                icon: makeDeliveryMarkerIcon(56),
                title: 'Delivery Partner',
                zIndex: 10,
            });

            const shopC = order?.seller?.location?.coordinates;
            if (shopC?.length >= 2) {
                new window.google.maps.Marker({
                    position: { lat: shopC[1], lng: shopC[0] },
                    map,
                    icon: makeIcon('🏬', 32),
                    title: 'Shop',
                });
            }

            const destLat = order?.shippingAddress?.latitude;
            const destLng = order?.shippingAddress?.longitude;
            if (destLat && destLng) {
                new window.google.maps.Marker({
                    position: { lat: destLat, lng: destLng },
                    map,
                    icon: makeHomePinIcon(),
                    title: 'Delivery Address',
                    zIndex: 9,
                });

                // ── Draw blue route from DP to customer ──
                const directionsService = new window.google.maps.DirectionsService();
                directionsService.route({
                    origin: { lat: dpLat, lng: dpLng },
                    destination: { lat: destLat, lng: destLng },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === 'OK') {
                        // Use raw polyline for better control
                        const path = result.routes[0].overview_path;
                        if (routePolylineRef.current) routePolylineRef.current.setMap(null);
                        routePolylineRef.current = new window.google.maps.Polyline({
                            path,
                            geodesic: true,
                            strokeColor: '#1565C0',
                            strokeOpacity: 1,
                            strokeWeight: 4,
                            map,
                        });
                    } else {
                        // Fallback: straight dashed line
                        if (routePolylineRef.current) routePolylineRef.current.setMap(null);
                        routePolylineRef.current = new window.google.maps.Polyline({
                            path: [{ lat: dpLat, lng: dpLng }, { lat: destLat, lng: destLng }],
                            geodesic: true,
                            strokeColor: '#1565C0',
                            strokeOpacity: 0.7,
                            strokeWeight: 3,
                            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
                            map,
                        });
                    }
                });
            }

            // Fit all points in view
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend({ lat: dpLat, lng: dpLng });
            if (shopC?.length >= 2) bounds.extend({ lat: shopC[1], lng: shopC[0] });
            if (order?.shippingAddress?.latitude) bounds.extend({ lat: order.shippingAddress.latitude, lng: order.shippingAddress.longitude });
            map.fitBounds(bounds, { top: 80, bottom: 60, left: 40, right: 40 });

            markersAddedRef.current = true;
        } else {
            // ── Subsequent polls: move scooter + update route ──
            dpMarkerRef.current?.setPosition({ lat: dpLat, lng: dpLng });

            // Re-draw route from updated DP position
            const destLat = order?.shippingAddress?.latitude;
            const destLng = order?.shippingAddress?.longitude;
            if (destLat && destLng) {
                const directionsService = new window.google.maps.DirectionsService();
                directionsService.route({
                    origin: { lat: dpLat, lng: dpLng },
                    destination: { lat: destLat, lng: destLng },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === 'OK') {
                        const path = result.routes[0].overview_path;
                        if (routePolylineRef.current) routePolylineRef.current.setPath(path);
                    } else if (routePolylineRef.current) {
                        routePolylineRef.current.setPath([
                            { lat: dpLat, lng: dpLng },
                            { lat: destLat, lng: destLng }
                        ]);
                    }
                });
            }
        }
    }, [mapReady, dpLat, dpLng]);

    // ─── ETA via Haversine ───
    const etaMins = (() => {
        if (!showMap || !order?.shippingAddress?.latitude) return null;
        const toRad = v => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(order.shippingAddress.latitude - dpLat);
        const dLon = toRad(order.shippingAddress.longitude - dpLng);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(dpLat)) * Math.cos(toRad(order.shippingAddress.latitude)) *
            Math.sin(dLon / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.ceil((distKm / 20) * 60);
    })();

    // ─── Modal helpers ───
    const openModal = (item, type) => {
        setActionModal({ isOpen: true, type, item });
        setActionReason('');
        setActionExchangeSize('');
        setActionExchangeColor('');
    };
    const closeModal = () => {
        setActionModal({ isOpen: false, type: '', item: null });
        setActionReason('');
        setActionExchangeSize('');
        setActionExchangeColor('');
    };
    const handleActionItem = async () => {
        if (!actionModal.item || !actionModal.type) return;
        setIsSubmitting(true);
        try {
            const payload = { itemId: actionModal.item._id, action: actionModal.type, reason: actionReason };
            if (actionModal.type === 'exchange') {
                payload.exchangeSize = actionExchangeSize;
                payload.exchangeColor = actionExchangeColor;
            }
            await api.put(`/orders/${order._id}/item-action`, payload);
            await fetchOrder();
            closeModal();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Payment label — prefer actual collected method over original ───
    const getPaymentLabel = (method) => {
        // If delivery partner already collected and recorded how — show that
        if (order.paymentCollectedVia) {
            return order.paymentCollectedVia; // Cash / UPI / Card / Online
        }
        if (!method) return 'Online';
        const m = method.toLowerCase();
        if (m === 'cod') return 'Cash on Delivery';
        if (m === 'wallet') return 'Wallet';
        return 'Online / UPI';
    };

    // ─── Date label ───
    const orderDate = order ? new Date(order.createdAt) : null;
    const orderedOnStr = orderDate
        ? (new Date().toDateString() === orderDate.toDateString()
            ? `Today, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `${orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
        : '';

    // ─── Status text ───
    const getStatusText = () => {
        const map = {
            'Delivered': 'Order Delivered!',
            'Placed': 'Order Placed',
            'Accepted': 'Order Accepted',
            'Packed': 'Order Packed',
            'Out for Delivery': 'Your order is on the way',
        };
        return map[order?.status] || `Order ${order?.status}`;
    };

    // ─── Timeline steps ───
    const statusSteps = ['Placed', 'Accepted', 'Packed', 'Picked Up', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order?.status);

    // ─── Loading / empty ───
    if (loading) {
        return (
            <div className="ot-loading">
                <div className="ot-spinner" />
                <p>Loading order...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="ot-empty-state">
                <div className="ot-empty-icon">📦</div>
                <h2>Order not found</h2>
                <button className="ot-btn-primary" onClick={() => navigate('/orders')}>View All Orders</button>
            </div>
        );
    }

    return (
        <div className="ot-page">

            {/* ══ MAP (active delivery) ══ */}
            {showMap ? (
                <div className="ot-map-wrapper">
                    {/* Google Maps container */}
                    <div ref={mapContainerRef} className="ot-map" />

                    {/* Overlay nav on top of map */}
                    <div className="ot-map-nav">
                        <button className="ot-back-pill" onClick={() => navigate('/orders')}>←</button>
                        <div className="ot-map-title-pill">Order Details</div>
                    </div>
                </div>
            ) : (
                <div className="ot-top-nav">
                    <button className="ot-back-flat" onClick={() => navigate('/orders')}>← Back</button>
                    <h1 className="ot-top-title">Order Details</h1>
                </div>
            )}

            {/* ══ BODY ══ */}
            <div className="ot-body">

                {/* Green ETA / status banner */}
                {showMap && (
                    <div className="ot-eta-banner">
                        <span className="ot-eta-icon">🛵</span>
                        <span className="ot-eta-text">
                            {order?.deliveryStatus === 'Assigned'
                                ? <><strong>{order.deliveryPartner?.name || 'Your delivery partner'}</strong>&nbsp;has accepted your order &amp; is heading to pick it up</>
                                : order?.deliveryStatus === 'Picked Up'
                                ? <>Order picked up! Arriving in&nbsp;<strong>{etaMins == null ? '...' : etaMins <= 1 ? 'less than a minute' : `${etaMins} mins`}</strong></>
                                : <>Deliveryman arriving in&nbsp;<strong>{etaMins == null ? '...' : etaMins <= 1 ? 'less than a minute' : `${etaMins} mins`}</strong></>
                            }
                        </span>
                    </div>
                )}

                {/* Status card (non-active) */}
                {!showMap && (
                    <div className="ot-status-card">
                        <div className="ot-status-icon-box">
                            {order.status === 'Delivered' ? '✅' : '🛍️'}
                        </div>
                        <div className="ot-status-info">
                            <h3>{getStatusText()}</h3>
                            <p className="ot-item-preview-text">
                                {order.items.map(i => i.name).join(' · ').substring(0, 45)}
                                {order.items.map(i => i.name).join(' · ').length > 45 ? '...' : ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* ══ WHITE PANEL ══ */}
                <div className="ot-white-panel">

                    {/* Summary row */}
                    <div className="ot-summary-row">
                        <div className="ot-summary-left">
                            <strong className="ot-summary-shop">{order.seller?.shopName || 'Shop'}</strong>
                            <span className="ot-summary-meta">
                                ₹{(order.totalAmount || 0).toFixed(2)}&nbsp;•&nbsp;
                                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                        <button
                            className="ot-detail-btn"
                            onClick={() => document.getElementById('ot-items')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Detail
                        </button>
                    </div>

                    <div className="ot-divider" />

                    {/* Shop row */}
                    <div className="ot-loc-row">
                        <div className="ot-loc-icon-wrap shop">🏬</div>
                        <div className="ot-loc-text">
                            <strong>{order.seller?.shopName || 'Shop'}</strong>
                            <span>{order.seller?.address || 'Shop location'}</span>
                        </div>
                    </div>

                    {/* Delivery address */}
                    <div className="ot-loc-row">
                        <div className="ot-loc-icon-wrap home">📍</div>
                        <div className="ot-loc-text">
                            <strong>Delivery location</strong>
                            <span>{order.shippingAddress?.fullAddress || order.shippingAddress?.street || 'Your address'}</span>
                        </div>
                    </div>

                    <div className="ot-divider" />

                    {/* Delivery partner */}
                    {order.deliveryPartner && (
                        <div className="ot-partner-row">
                            <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.deliveryPartner.name}&backgroundColor=10b981`}
                                alt={order.deliveryPartner.name}
                                className="ot-partner-avatar"
                            />
                            <div className="ot-partner-info">
                                <strong>{order.deliveryPartner.name}</strong>
                                <span>Delivery&nbsp;•&nbsp;{order.deliveryPartner.phone}</span>
                            </div>
                            <div className="ot-partner-actions">
                                <a href={`tel:${order.deliveryPartner.phone}`} className="ot-icon-btn green">📞</a>
                                <a href={`sms:${order.deliveryPartner.phone}`} className="ot-icon-btn yellow">💬</a>
                            </div>
                        </div>
                    )}

                    <div className="ot-divider" />

                    {/* Order items */}
                    <div id="ot-items" className="ot-items-section">
                        <h4 className="ot-section-title">Ordered Item(s)</h4>
                        {order.items.map((item, idx) => (
                            <div key={idx} className="ot-item-row">
                                <div className="ot-item-left">
                                    {item.image
                                        ? <img src={getImageUrl(item.image)} alt={item.name} className="ot-item-thumb" />
                                        : <div className="ot-item-thumb-placeholder">🛍️</div>
                                    }
                                    <div className="ot-item-details">
                                        <span className="ot-item-name">{item.name}</span>
                                        {(item.size || item.color) && (
                                            <span className="ot-item-variant">{[item.size, item.color].filter(Boolean).join(' · ')}</span>
                                        )}
                                        {item.status !== 'Active' && (
                                            <span className={`ot-item-flag flag-${item.status?.replace(/ /g, '-').toLowerCase()}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="ot-item-right">
                                    <span className="ot-item-qty">×{item.quantity}</span>
                                    <span className="ot-item-price">₹{((item.sellingPrice || item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Return/Exchange window */}
                        {order.status === 'Delivered' && timeLeft && (
                            <div className={`ot-return-window ${isExpired ? 'expired' : 'active'}`}>
                                {isExpired
                                    ? '⏳ Return window expired'
                                    : `⏱️ Return window: ${timeLeft} remaining`}
                            </div>
                        )}

                        {/* Return/Exchange action buttons */}
                        {order.status === 'Delivered' && !isExpired &&
                            order.items.filter(i => i.status === 'Active').map((item, idx) => (
                                <div key={idx} className="ot-item-actions">
                                    <span className="ot-item-actions-name">{item.name}</span>
                                    <div className="ot-item-action-btns">
                                        <button className="ot-link-btn return" onClick={() => openModal(item, 'return')}>Return</button>
                                        <button className="ot-link-btn review" onClick={() => navigate(`/product/${item.product?._id || item.product}`)}>Review</button>
                                    </div>
                                </div>
                            ))
                        }

                        {/* Cancel item (Placed/Accepted) */}
                        {['Placed', 'Accepted'].includes(order.status) &&
                            order.items.filter(i => i.status === 'Active').map((item, idx) => (
                                <div key={idx} className="ot-item-actions">
                                    <span className="ot-item-actions-name">{item.name}</span>
                                    <div className="ot-item-action-btns">
                                        <button className="ot-link-btn cancel" onClick={() => openModal(item, 'cancel')}>Cancel Item</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="ot-divider dashed" />

                    {/* Bill section */}
                    <div className="ot-bill-section">
                        <div className="ot-bill-row">
                            <span>Item total</span>
                            <span>₹{(order.sellingPriceTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="ot-bill-row">
                            <span>Delivery fee</span>
                            {order.deliveryFee > 0
                                ? <span>₹{(order.deliveryFee || 0).toFixed(2)}</span>
                                : <span className="ot-free">FREE</span>}
                        </div>
                        {order.platformFee > 0 && (
                            <div className="ot-bill-row">
                                <span>Taxes &amp; Charges</span>
                                <span>₹{(order.platformFee || 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="ot-bill-divider" />
                        <div className="ot-bill-total-row">
                            <span className="ot-payment-label">
                                <span className="ot-payment-check">✅</span>
                                Pay via {getPaymentLabel(order.paymentMethod)}
                            </span>
                            <strong className="ot-grand-total">₹{(order.totalAmount || 0).toFixed(2)}</strong>
                        </div>
                        <div className="ot-bill-meta">
                            <div className="ot-meta-row">
                                <span>Order ID</span>
                                <span className="ot-meta-val">{order.orderId}</span>
                            </div>
                            <div className="ot-meta-row">
                                <span>Ordered on</span>
                                <span className="ot-meta-val">{orderedOnStr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ TIMELINE ══ */}
                <div className="ot-timeline-card">
                    <h4 className="ot-section-title">Order Timeline</h4>
                    <div className="ot-timeline-h">
                        {statusSteps.map((step, idx) => {
                            const isCompleted = idx < currentStepIndex ||
                                (idx === currentStepIndex && idx === statusSteps.length - 1);
                            const isCurrent = idx === currentStepIndex;
                            let ts = null;
                            if (idx <= currentStepIndex && order.statusHistory) {
                                const h = order.statusHistory.find(x => x.status === step);
                                if (h?.timestamp) {
                                    const d = new Date(h.timestamp);
                                    ts = `${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}\n${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
                                }
                            }
                            return (
                                <div key={step} className={`ot-h-step${idx <= currentStepIndex ? ' active' : ''}`}>
                                    <div className="ot-h-indicator">
                                        <div className={`ot-h-dot${isCompleted ? ' completed' : isCurrent ? ' current' : ''}`}>
                                            {isCompleted && <span className="ot-h-check">✓</span>}
                                        </div>
                                        {idx < statusSteps.length - 1 && (
                                            <div className={`ot-h-line${isCompleted ? ' done' : ''}`} />
                                        )}
                                    </div>
                                    <div className="ot-h-content">
                                        <h5>{step}</h5>
                                        {ts && <p>{ts}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>{/* end ot-body */}

            {/* ══ ACTION MODAL ══ */}
            {actionModal.isOpen && (
                <div className="ot-modal-overlay" onClick={closeModal}>
                    <div className="ot-modal" onClick={e => e.stopPropagation()}>
                        <h3>{actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)} Item</h3>
                        <div className="ot-modal-preview">
                            {actionModal.item.image && (
                                <img src={getImageUrl(actionModal.item.image)} alt={actionModal.item.name} />
                            )}
                            <div>
                                <h4>{actionModal.item.name}</h4>
                                <span>Qty: {actionModal.item.quantity}</span>
                            </div>
                        </div>
                        {actionModal.type === 'exchange' && (
                            <div className="ot-modal-exchange">
                                <div className="ot-modal-field">
                                    <label>New Size (Optional)</label>
                                    <select value={actionExchangeSize} onChange={e => setActionExchangeSize(e.target.value)}>
                                        <option value="">Same Size</option>
                                        {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="ot-modal-field">
                                    <label>New Color (Optional)</label>
                                    <input type="text" placeholder="e.g. Red" value={actionExchangeColor}
                                        onChange={e => setActionExchangeColor(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="ot-modal-field">
                            <label>Reason (Optional)</label>
                            <textarea rows={3}
                                placeholder={`Why are you requesting a ${actionModal.type}?`}
                                value={actionReason}
                                onChange={e => setActionReason(e.target.value)}
                            />
                        </div>
                        <p className="ot-modal-warning">
                            {actionModal.type === 'cancel'
                                ? 'This item will be permanently cancelled.'
                                : `Your ${actionModal.type} request will be reviewed.`}
                        </p>
                        <div className="ot-modal-actions">
                            <button className="ot-modal-btn secondary" onClick={closeModal} disabled={isSubmitting}>
                                Keep It
                            </button>
                            <button
                                className={`ot-modal-btn ${actionModal.type === 'cancel' ? 'danger' : 'primary'}`}
                                onClick={handleActionItem}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : `Confirm ${actionModal.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderTracking;
