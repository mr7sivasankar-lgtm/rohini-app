import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const OrdersTab = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders/seller');
            if (res.data.success) {
                setOrders(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        if (!window.confirm(`Are you sure you want to mark this order as ${status}?`)) return;

        try {
            await api.put(`/orders/seller/${orderId}/status`, { status });
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update order status');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>;

    return (
        <div className="orders-tab">
            <div className="section-header">
                <h2>Order Management</h2>
                <p>Track, accept, and prepare customer orders for pickup.</p>
            </div>

            {orders.length === 0 ? (
                <div className="temp-placeholder">
                    <span style={{ fontSize: '48px', margin: '0 0 16px', display: 'block' }}>📦</span>
                    <h3>No orders yet</h3>
                    <p>When customers buy your products, they will appear here.</p>
                </div>
            ) : (
                <div className="orders-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                    {orders.map(order => (
                        <div key={order._id} className="order-card" style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>#{order.orderId.slice(-6)}</h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <span className={`status-badge status-${order.status.toLowerCase().replace(/ /g, '-')}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, height: 'fit-content', background: order.status === 'Placed' ? '#fef3c7' : '#eef2ff', color: order.status === 'Placed' ? '#b45309' : '#4f46e5' }}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="order-customer" style={{ marginBottom: '16px', fontSize: '14px' }}>
                                <strong>Customer:</strong> {order.shippingAddress?.fullName} <br />
                                <strong>Phone:</strong> {order.shippingAddress?.phone}
                            </div>

                            <div className="order-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.quantity} | {item.size ? `Size: ${item.size}` : ''}</div>
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>₹{(item.price * item.quantity).toFixed(0)}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '14px' }}>
                                    Total: <strong style={{ fontSize: '18px' }}>₹{order.total.toFixed(0)}</strong>
                                </div>
                                <div className="order-actions" style={{ display: 'flex', gap: '8px' }}>
                                    {order.status === 'Placed' && (
                                        <>
                                            <button 
                                                style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => updateOrderStatus(order._id, 'Accepted')}
                                            >Accept</button>
                                            <button 
                                                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => updateOrderStatus(order._id, 'Rejected')}
                                            >Reject</button>
                                        </>
                                    )}
                                    {order.status === 'Accepted' && (
                                        <button 
                                            style={{ padding: '8px 16px', background: '#eab308', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                            onClick={() => updateOrderStatus(order._id, 'Ready for Pickup')}
                                            className="pulse-btn"
                                        >Mark Ready for Pickup</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                .pulse-btn {
                    animation: pulse-ring 2s infinite;
                }
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
                }
            `}</style>
        </div>
    );
};

export default OrdersTab;
