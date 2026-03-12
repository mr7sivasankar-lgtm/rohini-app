import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import './OrderTracking.css';

const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const response = await api.get(`/orders`);
            if (response.data.success) {
                const foundOrder = response.data.data.find(o => o.orderId === orderId);
                setOrder(foundOrder);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    if (!order) {
        return (
            <div className="empty-state">
                <h2>Order not found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/orders')}>
                    View All Orders
                </button>
            </div>
        );
    }

    const statusSteps = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);

    return (
        <div className="order-tracking-page">
            <h1 className="page-title">Order Tracking</h1>

            <div className="order-card">
                <div className="order-header">
                    <div>
                        <h2>Order #{order.orderId}</h2>
                        <p className="order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className={`status-badge status-${order.status.toLowerCase().replace(' ', '-')}`}>
                        {order.status}
                    </div>
                </div>

                {/* Status Timeline */}
                <div className="status-timeline">
                    {statusSteps.map((step, index) => (
                        <div key={step} className={`timeline-step ${index <= currentStepIndex ? 'completed' : ''}`}>
                            <div className="timeline-dot"></div>
                            <div className="timeline-label">{step}</div>
                        </div>
                    ))}
                </div>

                {/* Order Items */}
                <div className="order-items-section">
                    <h3>Items ({order.items.length})</h3>
                    {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                            <img src={getImageUrl(item.image)} alt={item.name} />
                            <div className="item-details">
                                <div className="item-name">{item.name}</div>
                                {item.productCode && (
                                    <div className="item-meta" style={{ color: '#4f46e5', fontWeight: 600 }}>Code: {item.productCode}</div>
                                )}
                                <div className="item-meta">Qty: {item.quantity} • ₹{item.price.toFixed(2)}</div>
                                {order.status === 'Delivered' && (
                                    <button
                                        className="review-item-btn"
                                        onClick={() => navigate(`/product/${item.product}`)}
                                    >
                                        ⭐ Rate & Review
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Delivery Address */}
                <div className="address-section">
                    <h3>Delivery Address</h3>
                    <p>{order.shippingAddress.fullAddress}</p>
                    {order.shippingAddress.city && <p>{order.shippingAddress.city}, {order.shippingAddress.district}</p>}
                    {order.shippingAddress.pincode && <p>Pincode: {order.shippingAddress.pincode}</p>}
                </div>

                {/* Order Summary */}
                <div className="order-summary">
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>₹{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                        <span>Delivery Fee</span>
                        <span>₹{order.deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-row summary-total">
                        <span>Total</span>
                        <span>₹{order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
