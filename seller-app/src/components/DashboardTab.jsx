import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const DashboardTab = ({ onTabChange }) => {
    const { seller } = useAuth();
    const [stats, setStats] = useState({
        ordersToday: 0,
        pendingOrders: 0,
        revenueToday: 0,
        delivered: 0,
        returned: 0,
        exchanged: 0,
        recentOrders: []
    });
    const [showVisitorStats, setShowVisitorStats] = useState(false);
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

    if (loading) return <div className="loading"><div className="spinner" style={{ borderTopColor: '#4f46e5' }}></div></div>;

    const statCards = [
        { title: 'Unique Visitors', value: seller?.profileViews || 0, icon: '👁️', bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)', color: '#c026d3', shadow: 'rgba(192, 38, 211, 0.15)', isVisitorStats: true },
        { title: 'Orders Today', value: stats.ordersToday, icon: '📦', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb', shadow: 'rgba(37, 99, 235, 0.15)', tab: 'orders' },
        { title: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706', shadow: 'rgba(217, 119, 6, 0.15)', tab: 'orders' },
        { title: 'Revenue Today', value: `₹${stats.revenueToday.toLocaleString('en-IN')}`, icon: '₹', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#16a34a', shadow: 'rgba(22, 163, 74, 0.15)', tab: 'sales' },
        { title: 'Delivered (Total)', value: stats.delivered, icon: '✅', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', color: '#7c3aed', shadow: 'rgba(124, 58, 237, 0.15)', tab: 'orders' },
        { title: 'Returns/Exchanges', value: stats.returned + stats.exchanged, icon: '🔄', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', color: '#dc2626', shadow: 'rgba(220, 38, 38, 0.15)', tab: 'orders' }
    ];

    return (
        <div style={{ padding: '0 0 40px 0', fontFamily: "'Inter', sans-serif" }}>
            {/* Elegant Welcome Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #3b82f6 100%)',
                borderRadius: '24px',
                padding: '40px 32px',
                color: 'white',
                marginBottom: '40px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(67, 56, 202, 0.2)'
            }}>
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-30%', left: '10%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        Welcome back, {seller?.ownerName?.split(' ')[0] || 'Partner'} 👋
                    </h1>
                    <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                        Here's what's happening with <strong style={{ color: 'white' }}>{seller?.shopName}</strong> today.
                    </p>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {statCards.map((card, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                        <div
                            onClick={() => {
                                if (card.tab && onTabChange) onTabChange(card.tab);
                                else if (card.isVisitorStats) setShowVisitorStats(!showVisitorStats);
                            }}
                            style={{
                                background: 'white',
                                padding: '24px',
                                borderRadius: '20px',
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                cursor: (card.tab || card.isVisitorStats) ? 'pointer' : 'default',
                                position: 'relative', overflow: 'hidden',
                                height: '100%', boxSizing: 'border-box'
                            }} onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = `0 12px 24px ${card.shadow}, 0 4px 8px rgba(0,0,0,0.04)`;
                                e.currentTarget.style.borderColor = card.color + '40';
                            }} onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)';
                                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                            }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                                {card.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{card.title}</div>
                                <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>{card.value}</div>
                            </div>
                            {card.tab && (
                                <span style={{ fontSize: 18, color: '#cbd5e1' }}>→</span>
                            )}
                            {card.isVisitorStats && (
                                <span style={{ fontSize: 18, color: '#cbd5e1', transform: showVisitorStats ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</span>
                            )}
                        </div>

                        {/* Visitor Stats Dropdown */}
                        {card.isVisitorStats && showVisitorStats && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0,
                                background: 'white', borderRadius: '16px', padding: '20px',
                                border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 10, animation: 'fadeIn 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>Visitor Analytics</h4>
                                    <button onClick={() => setShowVisitorStats(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: '4px' }}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>👥</span>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Visits</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>All page loads</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{seller?.totalViews || seller?.profileViews || 0}</div>
                                    </div>
                                    <div style={{ background: '#fdf4ff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fae8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>🌟</span>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#c026d3', fontWeight: 700, textTransform: 'uppercase' }}>Unique Visitors</div>
                                                <div style={{ fontSize: '11px', color: '#d946ef' }}>Distinct customers</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#a21caf' }}>{seller?.profileViews || 0}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Recent Orders Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.3px' }}>Recent Orders</h3>
            </div>

            {stats.recentOrders.length === 0 ? (
                <div style={{ background: 'white', padding: '60px 40px', borderRadius: '24px', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>🛍️</div>
                    <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No orders yet today</div>
                    <div style={{ color: '#64748b', fontSize: '15px' }}>When customers place orders, they will appear right here.</div>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '20px 24px', fontSize: '13px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Details</th>
                                <th style={{ padding: '20px 24px', fontSize: '13px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                                <th style={{ padding: '20px 24px', fontSize: '13px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                                <th style={{ padding: '20px 24px', fontSize: '13px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentOrders.map((order, idx) => (
                                <tr key={order._id} style={{ borderBottom: idx !== stats.recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                            <div style={{ display: 'flex', gap: '-10px' }}>
                                                {order.items.slice(0, 3).map((item, i) => (
                                                    <img key={i} src={getImageUrl(item.image)} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginLeft: i > 0 ? '-16px' : '0', zIndex: 3 - i, position: 'relative' }} onError={(e) => e.target.style.display = 'none'} />
                                                ))}
                                                {order.items.length > 3 && (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b', marginLeft: '-16px', zIndex: 0, position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                        +{order.items.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', marginBottom: '4px' }}>#{order.orderId.slice(-6).toUpperCase()}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                                                {order.shippingAddress?.fullName ? order.shippingAddress.fullName.charAt(0).toUpperCase() : '👤'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{order.shippingAddress?.fullName || 'Guest'}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>{order.date ? new Date(order.date).toLocaleDateString() : 'Today'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                        ₹{order.total.toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                                            background: ['Placed', 'Accepted'].includes(order.status) ? '#fffbeb' : ['Delivered'].includes(order.status) ? '#ecfdf5' : '#f8fafc',
                                            color: ['Placed', 'Accepted'].includes(order.status) ? '#d97706' : ['Delivered'].includes(order.status) ? '#059669' : '#64748b',
                                            border: `1px solid ${['Placed', 'Accepted'].includes(order.status) ? '#fde68a' : ['Delivered'].includes(order.status) ? '#a7f3d0' : '#e2e8f0'}`
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
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
