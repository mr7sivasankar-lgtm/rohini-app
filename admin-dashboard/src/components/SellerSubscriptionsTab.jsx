import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const STATUS_COLOR = {
    ACTIVE: { bg: '#dcfce7', color: '#16a34a' },
    EXPIRED: { bg: '#fee2e2', color: '#dc2626' },
    PENDING: { bg: '#fffbeb', color: '#d97706' },
    SUSPENDED: { bg: '#fef3c7', color: '#92400e' },
    CANCELLED: { bg: '#f1f5f9', color: '#64748b' },
};

const SellerSubscriptionsTab = () => {
    const [subs, setSubs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchAll(); }, [statusFilter]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [subsRes, statsRes] = await Promise.all([
                api.get(`/subscriptions/admin/all${statusFilter ? `?status=${statusFilter}` : ''}`),
                api.get('/subscriptions/admin/stats')
            ]);
            if (subsRes.data.success) setSubs(subsRes.data.data);
            if (statsRes.data.success) setStats(statsRes.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleStatusChange = async (subId, newStatus) => {
        if (!window.confirm(`${newStatus} this subscription?`)) return;
        try {
            setActionLoading(subId);
            await api.put(`/subscriptions/admin/${subId}/status`, { status: newStatus });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally { setActionLoading(null); }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Seller Subscriptions</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>View and manage all seller subscription records</p>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {[
                        ['Active Sellers', stats.activeSellers, '#16a34a', '#22c55e'],
                        ['Expired Sellers', stats.expiredSellers, '#dc2626', '#ef4444'],
                        ['New Today', stats.todayNewSubscriptions, '#2563eb', '#3b82f6'],
                        ['Today Revenue', `₹${stats.todaySubscriptionRevenue}`, '#7c3aed', '#8b5cf6'],
                        ['Monthly Revenue', `₹${stats.monthlySubscriptionRevenue}`, '#0891b2', '#06b6d4'],
                        ['Total Revenue', `₹${stats.totalSubscriptionRevenue}`, '#059669', '#10b981'],
                    ].map(([label, val, color, border]) => (
                        <div key={label} className="stat-card" style={{ borderTop: `4px solid ${border}` }}>
                            <h3 style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</h3>
                            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['', 'ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter === s ? '#16a34a' : '#e2e8f0'}`, background: statusFilter === s ? '#f0fdf4' : 'white', color: statusFilter === s ? '#16a34a' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Seller', 'Plan', 'Amount', 'Start Date', 'Expiry Date', 'Status', 'Payment', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {subs.map(sub => {
                                const sc = STATUS_COLOR[sub.status] || STATUS_COLOR.CANCELLED;
                                return (
                                    <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{sub.seller?.shopName || '—'}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub.seller?.phone}</div>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{sub.planName}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>₹{sub.amount}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{fmt(sub.startDate)}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{fmt(sub.expiryDate)}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{sub.status}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: sub.paymentStatus === 'SUCCESS' ? '#16a34a' : '#dc2626' }}>{sub.paymentStatus}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {sub.status === 'ACTIVE' && (
                                                <button onClick={() => handleStatusChange(sub._id, 'SUSPENDED')} disabled={actionLoading === sub._id}
                                                    style={{ fontSize: 11, padding: '4px 10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                                    Suspend
                                                </button>
                                            )}
                                            {['SUSPENDED'].includes(sub.status) && (
                                                <button onClick={() => handleStatusChange(sub._id, 'CANCELLED')} disabled={actionLoading === sub._id}
                                                    style={{ fontSize: 11, padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {subs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No subscriptions found</div>}
                </div>
            )}
        </div>
    );
};

export default SellerSubscriptionsTab;
