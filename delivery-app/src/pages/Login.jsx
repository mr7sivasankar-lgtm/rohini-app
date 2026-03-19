import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MapPicker from '../components/MapPicker/MapPicker';
import api from '../utils/api';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { login, register } = useAuth();

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ 
        name: '', phone: '', password: '', vehicleType: 'Bike', vehicleNumber: '',
        address: '', city: '', state: '', pincode: '', location: { type: 'Point', coordinates: [0, 0] }
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setForm(prev => ({ ...prev, location: { type: 'Point', coordinates: [longitude, latitude] } }));
                try {
                    const res = await api.get(`/serviceability/geocode/reverse?lat=${latitude}&lon=${longitude}`);
                    if (res.data.success && res.data.data) {
                        const d = res.data.data;
                        setForm(prev => ({
                            ...prev,
                            city: d.city || prev.city,
                            state: d.state || prev.state,
                            pincode: d.pincode || prev.pincode
                        }));
                    }
                } catch (_) {}
                setLocationLoading(false);
            },
            (error) => {
                setLocationLoading(false);
                setError('Please allow location access to auto-detect device location.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

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
                    <h1>Partner Delivery</h1>
                    <p>Delivery Partner Portal</p>
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

                            <div className="input-group" style={{ marginTop: '15px' }}>
                                <label>Service Area & Location (Required)</label>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <button type="button" onClick={detectLocation} disabled={locationLoading} style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                            {locationLoading ? 'Detecting...' : '📡 Auto-Detect GPS'}
                                        </button>
                                        <button type="button" onClick={() => setShowMapPicker(true)} style={{ flex: 1, padding: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                            📍 Pin on Map
                                        </button>
                                    </div>
                                    {form.location.coordinates[0] !== 0 && (
                                        <div style={{ fontSize: '12px', color: '#059669', marginBottom: '10px', textAlign: 'center', background: '#ecfdf5', padding: '4px', borderRadius: '4px' }}>
                                            ✅ Location Pinned! (Lat: {form.location.coordinates[1].toFixed(4)}, Lng: {form.location.coordinates[0].toFixed(4)})
                                        </div>
                                    )}
                                    <input name="address" placeholder="Full Address / Door No" value={form.address} onChange={handle} required style={{ marginBottom: '8px', boxSizing: 'border-box', width: '100%' }} />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input name="city" placeholder="City" value={form.city} onChange={handle} required style={{ flex: 1, boxSizing: 'border-box' }} />
                                        <input name="pincode" placeholder="Pincode" value={form.pincode} onChange={handle} required style={{ flex: 1, boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Please wait…' : mode === 'login' ? 'Login →' : 'Create Account →'}
                    </button>
                </form>
            </div>

            {showMapPicker && (
                <MapPicker 
                    onSelect={(loc) => {
                        setForm(prev => ({
                            ...prev,
                            location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
                            address: loc.address || prev.address,
                            city: loc.city || prev.city,
                            state: loc.state || prev.state,
                            pincode: loc.pincode || prev.pincode
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                    initialLocation={form.location.coordinates[0] !== 0 ? { lat: form.location.coordinates[1], lng: form.location.coordinates[0] } : null}
                />
            )}
        </div>
    );
}
