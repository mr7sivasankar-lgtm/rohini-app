import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './OrderDetail.css';

const NEXT_STATUS = {
    'Assigned': 'Picked Up',
    'Picked Up': 'Out for Delivery',
    'Out for Delivery': 'Delivered',
};

const STATUS_STEPS = ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

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

    const openMap = () => {
        const { latitude, longitude, fullAddress, city } = order.shippingAddress || {};
        if (latitude && longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
        } else {
            const addr = encodeURIComponent(`${fullAddress}, ${city}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`);
        }
    };

    const currentStepIndex = STATUS_STEPS.indexOf(order?.deliveryStatus);

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
    if (!order) return <div className="loading-page"><p>Order not found</p></div>;

    return (
        <div className="order-detail-page">
            {/* Header */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h2>Order #{order.orderId?.slice(-6)}</h2>
                <div className="delivery-type-tag">{order.deliveryType}</div>
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

            {/* Customer Info */}
            <div className="detail-card">
                <h3>👤 Customer Details</h3>
                <div className="detail-row"><span>Name</span><strong>{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</strong></div>
                <div className="detail-row"><span>Phone</span><strong>{order.contactInfo?.phone || order.user?.phone}</strong></div>
                <div className="detail-row"><span>Address</span><strong>{order.shippingAddress?.fullAddress}, {order.shippingAddress?.city}, {order.shippingAddress?.pincode}</strong></div>
            </div>

            {/* Items */}
            <div className="detail-card">
                <h3>📦 Items</h3>
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
                        <div className="item-price">₹{item.price}</div>
                    </div>
                ))}
                <div className="total-row"><span>Total</span><strong>₹{order.total?.toFixed(2)}</strong></div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-grid">
                <button className="action-btn call-btn" onClick={callCustomer}>
                    <span>📞</span> Call Customer
                </button>
                <button className="action-btn map-btn" onClick={openMap}>
                    <span>🗺️</span> Navigate
                </button>
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
        </div>
    );
}
