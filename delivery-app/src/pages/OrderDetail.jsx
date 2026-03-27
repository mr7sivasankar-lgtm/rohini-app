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

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { partner } = useAuth(); // ADDED THIS LINE

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

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

    const updateStatus = async () => {
        const next = NEXT_STATUS[order.deliveryStatus];
        if (!next) return;
        if (!window.confirm(`Mark order as "${next}"?`)) return;
        setUpdating(true);
        try {
            await api.put(`/delivery/orders/${id}/status`, { deliveryStatus: next });
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

    // Get partner's exact GPS location for routing origin
    const originParam = (partner?.location?.coordinates) 
        ? `&origin=${partner.location.coordinates[1]},${partner.location.coordinates[0]}` 
        : '';

    // Navigate to seller pickup location
    const navigateToPickup = () => {
        const sel = order.sellerLocation;
        if (sel && sel.lat && sel.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1${originParam}&destination=${sel.lat},${sel.lng}`);
        } else if (order.sellerShopAddress) {
            const addr = encodeURIComponent(order.sellerShopAddress);
            window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`);
        } else {
            alert('Seller location not available.');
        }
    };

    // Navigate to customer delivery location
    const navigateToCustomer = () => {
        const { latitude, longitude, fullAddress, city } = order.shippingAddress || {};
        if (latitude && longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1${originParam}&destination=${latitude},${longitude}`);
        } else {
            const addr = encodeURIComponent(`${fullAddress}, ${city}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`);
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
                {order.sellerLocation?.lat && order.sellerLocation?.lng && (
                    <div className="detail-row">
                        <span>Coords</span>
                        <strong>{order.sellerLocation.lat.toFixed(4)}, {order.sellerLocation.lng.toFixed(4)}</strong>
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
                {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                    <div className="detail-row">
                        <span>Coords</span>
                        <strong>{order.shippingAddress.latitude.toFixed(4)}, {order.shippingAddress.longitude.toFixed(4)}</strong>
                    </div>
                )}
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

            {/* Status Update */}
            {NEXT_STATUS[order.deliveryStatus] && (
                <button className="status-update-btn" onClick={updateStatus} disabled={updating}>
                    {updating ? 'Updating…' : `Mark as "${NEXT_STATUS[order.deliveryStatus]}" →`}
                </button>
            )}
            {order.deliveryStatus === 'Delivered' && (
                <div className="delivered-banner">✅ This order has been delivered!</div>
            )}
            {order.deliveryStatus === 'Collected' && (
                <div className="delivered-banner">✅ Return collected successfully! Stock restored.</div>
            )}
        </div>
    );
}
