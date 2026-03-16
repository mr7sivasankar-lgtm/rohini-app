import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import './Auth.css';

const SHOP_CATEGORIES = [
    'Men Clothing',
    'Women Clothing',
    'Kids Clothing',
    'Mixed Fashion Store',
];

const Register = () => {
    // Step 1 state
    const [step, setStep] = useState(1); // 1=phone, 2=otp, 3=details
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [devOtp, setDevOtp] = useState(''); // shown in non-prod
    const [otpSent, setOtpSent] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);

    // Step 2 state
    const [formData, setFormData] = useState({
        ownerName: '',
        shopName: '',
        password: '',
        confirmPassword: '',
        shopAddress: '',
        shopCategory: 'Mixed Fashion Store',
        gstNumber: '',
        openingTime: '10:00',
        closingTime: '21:00',
        location: { type: 'Point', coordinates: [0, 0] },
        locationLabel: '',
    });
    const [shopLogo, setShopLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    // ── Step 1: Send OTP ──────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/send-otp', { phone: `+91${phone}` });
            if (res.data.success) {
                setOtpSent(true);
                setStep(2);
                if (res.data.otp) setDevOtp(res.data.otp); // dev only
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Verify OTP ────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/verify-otp', { phone: `+91${phone}`, otp });
            if (res.data.success) {
                setPhoneVerified(true);
                setStep(3);
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 3: Details form ──────────────────────────────────────
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShopLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleAutoLocation = () => {
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setFormData(prev => ({
                    ...prev,
                    location: { type: 'Point', coordinates: [longitude, latitude] },
                    locationLabel: `📍 Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
                }));
            },
            () => setError('Could not detect location. Please allow location access.')
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);

        const payload = new FormData();
        payload.append('phone', `+91${phone}`);
        payload.append('ownerName', formData.ownerName);
        payload.append('shopName', formData.shopName);
        payload.append('password', formData.password);
        payload.append('shopAddress', formData.shopAddress);
        payload.append('shopCategory', formData.shopCategory);
        payload.append('gstNumber', formData.gstNumber);
        payload.append('openingTime', formData.openingTime);
        payload.append('closingTime', formData.closingTime);

        const [lng, lat] = formData.location.coordinates;
        if (lng !== 0) {
            payload.append('longitude', lng);
            payload.append('latitude', lat);
        }
        if (shopLogo) payload.append('shopLogo', shopLogo);

        try {
            const res = await api.post('/sellers/register', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setIsSuccess(true);
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────
    if (isSuccess) {
        return (
            <div className="auth-container">
                <div className="auth-card success-card">
                    <div className="success-icon">🎉</div>
                    <h2>Registration Submitted!</h2>
                    <p>Your shop <strong>{formData.shopName}</strong> has been submitted for admin review.</p>
                    <div className="status-badge pending">⏳ Pending Approval</div>
                    <p className="hint-text">You will be notified once your shop is approved. You can login to check your status.</p>
                    <button className="btn-primary" onClick={() => navigate('/login')}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className={`auth-card register-card step-${step}`}>
                {/* Header */}
                <div className="auth-brand">
                    <span className="brand-icon">🚀</span>
                    <h2>Register Your Shop</h2>
                    <p>Join our marketplace as a seller</p>
                    <div className="step-indicator">
                        <span className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</span>
                        <span className="step-line"></span>
                        <span className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</span>
                        <span className="step-line"></span>
                        <span className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</span>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* ── STEP 1: Phone ── */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <div className="step-title">
                            <h3>📱 Verify Your Phone</h3>
                            <p>We'll send a 6-digit OTP to confirm your number</p>
                        </div>
                        <div className="form-group phone-input-wrapper">
                            <label>Phone Number</label>
                            <div className="phone-row">
                                <span className="phone-prefix">+91</span>
                                <input
                                    type="tel"
                                    placeholder="9700079239"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary full-width" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                        <div className="auth-footer">
                            <p>Already have an account? <Link to="/login">Sign in here</Link></p>
                        </div>
                    </form>
                )}

                {/* ── STEP 2: OTP ── */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="step-title">
                            <h3>🔐 Enter OTP</h3>
                            <p>OTP sent to <strong>+91 {phone}</strong></p>
                            {devOtp && <p className="dev-otp">Dev mode OTP: <strong>{devOtp}</strong></p>}
                        </div>
                        <div className="form-group">
                            <label>6-Digit OTP</label>
                            <input
                                type="text"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="otp-input"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary full-width" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" className="btn-link" onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                            ← Change phone number
                        </button>
                        <button type="button" className="btn-link" onClick={handleSendOtp} disabled={isLoading}>
                            Resend OTP
                        </button>
                    </form>
                )}

                {/* ── STEP 3: Details ── */}
                {step === 3 && (
                    <form onSubmit={handleSubmit} className="auth-form two-col-form">
                        <div className="step-title">
                            <h3>🏪 Shop Details</h3>
                            <p>Tell us about your shop</p>
                        </div>

                        {/* Phone locked */}
                        <div className="form-group full-width">
                            <label>Phone Number</label>
                            <div className="verified-field">
                                <span>+91 {phone}</span>
                                <span className="verified-badge">✓ Verified</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Owner Name</label>
                            <input type="text" name="ownerName" placeholder="Your Full Name" value={formData.ownerName} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Shop Name</label>
                            <input type="text" name="shopName" placeholder="e.g. Sri Ganesh Fashions" value={formData.shopName} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>Shop Category</label>
                            <select name="shopCategory" value={formData.shopCategory} onChange={handleChange} className="styled-select">
                                {SHOP_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" name="password" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" name="confirmPassword" placeholder="Re-enter password" value={formData.confirmPassword} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>GSTIN (Optional)</label>
                            <input type="text" name="gstNumber" placeholder="e.g. 29XXXXX1234X1Z5" value={formData.gstNumber} onChange={handleChange} />
                        </div>

                        <div className="form-group full-width">
                            <label>Shop Address</label>
                            <textarea name="shopAddress" placeholder="Complete physical address of your shop" value={formData.shopAddress} onChange={handleChange} rows={2} required />
                        </div>

                        {/* Shop Logo */}
                        <div className="form-group full-width logo-upload-group">
                            <label>Shop Logo</label>
                            <div className="logo-upload-area" onClick={() => document.getElementById('logoInput').click()}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="logo preview" className="logo-preview-img" />
                                ) : (
                                    <>
                                        <span className="logo-upload-icon">🖼️</span>
                                        <span>Click to upload shop logo</span>
                                    </>
                                )}
                            </div>
                            <input id="logoInput" type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                        </div>

                        {/* Shop Timings */}
                        <div className="form-group">
                            <label>🕐 Opening Time</label>
                            <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>🕘 Closing Time</label>
                            <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} />
                        </div>

                        {/* Location */}
                        <div className="form-group full-width">
                            <button type="button" className="btn-secondary location-btn" onClick={handleAutoLocation}>
                                📍 Auto-detect Shop Coordinates
                            </button>
                            {formData.locationLabel && (
                                <span className="location-success-text">{formData.locationLabel}</span>
                            )}
                        </div>

                        <button type="submit" className="btn-primary full-width" disabled={isLoading}>
                            {isLoading ? 'Submitting...' : 'Submit Registration'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;
