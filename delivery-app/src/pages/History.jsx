import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './History.css';

export default function History() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/delivery/history')
            .then(res => setHistory(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="history-page">
            <div className="history-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h2>Delivery History</h2>
                <div></div>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner"></div></div>
            ) : history.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No deliveries yet</p>
                    <span>Your completed deliveries will appear here</span>
                </div>
            ) : (
                <div className="history-list">
                    {history.map(order => (
                        <div key={order._id} className="history-card">
                            <div className="history-card-left">
                                <div className="history-order-id">#{order.orderId?.slice(-6)}</div>
                                <div className="history-type-badge">{order.deliveryType}</div>
                            </div>
                            <div className="history-card-mid">
                                <div className="history-customer">{order.shippingAddress?.fullName || order.user?.name || 'Customer'}</div>
                                <div className="history-address">{order.shippingAddress?.city}</div>
                                <div className="history-items">{order.items?.map(i => i.name).join(', ')}</div>
                            </div>
                            <div className="history-card-right">
                                <div className="history-amount" style={{ color: '#10b981' }}>+₹{(order.deliveryEarning || 0).toFixed(0)}</div>
                                <div className="history-date">
                                    {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </div>
                                <div className="delivered-badge">✅ Delivered</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
