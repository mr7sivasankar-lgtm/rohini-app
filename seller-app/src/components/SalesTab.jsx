import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const SalesTab = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/orders/seller/sales-analytics');
            if (res.data.success) {
                setAnalytics(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sales analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>;
    if (!analytics) return <div>Failed to load analytics</div>;

    const cards = [
        { label: "Today's Sales", revenue: analytics.today.revenue, orders: analytics.today.orders },
        { label: "This Week", revenue: analytics.week.revenue, orders: analytics.week.orders },
        { label: "This Month", revenue: analytics.month.revenue, orders: analytics.month.orders },
        { label: "Total Revenue", revenue: analytics.total.revenue, orders: analytics.total.orders }
    ];

    // Find max revenue for the trend graph scale
    const maxDayRevenue = Math.max(...analytics.trend.map(t => t.revenue), 1);

    return (
        <div className="sales-tab">
            <div className="section-header" style={{ marginBottom: '24px' }}>
                <h2>Sales & Revenue</h2>
                <p>Track your shop's financial performance (Note: Only Delivered orders count towards revenue)</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px', marginBottom: '32px' }}>
                {cards.map((card, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{card.label}</div>
                        <div style={{ color: '#0f172a', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>₹{card.revenue.toLocaleString('en-IN')}</div>
                        <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>{card.orders} Orders</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
                {/* Sales Trend Chart */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: '#1e293b' }}>Sales Trend (Last 7 Days)</h3>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', paddingBottom: '24px', position: 'relative' }}>
                        {analytics.trend.map((day, idx) => {
                            const heightPct = (day.revenue / maxDayRevenue) * 100;
                            return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                    {/* Tooltip on hover (simplified) */}
                                    <div style={{ fontSize: '10px', color: '#64748b', position: 'absolute', top: '-20px' }}>
                                        {day.revenue > 0 ? `₹${(day.revenue/1000).toFixed(1)}k` : ''}
                                    </div>
                                    <div style={{ 
                                        width: '100%', 
                                        height: `${Math.max(heightPct, 2)}%`, 
                                        background: '#4f46e5', 
                                        borderRadius: '4px 4px 0 0',
                                        transition: 'height 0.3s ease'
                                    }}></div>
                                    <div style={{ fontSize: '12px', color: '#64748b', position: 'absolute', bottom: '-20px' }}>{day.day}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: '#1e293b' }}>Top Selling Products</h3>
                    
                    {analytics.topProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>No sales data yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {analytics.topProducts.map((prod, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: idx !== analytics.topProducts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{ width: '24px', color: '#64748b', fontWeight: 600, fontSize: '14px' }}>#{idx + 1}</div>
                                    <img src={getImageUrl(prod.image)} alt={prod.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{prod.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{prod.orders} Orders</div>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>
                                        ₹{prod.revenue.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesTab;
