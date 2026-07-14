import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MapPicker from '../components/MapPicker/MapPicker';
import './Login.css';

/* ── Delivery Partner Legal Content ── */
const PRIVACY_POLICY = {
    title: 'Delivery Partner Privacy Policy',
    lastUpdated: 'July 14, 2026',
    intro: "This Privacy Policy applies to the Sifito Delivery Partner mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
    sections: [
        {
            heading: '1. Eligibility',
            body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.'
        },
        {
            heading: '2. Account Registration',
            body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.'
        },
        {
            heading: '3. Information Collected',
            body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.'
        },
        {
            heading: '4. Location Permission',
            body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.'
        },
        {
            heading: '5. Use of Information',
            body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.'
        },
        {
            heading: '6. Third-Party Services',
            body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.'
        },
        {
            heading: '7. Delivery Partner Code of Conduct',
            body: 'Delivery partners must provide accurate information, act professionally, maintain vehicles in safe condition, respect customer privacy, and complete deliveries in a safe and timely manner.'
        },
        {
            heading: '8. Prohibited Activities',
            body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.'
        },
        {
            heading: '9. Data Retention',
            body: 'Personal information is retained only as long as necessary for operational, legal and regulatory purposes. Users may request deletion where permitted by law.'
        },
        {
            heading: '10. Security',
            body: 'Reasonable technical and organizational safeguards are used to protect personal information from unauthorized access or disclosure.'
        },
        {
            heading: '11. Children\'s Privacy',
            body: 'The Application is not intended for children under 13 years of age and does not knowingly collect information from children.'
        },
        {
            heading: '12. Intellectual Property',
            body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.'
        },
        {
            heading: '13. Limitation of Liability',
            body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.'
        },
        {
            heading: '14. Termination',
            body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.'
        },
        {
            heading: '15. Changes',
            body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.'
        },
        {
            heading: '16. Contact Us',
            body: 'Email: mr7.sivasankar@gmail.com\nWhatsApp Support: +91 9700079239'
        }
    ]
};

const TERMS_CONDITIONS = {
    title: 'Delivery Partner Terms & Conditions',
    lastUpdated: 'July 14, 2026',
    intro: "This Terms and Conditions applies to the Sifito Delivery Partner mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
    sections: [
        {
            heading: '1. Eligibility',
            body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.'
        },
        {
            heading: '2. Account Registration',
            body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.'
        },
        {
            heading: '3. Information Collected',
            body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.'
        },
        {
            heading: '4. Location Permission',
            body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.'
        },
        {
            heading: '5. Use of Information',
            body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.'
        },
        {
            heading: '6. Third-Party Services',
            body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.'
        },
        {
            heading: '7. Delivery Partner Code of Conduct',
            body: 'Delivery partners must provide accurate information, act professionally, maintain vehicles in safe condition, respect customer privacy, and complete deliveries in a safe and timely manner.'
        },
        {
            heading: '8. Prohibited Activities',
            body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.'
        },
        {
            heading: '9. Intellectual Property',
            body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.'
        },
        {
            heading: '10. Limitation of Liability',
            body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.'
        },
        {
            heading: '11. Termination',
            body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.'
        },
        {
            heading: '12. Changes',
            body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.'
        },
        {
            heading: '13. Contact Us',
            body: 'Email: mr7.sivasankar@gmail.com\nWhatsApp Support: +91 9700079239'
        }
    ]
};

/* ── Legal Modal Component ── */
const LegalModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 9998,
                    animation: 'legalFadeIn 0.25s ease',
                }}
            />
            <div style={{
                position: 'fixed',
                left: 0, right: 0, bottom: 0,
                background: '#fff',
                borderRadius: '24px 24px 0 0',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
                animation: 'legalSlideUp 0.32s cubic-bezier(0.16,1,0.3,1)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 20px 12px',
                    borderBottom: '1px solid #f1f5f9',
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{data.title}</h2>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', fontWeight: 400 }}>Last updated: {data.lastUpdated}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9', border: 'none', borderRadius: '50%',
                            width: 36, height: 36, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '16px 20px 32px', flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>{data.intro}</p>
                    {data.sections.map((sec, idx) => (
                        <div key={idx} style={{ marginBottom: 20 }}>
                            <h3 style={{
                                fontSize: 14, fontWeight: 700, color: '#0f172a',
                                margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{
                                    display: 'inline-block', width: 6, height: 6,
                                    borderRadius: '50%', background: '#22c55e', flexShrink: 0,
                                }} />
                                {sec.heading}
                            </h3>
                            <p style={{
                                fontSize: 13, color: '#475569', lineHeight: 1.6,
                                margin: 0, paddingLeft: 14, whiteSpace: 'pre-line'
                            }}>
                                {sec.body}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '0 20px 28px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '14px',
                            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                            color: '#fff', border: 'none', borderRadius: 14,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
                        }}
                    >
                        I Accept
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes legalFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes legalSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
};

export default function Login() {
    const navigate = useNavigate();
    const { phoneLogin, register } = useAuth();

    // ── Steps: 'phone' | 'name' | 'kyc' | 'address' | 'vehicle' | 'bank'
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tempToken, setTempToken] = useState(null);
    const [legalModal, setLegalModal] = useState(null); // null | PRIVACY_POLICY | TERMS_CONDITIONS


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

    const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    // Compress image to max 800px wide at 60% JPEG quality before base64 encoding
    // This keeps the payload well under 1MB even for large camera photos
    const compressImage = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const MAX_W = 800;
                const scale = img.width > MAX_W ? MAX_W / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ── Phone step ────────────────────────────────────────────────────────────
    const handlePhoneChange = (e) => {
        const v = e.target.value.replace(/\D/g, '');
        if (v.length <= 10) setPhone(v);
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
        setLoading(true);
        try {
            const res = await phoneLogin(`+91${phone}`);
            if (res.success) {
                if (res.data.isNewPartner) {
                    setTempToken(res.data.token);
                    setStep('name');
                } else {
                    navigate('/');
                }
            }
        } catch (err) { setError(err.message || 'Login failed. Please try again.'); }
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
    const regStepIndex = regSteps.indexOf(step); // -1 for phone

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
                    <form onSubmit={handlePhoneSubmit} className="login-form">
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
                            <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, display: 'block' }}>Enter your 10-digit mobile number to continue</span>
                        </div>
                        <button type="submit" className="btn-submit" disabled={loading || phone.length !== 10}>
                            {loading ? 'Please wait…' : 'Continue →'}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                            By continuing, you agree to our{' '}
                            <button
                                type="button"
                                onClick={() => setLegalModal(TERMS_CONDITIONS)}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: '#16a34a', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer', textDecoration: 'underline',
                                    textUnderlineOffset: 2,
                                }}
                            >
                                Terms &amp; Conditions
                            </button>
                            {' '}and{' '}
                            <button
                                type="button"
                                onClick={() => setLegalModal(PRIVACY_POLICY)}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: '#16a34a', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer', textDecoration: 'underline',
                                    textUnderlineOffset: 2,
                                }}
                            >
                                Privacy Policy
                            </button>
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
                                onClick={() => { setStep('phone'); setError(''); }}
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
                                    onChange={async e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        // Compress before storing to keep payload small
                                        const compressed = await compressImage(file);
                                        setForm(p => ({ ...p, aadhaarImage: compressed }));
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
                                    onChange={async e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        // Compress before storing to keep payload small
                                        const compressed = await compressImage(file);
                                        setForm(p => ({ ...p, panImage: compressed }));
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

            <LegalModal data={legalModal} onClose={() => setLegalModal(null)} />
        </div>
    );
}
