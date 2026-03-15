import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { login, register } = useAuth();

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ name: '', phone: '', password: '', vehicleType: 'Bike', vehicleNumber: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            if (mode === 'login') await login(form.phone, form.password);
            else await register(form);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-glow"></div>
            <div className="login-card">
                <div className="login-brand">
                    <div className="brand-icon">🚴</div>
                    <h1>Rohini Delivery</h1>
                    <p>Partner Portal</p>
                </div>

                <div className="mode-tabs">
                    <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
                    <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <form onSubmit={submit} className="login-form">
                    {mode === 'register' && (
                        <div className="input-group">
                            <label>Full Name</label>
                            <input name="name" placeholder="Your name" value={form.name} onChange={handle} required />
                        </div>
                    )}
                    <div className="input-group">
                        <label>Phone Number</label>
                        <input name="phone" type="tel" placeholder="10-digit mobile number" value={form.phone} onChange={handle} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={handle} required />
                    </div>
                    {mode === 'register' && (
                        <>
                            <div className="input-group">
                                <label>Vehicle Type</label>
                                <select name="vehicleType" value={form.vehicleType} onChange={handle}>
                                    {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Vehicle Number</label>
                                <input name="vehicleNumber" placeholder="e.g. AP39 AB1234" value={form.vehicleNumber} onChange={handle} />
                            </div>
                        </>
                    )}
                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Please wait…' : mode === 'login' ? 'Login →' : 'Create Account →'}
                    </button>
                </form>
            </div>
        </div>
    );
}
