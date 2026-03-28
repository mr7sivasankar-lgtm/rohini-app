import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { getImageUrl } from '../../utils/api';
import './OrderTracking.css';

// ─── Fix Leaflet default icon paths broken by bundlers ───
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Custom map icons ───
const scooterIcon = L.divIcon({
    html: `<div class="ot-map-scooter">🛵</div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
});

const shopIcon = L.divIcon({
    html: `<div class="ot-map-shop">🏬</div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
});

const customerIcon = L.divIcon({
    html: `<div class="ot-map-pin">📍</div>`,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
});

// ─── Sub-component: smoothly re-center map when DP moves ───
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.panTo(center, { animate: true, duration: 1.5 });
    }, [center]);
    return null;
};

// ─── Sub-component: fit bounds on first load ───
const BoundsFitter = ({ points }) => {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (!fitted.current && points.length > 1) {
            map.fitBounds(points, { padding: [50, 50] });
            fitted.current = true;
        } else if (!fitted.current && points.length === 1) {
            map.setView(points[0], 15);
            fitted.current = true;
        }
    }, []);
    return null;
};

// ─── Main Component ───
const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', item: null });
    const [actionReason, setActionReason] = useState('');
    const [actionExchangeSize, setActionExchangeSize] = useState('');
    const [actionExchangeColor, setActionExchangeColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    // ─── Timer for return window ───
    const calculateTimeLeft = (deliveredTimestamp) => {
        const checkTime = () => {
            const diff = (new Date(deliveredTimestamp).getTime() + 3 * 3600000) - Date.now();
            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft('00:00:00');
            } else {
                setIsExpired(false);
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
            }
        };
        checkTime();
        const t = setInterval(checkTime, 1000);
        return () => clearInterval(t);
    };

    // ─── Fetch order data ───
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

    // ─── Live polling while delivery partner is active ───
    useEffect(() => {
        if (!order?.deliveryPartner) return;
        if (!['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status)) return;
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [order?.status, order?.deliveryPartner]);

    // ─── Loading / not found ───
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

    // ─── Derived state ───
    const ACTIVE_STATUSES = ['Assigned', 'Picked Up', 'Out for Delivery'];
    const showMap = !!(
        order.deliveryPartner &&
        order.deliveryPartner.location?.coordinates?.length >= 2 &&
        ACTIVE_STATUSES.includes(order.status)
    );

    const dpLat = showMap ? order.deliveryPartner.location.coordinates[1] : null;
    const dpLng = showMap ? order.deliveryPartner.location.coordinates[0] : null;
    const dpCenter = showMap ? [dpLat, dpLng] : null;

    const shopCoords = order.seller?.location?.coordinates;
    const shopCenter = shopCoords?.length >= 2 ? [shopCoords[1], shopCoords[0]] : null;
    const customerCenter = (order.shippingAddress?.latitude && order.shippingAddress?.longitude)
        ? [order.shippingAddress.latitude, order.shippingAddress.longitude]
        : null;

    const allMapPoints = [dpCenter, shopCenter, customerCenter].filter(Boolean);

    // ─── ETA via Haversine ───
    const etaMins = (() => {
        if (!showMap || !customerCenter) return null;
        const toRad = v => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(customerCenter[0] - dpLat);
        const dLon = toRad(customerCenter[1] - dpLng);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(dpLat)) * Math.cos(toRad(customerCenter[0])) * Math.sin(dLon / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.ceil((distKm / 20) * 60); // 20 km/h avg local speed
    })();

    // ─── Payment label ───
    const getPaymentLabel = (method) => {
        if (!method) return 'Online';
        const m = method.toLowerCase();
        if (m === 'cod') return 'Cash on Delivery';
        if (m === 'wallet') return 'Wallet';
        if (m === 'online' || m === 'upi') return 'Online / UPI';
        return method;
    };

    // ─── Date format ───
    const orderDate = new Date(order.createdAt);
    const isToday = new Date().toDateString() === orderDate.toDateString();
    const orderedOnStr = isToday
        ? `Today, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : `${orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // ─── Timeline ───
    const statusSteps = ['Placed', 'Accepted', 'Packed', 'Picked Up', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);

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

    // ─── Status display text ───
    const getStatusText = () => {
        if (order.status === 'Delivered') return 'Order Delivered!';
        if (order.status === 'Placed') return 'Order Placed';
        if (order.status === 'Accepted') return 'Order Accepted';
        if (order.status === 'Packed') return 'Order Packed';
        if (order.status === 'Out for Delivery') return 'Your order is on the way';
        return `Order ${order.status}`;
    };

    return (
        <div className="ot-page">

            {/* ══════════════════════════
                MAP SECTION (active orders)
            ══════════════════════════ */}
            {showMap ? (
                <div className="ot-map-wrapper">
                    <MapContainer
                        center={dpCenter}
                        zoom={14}
                        className="ot-map"
                        zoomControl={false}
                        scrollWheelZoom={false}
                        attributionControl={false}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="© OpenStreetMap contributors"
                            maxZoom={19}
                        />
                        <BoundsFitter points={allMapPoints} />
                        <MapUpdater center={dpCenter} />

                        {/* Delivery partner scooter */}
                        <Marker position={dpCenter} icon={scooterIcon} />

                        {/* Shop marker */}
                        {shopCenter && <Marker position={shopCenter} icon={shopIcon} />}

                        {/* Customer destination */}
                        {customerCenter && <Marker position={customerCenter} icon={customerIcon} />}
                    </MapContainer>

                    {/* Nav overlay on top of map */}
                    <div className="ot-map-nav">
                        <button className="ot-back-pill" onClick={() => navigate('/orders')}>
                            ←
                        </button>
                        <div className="ot-map-title-pill">Order Details</div>
                    </div>
                </div>
            ) : (
                /* ── Top nav (no map) ── */
                <div className="ot-top-nav">
                    <button className="ot-back-flat" onClick={() => navigate('/orders')}>← Back</button>
                    <h1 className="ot-top-title">Order Details</h1>
                </div>
            )}

            {/* ══════════════════════════
                BODY CONTENT
            ══════════════════════════ */}
            <div className="ot-body">

                {/* ── ETA Banner (active delivery) ── */}
                {showMap && (
                    <div className="ot-eta-banner">
                        <span className="ot-eta-icon">🛵</span>
                        <span className="ot-eta-text">
                            Deliveryman arriving in&nbsp;
                            <strong>
                                {etaMins == null
                                    ? '...'
                                    : etaMins <= 1
                                        ? 'less than a minute'
                                        : `${etaMins} mins`}
                            </strong>
                        </span>
                    </div>
                )}

                {/* ── Status Card (non-active orders) ── */}
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

                {/* ══════════════════════════
                    WHITE PANEL
                ══════════════════════════ */}
                <div className="ot-white-panel">

                    {/* ── Order summary row ── */}
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

                    {/* ── Shop row ── */}
                    <div className="ot-loc-row">
                        <div className="ot-loc-icon-wrap shop">🏬</div>
                        <div className="ot-loc-text">
                            <strong>{order.seller?.shopName || 'Shop'}</strong>
                            <span>{order.seller?.address || 'Shop'}</span>
                        </div>
                    </div>

                    {/* ── Delivery address row ── */}
                    <div className="ot-loc-row">
                        <div className="ot-loc-icon-wrap home">📍</div>
                        <div className="ot-loc-text">
                            <strong>Delivery location</strong>
                            <span>{order.shippingAddress?.fullAddress || order.shippingAddress?.street || 'Your address'}</span>
                        </div>
                    </div>

                    <div className="ot-divider" />

                    {/* ── Delivery partner ── */}
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

                    {/* ── Order Items ── */}
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
                                            <span className="ot-item-variant">
                                                {[item.size, item.color].filter(Boolean).join(' · ')}
                                            </span>
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
                                    <span className="ot-item-price">
                                        ₹{((item.sellingPrice || item.price) * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Return/Exchange actions for delivered orders */}
                        {order.status === 'Delivered' && !isExpired && (
                            <>
                                {timeLeft && (
                                    <div className="ot-return-window active">
                                        ⏱️ Return window: <strong>{timeLeft}</strong> remaining
                                    </div>
                                )}
                                {order.items.filter(i => i.status === 'Active').map((item, idx) => (
                                    <div key={idx} className="ot-item-actions">
                                        <span className="ot-item-actions-name">{item.name}</span>
                                        <div className="ot-item-action-btns">
                                            <button className="ot-link-btn return" onClick={() => openModal(item, 'return')}>Return</button>
                                            <button className="ot-link-btn exchange" onClick={() => openModal(item, 'exchange')}>Exchange</button>
                                            <button className="ot-link-btn review" onClick={() => navigate(`/product/${item.product?._id || item.product}`)}>Review</button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {order.status === 'Delivered' && isExpired && timeLeft && (
                            <div className="ot-return-window expired">⏳ Return window expired</div>
                        )}

                        {/* Cancel item during Placed/Accepted */}
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

                    {/* ── Bill Section ── */}
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

                {/* ══════════════════════════
                    ORDER TIMELINE
                ══════════════════════════ */}
                <div className="ot-timeline-card">
                    <h4 className="ot-section-title">Order Timeline</h4>
                    <div className="ot-timeline-h">
                        {statusSteps.map((step, idx) => {
                            const isCompleted = idx < currentStepIndex || (idx === currentStepIndex && idx === statusSteps.length - 1);
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

            {/* ══════════════════════════
                ACTION MODAL
            ══════════════════════════ */}
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
                            <textarea rows={3} placeholder={`Why are you requesting a ${actionModal.type}?`}
                                value={actionReason} onChange={e => setActionReason(e.target.value)} />
                        </div>
                        <p className="ot-modal-warning">
                            {actionModal.type === 'cancel'
                                ? 'This item will be permanently cancelled.'
                                : `Your ${actionModal.type} request will be reviewed.`}
                        </p>
                        <div className="ot-modal-actions">
                            <button className="ot-modal-btn secondary" onClick={closeModal} disabled={isSubmitting}>Keep It</button>
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
