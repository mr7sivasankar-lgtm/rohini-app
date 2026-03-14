import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

    const statusSteps = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);

    return (
        <div className="order-tracking-modern-page">
            <div className="tracking-header">
                <button className="back-button" onClick={() => navigate('/orders')}>
                    <span className="back-icon">←</span> Back
                </button>
                <h1 className="page-title">Order Details</h1>
            </div>

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
                        if (index === currentStepIndex) dotClass += ' current';
                        else if (index < currentStepIndex) dotClass += ' completed';
                        
                        return (
                            <div key={step} className={`timeline-block ${index <= currentStepIndex ? 'active' : ''}`}>
                                <div className={dotClass}>
                                    {index < currentStepIndex && <span className="check-mark">✓</span>}
                                </div>
                                <div className="timeline-title">{step}</div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Order Items List */}
            <div className="tracking-card">
                <h3 className="section-title">Items ({order.items.length})</h3>
                <div className="items-grid">
                    {order.items.map((item, index) => (
                        <div key={index} className="modern-order-item">
                            <img src={getImageUrl(item.image)} alt={item.name} className="item-img" />
                            <div className="item-info">
                                <div className="item-name-row">
                                    <h4 className="item-name">{item.name}</h4>
                                    <span className="item-price">₹{item.price.toFixed(2)}</span>
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
                                            {order.status === 'Delivered' && (
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

                                {/* Mini Logistical Timeline for Returns & Exchanges */}
                                {(item.status.includes('Return') || item.status.includes('Exchange')) && !item.status.includes('Rejected') && (
                                    <div className="mini-timeline-container" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                                            {item.status.includes('Return') ? 'Return Status' : 'Exchange Status'}
                                        </h5>
                                        <div className="modern-timeline" style={{ padding: '0' }}>
                                            {(() => {
                                                const steps = item.status.includes('Return') 
                                                    ? ['Return Requested', 'Return Approved', 'Return Completed']
                                                    : ['Exchange Requested', 'Exchange Approved', 'Exchange Completed'];
                                                
                                                const currentIndex = steps.indexOf(item.status);
                                                
                                                return steps.map((step, idx) => {
                                                    let dotClass = 'timeline-dot';
                                                    if (idx === currentIndex) dotClass += ' current';
                                                    else if (idx < currentIndex) dotClass += ' completed';
                                                    
                                                    return (
                                                        <div key={step} className={`timeline-block ${idx <= currentIndex ? 'active' : ''}`} style={{ width: `${100 / steps.length}%` }}>
                                                            <div className={dotClass} style={{ width: '24px', height: '24px', marginBottom: '6px' }}>
                                                                {idx < currentIndex && <span className="check-mark" style={{ fontSize: '10px' }}>✓</span>}
                                                            </div>
                                                            <div className="timeline-title" style={{ fontSize: '10px' }}>{step.replace('Return', '').replace('Exchange', '').replace('(Exchange)', '').trim() || (item.status.includes('Return') ? 'Completed' : 'Completed')}</div>
                                                        </div>
                                                    )
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
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
                            <span>₹{order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="summary-line">
                            <span>Delivery Fee</span>
                            <span>{order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE'}</span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-line total-line">
                            <span>Total</span>
                            <span>₹{order.total.toFixed(2)}</span>
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
