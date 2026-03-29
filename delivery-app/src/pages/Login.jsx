import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MapPicker from '../components/MapPicker/MapPicker';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { sendOTP, verifyOTP, register } = useAuth();

    // ── Steps: 'phone' | 'otp' | 'name' | 'kyc' | 'address' | 'vehicle' | 'bank'
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const otpInputRef = useRef(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tempToken, setTempToken] = useState(null); // token from verify-otp

    // Registration form
    const [form, setForm] = useState({
        name: '',
        email: '', dob: '', gender: '',
        aadhaarNumber: '', panNumber: '',
        aadhaarImage: '', panImage: '',
        vehicleType: 'Bike', vehicleNumber: '',
        address: '', city: '', state: '', pincode: '',
        location: { type: 'Point', coordinates: [0, 0] },
        bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: ''
    });

    const [showMapPicker, setShowMapPicker] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    // Resend countdown
    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    // ── Phone step ────────────────────────────────────────────────────────────
    const handlePhoneChange = (e) => {
        const v = e.target.value.replace(/\D/g, '');
        if (v.length <= 10) setPhone(v);
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
        setLoading(true);
        try {
            const res = await sendOTP(`+91${phone}`);
            if (res.success) {
                setStep('otp');
                setResendTimer(30);
                if (res.data?.otp) alert(`[Dev] Your OTP: ${res.data.otp}`);
            }
        } catch (err) { setError(err.message || 'Failed to send OTP'); }
        finally { setLoading(false); }
    };

    // ── OTP step ─────────────────────────────────────────────────────────────
    const handleOTPInput = (e) => {
        const raw = e.target.value
            .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
            .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
            .replace(/[\u0966-\u096F]/g, d => String(d.charCodeAt(0) - 0x0966))
            .replace(/\D/g, '')
            .slice(0, 6);
        setOtp(raw);
    };

    const handleOTPPaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        setOtp(paste);
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Enter all 6 digits'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await verifyOTP(`+91${phone}`, otp);
            if (res.success) {
                if (res.data.isNewPartner) {
                    // Save token temporarily so they can register
                    setTempToken(res.data.token);
                    setStep('name');
                } else {
                    navigate('/');
                }
            }
        } catch (err) { setError(err.message || 'Invalid OTP'); }
        finally { setLoading(false); }
    };

    // ── Name step ────────────────────────────────────────────────────────────
    const handleNameNext = (e) => {
        e.preventDefault();
        if (!form.name.trim() || form.name.trim().length < 2) {
            setError('Enter your full name (min 2 chars)'); return;
        }
        setError('');
        setStep('kyc');
    };

    // ── KYC step ─────────────────────────────────────────────────────────────
    const handleKYCNext = (e) => {
        e.preventDefault();
        if (!form.aadhaarNumber || !form.panNumber) {
            setError('Please provide Aadhaar and PAN numbers.'); return;
        }
        if (!/^\d{12}$/.test(form.aadhaarNumber)) {
            setError('Aadhaar must be exactly 12 digits.'); return;
        }
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) {
            setError('PAN format: ABCDE1234F'); return;
        }
        setError('');
        setStep('address');
    };

    // ── Address step ─────────────────────────────────────────────────────────
    const detectLocation = () => {
        if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setForm(p => ({ ...p, location: { type: 'Point', coordinates: [longitude, latitude] } }));
                setLocationLoading(false);
            },
            () => { setLocationLoading(false); setError('Allow location access to auto-detect.'); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleAddressNext = (e) => {
        e.preventDefault();
        if (!form.address || !form.city || !form.pincode) {
            setError('Please fill address, city, and pincode.'); return;
        }
        setError('');
        setStep('vehicle');
    };

    // ── Vehicle step ─────────────────────────────────────────────────────────
    const handleVehicleNext = (e) => {
        e.preventDefault();
        if (!form.vehicleNumber && form.vehicleType !== 'Bicycle') {
            setError('Vehicle number is required for motorized vehicles.'); return;
        }
        setError('');
        setStep('bank');
    };

    // ── Bank / Final submit ───────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.bankAccountNumber || !form.bankIfsc) {
            setError('Bank details are required.'); return;
        }
        setError('');
        setLoading(true);
        try {
            await register({ ...form, phone: `+91${phone}` });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed');
        } finally { setLoading(false); }
    };

    // Step order for the progress bar (new user registration steps)
    const regSteps = ['name', 'kyc', 'address', 'vehicle', 'bank'];
    const regStepIndex = regSteps.indexOf(step); // -1 for phone/otp

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="login-page">
            <div className="login-glow" />
            <div className="login-card" style={regStepIndex >= 0 ? { maxHeight: '90vh', overflowY: 'auto' } : {}}>

                {/* Brand */}
                <div className="login-brand">
                    <div className="brand-icon">🚴</div>
                    <h1>Delivery Partner</h1>
                    <p>
                        {step === 'phone' && 'Sign in with your phone number'}
                        {step === 'otp' && `OTP sent to +91 ${phone}`}
                        {step === 'name' && 'Complete your profile'}
                        {step === 'kyc' && 'Identity Verification'}
                        {step === 'address' && 'Your Address & Location'}
                        {step === 'vehicle' && 'Vehicle Details'}
                        {step === 'bank' && 'Bank Account Details'}
                    </p>
                </div>

                {/* Progress bar for registration steps */}
                {regStepIndex >= 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {regSteps.map((s, i) => (
                            <div key={s} style={{
                                flex: 1, height: 4,
                                background: i <= regStepIndex ? '#22c55e' : '#e2e8f0',
                                borderRadius: 4, transition: 'background 0.3s'
                            }} />
                        ))}
                    </div>
                )}

                {error && <div className="error-msg">⚠️ {error}</div>}

                {/* ── Phone Step ── */}
                {step === 'phone' && (
                    <form onSubmit={handleSendOTP} className="login-form">
                        <div className="input-group">
                            <label>Phone Number</label>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                                <span style={{ padding: '0 12px', color: '#374151', fontWeight: 700, borderRight: '1.5px solid #e2e8f0', whiteSpace: 'nowrap', lineHeight: '48px' }}>+91</span>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="10-digit mobile number"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    maxLength="10"
                                    autoFocus
                                    style={{ flex: 1, border: 'none', background: 'none', padding: '12px 14px', fontSize: 15, outline: 'none' }}
                                />
                            </div>
                            <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, display: 'block' }}>We'll send a one-time verification code</span>
                        </div>
                        <button type="submit" className="btn-submit" disabled={loading || phone.length !== 10}>
                            {loading ? 'Sending OTP…' : 'Continue →'}
                        </button>
                    </form>
                )}

                {/* ── OTP Step ── */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP} className="login-form">
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>OTP sent to</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>+91 {phone}</div>
                        </div>

                        {/* OTP underline boxes */}
                        <div
                            style={{ position: 'relative', display: 'flex', gap: 10, justifyContent: 'center', cursor: 'text' }}
                            onClick={() => otpInputRef.current?.focus()}
                        >
                            <input
                                ref={otpInputRef}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={handleOTPInput}
                                onPaste={handleOTPPaste}
                                autoFocus
                                style={{
                                    position: 'absolute', opacity: 0, width: '100%', height: '100%',
                                    top: 0, left: 0, zIndex: 1, cursor: 'text', fontSize: 16,
                                }}
                            />
                            {[0,1,2,3,4,5].map(i => {
                                const filled = i < otp.length;
                                const isCursor = i === otp.length;
                                return (
                                    <div key={i} style={{
                                        width: 44, height: 56,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderBottom: `3px solid ${filled ? '#16a34a' : isCursor ? '#22c55e' : '#d1d5db'}`,
                                        fontSize: 28, fontWeight: 800,
                                        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                        color: '#111827', position: 'relative', transition: 'border-color 0.15s',
                                    }}>
                                        {filled ? otp[i] : (isCursor ? (
                                            <span style={{ width: 2, height: 28, background: '#22c55e', borderRadius: 2, display: 'block', animation: 'otpBlink 1s step-end infinite' }} />
                                        ) : null)}
                                    </div>
                                );
                            })}
                        </div>
                        <style>{`@keyframes otpBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

                        <button type="submit" className="btn-submit" disabled={loading || otp.length !== 6}>
                            {loading ? 'Verifying…' : 'Verify & Continue →'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            {resendTimer > 0 ? (
                                <span style={{ fontSize: 13, color: '#9ca3af' }}>Resend OTP in <strong style={{ color: '#22c55e' }}>{resendTimer}s</strong></span>
                            ) : (
                                <button type="button" style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
                                    ← Change number / Resend OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* ── Name Step (new partner) ── */}
                {step === 'name' && (
                    <form onSubmit={handleNameNext} className="login-form">
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 4 }}>
                            🎉 Welcome! Let's set up your profile in a few steps.
                        </div>
                        <div className="input-group">
                            <label>Full Name *</label>
                            <input name="name" placeholder="e.g. Rajesh Kumar" value={form.name} onChange={handle} autoFocus />
                        </div>
                        <div className="input-group">
                            <label>Email Address</label>
                            <input name="email" type="email" placeholder="Optional" value={form.email} onChange={handle} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Date of Birth</label>
                                <input name="dob" type="date" value={form.dob} onChange={handle} />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Gender</label>
                                <select name="gender" value={form.gender} onChange={handle}>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button"
                                onClick={() => { setStep('otp'); setOtp(''); setError(''); }}
                                style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-submit" style={{ flex: 2 }}>Continue →</button>
                        </div>
                    </form>
                )}

                {/* ── KYC Step ── */}
                {step === 'kyc' && (
                    <form onSubmit={handleKYCNext} className="login-form">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Identity (KYC)</h3>
                        <div className="input-group">
                            <label>Aadhaar Number *</label>
                            <input name="aadhaarNumber" placeholder="12-digit Aadhaar" value={form.aadhaarNumber} onChange={handle} maxLength={12} inputMode="numeric" />
                        </div>

                        {/* Aadhaar Card Image */}
                        <div className="input-group">
                            <label>Aadhaar Card Photo *</label>
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: 6, padding: '14px', border: '2px dashed #cbd5e1', borderRadius: 10,
                                cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.2s'
                            }}>
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setForm(p => ({ ...p, aadhaarImage: ev.target.result }));
                                        reader.readAsDataURL(file);
                                    }}
                                />
                                {form.aadhaarImage
                                    ? <img src={form.aadhaarImage} alt="Aadhaar" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                                    : <><span style={{ fontSize: 28 }}>📷</span><span style={{ fontSize: 13, color: '#64748b' }}>Tap to upload Aadhaar card</span></>}
                            </label>
                        </div>

                        <div className="input-group">
                            <label>PAN Card Number *</label>
                            <input name="panNumber" placeholder="ABCDE1234F" value={form.panNumber}
                                onChange={e => setForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                                maxLength={10} style={{ textTransform: 'uppercase' }} />
                        </div>

                        {/* PAN Card Image */}
                        <div className="input-group">
                            <label>PAN Card Photo *</label>
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: 6, padding: '14px', border: '2px dashed #cbd5e1', borderRadius: 10,
                                cursor: 'pointer', background: '#f8fafc'
                            }}>
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setForm(p => ({ ...p, panImage: ev.target.result }));
                                        reader.readAsDataURL(file);
                                    }}
                                />
                                {form.panImage
                                    ? <img src={form.panImage} alt="PAN" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                                    : <><span style={{ fontSize: 28 }}>📷</span><span style={{ fontSize: 13, color: '#64748b' }}>Tap to upload PAN card</span></>}
                            </label>
                        </div>

                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>📎 Images are securely stored for admin verification.</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => { setStep('name'); setError(''); }}
                                style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-submit" style={{ flex: 2 }}>Continue →</button>
                        </div>
                    </form>
                )}

                {/* ── Address Step ── */}
                {step === 'address' && (
                    <form onSubmit={handleAddressNext} className="login-form">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Address & Location</h3>
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                <button type="button" onClick={detectLocation} disabled={locationLoading}
                                    style={{ flex: 1, padding: 8, background: 'white', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                                    {locationLoading ? 'Detecting…' : '📡 Auto-Detect GPS'}
                                </button>
                                <button type="button" onClick={() => setShowMapPicker(true)}
                                    style={{ flex: 1, padding: 8, background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                                    📍 Pin on Map
                                </button>
                            </div>
                            {form.location.coordinates[0] !== 0 && (
                                <div style={{ fontSize: 12, color: '#059669', marginBottom: 10, textAlign: 'center', background: '#ecfdf5', padding: 4, borderRadius: 4 }}>
                                    ✅ Location Pinned! (Lat: {form.location.coordinates[1].toFixed(4)}, Lng: {form.location.coordinates[0].toFixed(4)})
                                </div>
                            )}
                            <div className="input-group">
                                <input name="address" placeholder="Full Address / Door No *" value={form.address} onChange={handle} required />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input name="city" placeholder="City *" value={form.city} onChange={handle} required style={{ flex: 1 }} />
                                <input name="pincode" placeholder="Pincode *" value={form.pincode} onChange={handle} required style={{ flex: 1 }} inputMode="numeric" />
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <input name="state" placeholder="State / Region" value={form.state} onChange={handle} style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => { setStep('kyc'); setError(''); }}
                                style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-submit" style={{ flex: 2 }}>Continue →</button>
                        </div>
                    </form>
                )}

                {/* ── Vehicle Step ── */}
                {step === 'vehicle' && (
                    <form onSubmit={handleVehicleNext} className="login-form">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Vehicle Details</h3>
                        <div className="input-group">
                            <label>Vehicle Type *</label>
                            <select name="vehicleType" value={form.vehicleType} onChange={handle}>
                                {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Vehicle Number {form.vehicleType !== 'Bicycle' ? '*' : ''}</label>
                            <input name="vehicleNumber" placeholder="e.g. AP39 AB1234" value={form.vehicleNumber} onChange={handle} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => { setStep('address'); setError(''); }}
                                style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-submit" style={{ flex: 2 }}>Continue →</button>
                        </div>
                    </form>
                )}

                {/* ── Bank Step ── */}
                {step === 'bank' && (
                    <form onSubmit={handleSubmit} className="login-form">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Bank Account Details</h3>
                        <div className="input-group">
                            <label>Account Holder Name *</label>
                            <input name="bankAccountName" placeholder="As per bank records" value={form.bankAccountName} onChange={handle} />
                        </div>
                        <div className="input-group">
                            <label>Account Number *</label>
                            <input name="bankAccountNumber" placeholder="Account Number" value={form.bankAccountNumber} onChange={handle} type="password" />
                        </div>
                        <div className="input-group">
                            <label>IFSC Code *</label>
                            <input name="bankIfsc" placeholder="e.g. SBIN0001234" value={form.bankIfsc}
                                onChange={e => setForm(p => ({ ...p, bankIfsc: e.target.value.toUpperCase() }))}
                                style={{ textTransform: 'uppercase' }} />
                        </div>
                        <div className="input-group">
                            <label>Bank Name</label>
                            <input name="bankName" placeholder="e.g. State Bank of India" value={form.bankName} onChange={handle} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => { setStep('vehicle'); setError(''); }}
                                style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-submit" disabled={loading} style={{ flex: 2 }}>
                                {loading ? 'Submitting…' : '✓ Submit & Register'}
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                            Your account will be activated after admin approval.
                        </p>
                    </form>
                )}
            </div>

            {/* Map Picker modal */}
            {showMapPicker && (
                <MapPicker
                    initialLat={form.location.coordinates[0] !== 0 ? form.location.coordinates[1] : null}
                    initialLng={form.location.coordinates[0] !== 0 ? form.location.coordinates[0] : null}
                    onConfirm={(lat, lng, addressText, details) => {
                        setForm(p => ({
                            ...p,
                            location: { type: 'Point', coordinates: [lng, lat] },
                            address: addressText || p.address,
                            city: details?.city || p.city,
                            state: details?.state || p.state,
                            pincode: details?.pincode || p.pincode
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}
        </div>
    );
}
