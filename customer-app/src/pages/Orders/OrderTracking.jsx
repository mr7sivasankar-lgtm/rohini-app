import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Marker, Overlay } from 'pigeon-maps';
import api, { getImageUrl } from '../../utils/api';
import './OrderTracking.css';

const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', item: null });
    const [actionReason, setActionReason] = useState('');
    const [actionExchangeSize, setActionExchangeSize] = useState('');
    const [actionExchangeColor, setActionExchangeColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Timer state
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    const fetchOrder = async () => {
        try {
            const response = await api.get(`/orders`);
            if (response.data.success) {
                const foundOrder = response.data.data.find(o => o.orderId === orderId);
                setOrder(foundOrder);
                
                // Initialize timer if delivered
                if (foundOrder?.status === 'Delivered') {
                    const deliveredStatus = foundOrder.statusHistory.find(s => s.status === 'Delivered');
                    if (deliveredStatus) {
                        calculateTimeLeft(deliveredStatus.timestamp);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    // Live Map Polling (Fetch order every 10 seconds if Out for Delivery properties apply)
    useEffect(() => {
        let interval;
        if (order && order.deliveryPartner && ['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status)) {
            interval = setInterval(() => {
                fetchOrder();
            }, 10000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [order?.status, order?.deliveryPartner]);

    // Calculate the remaining time within the 3-hour window
    const calculateTimeLeft = (deliveredTimestamp) => {
        const checkTime = () => {
            const deliveredAt = new Date(deliveredTimestamp).getTime();
            const threeHoursInMs = 3 * 60 * 60 * 1000;
            const expiresAt = deliveredAt + threeHoursInMs;
            const now = new Date().getTime();
            const difference = expiresAt - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft('00:00:00');
            } else {
                setIsExpired(false);
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                
                setTimeLeft(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }
        };

        checkTime();
        // Setup interval to continue counting down
        const timer = setInterval(checkTime, 1000);
        return () => clearInterval(timer);
    };

    const handleActionItem = async () => {
        if (!actionModal.item || !actionModal.type) return;
        
        setIsSubmitting(true);
        try {
            const payload = {
                itemId: actionModal.item._id,
                action: actionModal.type,
                reason: actionReason
            };

            if (actionModal.type === 'exchange') {
                payload.exchangeSize = actionExchangeSize;
                payload.exchangeColor = actionExchangeColor;
            }

            await api.put(`/orders/${order._id}/item-action`, payload);
            // Refresh order state
            await fetchOrder();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Error processing request');
        } finally {
            setIsSubmitting(false);
        }
    };

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

    if (loading) {
        return <div className="tracking-loading"><div className="spinner"></div></div>;
    }

    if (!order) {
        return (
            <div className="tracking-empty-state">
                <div className="empty-icon">📦</div>
                <h2>Order not found</h2>
                <button className="btn-modern primary" onClick={() => navigate('/orders')}>
                    View All Orders
                </button>
            </div>
        );
    }

    const statusSteps = ['Placed', 'Accepted', 'Packed', 'Picked Up', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);

    return (
        <div className="order-tracking-modern-page">
            <div className="tracking-header">
                <button className="back-button" onClick={() => navigate('/orders')}>
                    <span className="back-icon">←</span>
                </button>
                <h1 className="page-title">Order Summary</h1>
            </div>

            {/* 📍 Map Takes Top Section */}
            {order.deliveryPartner && order.deliveryPartner.location && order.deliveryPartner.location.coordinates?.length >= 2 && ['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status) && (
                <div className="tracking-map-top">
                    <Map 
                        height={260} 
                        center={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]} 
                        defaultZoom={15}
                    >
                        {/* Delivery Partner Scooter Marker */}
                        <Overlay 
                            anchor={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]}
                            offset={[20, 20]}
                        >
                            <div className="map-vehicle-marker">🛵</div>
                        </Overlay>
                        
                        {/* Customer Destination Marker */}
                        {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                           <Overlay 
                               anchor={[order.shippingAddress.latitude, order.shippingAddress.longitude]}
                               offset={[16, 32]}
                           >
                               <div className="map-destination-marker">📍</div>
                           </Overlay>
                        )}
                    </Map>
                    
                    <div className="live-ping-badge">
                        <span className="live-ping-dot"></span> Live Tracking
                    </div>
                </div>
            )}

            {/* Hero Status Banner */}
            <div className="tracking-hero">
                <h2>{order.status === 'Delivered' ? 'Delivered successfully' : order.status === 'Out for Delivery' ? 'Arriving soon' : order.status}</h2>
                <p>Order #{order.orderId} • {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>

            {/* Expired Window Banner */}
            {order.status === 'Delivered' && timeLeft && (
                <div className={`time-window-banner ${isExpired ? 'expired-banner' : 'active-banner'}`}>
                    <div className="banner-icon">{isExpired ? '⏳' : '⏱️'}</div>
                    <div className="banner-text">
                        {isExpired ? (
                            <p><strong>Return window expired.</strong> Items can no longer be returned or exchanged.</p>
                        ) : (
                            <p>Return / Exchange available for: <strong>{timeLeft} remaining</strong></p>
                        )}
                    </div>
                </div>
            )}

            {/* Delivery Partner Compact Row */}
            {order.deliveryPartner && (
                <div className="dp-compact-row">
                    <div className="dp-avatar">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.deliveryPartner.name}&backgroundColor=f97316`} alt="Avatar" />
                    </div>
                    <div className="dp-info">
                        <h4>{order.deliveryPartner.name}</h4>
                        <p>Your Delivery Partner</p>
                    </div>
                    <a href={`tel:${order.deliveryPartner.phone}`} className="dp-call-btn">📞</a>
                </div>
            )}

            <div className="page-section-divider" />

            {/* Vertical Tracking Timeline */}
            <div className="tracking-timeline-vertical">
                {statusSteps.map((step, index) => {
                    let dotClass = 'v-dot';
                    const isFinished = index === currentStepIndex && index === statusSteps.length - 1;

                    if (isFinished || index < currentStepIndex) dotClass += ' completed';
                    else if (index === currentStepIndex) dotClass += ' current';
                    
                    let stepTimestamp = null;
                    if (index <= currentStepIndex && order.statusHistory) {
                        const historyItem = order.statusHistory.find(h => h.status === step);
                        if (historyItem && historyItem.timestamp) {
                            const d = new Date(historyItem.timestamp);
                            stepTimestamp = `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        }
                    }

                    return (
                        <div key={step} className={`v-step ${index <= currentStepIndex ? 'active' : ''}`}>
                            <div className="v-line-container">
                                <div className={dotClass}>
                                    {(isFinished || index < currentStepIndex) && <span className="check">✓</span>}
                                </div>
                                {index < statusSteps.length - 1 && <div className="v-line" />}
                            </div>
                            <div className="v-content">
                                <h4>{step}</h4>
                                {stepTimestamp && <p>{stepTimestamp}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="page-section-divider" />

            {/* Compact Receipt / Bill Details */}
            <div className="bill-details-container">
                <h3 className="section-title">Bill Details</h3>
                <div className="receipt-shop-name">From {order.seller?.shopName || 'Shop'}</div>
                
                <div className="receipt-items">
                    {order.items.map((item, index) => (
                        <div key={index} className="receipt-item">
                            <div className="receipt-item-main">
                                <div className="receipt-item-img-wrap">
                                    {item.image ? <img src={getImageUrl(item.image)} alt={item.name} /> : <div className="receipt-placeholder">🛍️</div>}
                                </div>
                                <div className="receipt-item-info">
                                    <div className="receipt-name-row">
                                        <span className="receipt-name">{item.name}</span>
                                        <span className="receipt-qty">x {item.quantity}</span>
                                    </div>
                                    <div className="receipt-variants">
                                        {item.size && <span>Size: {item.size}</span>}
                                        {item.color && <span>Color: {item.color}</span>}
                                        {item.productCode && <span>| Code: {item.productCode}</span>}
                                    </div>
                                </div>
                                <div className="receipt-price">
                                    ₹{((item.sellingPrice || item.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>

                            {/* Conditional Item Actions aligned under the item */}
                            <div className="receipt-actions-row">
                                {item.status !== 'Active' ? (
                                    <div className={`compact-status-flag flag-${item.status.replace(/ /g, '-').toLowerCase()}`}>
                                        {item.status}
                                    </div>
                                ) : (
                                    <div className="compact-action-buttons">
                                        {(order.status === 'Placed' || order.status === 'Accepted') && (
                                            <button className="link-action-btn cancel" onClick={() => openModal(item, 'cancel')}>Cancel</button>
                                        )}
                                        {order.status === 'Delivered' && !isExpired && (
                                            <>
                                                <button className="link-action-btn" onClick={() => openModal(item, 'return')}>Return</button>
                                                <button className="link-action-btn" onClick={() => openModal(item, 'exchange')}>Exchange</button>
                                            </>
                                        )}
                                        {order.status === 'Delivered' && (
                                            <button className="link-action-btn review" onClick={() => navigate(`/product/${item.product._id || item.product}`)}>Review</button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Nested Mini Logistics Timeline inside the compact item */}
                            {(item.status.includes('Return') || item.status.includes('Exchange')) && !item.status.includes('Rejected') && (
                                <div className="mini-logistics-text">
                                    <span className="mini-arrow">↳</span> 
                                    <strong>{item.status}</strong> — tracking initiated
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="receipt-summary">
                    <div className="receipt-line"><span>Item Total</span><span>₹{(order.sellingPriceTotal || 0).toFixed(2)}</span></div>
                    <div className="receipt-line">
                        <span>Delivery Fee</span>
                        {order.deliveryFee > 0 ? <span>₹{(order.deliveryFee || 0).toFixed(2)}</span> : <span className="free-text">FREE</span>}
                    </div>
                    {order.platformFee > 0 && (
                        <div className="receipt-line"><span>Platform Fee</span><span>₹{(order.platformFee || 0).toFixed(2)}</span></div>
                    )}
                    <div className="receipt-divider" />
                    <div className="receipt-line grand-total">
                        <span>Grand Total</span>
                        <span>₹{(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                </div>

                <div className="receipt-payment-mode">
                    <span className="pay-icon">💳</span> PAID VIA {order.paymentMethod.toUpperCase()}
                </div>
            </div>

            <div className="page-section-divider" />

            {/* Customer Delivery Details */}
            <div className="delivery-address-container">
                <h3 className="section-title">Delivery Details</h3>
                <div className="address-compact">
                    <div className="address-icon">📍</div>
                    <div className="address-content">
                        <strong>Delivering to {order.shippingAddress.fullName || 'Home'}</strong>
                        <p>{order.shippingAddress.fullAddress}, {order.shippingAddress.city} {order.shippingAddress.district && `, ${order.shippingAddress.district}`} - {order.shippingAddress.pincode}</p>
                        <p className="address-phone">Phone: {order.contactInfo?.phone}</p>
                    </div>
                </div>
            </div>

            {/* Action Modal (Cancel/Return/Exchange) */}
            {actionModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modern-modal">
                        <h3>{actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)} Item</h3>
                        <div className="modal-item-preview">
                            <img src={getImageUrl(actionModal.item.image)} alt={actionModal.item.name} />
                            <div>
                                <h4>{actionModal.item.name}</h4>
                                <span>Qty: {actionModal.item.quantity}</span>
                            </div>
                        </div>
                        
                        <div className="modal-form">
                            {actionModal.type === 'exchange' && (
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label>New Size (Optional)</label>
                                        <select 
                                            value={actionExchangeSize} 
                                            onChange={(e) => setActionExchangeSize(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">Same Size</option>
                                            <option value="XS">XS</option>
                                            <option value="S">S</option>
                                            <option value="M">M</option>
                                            <option value="L">L</option>
                                            <option value="XL">XL</option>
                                            <option value="XXL">XXL</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>New Color (Optional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Red"
                                            value={actionExchangeColor} 
                                            onChange={(e) => setActionExchangeColor(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <label>Reason / Comments (Optional)</label>
                            <textarea 
                                placeholder={`Why are you requesting a ${actionModal.type}?`}
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                rows={3}
                            ></textarea>
                            <p className="modal-warning">
                                {actionModal.type === 'cancel' 
                                    ? 'This item will be permanently cancelled'
                                    : `Your ${actionModal.type} request will be reviewed by our team.`}
                            </p>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-modern secondary" onClick={closeModal} disabled={isSubmitting}>
                                No, Keep It
                            </button>
                            <button 
                                className={`btn-modern ${actionModal.type === 'cancel' ? 'danger' : 'warning'}`} 
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

