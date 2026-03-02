import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import './BottomNav.css';

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cartCount } = useCart();

    const tabs = [
        {
            name: 'Home',
            path: '/home',
            icon: (active) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            )
        },
        {
            name: 'Orders',
            path: '/orders',
            icon: (active) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="2">
                    <path d="M9 11H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-5M9 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5M9 11h6" />
                </svg>
            )
        },
        {
            name: 'Cart',
            path: '/cart',
            icon: (active) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
            badge: cartCount
        },
        {
            name: 'Profile',
            path: '/profile',
            icon: (active) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            )
        }
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="bottom-nav">
            {tabs.map((tab) => (
                <button
                    key={tab.name}
                    className={`nav-tab ${isActive(tab.path) ? 'active' : ''}`}
                    onClick={() => navigate(tab.path)}
                >
                    <div className="nav-icon">
                        {tab.icon(isActive(tab.path))}
                        {tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>}
                    </div>
                    <span className="nav-label">{tab.name}</span>
                </button>
            ))}
        </nav>
    );
};

export default BottomNav;
