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

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const fetchActiveOrder = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await api.get('/orders');
                if (response.data.success) {
                    const orders = response.data.data;
                    // Find first order that is still active (not Delivered and not Cancelled)
                    // If an item was returned/exchanged, it counts if the overall status isn't fully closed.
                    const active = orders.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
                    setActiveOrder(active);
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
            {activeOrder && location.pathname === '/home' && (
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
                            <div className="banner-status">{activeOrder.status}</div>
                        </div>
                    </div>
                    <div className="banner-right">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
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
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/home') ? '#3b82f6' : 'none'} stroke={isActive('/home') ? '#3b82f6' : '#64748b'} strokeWidth={isActive('/home') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/orders') ? '#3b82f6' : 'none'} stroke={isActive('/orders') ? '#3b82f6' : '#64748b'} strokeWidth={isActive('/orders') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/cart') ? '#3b82f6' : 'none'} stroke={isActive('/cart') ? '#3b82f6' : '#64748b'} strokeWidth={isActive('/cart') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="26" height="26" viewBox="0 0 24 24" fill={isActive('/profile') ? '#3b82f6' : 'none'} stroke={isActive('/profile') ? '#3b82f6' : '#64748b'} strokeWidth={isActive('/profile') ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
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
