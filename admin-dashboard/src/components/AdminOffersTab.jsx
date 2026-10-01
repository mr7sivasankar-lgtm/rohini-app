import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const STATUS_COLOR = {
    PENDING: { bg: '#fffbeb', color: '#d97706' },
    ACCEPTED: { bg: '#f0fdf4', color: '#16a34a' },
    REJECTED: { bg: '#fee2e2', color: '#dc2626' },
    COUNTERED: { bg: '#eff6ff', color: '#2563eb' },
    CUSTOMER_ACCEPTED: { bg: '#f0fdf4', color: '#15803d' },
    CUSTOMER_REJECTED: { bg: '#fef2f2', color: '#b91c1c' },
    EXPIRED: { bg: '#f8fafc', color: '#94a3b8' },
    CANCELLED: { bg: '#f8fafc', color: '#94a3b8' },
    CONVERTED_TO_ORDER: { bg: '#f5f3ff', color: '#7c3aed' },
};

const AdminOffersTab = () => {
    const [offers, setOffers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedOffer, setSelectedOffer] = useState(null);

    useEffect(() => { fetchAll(); }, [statusFilter]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [offersRes, statsRes] = await Promise.all([
                api.get(`/offers/admin/all${statusFilter ? `?status=${statusFilter}` : ''}`),
                api.get('/offers/admin/stats')
            ]);
            if (offersRes.data.success) setOffers(offersRes.data.data);
            if (statsRes.data.success) setStats(statsRes.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const sc = (status) => STATUS_COLOR[status] || STATUS_COLOR.EXPIRED;

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Offer Management</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>View all customer-seller price negotiations</p>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
                    {[
                        ['Total', stats.total, '#1e293b', '#64748b'],
                        ['Pending', stats.PENDING || 0, '#d97706', '#f59e0b'],
                        ['Accepted', stats.ACCEPTED || 0, '#16a34a', '#22c55e'],
                        ['Countered', stats.COUNTERED || 0, '#2563eb', '#3b82f6'],
                        ['Rejected', stats.REJECTED || 0, '#dc2626', '#ef4444'],
                        ['Expired', stats.EXPIRED || 0, '#64748b', '#94a3b8'],
                        ['Converted', stats.CONVERTED_TO_ORDER || 0, '#7c3aed', '#8b5cf6'],
                    ].map(([label, val, color, border]) => (
                        <div key={label} className="stat-card" style={{ borderTop: `4px solid ${border}` }}>
                            <h3 style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</h3>
                            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['', 'PENDING', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'CUSTOMER_ACCEPTED', 'EXPIRED', 'CONVERTED_TO_ORDER'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${statusFilter === s ? '#4f46e5' : '#e2e8f0'}`, background: statusFilter === s ? '#eff6ff' : 'white', color: statusFilter === s ? '#4f46e5' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Product', 'Customer', 'Seller', 'Orig. Price', 'Offer Price', 'Qty', 'Total', 'Status', 'Date', 'Expires', 'Details'].map(h => (
                                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {offers.map(offer => {
                                const col = sc(offer.status);
                                return (
                                    <tr key={offer._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 10px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.product?.name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '10px 10px', color: '#475569' }}>{offer.customer?.name || '—'}</td>
                                        <td style={{ padding: '10px 10px', color: '#475569' }}>{offer.seller?.shopName || '—'}</td>
                                        <td style={{ padding: '10px 10px', color: '#64748b' }}>₹{offer.originalUnitPrice}</td>
                                        <td style={{ padding: '10px 10px', fontWeight: 700, color: '#4f46e5' }}>₹{offer.offeredUnitPrice}</td>
                                        <td style={{ padding: '10px 10px', color: '#475569' }}>{offer.quantity}</td>
                                        <td style={{ padding: '10px 10px', fontWeight: 700 }}>₹{offer.totalOfferAmount}</td>
                                        <td style={{ padding: '10px 10px' }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 999, background: col.bg, color: col.color, whiteSpace: 'nowrap' }}>{offer.status.replace(/_/g, ' ')}</span>
                                        </td>
                                        <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(offer.createdAt)}</td>
                                        <td style={{ padding: '10px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmt(offer.expiresAt)}</td>
                                        <td style={{ padding: '10px 10px' }}>
                                            <button onClick={() => setSelectedOffer(offer)}
                                                style={{ fontSize: 11, padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {offers.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No offers found</div>}
                </div>
            )}

            {/* Offer Detail Modal */}
            {selectedOffer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Offer Details</h3>
                            <button onClick={() => setSelectedOffer(null)} style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                ['Offer ID', selectedOffer.offerId],
                                ['Status', selectedOffer.status],
                                ['Product', selectedOffer.product?.name],
                                ['Seller', selectedOffer.seller?.shopName],
                                ['Customer', selectedOffer.customer?.name],
                                ['Original Price', `₹${selectedOffer.originalUnitPrice}`],
                                ['Offered Price', `₹${selectedOffer.offeredUnitPrice}`],
                                ['Agreed Price', selectedOffer.agreedUnitPrice ? `₹${selectedOffer.agreedUnitPrice}` : '—'],
                                ['Quantity', selectedOffer.quantity],
                                ['Total Amount', `₹${selectedOffer.totalOfferAmount}`],
                                ['Round', `${selectedOffer.roundNumber}/${selectedOffer.maxRounds}`],
                                ['Expires', fmt(selectedOffer.expiresAt)],
                            ].map(([label, val]) => (
                                <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{val || '—'}</div>
                                </div>
                            ))}
                        </div>
                        {selectedOffer.messages?.length > 0 && (
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Negotiation History</div>
                                {selectedOffer.messages.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'customer' ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                                        <div style={{ background: msg.from === 'customer' ? '#eff6ff' : '#f0fdf4', borderRadius: 10, padding: '8px 12px', maxWidth: '80%', fontSize: 12 }}>
                                            <div style={{ fontWeight: 700, color: msg.from === 'customer' ? '#4f46e5' : '#16a34a', marginBottom: 2 }}>{msg.from === 'customer' ? '🛒 Customer' : '🏪 Seller'}</div>
                                            <div>{msg.action.replace(/_/g, ' ')}{msg.price ? ` — ₹${msg.price}` : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOffersTab;
