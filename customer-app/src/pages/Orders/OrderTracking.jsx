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
        <div className={`order-tracking-premium-page ${order.deliveryPartner && ['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status) ? 'has-active-map' : 'no-map'}`}>
            
            {/* 🗺️ Background Map (Fixed at top/behind) */}
            {order.deliveryPartner && order.deliveryPartner.location && order.deliveryPartner.location.coordinates?.length >= 2 && ['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status) && (
                <div className="premium-map-bg">
                    <Map 
                        center={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]} 
                        defaultZoom={15}
                    >
                        <Overlay anchor={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]} offset={[20, 20]}>
                            <div className="map-vehicle-marker">
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.deliveryPartner.name}&backgroundColor=f97316`} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} alt="Partner" />
                            </div>
                        </Overlay>
                        
                        {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                           <Overlay anchor={[order.shippingAddress.latitude, order.shippingAddress.longitude]} offset={[16, 32]}>
                               <div className="map-destination-marker" style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'}}>📍</div>
                           </Overlay>
                        )}
                    </Map>
                </div>
            )}

            {/* 🔴 Floating Top Nav */}
            <div className="floating-top-nav">
                <button className="pill-back-btn" onClick={() => navigate('/orders')}>
                    <span className="icon">←</span> Back
                </button>
                <h1 className="pill-title">Order Details</h1>
            </div>

            {/* 🧊 Content Overlay (Pulls up over the map) */}
            <div className="premium-content-overlay">

                {/* Card 1: Status & Quick Summary */}
                <div className="glass-card main-status-card">
                    <div className="status-hero-row">
                        <div className="status-icon-box">
                            {order.status === 'Delivered' ? '✅' : '🛍️'}
                        </div>
                        <div className="status-hero-text">
                            <h3>{order.status === 'Delivered' ? 'Order Delivered Successfully' : order.status === 'Out for Delivery' ? 'Your order is on the way' : `Order ${order.status}`}</h3>
                            <p>{order.status === 'Delivered' ? `Delivered at ${new Date(order.deliveredAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Coming soon to your location'}</p>
                        </div>
                    </div>
                    
                    <div className="thin-divider" />
                    
                    <div className="status-quick-items-row">
                        <div className="quick-item-names">
                            <p className="item-names-text">
                                {order.items.map(i => i.name).join(' – ').length > 28 
                                    ? order.items.map(i => i.name).join(' – ').substring(0, 28) + '...' 
                                    : order.items.map(i => i.name).join(' – ')}
                            </p>
                            <p className="item-meta">₹{(order.totalAmount || 0).toFixed(2)} &nbsp;•&nbsp; {order.items.length} items</p>
                        </div>
                        <button className="btn-detail-solid" onClick={() => document.getElementById('extended-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                            Detail
                        </button>
                    </div>
                </div>

                {/* Card 2: Route & Delivery Partner */}
                <div className="glass-card route-partner-card">
                    <div className="route-path-container">
                        <div className="route-node">
                            <div className="node-icon dot"></div>
                            <div className="node-text">
                                <strong>{order.seller?.shopName || 'Shop'}</strong>
                                <span>Shop</span>
                            </div>
                        </div>
                        <div className="route-line-dashed"></div>
                        <div className="route-node">
                            <div className="node-icon pin">📍</div>
                            <div className="node-text">
                                <strong>You – {order.shippingAddress?.fullAddress?.split(',')[0]}</strong>
                                <span>Home • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>

                    {order.deliveryPartner && (
                        <>
                            <div className="thin-divider" />
                            <div className="dp-contact-row">
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.deliveryPartner.name}&backgroundColor=10b981`} alt="DP" className="dp-pic" />
                                <div className="dp-text">
                                    <strong>{order.deliveryPartner.name}</strong>
                                    <span>Delivery • {order.deliveryPartner.phone}</span>
                                </div>
                                <div className="dp-actions">
                                    <a href={`tel:${order.deliveryPartner.phone}`} className="circle-btn green">📞</a>
                                    <a href={`sms:${order.deliveryPartner.phone}`} className="circle-btn yellow">💬</a>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Anchor point for "Detail" button scroll */}
                <div id="extended-details" className="extended-details-section">
                
                    {/* Expired Window Banner */}
                    {order.status === 'Delivered' && timeLeft && (
                        <div className={`time-window-banner ${isExpired ? 'expired-banner' : 'active-banner'}`} style={{ marginBottom: '20px' }}>
                            <div className="banner-icon">{isExpired ? '⏳' : '⏱️'}</div>
                            <div className="banner-text">
                                {isExpired ? (
                                    <p><strong>Return window expired.</strong></p>
                                ) : (
                                    <p>Return / Exchange available for: <strong>{timeLeft} remaining</strong></p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="extended-card timeline-card">
                        <h3 className="section-title">Order Timeline</h3>
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
                    </div>

                    {/* Bill Details */}
                    <div className="extended-card bill-details-container">
                        <h3 className="section-title">Bill Details</h3>
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

