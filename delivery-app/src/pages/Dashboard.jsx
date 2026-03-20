import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const DELIVERY_TYPE_LABELS = { Normal: '🚚 Normal Delivery', 'Return Pickup': '↩️ Return Pickup', 'Exchange Pickup': '🔄 Exchange Pickup' };
const STATUS_COLORS = { Assigned: '#f59e0b', 'Picked Up': '#3b82f6', 'Out for Delivery': '#8b5cf6' };

export default function Dashboard() {
    const { partner, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({ assigned: 0, pending: 0, deliveredToday: 0, returnPickups: 0, exchangePickups: 0 });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                api.get('/delivery/stats'),
                api.get('/delivery/orders')
            ]);
            setStats(statsRes.data.data);
            setOrders(ordersRes.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="dash-header">
                <div className="dash-greeting">
                    <div className="avatar">🚴</div>
                    <div>
                        <h2>Hey, {partner?.name?.split(' ')[0]}!</h2>
                        <p>Ready to deliver?</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                {[
                    { label: 'Assigned', value: stats.assigned, color: '#f59e0b', icon: '📦' },
                    { label: 'Pending', value: stats.pending, color: '#3b82f6', icon: '⏳' },
                    { label: 'Delivered Today', value: stats.deliveredToday, color: '#10b981', icon: '✅' },
                    { label: 'Return Pickups', value: stats.returnPickups, color: '#ef4444', icon: '↩️' },
                    { label: 'Exchange Pickups', value: stats.exchangePickups, color: '#8b5cf6', icon: '🔄' },
                ].map(s => (
                    <div className="stat-card" key={s.label} style={{ borderTop: `3px solid ${s.color}` }}>
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Orders */}
            <div className="section-header">
                <h3>Active Deliveries</h3>
                <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner"></div></div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No active deliveries right now</p>
                    <span>New orders will appear here automatically</span>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order._id} className="order-card" onClick={() => navigate(`/order/${order._id}`)}>
                            <div className="order-card-top">
                                <div>
                                    <div className="order-id">#{order.orderId?.slice(-6)}</div>
                                    <div className="delivery-type-badge" style={{ background: order.deliveryType === 'Normal' ? '#dcfce7' : '#fef3c7', color: order.deliveryType === 'Normal' ? '#16a34a' : '#b45309' }}>
                                        {DELIVERY_TYPE_LABELS[order.deliveryType] || order.deliveryType}
                                    </div>
                                </div>
                                <div className="status-pill" style={{ background: STATUS_COLORS[order.deliveryStatus] || '#94a3b8' }}>
                                    {order.deliveryStatus}
                                </div>
                            </div>

                            <div className="order-card-info">
                                <div className="info-row">
                                    <span>👤</span>
                                    <span>{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</span>
                                </div>
                                <div className="info-row">
                                    <span>📍</span>
                                    <span className="address-text">{order.shippingAddress?.fullAddress}, {order.shippingAddress?.city}</span>
                                </div>
                                <div className="info-row">
                                    <span>📦</span>
                                    <span>{order.items?.map(i => i.name).join(', ')}</span>
                                </div>
                                <div className="info-row">
                                    <span>💰</span>
                                    <span className="amount" style={{ color: '#10b981', fontWeight: 700 }}>+₹{(order.deliveryEarning || 0).toFixed(0)}</span>
                                </div>
                            </div>

                            <div className="order-card-footer">
                                <span className="tap-hint">Tap to view details →</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
