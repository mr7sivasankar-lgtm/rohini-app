import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './OrderDetail.css';

const NEXT_STATUS_NORMAL = {
    'Assigned':         'Picked Up',
    'Picked Up':        'Out for Delivery',
    'Out for Delivery': 'Delivered',
};

const NEXT_STATUS_RETURN = {
    'Assigned':  'Picked Up',
    'Picked Up': 'Collected',
};

const STATUS_STEPS_NORMAL = ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];
const STATUS_STEPS_RETURN = ['Assigned', 'Picked Up', 'Collected'];

const PAYMENT_OPTIONS = [
    { value: 'Cash', label: '💵 Cash', color: '#10b981' },
    { value: 'UPI',  label: '📱 UPI',  color: '#6366f1' },
    { value: 'Card', label: '💳 Card', color: '#f59e0b' },
    { value: 'Online', label: '🌐 Online', color: '#3b82f6' },
];

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { partner } = useAuth();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Payment collection modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/delivery/orders/single/${id}`);
            setOrder(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    const isReturnPickup = order?.deliveryType === 'Return Pickup';
    const NEXT_STATUS = isReturnPickup ? NEXT_STATUS_RETURN : NEXT_STATUS_NORMAL;
    const STATUS_STEPS = isReturnPickup ? STATUS_STEPS_RETURN : STATUS_STEPS_NORMAL;
    const currentStepIndex = STATUS_STEPS.indexOf(order?.deliveryStatus);

    const nextStatus = NEXT_STATUS[order?.deliveryStatus];
    const isAboutToDeliver = nextStatus === 'Delivered';

    // Handle button click — intercept "Delivered" to show payment modal first
    const handleStatusBtn = () => {
        if (isAboutToDeliver) {
            setSelectedPayment('');
            setShowPaymentModal(true);
        } else {
            confirmStatusUpdate(null);
        }
    };

    const confirmStatusUpdate = async (paymentMethod) => {
        const next = NEXT_STATUS[order.deliveryStatus];
        if (!next) return;
        setShowPaymentModal(false);
        setUpdating(true);
        try {
            const body = { deliveryStatus: next };
            if (paymentMethod) body.paymentCollectedVia = paymentMethod;

            await api.put(`/delivery/orders/${id}/status`, body);
            await fetchOrder();
            if (next === 'Delivered') {
                alert('✅ Order marked as Delivered!');
                navigate('/');
            }
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const callCustomer = () => {
        const phone = order.contactInfo?.phone || order.user?.phone;
        if (phone) window.open(`tel:${phone}`);
    };

    const originParam = (partner?.location?.coordinates)
        ? `&origin=${partner.location.coordinates[1]},${partner.location.coordinates[0]}`
        : '';

    const navigateToPickup = () => {
        const sel = order.sellerLocation;
        if (sel && sel.lat && sel.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1${originParam}&destination=${sel.lat},${sel.lng}`);
        } else if (order.sellerShopAddress) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.sellerShopAddress)}`);
        } else {
            alert('Seller location not available.');
        }
    };

    const navigateToCustomer = () => {
        const { latitude, longitude, fullAddress, city } = order.shippingAddress || {};
        if (latitude && longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1${originParam}&destination=${latitude},${longitude}`);
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fullAddress}, ${city}`)}`);
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
    if (!order) return <div className="loading-page"><p>Order not found</p></div>;

    return (
        <div className="order-detail-page">

            {/* Header */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h2>Order #{order.orderId?.slice(-6)}</h2>
                <div className={`delivery-type-tag ${isReturnPickup ? 'return-tag' : ''}`}>
                    {isReturnPickup ? '↩️ Return Pickup' : order.deliveryType}
                </div>
            </div>

            {/* Progress Steps */}
            <div className="progress-bar-container">
                {STATUS_STEPS.map((step, idx) => (
                    <div key={step} className={`step ${idx <= currentStepIndex ? 'done' : ''} ${idx === currentStepIndex ? 'active' : ''}`}>
                        <div className="step-dot">{idx < currentStepIndex ? '✓' : idx + 1}</div>
                        <div className="step-label">{step}</div>
                        {idx < STATUS_STEPS.length - 1 && <div className={`step-line ${idx < currentStepIndex ? 'filled' : ''}`}></div>}
                    </div>
                ))}
            </div>

            {/* Delivery Earnings Banner */}
            {order.deliveryEarning > 0 && (
                <div style={{ margin: '0 16px 16px', background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Delivery Earning</span>
                    <span style={{ fontSize: '18px', fontWeight: 800 }}>+₹{order.deliveryEarning.toFixed(0)}</span>
                </div>
            )}

            {/* Payment Method Info (shows what customer initially chose) */}
            <div style={{ margin: '0 16px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Order Payment Method</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: order.paymentMethod === 'COD' ? '#f59e0b' : '#10b981' }}>
                    {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Online Paid'}
                </span>
            </div>

            {/* Collected Via (once delivered) */}
            {order.paymentCollectedVia && (
                <div style={{ margin: '0 16px 16px', background: '#ecfdf5', border: '1px solid #10b981', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#047857', fontWeight: 600 }}>Payment Collected Via</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                        ✅ {order.paymentCollectedVia}
                    </span>
                </div>
            )}

            {/* Pickup Location */}
            <div className="detail-card location-card">
                <h3>🏪 Pickup From</h3>
                <div className="detail-row">
                    <span>Shop</span>
                    <strong>{order.sellerShopName || order.items?.[0]?.sellerShopName || 'Seller Shop'}</strong>
                </div>
                {order.sellerShopAddress && (
                    <div className="detail-row">
                        <span>Address</span>
                        <strong>📍 {order.sellerShopAddress}</strong>
                    </div>
                )}
                <button className="map-nav-btn pickup-nav-btn" onClick={navigateToPickup}>
                    🗺️ Navigate to Pickup
                </button>
            </div>

            {/* Customer Info */}
            <div className="detail-card location-card">
                <h3>📦 Deliver To</h3>
                <div className="detail-row"><span>Name</span><strong>{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</strong></div>
                <div className="detail-row"><span>Phone</span><strong>{order.contactInfo?.phone || order.user?.phone}</strong></div>
                <div className="detail-row">
                    <span>Address</span>
                    <strong>📍 {order.shippingAddress?.fullAddress}, {order.shippingAddress?.city}, {order.shippingAddress?.pincode}</strong>
                </div>
                <div className="nav-buttons-row">
                    <button className="action-btn call-btn" onClick={callCustomer}>
                        <span>📞</span> Call Customer
                    </button>
                    <button className="map-nav-btn customer-nav-btn" onClick={navigateToCustomer}>
                        🗺️ Navigate to Customer
                    </button>
                </div>
            </div>

            {/* Items */}
            <div className="detail-card">
                <h3>🛍️ Items</h3>
                {order.items?.map((item, idx) => (
                    <div key={idx} className="item-row">
                        <div className="item-img-wrap">
                            {item.image ? <img src={item.image} alt={item.name} /> : <div className="img-placeholder">📦</div>}
                        </div>
                        <div className="item-info">
                            <div className="item-name">{item.name}</div>
                            <div className="item-meta">
                                {item.size && <span>Size: {item.size}</span>}
                                {item.color && <span>Color: {item.color}</span>}
                                <span>Qty: {item.quantity}</span>
                            </div>
                        </div>
                        <div className="item-price">₹{item.sellingPrice || item.price}</div>
                    </div>
                ))}
                <div className="total-row"><span>Total Order Value</span><strong>₹{order.total?.toFixed(2)}</strong></div>
            </div>

            {/* Status Update Button */}
            {NEXT_STATUS[order.deliveryStatus] && (
                <button
                    className={`status-update-btn ${isAboutToDeliver ? 'deliver-btn' : ''}`}
                    onClick={handleStatusBtn}
                    disabled={updating}
                >
                    {updating
                        ? 'Updating…'
                        : isAboutToDeliver
                            ? '💰 Collect Payment & Deliver →'
                            : `Mark as "${NEXT_STATUS[order.deliveryStatus]}" →`}
                </button>
            )}

            {order.deliveryStatus === 'Delivered' && (
                <div className="delivered-banner">✅ This order has been delivered!</div>
            )}
            {order.deliveryStatus === 'Collected' && (
                <div className="delivered-banner">✅ Return collected successfully! Stock restored.</div>
            )}

            {/* ══ PAYMENT COLLECTION MODAL ══ */}
            {showPaymentModal && (
                <div className="od-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="od-payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="od-modal-header">
                            <span className="od-modal-icon">💰</span>
                            <h3>Payment Received</h3>
                            <p>How did the customer pay?</p>
                        </div>

                        <div className="od-payment-options">
                            {PAYMENT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`od-payment-opt ${selectedPayment === opt.value ? 'selected' : ''}`}
                                    style={selectedPayment === opt.value ? { borderColor: opt.color, background: `${opt.color}15` } : {}}
                                    onClick={() => setSelectedPayment(opt.value)}
                                >
                                    <span className="od-opt-label">{opt.label}</span>
                                    {selectedPayment === opt.value && (
                                        <span className="od-opt-check" style={{ color: opt.color }}>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="od-modal-note">
                            {order.paymentMethod === 'COD'
                                ? '⚠️ This is a Cash on Delivery order. Please collect ₹' + (order.totalAmount || 0).toFixed(2) + ' before marking as delivered.'
                                : '✅ This order was paid online. Confirm delivery after handing over the package.'}
                        </div>

                        <div className="od-modal-actions">
                            <button className="od-modal-btn cancel" onClick={() => setShowPaymentModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="od-modal-btn confirm"
                                disabled={!selectedPayment}
                                onClick={() => confirmStatusUpdate(selectedPayment)}
                            >
                                ✅ Mark as Delivered
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
