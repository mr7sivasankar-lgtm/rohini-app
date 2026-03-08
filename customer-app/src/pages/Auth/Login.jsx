import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const { sendOTP, verifyOTP } = useAuth();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length <= 10) {
            setPhone(value);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!phone || phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `+91${phone}`;
            const response = await sendOTP(fullPhone);

            if (response.success) {
                setStep('otp');
                // Show OTP in dev mode
                if (response.data.otp) {
                    alert(`Your OTP is: ${response.data.otp}`);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Make sure backend is running on port 5000.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `+91${phone}`;
            const response = await verifyOTP(fullPhone, otp);

            if (response.success) {
                navigate('/home');
            }
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Brand Icon */}
                <div className="login-brand">
                    <div className="login-brand-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    <span className={`step-dot ${step === 'phone' ? 'active' : ''}`}></span>
                    <span className={`step-dot ${step === 'otp' ? 'active' : ''}`}></span>
                </div>

                <div className="login-header">
                    <h1>{step === 'phone' ? 'Welcome!' : 'Verify OTP'}</h1>
                    <p>{step === 'phone' ? 'Sign in with your phone number' : 'Enter the code we sent you'}</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP} className="login-form">
                        <div className="form-group">
                            <label>Phone Number</label>
                            <div className="phone-input-wrapper">
                                <span className="phone-prefix">+91</span>
                                <input
                                    type="tel"
                                    className="login-input phone-input"
                                    placeholder="Enter your number"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    maxLength="10"
                                />
                            </div>
                            <span className="input-hint">
                                We'll send you a one-time verification code
                            </span>
                        </div>

                        <button type="submit" className="login-btn login-btn-primary" disabled={loading || phone.length !== 10}>
                            {loading && <span className="btn-spinner"></span>}
                            {loading ? 'Sending OTP...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="login-form">
                        <div className="otp-sent-info">
                            <small>OTP sent to</small>
                            <div className="otp-phone">+91 {phone}</div>
                        </div>

                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                className="login-input"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                maxLength="6"
                                autoFocus
                                style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 700 }}
                            />
                        </div>

                        <button type="submit" className="login-btn login-btn-primary" disabled={loading || otp.length !== 6}>
                            {loading && <span className="btn-spinner"></span>}
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        <button
                            type="button"
                            className="login-btn login-btn-secondary"
                            onClick={() => {
                                setStep('phone');
                                setOtp('');
                                setError('');
                            }}
                        >
                            ← Change Number
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    <p>By continuing, you agree to our Terms & Privacy Policy</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
