import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const OrdersTab = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('New');

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

    const tabs = ['New', 'Accepted', 'Ready', 'Completed', 'Cancelled', 'Returns/Exchanges'];

    const getFilteredOrders = () => {
        switch (activeTab) {
            case 'New': return orders.filter(o => o.status === 'Placed');
            case 'Accepted': return orders.filter(o => o.status === 'Accepted' || o.status === 'Preparing');
            case 'Ready': return orders.filter(o => o.status === 'Ready for Pickup' || o.status === 'Out for Delivery');
            case 'Completed': return orders.filter(o => o.status === 'Delivered');
            case 'Cancelled': return orders.filter(o => o.status === 'Cancelled' || o.status === 'Rejected');
            case 'Returns/Exchanges': return orders.filter(o => o.status.includes('Return') || o.status.includes('Exchange'));
            default: return orders;
        }
    };

    const filteredOrders = getFilteredOrders();

    return (
        <div className="orders-tab">
            <div className="section-header" style={{ marginBottom: '16px' }}>
                <h2>Order Management</h2>
                <p>Track, accept, and prepare customer orders for pickup.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                            background: activeTab === tab ? '#1e293b' : '#f1f5f9',
                            color: activeTab === tab ? '#fff' : '#64748b'
                        }}
                    >
                        {tab} ({
                            tab === 'New' ? orders.filter(o => o.status === 'Placed').length :
                            tab === 'Accepted' ? orders.filter(o => o.status === 'Accepted' || o.status === 'Preparing').length :
                            tab === 'Ready' ? orders.filter(o => o.status === 'Ready for Pickup' || o.status === 'Out for Delivery').length :
                            tab === 'Completed' ? orders.filter(o => o.status === 'Delivered').length :
                            tab === 'Cancelled' ? orders.filter(o => o.status === 'Cancelled' || o.status === 'Rejected').length :
                            orders.filter(o => o.status.includes('Return') || o.status.includes('Exchange')).length
                        })
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="temp-placeholder">
                     <span style={{ fontSize: '48px', margin: '0 0 16px', display: 'block' }}>📦</span>
                     <h3>No orders yet</h3>
                     <p>When customers buy your products, they will appear here.</p>
                 </div>
            ) : (
                <div className="orders-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
                    {filteredOrders.map(order => (
                        <div key={order._id} className="order-card" style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>#{order.orderId.slice(-6)}</h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <span className={`status-badge`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, height: 'fit-content', 
                                    background: ['Placed', 'Return Requested'].includes(order.status) ? '#fef3c7' : 
                                                ['Delivered', 'Return Completed'].includes(order.status) ? '#dcfce7' : 
                                                ['Cancelled', 'Rejected'].includes(order.status) ? '#fee2e2' : '#eef2ff', 
                                    color: ['Placed', 'Return Requested'].includes(order.status) ? '#b45309' : 
                                           ['Delivered', 'Return Completed'].includes(order.status) ? '#16a34a' : 
                                           ['Cancelled', 'Rejected'].includes(order.status) ? '#dc2626' : '#4f46e5' 
                                }}>
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
                                <div className="order-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {order.status === 'Placed' && (
                                        <>
                                            <button 
                                                style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Accepted')}
                                            >Accept</button>
                                            <button 
                                                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Rejected')}
                                            >Reject</button>
                                        </>
                                    )}
                                    {order.status === 'Accepted' && (
                                        <button 
                                            style={{ padding: '8px 16px', background: '#eab308', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                            onClick={() => updateOrderStatus(order._id, 'Ready for Pickup')}
                                            className="pulse-btn"
                                        >Mark Ready</button>
                                    )}
                                    {order.status === 'Return Requested' && (
                                        <>
                                            <button style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Return Approved')}>Approve Return</button>
                                            <button style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Return Rejected')}>Reject Return</button>
                                        </>
                                    )}
                                    {order.status === 'Exchange Requested' && (
                                        <>
                                            <button style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Exchange Approved')}>Approve Exchange</button>
                                            <button style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                onClick={() => updateOrderStatus(order._id, 'Exchange Rejected')}>Reject Exchange</button>
                                        </>
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
