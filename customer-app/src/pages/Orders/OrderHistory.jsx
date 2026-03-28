import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import './OrderHistory.css';

const STATUS_CONFIG = {
    'Placed':              { color: '#2563eb', bg: '#eff6ff', dot: '#2563eb', label: 'Placed' },
    'Accepted':            { color: '#16a34a', bg: '#f0fdf4', dot: '#16a34a', label: 'Accepted' },
    'Packed':              { color: '#d97706', bg: '#fffbeb', dot: '#d97706', label: 'Packed' },
    'Picked Up':           { color: '#ea580c', bg: '#fff7ed', dot: '#ea580c', label: 'Picked Up' },
    'Out for Delivery':    { color: '#ea580c', bg: '#fff7ed', dot: '#ea580c', label: 'On the way' },
    'Delivered':           { color: '#15803d', bg: '#f0fdf4', dot: '#15803d', label: 'Delivered' },
    'Cancelled':           { color: '#dc2626', bg: '#fef2f2', dot: '#dc2626', label: 'Cancelled' },
    'Return Requested':    { color: '#be185d', bg: '#fdf2f8', dot: '#be185d', label: 'Return Req.' },
    'Return Approved':     { color: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed', label: 'Return ✓' },
    'Return Completed':    { color: '#0d9488', bg: '#f0fdfa', dot: '#0d9488', label: 'Returned' },
    'Return Rejected':     { color: '#dc2626', bg: '#fef2f2', dot: '#dc2626', label: 'Return ✗' },
    'Exchange Requested':  { color: '#0284c7', bg: '#f0f9ff', dot: '#0284c7', label: 'Exchange Req.' },
    'Exchange Approved':   { color: '#4f46e5', bg: '#eef2ff', dot: '#4f46e5', label: 'Exchange ✓' },
    'Exchange Completed':  { color: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed', label: 'Exchanged' },
    'Exchange Rejected':   { color: '#dc2626', bg: '#fef2f2', dot: '#dc2626', label: 'Exchange ✗' },
};

const getEffectiveStatus = (order) => {
    const activeItem = order.items.find(i =>
        i.status !== 'Active' &&
        !i.status?.includes('Completed') &&
        !i.status?.includes('Rejected') &&
        i.status !== 'Cancelled'
    );
    const resolvedItem = order.items.find(i =>
        i.status?.includes('Completed') || i.status?.includes('Rejected')
    );
    return activeItem?.status || resolvedItem?.status || order.status;
};

const fmtDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = (now - date) / 86400000;
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: diff > 300 ? 'numeric' : undefined });
};

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            if (res.data.success) setOrders(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="oh-page">
                <div className="oh-header">
                    <h1 className="oh-title">My Orders</h1>
                </div>
                <div className="oh-skeleton-list">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="oh-skeleton-row">
                            <div className="oh-sk-img" />
                            <div className="oh-sk-body">
                                <div className="oh-sk-line w70" />
                                <div className="oh-sk-line w45" />
                                <div className="oh-sk-line w55" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="oh-page">
                <div className="oh-header">
                    <h1 className="oh-title">My Orders</h1>
                </div>
                <div className="oh-empty">
                    <div className="oh-empty-icon">🛍️</div>
                    <h2>No orders yet</h2>
                    <p>Your order history will appear here</p>
                    <button className="oh-shop-btn" onClick={() => navigate('/home')}>
                        Start Shopping →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="oh-page">
            <div className="oh-header">
                <h1 className="oh-title">My Orders</h1>
                <span className="oh-count">{orders.length} orders</span>
            </div>

            <div className="oh-list">
                {orders.map((order) => {
                    const effectiveStatus = getEffectiveStatus(order);
                    const cfg = STATUS_CONFIG[effectiveStatus] || { color: '#64748b', bg: '#f8fafc', dot: '#94a3b8', label: effectiveStatus };
                    const firstItem = order.items[0];
                    const extraCount = order.items.length - 1;

                    return (
                        <div
                            key={order._id}
                            className="oh-row"
                            onClick={() => navigate(`/tracking/${order.orderId}`)}
                        >
                            {/* Product thumbnail */}
                            <div className="oh-thumb-wrap">
                                {firstItem?.image ? (
                                    <img
                                        src={getImageUrl(firstItem.image)}
                                        alt={firstItem.name}
                                        className="oh-thumb"
                                        onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="oh-thumb-placeholder">📦</div>
                                )}
                                {extraCount > 0 && (
                                    <div className="oh-extra-badge">+{extraCount}</div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="oh-info">
                                <div className="oh-info-top">
                                    <span className="oh-item-name">
                                        {firstItem?.name || 'Order'}
                                        {order.items.length > 1 && ` & ${order.items.length - 1} more`}
                                    </span>
                                    <span className="oh-amount">₹{(order.totalAmount || 0).toFixed(0)}</span>
                                </div>

                                <div className="oh-meta-row">
                                    <span className="oh-shop">🏪 {order.seller?.shopName || 'Shop'}</span>
                                </div>

                                <div className="oh-bottom-row">
                                    <span className="oh-date">{fmtDate(order.createdAt)}</span>
                                    <span className="oh-status-chip" style={{ background: cfg.bg, color: cfg.color }}>
                                        <span className="oh-status-dot" style={{ background: cfg.dot }} />
                                        {cfg.label}
                                    </span>
                                </div>
                            </div>

                            {/* Chevron */}
                            <svg className="oh-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderHistory;
