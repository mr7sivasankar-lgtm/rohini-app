import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const DashboardTab = () => {
    const [stats, setStats] = useState({
        ordersToday: 0,
        pendingOrders: 0,
        revenueToday: 0,
        delivered: 0,
        returned: 0,
        exchanged: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/orders/seller/dashboard-stats');
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>;

    const statCards = [
        { title: 'Orders Today', value: stats.ordersToday, icon: '📦', color: '#eff6ff', textColor: '#3b82f6' },
        { title: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', color: '#fef3c7', textColor: '#d97706' },
        { title: 'Revenue Today', value: `₹${stats.revenueToday.toLocaleString('en-IN')}`, icon: '₹', color: '#dcfce7', textColor: '#16a34a' },
        { title: 'Delivered (Total)', value: stats.delivered, icon: '✅', color: '#f3e8ff', textColor: '#9333ea' },
        { title: 'Returns/Exchanges', value: stats.returned + stats.exchanged, icon: '🔄', color: '#fee2e2', textColor: '#dc2626' }
    ];

    return (
        <div className="dashboard-tab">
            <div className="section-header" style={{ marginBottom: '24px' }}>
                <h2>Business Overview</h2>
                <p>Quick snapshot of your shop's performance</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {statCards.map((card, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.color, color: card.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            {card.icon}
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{card.title}</div>
                            <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: 700 }}>{card.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="section-header" style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Recent Orders</h3>
            </div>

            {stats.recentOrders.length === 0 ? (
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
                    <div style={{ color: '#64748b' }}>No recent orders to show</div>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Order ID</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Customer</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Items</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Amount</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentOrders.map((order, idx) => (
                                <tr key={order._id} style={{ borderBottom: idx !== stats.recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#4f46e5' }}>#{order.orderId.slice(-6)}</td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b' }}>{order.shippingAddress?.fullName}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {order.items.slice(0, 2).map((item, i) => (
                                                <div key={i} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <img src={getImageUrl(item.image)} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                                    {item.name} (x{item.quantity})
                                                </div>
                                            ))}
                                            {order.items.length > 2 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>+ {order.items.length - 2} more item(s)</div>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>₹{order.total.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, 
                                            background: ['Placed', 'Accepted'].includes(order.status) ? '#fef3c7' : ['Delivered'].includes(order.status) ? '#dcfce7' : '#f1f5f9', 
                                            color: ['Placed', 'Accepted'].includes(order.status) ? '#b45309' : ['Delivered'].includes(order.status) ? '#16a34a' : '#64748b' 
                                        }}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DashboardTab;
