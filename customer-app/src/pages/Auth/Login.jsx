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
                <div className="login-header">
                    <h1>Welcome Back!</h1>
                    <p>Enter your phone number to continue</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP} className="login-form">
                        <div className="form-group">
                            <label>Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#64748b',
                                    fontWeight: 600
                                }}>
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    className="input"
                                    style={{ paddingLeft: '50px' }}
                                    placeholder="9999999999"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    maxLength="10"
                                />
                            </div>
                            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                Enter 10-digit mobile number
                            </small>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || phone.length !== 10}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="login-form">
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '8px' }}>
                            <small style={{ color: '#64748b' }}>OTP sent to</small>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>+91 {phone}</div>
                        </div>

                        <div className="form-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                maxLength="6"
                                autoFocus
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || otp.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setStep('phone');
                                setOtp('');
                                setError('');
                            }}
                        >
                            Change Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
