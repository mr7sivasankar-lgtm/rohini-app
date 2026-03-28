import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardTab from '../../components/DashboardTab';
import OrdersTab from '../../components/OrdersTab';
import ProductsTab from '../../components/ProductsTab';
import ProfileTab from '../../components/ProfileTab';
import SalesTab from '../../components/SalesTab';
import ReviewsTab from '../../components/ReviewsTab';
import WalletTab from '../../components/WalletTab';
import SellerNotificationBanner from '../../components/SellerNotificationBanner';
import './Dashboard.css';

// Bottom nav config for mobile (max 5 items — "More" opens the drawer)
const BOTTOM_NAV = [
    { key: 'dashboard', icon: '📊', label: 'Overview' },
    { key: 'orders',    icon: '📦', label: 'Orders'   },
    { key: 'products',  icon: '👕', label: 'Products'  },
    { key: 'wallet',    icon: '💰', label: 'Wallet'    },
    { key: '__more',    icon: '☰',  label: 'More'      },
];

// Everything inside "More" drawer
const MORE_ITEMS = [
    { key: 'sales',   icon: '📈', label: 'Sales & Revenue' },
    { key: 'reviews', icon: '⭐', label: 'Reviews'         },
    { key: 'profile', icon: '⚙️', label: 'Shop Profile'    },
];

const TAB_LABELS = {
    dashboard: 'Overview',
    orders:    'Order Management',
    products:  'Product Catalog',
    sales:     'Sales Analytics',
    wallet:    'Wallet & Payouts',
    reviews:   'Customer Reviews',
    profile:   'Shop Profile',
};

const Dashboard = () => {
    const { seller, logout } = useAuth();
    const [activeTab, setActiveTab]   = useState('dashboard');
    const [moreOpen, setMoreOpen]     = useState(false);

    const handleNav = (key) => {
        if (key === '__more') { setMoreOpen(true); return; }
        setActiveTab(key);
        setMoreOpen(false);
    };

    const handleNotifView = (goTo) => {
        setActiveTab(goTo || 'orders');
    };

    const isMobileMoreTab = MORE_ITEMS.some(m => m.key === activeTab);

    return (
        <div className="seller-dashboard">

            {/* ── Global notification banners ── */}
            <SellerNotificationBanner onView={handleNotifView} />

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
