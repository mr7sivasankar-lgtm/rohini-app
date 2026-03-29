import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import api from '../utils/api';
import './BottomNav.css';

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cartCount } = useCart();
    const [activeOrder, setActiveOrder] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const fetchActiveOrder = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await api.get('/orders');
                if (response.data.success) {
                    const orders = response.data.data;
                    // Sort by newest first, find the most recent active order
                    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    const TERMINAL_STATUSES = ['Delivered', 'Cancelled', 'Rejected', 'Return Completed'];
                    const active = sorted.find(o => !TERMINAL_STATUSES.includes(o.status));
                    setActiveOrder(active);
                    // Reset dismissed when a NEW order appears
                    setDismissed(false);
                }
            } catch (error) {
                console.error('Error fetching active order for nav banner', error);
            }
        };

        fetchActiveOrder();
        
        // Poll every 15 seconds to keep status live
        const intervalId = setInterval(fetchActiveOrder, 15000);
        return () => clearInterval(intervalId);
    }, [location.pathname]); // Re-verify slightly on navigation

    return (
        <>
            {/* Active Order Tracker Banner */}
            {activeOrder && !dismissed && location.pathname === '/home' && (
                <div 
                    className="active-order-nav-banner"
                    onClick={() => navigate(`/tracking/${activeOrder.orderId}`)}
                >
                    <div className="banner-left">
                        <div className="banner-icon-wrapper">
                            <span className="live-pulse"></span>
                            <span className="banner-emoji">🚚</span>
                        </div>
                        <div className="banner-text">
                            <div className="banner-title">Track your order</div>
                            <div className="banner-status">{activeOrder.status?.toUpperCase()}</div>
                        </div>
                    </div>
                    <div className="banner-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <button
                            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'inherit', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}
                            aria-label="Close banner"
                        >✕</button>
                    </div>
                </div>
            )}

            <nav className="bottom-nav">
                {/* Home */}
                <button
                    className={`nav-tab ${isActive('/home') ? 'active' : ''}`}
                    onClick={() => navigate('/home')}
                >
                    <div className="nav-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/home') ? '#22c55e' : 'none'} stroke={isActive('/home') ? '#22c55e' : '#64748b'} strokeWidth={isActive('/home') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <span className="nav-label">Home</span>
                </button>

                {/* Orders */}
                <button
                    className={`nav-tab ${isActive('/orders') ? 'active' : ''}`}
                    onClick={() => navigate('/orders')}
                >
                    <div className="nav-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/orders') ? '#22c55e' : 'none'} stroke={isActive('/orders') ? '#22c55e' : '#64748b'} strokeWidth={isActive('/orders') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="18" rx="2" />
                            <path d="M8 7h8" />
                            <path d="M8 11h8" />
                            <path d="M8 15h5" />
                        </svg>
                    </div>
                    <span className="nav-label">Orders</span>
                </button>

                {/* Floating Search Button (center) */}
                <div className="nav-search-wrap">
                    <button
                        className={`floating-search-btn ${isActive('/search') ? 'active' : ''}`}
                        onClick={() => {
                            if (location.pathname.startsWith('/shop/')) {
                                const shopId = location.pathname.split('/')[2];
                                navigate(`/search?shopId=${shopId}`);
                            } else {
                                navigate('/search');
                            }
                        }}
                        aria-label="Search"
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                </div>

                {/* Cart */}
                <button
                    className={`nav-tab ${isActive('/cart') ? 'active' : ''}`}
                    onClick={() => navigate('/cart')}
                >
                    <div className="nav-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/cart') ? '#22c55e' : 'none'} stroke={isActive('/cart') ? '#22c55e' : '#64748b'} strokeWidth={isActive('/cart') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                            <path d="M3 6h18" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
                    </div>
                    <span className="nav-label">Cart</span>
                </button>

                {/* Profile */}
                <button
                    className={`nav-tab ${isActive('/profile') ? 'active' : ''}`}
                    onClick={() => navigate('/profile')}
                >
                    <div className="nav-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/profile') ? '#22c55e' : 'none'} stroke={isActive('/profile') ? '#22c55e' : '#64748b'} strokeWidth={isActive('/profile') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M20 21a8 8 0 0 0-16 0" />
                        </svg>
                    </div>
                    <span className="nav-label">Profile</span>
                </button>
            </nav>
        </>
    );
};

export default BottomNav;
