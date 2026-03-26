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
                    <span className="back-icon">←</span> Back
                </button>
                <h1 className="page-title">Order Details</h1>
            </div>

            {/* Expired Window Banner */}
            {order.status === 'Delivered' && timeLeft && (
                <div className={`time-window-banner ${isExpired ? 'expired-banner' : 'active-banner'}`}>
                    <div className="banner-icon">{isExpired ? '⏳' : '⏱️'}</div>
                    <div className="banner-text">
                        {isExpired ? (
                            <p><strong>Return/Exchange window expired.</strong> Items can no longer be returned or exchanged.</p>
                        ) : (
                            <p>Return / Exchange available for: <strong>{timeLeft} remaining</strong></p>
                        )}
                    </div>
                </div>
            )}

            {/* Order Items List */}
            <div className="tracking-card">
                <h3 className="section-title">
                    Items ({order.items.length}) 
                    {order.seller && <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginLeft: '6px' }}>from {order.seller.shopName}</span>}
                </h3>
                <div className="items-grid">
                    {order.items.map((item, index) => (
                        <div key={index} className="modern-order-item">
                            <img src={getImageUrl(item.image)} alt={item.name} className="item-img" />
                            <div className="item-info">
                                <div className="item-name-row">
                                    <h4 className="item-name">{item.name}</h4>
                                    <span className="item-price">₹{(item.sellingPrice || 0).toFixed(2)}</span>
                                </div>
                                
                                <div className="item-specs">
                                    <span>Qty: <strong>{item.quantity}</strong></span>
                                    {item.productCode && (
                                        <span className="item-code">Code: {item.productCode}</span>
                                    )}
                                </div>

                                {(item.size || item.color) && (
                                    <div className="item-variants">
                                        {item.size && <span>Size: {item.size}</span>}
                                        {item.color && <span>Color: {item.color}</span>}
                                    </div>
                                )}

                                {/* Action Buttons Logic based on Item Status and Order Status */}
                                <div className="item-actions-row">
                                    {item.status !== 'Active' ? (
                                        <div className={`item-status-flag flag-${item.status.replace(/ /g, '-').toLowerCase()}`}>
                                            {item.status}
                                        </div>
                                    ) : (
                                        <>
                                            {/* CANCEL ITEM if Order is early stage */}
                                            {(order.status === 'Placed' || order.status === 'Accepted') && (
                                                <button className="btn-action action-cancel" onClick={() => openModal(item, 'cancel')}>
                                                    Cancel Item
                                                </button>
                                            )}

                                            {/* RETURN/EXCHANGE ITEM if Order is Delivered */}
                                            {order.status === 'Delivered' && !isExpired && (
                                                <div className="delivered-actions">
                                                    <button className="btn-action action-return" onClick={() => openModal(item, 'return')}>
                                                        Return
                                                    </button>
                                                    <button className="btn-action action-exchange" onClick={() => openModal(item, 'exchange')}>
                                                        Exchange
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {order.status === 'Delivered' && item.status === 'Active' && (
                                        <button className="btn-action action-review" onClick={() => navigate(`/product/${item.product._id || item.product}`)}>
                                            ⭐ Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Tracking Details */}
            <div className="tracking-card">
                <div className="order-meta-header">
                    <div className="order-meta-left">
                        <h2>Order #{order.orderId}</h2>
                        <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <span className={`status-pill status-${order.status.toLowerCase().replace(/ /g, '-')}`}>
                        {order.status}
                    </span>
                </div>

                {/* Status Timeline */}
                <div className="modern-timeline">
                    {statusSteps.map((step, index) => {
                        let dotClass = 'timeline-dot';
                        // If we are at the very last step (Delivered/Cancelled), it should be a checkmark too because it's completely finished
                        const isFinished = index === currentStepIndex && index === statusSteps.length - 1;

                        if (isFinished || index < currentStepIndex) dotClass += ' completed';
                        else if (index === currentStepIndex) dotClass += ' current';
                        
                        // Find if this step is reached to show its timestamp
                        let stepTimestamp = null;
                        if (index <= currentStepIndex && order.statusHistory) {
                            const historyItem = order.statusHistory.find(h => h.status === step);
                            if (historyItem && historyItem.timestamp) {
                                const d = new Date(historyItem.timestamp);
                                stepTimestamp = `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                            }
                        }

                        return (
                            <div key={step} className={`timeline-block ${index <= currentStepIndex ? 'active' : ''}`}>
                                <div className={dotClass}>
                                    {(isFinished || index < currentStepIndex) && <span className="check-mark">✓</span>}
                                </div>
                                <div className="timeline-title">{step}</div>
                                {stepTimestamp && (
                                    <div className="timeline-timestamp">{stepTimestamp}</div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Delivery Partner Info */}
                {order.deliveryPartner && (
                    <div className="delivery-partner-card" style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#f97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
                            🚚
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Partner</div>
                            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{order.deliveryPartner.name}</div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>📞 +91 {order.deliveryPartner.phone}</div>
                        </div>
                    </div>
                )}
                
                {/* 🛵 Live Delivery Tracking Map */}
                {order.deliveryPartner && order.deliveryPartner.location && order.deliveryPartner.location.coordinates?.length >= 2 && ['Assigned', 'Picked Up', 'Out for Delivery'].includes(order.status) && (
                    <div className="tracking-map-container" style={{ height: '300px', borderRadius: '16px', overflow: 'hidden', marginTop: '24px', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <Map 
                            height={300} 
                            center={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]} 
                            defaultZoom={15}
                        >
                            {/* Delivery Partner Scooter Marker */}
                            <Overlay 
                                anchor={[order.deliveryPartner.location.coordinates[1], order.deliveryPartner.location.coordinates[0]]}
                                offset={[20, 20]}
                            >
                                <div style={{ 
                                    fontSize: '32px', 
                                    transform: 'scaleX(-1)', /* face scooter towards general right */
                                    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))',
                                    transition: 'all 0.5s ease-in-out' // Smooth glide 
                                }}>
                                    🛵
                                </div>
                            </Overlay>
                            
                            {/* Customer Destination Marker */}
                            {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                               <Overlay 
                                   anchor={[order.shippingAddress.latitude, order.shippingAddress.longitude]}
                                   offset={[16, 32]}
                               >
                                   <div style={{ 
                                        fontSize: '28px', 
                                        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))'
                                    }}>
                                       📍
                                   </div>
                               </Overlay>
                            )}
                        </Map>
                        
                        {/* Live Update Ping Indicator */}
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                            <span className="live-ping-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'block' }}></span>
                            Live Tracking
                        </div>
                    </div>
                )}

                {/* Mini Logistical Timeline for Returns & Exchanges */}
                {order.items.map((item, index) => {
                    if ((item.status.includes('Return') || item.status.includes('Exchange')) && !item.status.includes('Rejected')) {
                        return (
                            <div key={`logistics-${index}`} className="mini-timeline-container" style={{ marginTop: '24px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h5 style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: 600 }}>
                                        {item.status.includes('Return') ? 'Return Status' : 'Exchange Status'}
                                    </h5>
                                    {order.items.length > 1 && (
                                        <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                                            For: {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                                        </span>
                                    )}
                                </div>
                                <div className="modern-timeline" style={{ padding: '0' }}>
                                    {(() => {
                                        const steps = item.status.includes('Return') 
                                            ? ['Return Requested', 'Return Approved', 'Return Completed']
                                            : ['Exchange Requested', 'Exchange Approved', 'Exchange Completed'];
                                        
                                        const currentIndex = steps.indexOf(item.status);
                                        
                                        return steps.map((step, idx) => {
                                            let dotClass = 'timeline-dot';
                                            const isFinished = idx === currentIndex && idx === steps.length - 1;

                                            if (isFinished || idx < currentIndex) dotClass += ' completed';
                                            else if (idx === currentIndex) dotClass += ' current';
                                            
                                            return (
                                                <div key={step} className={`timeline-block ${idx <= currentIndex ? 'active' : ''}`} style={{ width: `${100 / steps.length}%` }}>
                                                    <div className={dotClass} style={{ width: '28px', height: '28px', marginBottom: '8px' }}>
                                                        {(isFinished || idx < currentIndex) && <span className="check-mark" style={{ fontSize: '12px' }}>✓</span>}
                                                    </div>
                                                    <div className="timeline-title" style={{ fontSize: '11px', fontWeight: 500 }}>{step.replace('Return', '').replace('Exchange', '').replace('(Exchange)', '').trim() || (item.status.includes('Return') ? 'Completed' : 'Completed')}</div>
                                                </div>
                                            )
                                        });
                                    })()}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>

            <div className="split-cards">
                {/* Delivery Address */}
                <div className="tracking-card flex-half">
                    <h3 className="section-title">Delivery Address</h3>
                    <div className="address-box">
                        <div className="address-icon">📍</div>
                        <div className="address-details">
                            <p className="address-name">{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.fullAddress}</p>
                            {(order.shippingAddress.city || order.shippingAddress.district) && (
                                <p>{order.shippingAddress.city}{order.shippingAddress.city && ','} {order.shippingAddress.district}</p>
                            )}
                            {order.shippingAddress.pincode && <p>PIN: {order.shippingAddress.pincode}</p>}
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="tracking-card flex-half">
                    <h3 className="section-title">Payment Summary</h3>
                    <div className="payment-summary">
                        <div className="summary-line">
                            <span>Subtotal</span>
                            <span>₹{(order.sellingPriceTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="summary-line">
                            <span>Delivery Fee</span>
                            <span>{order.deliveryFee > 0 ? `₹${(order.deliveryFee || 0).toFixed(2)}` : 'FREE'}</span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-line total-line">
                            <span>Total</span>
                            <span>₹{(order.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="payment-method-badge">
                            Payment: {order.paymentMethod}
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

