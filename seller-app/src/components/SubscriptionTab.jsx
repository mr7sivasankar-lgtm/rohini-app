import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionTab = () => {
    const { seller } = useAuth();
    const [currentSub, setCurrentSub] = useState(null);
    const [plans, setPlans] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('status'); // 'status' | 'history'

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [subRes, planRes, histRes] = await Promise.all([
                api.get('/subscriptions/seller/current'),
                api.get('/subscriptions/plans'),
                api.get('/subscriptions/seller/history')
            ]);
            if (subRes.data.success) setCurrentSub(subRes.data.data);
            if (planRes.data.success) setPlans(planRes.data.data);
            if (histRes.data.success) setHistory(histRes.data.data);
        } catch (err) {
            console.error('Subscription fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan) => {
        if (payLoading) return;
        try {
            setPayLoading(true);
            // 1. Create Razorpay order
            const res = await api.post('/subscriptions/create-payment', { planId: plan.planId });
            if (!res.data.success) throw new Error(res.data.message);

            const { razorpayOrderId, amount, keyId, planId, planName } = res.data.data;

            // 2. Open Razorpay checkout
            const options = {
                key: keyId,
                amount: Math.round(amount * 100),
                currency: 'INR',
                name: 'Sifito',
                description: `${planName} Subscription`,
                order_id: razorpayOrderId,
                handler: async (response) => {
                    try {
                        const verifyRes = await api.post('/subscriptions/verify-payment', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            planId
                        });
                        if (verifyRes.data.success) {
                            alert('\u2705 Subscription activated successfully!');
                            fetchAll();
                        } else {
                            alert('Payment verification failed. Contact support.');
                        }
                    } catch (e) {
                        alert('Payment verification error: ' + (e.response?.data?.message || e.message));
                    } finally {
                        setPayLoading(false);
                    }
                },
                prefill: {
                    name: seller?.ownerName || '',
                    contact: seller?.phone || ''
                },
                theme: { color: '#16a34a' },
                modal: {
                    ondismiss: () => { setPayLoading(false); }
                }
            };

            if (!window.Razorpay) {
                // Load Razorpay script if not present
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setPayLoading(false);
            alert('Payment error: ' + (err.response?.data?.message || err.message));
        }
    };

    const getDaysRemaining = (expiryDate) => {
        if (!expiryDate) return 0;
        const diff = new Date(expiryDate) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const isExpired = !currentSub || seller?.subscriptionStatus !== 'ACTIVE' || getDaysRemaining(currentSub?.expiryDate) === 0;
    const defaultPlan = plans[0];

    if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ borderTopColor: '#16a34a', margin: '40px auto' }} /></div>;

    return (
        <div style={{ padding: '0 0 80px', fontFamily: "'Inter', sans-serif" }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #15803d 100%)', borderRadius: 20, padding: '28px 24px', marginBottom: 24, color: 'white' }}>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Sifito Seller</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>🔑 Subscription</div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>Your subscription gives you access to Sifito customers & orders</div>
            </div>

            {/* Section Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[['status', '📋 Status'], ['history', '🕐 History']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveSection(key)}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${activeSection === key ? '#16a34a' : '#e2e8f0'}`, background: activeSection === key ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: activeSection === key ? '#16a34a' : '#64748b' }}>
                        {label}
                    </button>
                ))}
            </div>

            {activeSection === 'status' && (
                <div>
                    {/* Current Status Card */}
                    {isExpired ? (
                        <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>Subscription Expired</div>
                            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                                Your Sifito seller subscription has expired.<br />
                                Renew to continue receiving customers and orders.
                            </p>
                        </div>
                    ) : (
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #86efac', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Current Plan</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#052e16' }}>{currentSub?.planName || 'Daily Seller'}</div>
                                </div>
                                <span style={{ background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 999 }}>ACTIVE ✓</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    ['💰 Price', `₹${currentSub?.amount || 0}/day`],
                                    ['⏰ Expires', formatDate(currentSub?.expiryDate)],
                                    ['📅 Started', formatDate(currentSub?.startDate)],
                                    ['🗓️ Days Left', `${getDaysRemaining(currentSub?.expiryDate)} day${getDaysRemaining(currentSub?.expiryDate) !== 1 ? 's' : ''}`]
                                ].map(([label, val]) => (
                                    <div key={label} style={{ background: 'white', borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Available Plans */}
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{isExpired ? 'Renew Subscription' : 'Extend Subscription'}</h3>
                        {plans.map(plan => (
                            <div key={plan._id} style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{plan.name}</div>
                                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{plan.description || `${plan.duration} ${plan.durationType.toLowerCase()} access`}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>₹{plan.price}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>/{plan.durationType.toLowerCase()}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={payLoading}
                                    style={{ width: '100%', padding: '14px', background: payLoading ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: payLoading ? 'not-allowed' : 'pointer' }}>
                                    {payLoading ? '⏳ Processing...' : isExpired ? '🔄 RENEW NOW' : '➕ EXTEND'}
                                </button>
                            </div>
                        ))}
                        {plans.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No plans available. Contact support.</div>
                        )}
                    </div>
                </div>
            )}

            {activeSection === 'history' && (
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Subscription History</h3>
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                            <p>No subscription history yet</p>
                        </div>
                    ) : (
                        history.map(sub => (
                            <div key={sub._id} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{sub.planName}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: sub.status === 'ACTIVE' ? '#dcfce7' : sub.status === 'EXPIRED' ? '#fee2e2' : '#f1f5f9', color: sub.status === 'ACTIVE' ? '#16a34a' : sub.status === 'EXPIRED' ? '#dc2626' : '#64748b' }}>{sub.status}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#64748b' }}>
                                    <div>Amount: <strong style={{ color: '#0f172a' }}>₹{sub.amount}</strong></div>
                                    <div>Payment: <strong style={{ color: sub.paymentStatus === 'SUCCESS' ? '#16a34a' : '#dc2626' }}>{sub.paymentStatus}</strong></div>
                                    <div>From: <strong style={{ color: '#0f172a' }}>{formatDate(sub.startDate)}</strong></div>
                                    <div>To: <strong style={{ color: '#0f172a' }}>{formatDate(sub.expiryDate)}</strong></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SubscriptionTab;
