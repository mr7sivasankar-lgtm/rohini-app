import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/login');
        }
    };

    if (!user) {
        return (
            <div className="empty-state">
                <h2>Not logged in</h2>
                <button className="btn btn-primary" onClick={() => navigate('/login')}>
                    Login
                </button>
            </div>
        );
    }

    const menuItems = [
        {
            icon: '📦',
            label: 'Order History',
            path: '/orders',
            description: 'View all your orders'
        },
        {
            icon: '❤️',
            label: 'Wishlist',
            path: '/wishlist',
            description: 'Your favorite items'
        },
        {
            icon: '📍',
            label: 'Addresses',
            path: '/addresses',
            description: 'Manage delivery addresses'
        },
        {
            icon: '👤',
            label: 'Edit Profile',
            path: '/edit-profile',
            description: 'Update your information'
        }
    ];

    return (
        <div className="profile-page">
            {/* User Info Card */}
            <div className="user-card">
                <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                    <h2 className="user-name">{user.name}</h2>
                    <p className="user-phone">{user.phone}</p>
                    {user.email && <p className="user-email">{user.email}</p>}
                </div>
            </div>

            {/* Menu Items */}
            <div className="menu-section">
                {menuItems.map((item) => (
                    <div
                        key={item.path}
                        className="menu-item"
                        onClick={() => navigate(item.path)}
                    >
                        <div className="menu-icon">{item.icon}</div>
                        <div className="menu-content">
                            <div className="menu-label">{item.label}</div>
                            <div className="menu-description">{item.description}</div>
                        </div>
                        <div className="menu-arrow">›</div>
                    </div>
                ))}
            </div>

            {/* Logout Button */}
            <button className="btn btn-dark btn-lg logout-btn" onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
};

export default Profile;
