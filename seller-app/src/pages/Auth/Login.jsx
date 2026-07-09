import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { checkAuth } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/login-phone', { phone: `+91${phone}` });
            if (res.data.success) {
                localStorage.setItem('sellerToken', res.data.data.token);
                await checkAuth();
                navigate('/dashboard');
            } else {
                setError(res.data.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your phone number.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-icon">🏪</span>
                    <h2>Seller Portal</h2>
                    <p>Manage your shop and orders</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group phone-input-wrapper">
                        <label>Phone Number</label>
                        <div className="phone-row">
                            <span className="phone-prefix">+91</span>
                            <input
                                type="tel"
                                placeholder="Enter your phone number"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                autoComplete="off"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="auth-footer">
                        <p>Don't have a seller account? <Link to="/register">Register your shop</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
