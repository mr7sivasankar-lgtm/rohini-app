import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import './Auth.css';

const Login = () => {
    const [step, setStep] = useState(1); // 1=phone, 2=otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [devOtp, setDevOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { loginWithOtp } = useAuth();
    const navigate = useNavigate();

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/login-otp', { phone: `+91${phone}` });
            if (res.data.success) {
                setStep(2);
                if (res.data.otp) setDevOtp(res.data.otp); // dev mode
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Check your phone number.');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP & Login
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await loginWithOtp(`+91${phone}`, otp);
            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.message || 'Invalid OTP. Please try again.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
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

                {/* ── Step 1: Phone ── */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="auth-form">
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
                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>

                        <div className="auth-footer">
                            <p>Don't have a seller account? <Link to="/register">Register your shop</Link></p>
                        </div>
                    </form>
                )}

                {/* ── Step 2: OTP ── */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="step-title" style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>
                                OTP sent to <strong>+91 {phone}</strong>
                            </p>
                            {devOtp && (
                                <div className="dev-otp">
                                    Dev mode OTP: <strong>{devOtp}</strong>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="otp-input"
                                autoFocus
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        <button
                            type="button"
                            className="btn-link"
                            onClick={() => { setStep(1); setOtp(''); setError(''); setDevOtp(''); }}
                        >
                            ← Change phone number
                        </button>

                        <button
                            type="button"
                            className="btn-link"
                            onClick={handleSendOtp}
                            disabled={isLoading}
                        >
                            Resend OTP
                        </button>

                        <div className="auth-footer">
                            <p>Don't have a seller account? <Link to="/register">Register your shop</Link></p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
