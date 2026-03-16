import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import './OrderHistory.css';

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders');
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    if (orders.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h2 className="empty-state-title">No orders yet</h2>
                <p className="empty-state-text">Start shopping to see your orders here!</p>
                <button className="btn btn-primary" onClick={() => navigate('/home')}>
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="order-history-page">
            <h1 className="page-title">Order History</h1>

            <div className="orders-list">
                {orders.map((order) => (
                    <div key={order._id} className="order-card-item" onClick={() => navigate(`/tracking/${order.orderId}`)}>
                        <div className="order-card-header">
                            <div>
                                <h3>Order #{order.orderId}</h3>
                                {order.seller && (
                                    <p className="order-shop-name" style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 4px', fontWeight: '500' }}>
                                        Sold by: {order.seller.shopName}
                                    </p>
                                )}
                                <p className="order-date">
                                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            {(() => {
                                // Find if any items have an active return/exchange state
                                const activeItem = order.items.find(item => 
                                    item.status !== 'Active' && 
                                    !item.status.includes('Completed') && 
                                    !item.status.includes('Rejected') && 
                                    item.status !== 'Cancelled'
                                );
                                
                                // Alternatively, if any item is completed/rejected and no others are active
                                const resolvedItem = order.items.find(item => 
                                    item.status.includes('Completed') || item.status.includes('Rejected')
                                );

                                const effectiveStatus = activeItem ? activeItem.status : (resolvedItem ? resolvedItem.status : order.status);
                                const statusClass = effectiveStatus.toLowerCase().replace(/ /g, '-');

                                return (
                                    <div className={`status-badge status-${statusClass}`}>
                                        {effectiveStatus}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="order-items-preview">
                            {order.items.slice(0, 4).map((item, index) => (
                                <img
                                    key={index}
                                    src={getImageUrl(item.image)}
                                    alt={item.name}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            ))}
                            {order.items.length > 4 && (
                                <div className="more-items">+{order.items.length - 4}</div>
                            )}
                        </div>

                        <div className="order-total">
                            <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="total-amount">₹{order.total.toFixed(2)}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m9 18 6-6-6-6"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderHistory;
