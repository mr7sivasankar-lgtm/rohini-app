import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import DashboardTab from '../../components/DashboardTab';
import OrdersTab from '../../components/OrdersTab';
import ProductsTab from '../../components/ProductsTab';
import ProfileTab from '../../components/ProfileTab';
import SalesTab from '../../components/SalesTab';
import ReviewsTab from '../../components/ReviewsTab';
import WalletTab from '../../components/WalletTab';
import SellerNotificationBanner from '../../components/SellerNotificationBanner';
import SellerAlertModal from '../../components/SellerAlertModal';
import LegalTab from '../../components/LegalTab';
import SubscriptionTab from '../../components/SubscriptionTab';
import OffersTab from '../../components/OffersTab';
import './Dashboard.css';

/* ── Subscription Gate Modal ── */
const SubscriptionGate = ({ onSuccess }) => {
    const { seller } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);

    useEffect(() => {
        api.get('/subscriptions/plans')
            .then(res => { if (res.data.success) setPlans(res.data.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSubscribe = async (plan) => {
        if (payLoading) return;
        try {
            setPayLoading(true);
            const res = await api.post('/subscriptions/create-payment', { planId: plan.planId });
            if (!res.data.success) throw new Error(res.data.message);

            const { razorpayOrderId, amount, keyId, planId, planName } = res.data.data;

            if (!window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }

            const rzp = new window.Razorpay({
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
                            onSuccess();
                        } else {
                            alert('Payment verification failed. Contact support.');
                        }
                    } catch (e) {
                        alert('Verification error: ' + (e.response?.data?.message || e.message));
                    } finally {
                        setPayLoading(false);
                    }
                },
                prefill: { name: seller?.ownerName || '', contact: seller?.phone || '' },
                theme: { color: '#16a34a' },
                modal: { ondismiss: () => setPayLoading(false) }
            });
            rzp.open();
        } catch (err) {
            setPayLoading(false);
            alert('Payment error: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div style={{
                background: 'white', borderRadius: 20, width: '100%', maxWidth: 420,
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #052e16 0%, #15803d 100%)',
                    borderRadius: '20px 20px 0 0', padding: '28px 24px', color: 'white', textAlign: 'center'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Subscription Required</h2>
                    <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: 14 }}>
                        Subscribe to access your seller dashboard and receive orders
                    </p>
                </div>

                <div style={{ padding: 24 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading plans...</div>
                    ) : plans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            No plans available. Contact support.
                        </div>
                    ) : (
                        plans.map(plan => (
                            <div key={plan._id} style={{
                                border: '2px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{plan.name}</div>
                                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                                            {plan.description || `${plan.duration} ${plan.durationType.toLowerCase()} access`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 26, fontWeight: 900, color: '#16a34a' }}>₹{plan.price}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>/{plan.durationType.toLowerCase()}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={payLoading}
                                    style={{
                                        width: '100%', padding: '14px',
                                        background: payLoading ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)',
                                        color: 'white', border: 'none', borderRadius: 12,
                                        fontSize: 15, fontWeight: 700,
                                        cursor: payLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {payLoading ? '⏳ Processing...' : `Subscribe for ₹${plan.price}`}
                                </button>
                            </div>
                        ))
                    )}

                    <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: '8px 0 0' }}>
                        Secure payment via Razorpay. Access unlocked immediately after payment.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Bottom nav config for mobile (max 5 items — "More" opens the drawer)
const BOTTOM_NAV = [
    { key: 'dashboard', icon: '📊', label: 'Overview' },
    { key: 'orders',    icon: '📦', label: 'Orders'   },
    { key: 'products',  icon: '👕', label: 'Products'  },
    { key: 'wallet',    icon: '💰', label: 'Wallet'    },
    { key: '__more',    icon: '☰',  label: 'More'      },
];

const MORE_ITEMS = [
    { key: 'sales',   icon: '📈', label: 'Sales & Revenue' },
    { key: 'reviews', icon: '⭐', label: 'Reviews'         },
    { key: 'profile', icon: '⚙️', label: 'Shop Profile'    },
    { key: 'legal',   icon: '📄', label: 'Terms & Privacy' },
    { key: 'subscription', icon: '🔑', label: 'Subscription' },
    { key: '__support', icon: '💬', label: 'Help & Support' },
];

const TAB_LABELS = {
    dashboard: 'Overview',
    orders:    'Order Management',
    products:  'Product Catalog',
    sales:     'Sales Analytics',
    wallet:    'Wallet & Payouts',
    reviews:   'Customer Reviews',
    profile:   'Shop Profile',
    legal:     'Terms & Privacy',
    subscription: 'Subscription',
    offers: 'Offers & Negotiations',
};

const Dashboard = () => {
    const { seller, logout } = useAuth();
    const [activeTab, setActiveTab]   = useState('dashboard');
    const [moreOpen, setMoreOpen]     = useState(false);
    const [showSubGate, setShowSubGate] = useState(false);

    // On mount: check if seller has an active subscription
    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const res = await api.get('/subscriptions/seller/current');
                const sub = res.data.data;
                const now = new Date();
                const isActive = sub && sub.status === 'ACTIVE' && new Date(sub.expiryDate) > now;
                if (!isActive) {
                    setShowSubGate(true);
                }
            } catch (err) {
                // If endpoint fails silently, don't block the seller
                console.warn('Subscription check failed:', err.message);
            }
        };
        if (seller) checkSubscription();
    }, [seller]);

    const handleNav = (key) => {
        if (key === '__more') { setMoreOpen(true); return; }
        if (key === '__support') {
            window.open(
                'https://wa.me/919700079239?text=Hi%2C%20I%20need%20help%20as%20a%20Rohini%20seller.',
                '_blank'
            );
            setMoreOpen(false);
            return;
        }
        setActiveTab(key);
        setMoreOpen(false);
    };

    const handleNotifView = (goTo) => {
        setActiveTab(goTo || 'orders');
    };

    const isMobileMoreTab = MORE_ITEMS.some(m => m.key === activeTab);

    return (
        <div className="seller-dashboard">

            {/* ── Subscription Gate: shown when seller has no active subscription ── */}
            {showSubGate && <SubscriptionGate onSuccess={() => setShowSubGate(false)} />}

            {/* ── Global notification banners & big popups ── */}
            <SellerNotificationBanner onView={handleNotifView} />
            <SellerAlertModal onView={handleNotifView} />

            {/* ── More Drawer Overlay ── */}
            {moreOpen && (
                <>
                    <div
                        className="more-overlay"
                        onClick={() => setMoreOpen(false)}
                    />
                    <div className="more-drawer">
                        <div className="more-drawer-handle" />
                        <p className="more-drawer-title">More Options</p>
                        {MORE_ITEMS.map(item => (
                            <button
                                key={item.key}
                                className={`more-drawer-item ${activeTab === item.key ? 'active' : ''}`}
                                onClick={() => handleNav(item.key)}
                            >
                                <span className="more-item-icon">{item.icon}</span>
                                <span className="more-item-label">{item.label}</span>
                                <span className="more-item-arrow">›</span>
                            </button>
                        ))}
                        <button
                            className="more-drawer-item logout-row"
                            onClick={() => { setMoreOpen(false); logout(); }}
                        >
                            <span className="more-item-icon">🚪</span>
                            <span className="more-item-label">Logout</span>
                        </button>
                    </div>
                </>
            )}

            {/* ── Sidebar (desktop) ── */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-icon">🏪</span>
                    <div className="brand-text">
                        <h2>{seller?.shopName}</h2>
                        <span className="seller-badge">Seller Portal</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {[...BOTTOM_NAV.filter(n => n.key !== '__more'), ...MORE_ITEMS].map(item => (
                        <button
                            key={item.key}
                            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.key)}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="support-btn"
                        onClick={() => window.open(
                            'https://wa.me/919700079239?text=Hi%2C%20I%20need%20help%20as%20a%20Rohini%20seller.',
                            '_blank'
                        )}
                    >
                        💬 Help & Support
                    </button>
                    <button className="logout-btn" onClick={logout}>🚪 Logout</button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>{TAB_LABELS[activeTab] || 'Dashboard'}</h1>
                    <div className="mobile-header-actions">
                        <button className="mobile-logout-btn" onClick={logout} title="Logout">🚪</button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'dashboard' && <DashboardTab onTabChange={setActiveTab} />}
                    {activeTab === 'orders'    && <OrdersTab />}
                    {activeTab === 'products'  && <ProductsTab />}
                    {activeTab === 'sales'     && <SalesTab />}
                    {activeTab === 'wallet'    && <WalletTab />}
                    {activeTab === 'reviews'   && <ReviewsTab />}
                    {activeTab === 'profile'   && <ProfileTab seller={seller} />}
                    {activeTab === 'legal'     && <LegalTab />}
                    {activeTab === 'subscription' && <SubscriptionTab />}
                    {activeTab === 'offers' && <OffersTab />}
                </div>
            </main>

            {/* ── Bottom Nav (mobile only — rendered via CSS) ── */}
            <nav className="mobile-bottom-nav">
                {BOTTOM_NAV.map(item => {
                    const isActive =
                        item.key === '__more'
                            ? isMobileMoreTab || moreOpen
                            : activeTab === item.key;
                    return (
                        <button
                            key={item.key}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleNav(item.key)}
                        >
                            <span className="mobile-nav-icon">{item.icon}</span>
                            <span className="mobile-nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Dashboard;
