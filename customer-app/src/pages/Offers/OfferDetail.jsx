import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const OfferDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchOffer(); }, [id]);

    const fetchOffer = async () => {
        try {
            const res = await api.get(`/offers/customer/${id}`);
            if (res.data.success) setOffer(res.data.data);
        } catch (err) {
            setError('Could not load offer details');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptCounter = async () => {
        if (!window.confirm('Accept the seller\'s counter offer?')) return;
        try {
            setActionLoading(true);
            const res = await api.put(`/offers/customer/${id}/accept`);
            if (res.data.success) { alert('✅ Counter offer accepted! You can now proceed to checkout.'); fetchOffer(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Error accepting offer');
        } finally { setActionLoading(false); }
    };

    const handleRejectCounter = async () => {
        if (!window.confirm('Reject the seller\'s counter offer?')) return;
        try {
            setActionLoading(true);
            const res = await api.put(`/offers/customer/${id}/reject`);
            if (res.data.success) { alert('Counter offer rejected.'); fetchOffer(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Error rejecting offer');
        } finally { setActionLoading(false); }
    };

    const handleProceedToCheckout = async () => {
        try {
            setActionLoading(true);
            const res = await api.get(`/offers/customer/${id}/checkout-data`);
            if (res.data.success) {
                const data = res.data.data;
                navigate('/checkout', { state: { fromOffer: true, offerCheckoutData: data } });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Could not proceed to checkout');
        } finally { setActionLoading(false); }
    };

    const getImg = (offer) => {
        const img = offer?.product?.images?.[0];
        if (!img) return null;
        if (img.startsWith('http')) return img;
        const base = (import.meta.env.VITE_API_URL || '').replace('/api', '');
        return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
    if (error || !offer) return <div style={{ padding: 24, color: '#dc2626' }}>{error || 'Offer not found'}</div>;

    const agreedPrice = offer.agreedUnitPrice || offer.offeredUnitPrice;
    const canCheckout = ['ACCEPTED', 'CUSTOMER_ACCEPTED'].includes(offer.status);
    const needsAction = offer.status === 'COUNTERED';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: 100 }}>
            <div style={{ background: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => navigate('/offers')} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>←</button>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Offer Details</h1>
            </div>

            <div style={{ padding: 16 }}>
                {/* Product Card */}
                <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', gap: 14 }}>
                    {getImg(offer) && <img src={getImg(offer)} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{offer.product?.name}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Seller: {offer.seller?.shopName}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Original Price: <strong>₹{offer.originalUnitPrice}</strong></div>
                        {offer.selectedSize && <div style={{ fontSize: 12, color: '#94a3b8' }}>Size: {offer.selectedSize}</div>}
                    </div>
                </div>

                {/* Status Banner */}
                {needsAction && (
                    <div style={{ background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>🔔 Seller Counter Offer</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e40af', marginBottom: 4 }}>₹{offer.offeredUnitPrice} / unit</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Total: ₹{offer.offeredUnitPrice * offer.quantity} for {offer.quantity} item(s)</div>
                    </div>
                )}

                {canCheckout && (
                    <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>✅ Offer Accepted!</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', marginBottom: 4 }}>₹{agreedPrice} / unit</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Total: ₹{agreedPrice * offer.quantity} for {offer.quantity} item(s)</div>
                    </div>
                )}

                {/* Price Summary */}
                <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Price Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            ['Original Price', `₹${offer.originalUnitPrice}/unit`],
                            ['Your Offer', `₹${offer.offeredUnitPrice}/unit`],
                            ['Quantity', offer.quantity],
                            ['Offer Total', `₹${offer.totalOfferAmount}`],
                        ].map(([label, val]) => (
                            <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{val}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Negotiation History */}
                <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Negotiation History</h3>
                    {offer.messages?.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'customer' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                            <div style={{ background: msg.from === 'customer' ? '#eff6ff' : '#f0fdf4', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 13 }}>
                                <div style={{ fontWeight: 700, color: msg.from === 'customer' ? '#4f46e5' : '#16a34a', fontSize: 11, marginBottom: 2 }}>{msg.from === 'customer' ? '🛒 You' : '🏪 Seller'}</div>
                                <div style={{ fontWeight: 600 }}>{msg.action.replace(/_/g, ' ')}{msg.price ? ` — ₹${msg.price}` : ''}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{formatDate(msg.createdAt)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Offer expires info */}
                <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Offer expires: {formatDate(offer.expiresAt)}</div>
            </div>

            {/* Sticky Bottom Actions */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                {needsAction && (
                    <>
                        <button onClick={handleRejectCounter} disabled={actionLoading}
                            style={{ flex: 1, padding: 14, background: 'white', color: '#dc2626', border: '2px solid #dc2626', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                            Reject
                        </button>
                        <button onClick={handleAcceptCounter} disabled={actionLoading}
                            style={{ flex: 2, padding: 14, background: '#16a34a', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                            {actionLoading ? '⏳...' : '✅ Accept ₹' + offer.offeredUnitPrice}
                        </button>
                    </>
                )}
                {canCheckout && (
                    <button onClick={handleProceedToCheckout} disabled={actionLoading}
                        style={{ flex: 1, padding: 15, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                        {actionLoading ? '⏳...' : '🛒 Proceed to Buy — ₹' + (agreedPrice * offer.quantity)}
                    </button>
                )}
                {!needsAction && !canCheckout && (
                    <button onClick={() => navigate('/offers')} style={{ flex: 1, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>← Back to Offers</button>
                )}
            </div>
        </div>
    );
};

export default OfferDetail;
