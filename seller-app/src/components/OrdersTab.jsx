import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

// Privacy masking helpers
const maskName = (name) => {
    if (!name) return 'Customer';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + '***';
    return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '***';
};

const maskPhone = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '****';
    return digits.slice(0, 2) + '****' + digits.slice(-2);
};

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
            case 'Returns/Exchanges': return orders.filter(o => o.status?.includes('Return') || o.status?.includes('Exchange'));
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

            <style>{`
                .tabs-container::-webkit-scrollbar { display: none; }
                .tabs-container { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            <div style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div className="tabs-container" style={{ 
                    display: 'flex', gap: '8px', overflowX: 'auto', 
                    background: '#f1f5f9', padding: '6px', borderRadius: '16px', 
                    width: 'max-content', maxWidth: '100%' 
                }}>
                    {tabs.map(tab => {
                        const count = 
                            tab === 'New' ? orders.filter(o => o.status === 'Placed').length :
                            tab === 'Accepted' ? orders.filter(o => o.status === 'Accepted' || o.status === 'Preparing').length :
                            tab === 'Ready' ? orders.filter(o => o.status === 'Ready for Pickup' || o.status === 'Out for Delivery').length :
                            tab === 'Completed' ? orders.filter(o => o.status === 'Delivered').length :
                            tab === 'Cancelled' ? orders.filter(o => o.status === 'Cancelled' || o.status === 'Rejected').length :
                            orders.filter(o => o.status?.includes('Return') || o.status?.includes('Exchange')).length;

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 16px', borderRadius: '12px', fontSize: '14px', 
                                    fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: activeTab === tab ? '#ffffff' : 'transparent',
                                    color: activeTab === tab ? '#4f46e5' : '#64748b',
                                    boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                {tab}
                                <span style={{
                                    background: activeTab === tab ? '#eef2ff' : '#e2e8f0',
                                    color: activeTab === tab ? '#4f46e5' : '#64748b',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    transition: 'all 0.2s',
                                    minWidth: '24px',
                                    textAlign: 'center'
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="temp-placeholder">
                     <span style={{ fontSize: '48px', margin: '0 0 16px', display: 'block' }}>📦</span>
                     <h3>No orders yet</h3>
                     <p>When customers buy your products, they will appear here.</p>
                 </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredOrders.map(order => {
                        const statusColor =
                            ['Placed', 'Return Requested'].includes(order.status) ? '#f59e0b' :
                            ['Delivered', 'Return Completed'].includes(order.status) ? '#22c55e' :
                            ['Cancelled', 'Rejected'].includes(order.status) ? '#ef4444' : '#6366f1';

                        const statusBg =
                            ['Placed', 'Return Requested'].includes(order.status) ? '#fef3c7' :
                            ['Delivered', 'Return Completed'].includes(order.status) ? '#dcfce7' :
                            ['Cancelled', 'Rejected'].includes(order.status) ? '#fee2e2' : '#eef2ff';

                        const statusText =
                            ['Placed', 'Return Requested'].includes(order.status) ? '#b45309' :
                            ['Delivered', 'Return Completed'].includes(order.status) ? '#16a34a' :
                            ['Cancelled', 'Rejected'].includes(order.status) ? '#dc2626' : '#4f46e5';

                        return (
                            <div key={order._id} style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'stretch',
                                background: 'white',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                            }}>
                                {/* Left accent bar */}
                                <div style={{ width: '5px', background: statusColor, flexShrink: 0 }} />

                                {/* Main content */}
                                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

                                    {/* Order ID + Date */}
                                    <div style={{ minWidth: '90px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                            #{(order.orderId || order._id?.toString())?.slice(-6)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                            {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: statusBg, color: statusText, whiteSpace: 'nowrap' }}>
                                        {order.status}
                                    </span>

                                    {/* Customer (masked) */}
                                    <div style={{ minWidth: '110px' }}>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>👤 {maskName(order.shippingAddress?.fullName || order.contactInfo?.name)}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {maskPhone(order.shippingAddress?.phone || order.contactInfo?.phone || order.user?.phone) || 'N/A'}</div>
                                    </div>

                                    {/* Items list */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 'min(100%, 350px)' }}>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                                                <img
                                                    src={getImageUrl(item.image)}
                                                    alt={item.name}
                                                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer', border: '1px solid #e2e8f0' }}
                                                    onClick={() => window.open(getImageUrl(item.image), '_blank')}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                {/* Title */}
                                                <div style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                                    {item.name}
                                                </div>
                                                
                                                {/* Attributes spread out */}
                                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '50px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Qty</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{item.quantity}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Size</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{item.size || '-'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Color</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{item.color || '-'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Category</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={item.product?.category?.name}>
                                                            {item.product?.category?.name || '-'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Code</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace', color: '#6366f1' }}>{item.productCode ? `#${item.productCode}` : '-'}</span>
                                                    </div>
                                                    
                                                    {/* Item Value */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '70px' }}>
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Value</span>
                                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>₹{((item.sellingPrice ?? 0) * item.quantity).toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa', width: '100%' }}>
                                    {order.status === 'Placed' && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Accepted')}>✅ Accept</button>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Rejected')}>❌ Reject</button>
                                        </div>
                                    )}
                                    {order.status === 'Accepted' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <button style={{ padding: '7px 14px', background: '#eab308', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Ready for Pickup')} className="pulse-btn">📦 Mark Ready</button>
                                            <button style={{ padding: '7px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Rejected')}>❌ Reject</button>
                                        </div>
                                    )}
                                    {order.status === 'Return Requested' && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Return Approved')}>✅ Approve</button>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Return Rejected')}>❌ Reject</button>
                                        </div>
                                    )}
                                    {order.status === 'Exchange Requested' && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Exchange Approved')}>✅ Approve</button>
                                            <button style={{ flex: 1, padding: '7px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                                                onClick={() => updateOrderStatus(order._id, 'Exchange Rejected')}>❌ Reject</button>
                                        </div>
                                    )}
                                    {!['Placed','Accepted','Return Requested','Exchange Requested'].includes(order.status) && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '0 8px' }}>—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
