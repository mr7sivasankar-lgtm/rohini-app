import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { getImageUrl } from '../../utils/api';
import './OrderTracking.css';

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

    // ─── Leaflet refs (not state — no re-renders) ───
    const mapContainerRef = useRef(null);
    const leafletMapRef = useRef(null);
    const dpMarkerRef = useRef(null);
    const markersAddedRef = useRef(false);

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
    const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
    const showMap = !!(
        order?.deliveryPartner &&
        order.deliveryPartner.location?.coordinates?.length >= 2 &&
        ACTIVE.includes(order?.status)
    );
    const dpLat = showMap ? order.deliveryPartner.location.coordinates[1] : null;
    const dpLng = showMap ? order.deliveryPartner.location.coordinates[0] : null;

    // ─── LEAFLET: Init map (pure DOM, no react-leaflet) ───
    useEffect(() => {
        if (!showMap || !mapContainerRef.current || leafletMapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
            dragging: true,
            attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org">OSM</a>',
            maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
        setMapReady(true);

        return () => {
            leafletMapRef.current?.remove();
            leafletMapRef.current = null;
            dpMarkerRef.current = null;
            markersAddedRef.current = false;
            setMapReady(false);
        };
    }, [showMap]);

    // ─── LEAFLET: Add / update markers ───
    useEffect(() => {
        const map = leafletMapRef.current;
        if (!mapReady || !map || dpLat === null || dpLng === null) return;

        const scooterIcon = L.divIcon({
            html: `<div style="font-size:26px;transform:scaleX(-1);filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));line-height:1;">🛵</div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
        });

        if (!markersAddedRef.current) {
            // ── First load: place all markers ──
            dpMarkerRef.current = L.marker([dpLat, dpLng], { icon: scooterIcon }).addTo(map);

            const shopC = order?.seller?.location?.coordinates;
            if (shopC?.length >= 2) {
                const shopIcon = L.divIcon({
                    html: `<div style="background:#10b981;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.25);">🏬</div>`,
                    className: '',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                });
                L.marker([shopC[1], shopC[0]], { icon: shopIcon }).addTo(map);
            }

            if (order?.shippingAddress?.latitude && order?.shippingAddress?.longitude) {
                const pinIcon = L.divIcon({
                    html: `<div style="font-size:26px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));line-height:1;">📍</div>`,
                    className: '',
                    iconSize: [30, 38],
                    iconAnchor: [15, 38],
                });
                L.marker(
                    [order.shippingAddress.latitude, order.shippingAddress.longitude],
                    { icon: pinIcon }
                ).addTo(map);
            }

            // Fit all points in view
            const pts = [[dpLat, dpLng]];
            if (shopC?.length >= 2) pts.push([shopC[1], shopC[0]]);
            if (order?.shippingAddress?.latitude) pts.push([
                order.shippingAddress.latitude,
                order.shippingAddress.longitude,
            ]);

            if (pts.length > 1) {
                map.fitBounds(pts, { padding: [50, 50] });
            } else {
                map.setView([dpLat, dpLng], 15);
            }

            markersAddedRef.current = true;
        } else {
            // ── Subsequent polls: only move scooter ──
            dpMarkerRef.current?.setLatLng([dpLat, dpLng]);
            map.panTo([dpLat, dpLng], { animate: true, duration: 1.5 });
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
                    {/* Raw Leaflet container — populated by useEffect */}
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

                {/* Green ETA banner */}
                {showMap && (
                    <div className="ot-eta-banner">
                        <span className="ot-eta-icon">🛵</span>
                        <span className="ot-eta-text">
                            Deliveryman arriving in&nbsp;
                            <strong>
                                {etaMins == null ? '...' : etaMins <= 1 ? 'less than a minute' : `${etaMins} mins`}
                            </strong>
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
                                        <button className="ot-link-btn exchange" onClick={() => openModal(item, 'exchange')}>Exchange</button>
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
