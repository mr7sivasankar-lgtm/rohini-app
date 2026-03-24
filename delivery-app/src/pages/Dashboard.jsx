import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const DELIVERY_TYPE_LABELS = { Normal: '🚚 Normal Delivery', 'Return Pickup': '↩️ Return Pickup', 'Exchange Pickup': '🔄 Exchange Pickup' };
const STATUS_COLORS = { Assigned: '#f59e0b', 'Picked Up': '#3b82f6', 'Out for Delivery': '#8b5cf6' };

export default function Dashboard() {
    const { partner, updatePartner } = useAuth();
    const navigate = useNavigate();

    const [isOnline, setIsOnline] = useState(partner?.isOnline || false);
    const [stats, setStats] = useState({ assigned: 0, pending: 0, deliveredToday: 0, returnPickups: 0, exchangePickups: 0 });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null); // null = show all active

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

    const toggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        try {
            await api.put('/delivery/profile/status', { isOnline: newStatus });
            if (updatePartner) updatePartner({ isOnline: newStatus });
        } catch { setIsOnline(!newStatus); }
    };

    const handleFilterClick = (key) => {
        setActiveFilter(prev => prev === key ? null : key);
    };

    const getFilteredOrders = () => {
        if (!activeFilter) return orders;
        switch (activeFilter) {
            case 'assigned':
                return orders.filter(o => o.deliveryStatus === 'Assigned');
            case 'pending':
                return orders.filter(o => ['Picked Up', 'Out for Delivery'].includes(o.deliveryStatus));
            case 'deliveredToday': {
                const today = new Date().toDateString();
                return orders.filter(o => o.deliveryStatus === 'Delivered' && new Date(o.updatedAt).toDateString() === today);
            }
            case 'returnPickups':
                return orders.filter(o => o.deliveryType === 'Return Pickup');
            case 'exchangePickups':
                return orders.filter(o => o.deliveryType === 'Exchange Pickup');
            default:
                return orders;
        }
    };

    const filteredOrders = getFilteredOrders();

    const FILTER_LABELS = {
        assigned: 'Assigned',
        pending: 'Pending',
        deliveredToday: 'Delivered Today',
        returnPickups: 'Return Pickups',
        exchangePickups: 'Exchange Pickups',
    };

    const statCards = [
        { key: 'assigned',        label: 'Assigned',         value: stats.assigned,        color: '#f59e0b', icon: '📦' },
        { key: 'pending',         label: 'Pending',          value: stats.pending,         color: '#3b82f6', icon: '⏳' },
        { key: 'deliveredToday',  label: 'Delivered Today',  value: stats.deliveredToday,  color: '#10b981', icon: '✅' },
        { key: 'returnPickups',   label: 'Return Pickups',   value: stats.returnPickups,   color: '#ef4444', icon: '↩️' },
        { key: 'exchangePickups', label: 'Exchange Pickups', value: stats.exchangePickups, color: '#8b5cf6', icon: '🔄' },
    ];

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
                <div className="status-toggle-wrap-dashboard">
                    <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{isOnline ? 'Online' : 'Offline'}</span>
                    <label className="toggle-dash">
                        <input type="checkbox" checked={isOnline} onChange={toggleStatus} />
                        <span className="slider-dash"></span>
                    </label>
                </div>
            </div>

            {/* Stats Cards — tap to filter */}
            <div className="stats-grid">
                {statCards.map(s => (
                    <div
                        key={s.key}
                        className="stat-card"
                        onClick={() => handleFilterClick(s.key)}
                        style={{
                            borderTop: `3px solid ${s.color}`,
                            cursor: 'pointer',
                            outline: activeFilter === s.key ? `2.5px solid ${s.color}` : 'none',
                            background: activeFilter === s.key ? `${s.color}18` : 'white',
                            transform: activeFilter === s.key ? 'scale(1.04)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label.toUpperCase()}</div>
                    </div>
                ))}
            </div>

            {/* Section header */}
            <div className="section-header">
                <h3>
                    {activeFilter ? `${FILTER_LABELS[activeFilter]} Orders` : 'Active Deliveries'}
                    {activeFilter && (
                        <span
                            onClick={() => setActiveFilter(null)}
                            style={{ marginLeft: 8, fontSize: 12, color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontWeight: 400 }}
                        >
                            (Clear)
                        </span>
                    )}
                </h3>
                <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner"></div></div>
            ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>{activeFilter ? `No ${FILTER_LABELS[activeFilter]} orders` : 'No active deliveries right now'}</p>
                    <span>{activeFilter ? 'Tap the card again to clear filter' : 'New orders will appear here automatically'}</span>
                </div>
            ) : (
                <div className="orders-list">
                    {filteredOrders.map(order => (
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
                                <div className="info-row"><span>👤</span><span>{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</span></div>
                                <div className="info-row"><span>📍</span><span className="address-text">{order.shippingAddress?.fullAddress}, {order.shippingAddress?.city}</span></div>
                                <div className="info-row"><span>📦</span><span>{order.items?.map(i => i.name).join(', ')}</span></div>
                                <div className="info-row"><span>💰</span><span className="amount" style={{ color: '#10b981', fontWeight: 700 }}>+₹{(order.deliveryEarning || 0).toFixed(0)}</span></div>
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
