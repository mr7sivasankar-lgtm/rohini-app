import { useState, useEffect } from 'react';
import api from '../utils/api';

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'COUNTERED', label: 'Countered' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'CUSTOMER_ACCEPTED', label: 'Cust. Accepted' },
    { key: 'EXPIRED', label: 'Expired' },
    { key: 'CONVERTED_TO_ORDER', label: 'Converted' },
];

const STATUS_COLOR = {
    PENDING: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
    ACCEPTED: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    REJECTED: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    COUNTERED: { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
    CUSTOMER_ACCEPTED: { bg: '#f0fdf4', color: '#15803d', border: '#4ade80' },
    CUSTOMER_REJECTED: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
    EXPIRED: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
    CANCELLED: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
    CONVERTED_TO_ORDER: { bg: '#f5f3ff', color: '#7c3aed', border: '#c4b5fd' },
};

const OffersTab = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('');
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [counterPrice, setCounterPrice] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchOffers();
    }, [activeStatus]);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const url = activeStatus ? `/offers/seller?status=${activeStatus}` : '/offers/seller';
            const res = await api.get(url);
            if (res.data.success) setOffers(res.data.data);
        } catch (err) {
            console.error('Fetch offers error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (offerId) => {
        if (actionLoading) return;
        if (!window.confirm('Accept this offer?')) return;
        try {
            setActionLoading(true);
            const res = await api.put(`/offers/seller/${offerId}/accept`);
            if (res.data.success) { alert('✅ Offer accepted! Customer has been notified.'); setSelectedOffer(null); fetchOffers(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Error accepting offer');
        } finally { setActionLoading(false); }
    };

    const handleReject = async (offerId) => {
        if (actionLoading) return;
        if (!window.confirm('Reject this offer?')) return;
        try {
            setActionLoading(true);
            const res = await api.put(`/offers/seller/${offerId}/reject`);
            if (res.data.success) { alert('Offer rejected. Customer has been notified.'); setSelectedOffer(null); fetchOffers(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Error rejecting offer');
        } finally { setActionLoading(false); }
    };

    const handleCounter = async (offerId) => {
        if (actionLoading) return;
        const price = parseFloat(counterPrice);
        if (!price || price <= 0) { alert('Enter a valid counter price'); return; }
        try {
            setActionLoading(true);
            const res = await api.put(`/offers/seller/${offerId}/counter`, { counterPrice: price });
            if (res.data.success) { alert('✅ Counter offer sent! Customer has been notified.'); setSelectedOffer(null); setCounterPrice(''); fetchOffers(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Error sending counter offer');
        } finally { setActionLoading(false); }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getImg = (offer) => {
        const img = offer.product?.images?.[0];
        if (!img) return null;
        if (img.startsWith('http')) return img;
        const base = (import.meta.env.VITE_API_URL || '').replace('/api', '');
        return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    const sc = (status) => STATUS_COLOR[status] || STATUS_COLOR.EXPIRED;

    return (
        <div style={{ padding: '0 0 80px', fontFamily: "'Inter', sans-serif" }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)', borderRadius: 20, padding: '24px', marginBottom: 20, color: 'white' }}>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🤝 Offers</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>Manage price negotiations from customers</div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {STATUS_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveStatus(tab.key)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${activeStatus === tab.key ? '#4f46e5' : '#e2e8f0'}`, background: activeStatus === tab.key ? '#eff6ff' : 'white', color: activeStatus === tab.key ? '#4f46e5' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ borderTopColor: '#4f46e5', margin: '0 auto' }} /></div>
            ) : offers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                    <p style={{ fontWeight: 600 }}>No offers yet</p>
                    <p style={{ fontSize: 13 }}>Offers from customers will appear here</p>
                </div>
            ) : (
                offers.map(offer => {
                    const col = sc(offer.status);
                    return (
                        <div key={offer._id} onClick={() => { setSelectedOffer(offer); setCounterPrice(''); }}
                            style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 12, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                {getImg(offer) && <img src={getImg(offer)} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{offer.product?.name || 'Product'}</span>
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: col.bg, color: col.color, border: `1px solid ${col.border}`, flexShrink: 0 }}>{offer.status.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>👤 {offer.customer?.name || 'Customer'}</div>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                                        <span style={{ color: '#64748b' }}>Your Price: <strong>₹{offer.originalUnitPrice}</strong></span>
                                        <span style={{ color: '#4f46e5' }}>Offer: <strong>₹{offer.offeredUnitPrice}</strong></span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Qty: {offer.quantity} • Total: ₹{offer.totalOfferAmount} • {formatDate(offer.createdAt)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Offer Detail Modal */}
            {selectedOffer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🤝 Offer Details</h3>
                            <button onClick={() => setSelectedOffer(null)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </div>

                        {/* Product info */}
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{selectedOffer.product?.name}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>Customer: <strong>{selectedOffer.customer?.name}</strong></div>
                        </div>

                        {/* Price breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                ['Your Price', `₹${selectedOffer.originalUnitPrice}/unit`],
                                ['Customer Offer', `₹${selectedOffer.offeredUnitPrice}/unit`],
                                ['Quantity', selectedOffer.quantity],
                                ['Offer Total', `₹${selectedOffer.totalOfferAmount}`],
                            ].map(([label, val]) => (
                                <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{val}</div>
                                </div>
                            ))}
                        </div>

                        {/* Negotiation History */}
                        {selectedOffer.messages?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Negotiation History</div>
                                {selectedOffer.messages.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'seller' ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                                        <div style={{ background: msg.from === 'seller' ? '#eff6ff' : '#f0fdf4', borderRadius: 10, padding: '8px 12px', maxWidth: '80%', fontSize: 13 }}>
                                            <div style={{ fontWeight: 700, color: msg.from === 'seller' ? '#2563eb' : '#16a34a', fontSize: 11, marginBottom: 2 }}>{msg.from === 'seller' ? '👤 You' : '🛒 Customer'}</div>
                                            <div>{msg.action.replace(/_/g, ' ')}{msg.price ? ` — ₹${msg.price}` : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {['PENDING', 'CUSTOMER_REJECTED'].includes(selectedOffer.status) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => handleAccept(selectedOffer._id)} disabled={actionLoading}
                                        style={{ flex: 1, padding: 14, background: '#16a34a', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                        ✅ ACCEPT
                                    </button>
                                    <button onClick={() => handleReject(selectedOffer._id)} disabled={actionLoading}
                                        style={{ flex: 1, padding: 14, background: '#dc2626', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                        ❌ REJECT
                                    </button>
                                </div>
                                {selectedOffer.roundNumber < selectedOffer.maxRounds && (
                                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>🔄 Counter Offer (Round {selectedOffer.roundNumber}/{selectedOffer.maxRounds})</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} placeholder="Enter your price ₹" min="1"
                                                style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14 }} />
                                            <button onClick={() => handleCounter(selectedOffer._id)} disabled={actionLoading || !counterPrice}
                                                style={{ padding: '10px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedOffer.status === 'CUSTOMER_ACCEPTED' && (
                            <button onClick={() => handleAccept(selectedOffer._id)} disabled={actionLoading}
                                style={{ width: '100%', padding: 14, background: '#16a34a', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                                ✅ CONFIRM ACCEPTANCE
                            </button>
                        )}

                        {!['PENDING', 'CUSTOMER_REJECTED', 'CUSTOMER_ACCEPTED'].includes(selectedOffer.status) && (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '8px 0' }}>No actions available for status: {selectedOffer.status.replace(/_/g, ' ')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OffersTab;
