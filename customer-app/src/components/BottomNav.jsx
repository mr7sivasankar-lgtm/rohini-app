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
                <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#64748b'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            )
        },
        {
            name: 'Orders',
            path: '/orders',
            icon: (active) => (
                <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#64748b'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="2" />
                    <path d="M8 7h8" />
                    <path d="M8 11h8" />
                    <path d="M8 15h5" />
                </svg>
            )
        },
        {
            name: 'Cart',
            path: '/cart',
            icon: (active) => (
                <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#64748b'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            ),
            badge: cartCount
        },
        {
            name: 'Profile',
            path: '/profile',
            icon: (active) => (
                <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#64748b'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
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
