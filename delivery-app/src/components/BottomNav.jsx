import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BottomNav.css';

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    // Do not show bottom nav on login or specific full-screen pages if desired
    if (location.pathname === '/login') return null;

    return (
        <div className="bottom-nav">
            <button 
                className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} 
                onClick={() => navigate('/')}
            >
                <div className="nav-icon">📦</div>
                <span>Orders</span>
            </button>
            <button 
                className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`} 
                onClick={() => navigate('/history')}
            >
                <div className="nav-icon">📋</div>
                <span>History</span>
            </button>
            <button 
                className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`} 
                onClick={() => navigate('/profile')}
            >
                <div className="nav-icon">👤</div>
                <span>Profile</span>
            </button>
            <button 
                className="nav-item logout" 
                onClick={logout}
            >
                <div className="nav-icon text-red">⏻</div>
                <span>Logout</span>
            </button>
        </div>
    );
}
