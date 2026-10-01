import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const STATUS_COLOR = {
    PENDING: { bg: '#fffbeb', color: '#d97706' },
    ACCEPTED: { bg: '#f0fdf4', color: '#16a34a' },
    REJECTED: { bg: '#fef2f2', color: '#dc2626' },
    COUNTERED: { bg: '#eff6ff', color: '#2563eb' },
    CUSTOMER_ACCEPTED: { bg: '#f0fdf4', color: '#15803d' },
    CUSTOMER_REJECTED: { bg: '#fef2f2', color: '#b91c1c' },
    EXPIRED: { bg: '#f8fafc', color: '#94a3b8' },
    CANCELLED: { bg: '#f8fafc', color: '#94a3b8' },
    CONVERTED_TO_ORDER: { bg: '#f5f3ff', color: '#7c3aed' },
};

const MyOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchOffers(); }, []);

    const fetchOffers = async () => {
        try {
            const res = await api.get('/offers/customer');
            if (res.data.success) setOffers(res.data.data);
        } catch (err) {
            console.error('Fetch offers error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getImg = (offer) => {
        const img = offer.product?.images?.[0];
        if (!img) return null;
        if (img.startsWith('http')) return img;
        const base = (import.meta.env.VITE_API_URL || '').replace('/api', '');
        return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const sc = (status) => STATUS_COLOR[status] || STATUS_COLOR.EXPIRED;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ background: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => navigate(-1)} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>←</button>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>🤝 My Offers</h1>
            </div>

            <div style={{ padding: '16px 16px 0' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                    </div>
                ) : offers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                        <div style={{ fontSize: 56, marginBottom: 12 }}>🤝</div>
                        <p style={{ fontWeight: 600, fontSize: 16 }}>No offers yet</p>
                        <p style={{ fontSize: 14 }}>Make an offer on a product to start negotiating</p>
                    </div>
                ) : (
                    offers.map(offer => {
                        const col = sc(offer.status);
                        const needsAction = ['COUNTERED'].includes(offer.status);
                        return (
                            <div key={offer._id}
                                onClick={() => navigate(`/offers/${offer._id}`)}
                                style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 12, cursor: 'pointer', border: needsAction ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', position: 'relative' }}>
                                {needsAction && <div style={{ position: 'absolute', top: -6, right: 12, background: '#4f46e5', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>ACTION NEEDED</div>}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {getImg(offer) && <img src={getImg(offer)} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{offer.product?.name || 'Product'}</span>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: col.bg, color: col.color, flexShrink: 0 }}>{offer.status.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>🏪 {offer.seller?.shopName || 'Seller'}</div>
                                        <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                                            <span style={{ color: '#64748b' }}>My Offer: <strong style={{ color: '#4f46e5' }}>₹{offer.offeredUnitPrice}</strong></span>
                                            <span style={{ color: '#64748b' }}>Qty: <strong>{offer.quantity}</strong></span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{formatDate(offer.createdAt)} • Expires: {formatDate(offer.expiresAt)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MyOffers;
