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
    const [step, setStep] = useState(1); // 1 to 5 for register

    const [form, setForm] = useState({ 
        name: '', phone: '', password: '', 
        email: '', dob: '', gender: '',
        aadhaarNumber: '', panNumber: '',
        vehicleType: 'Bike', vehicleNumber: '',
        address: '', city: '', state: '', pincode: '', location: { type: 'Point', coordinates: [0, 0] },
        bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: ''
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

    const nextStep = () => {
        setError('');
        if (step === 1 && (!form.name || !form.phone || !form.password)) {
            setError('Please fill all required basic details.'); return;
        }
        if (step === 2) {
            if (!form.aadhaarNumber || !form.panNumber) {
                setError('Please provide Aadhaar and PAN numbers.'); return;
            }
            if (!/^\d{12}$/.test(form.aadhaarNumber)) {
                setError('Aadhaar number must be exactly 12 digits.'); return;
            }
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) {
                setError('PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter).'); return;
            }
        }
        if (step === 3 && (!form.address || !form.city || !form.pincode)) {
            setError('Please provide complete address and pin a location.'); return;
        }
        if (step === 4 && (!form.vehicleNumber && form.vehicleType !== 'Bicycle')) {
            setError('Vehicle Number is required for motorized vehicles.'); return;
        }
        setStep(s => s + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(s => s - 1);
    };

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.phone, form.password);
            } else {
                if (!form.bankAccountNumber || !form.bankIfsc) {
                    setError('Bank details are required to complete registration.');
                    setLoading(false);
                    return;
                }
                await register(form);
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const StepIndicator = () => (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '12px', color: '#64748b' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ 
                    flex: 1, height: '4px', background: step >= i ? '#22c55e' : '#e2e8f0', 
                    margin: '0 2px', borderRadius: '4px' 
                }} />
            ))}
        </div>
    );

    return (
        <div className="login-page">
            <div className="login-glow"></div>
            <div className="login-card" style={mode === 'register' ? {maxHeight: '90vh', overflowY: 'auto'} : {}}>
                <div className="login-brand">
                    <div className="brand-icon">🚴</div>
                    <h1>Delivery Partner</h1>
                    <p>Delivery Partner Portal</p>
                </div>

                <div className="mode-tabs">
                    <button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login'); setStep(1); setError('');}}>Login</button>
                    <button className={mode === 'register' ? 'active' : ''} onClick={() => {setMode('register'); setStep(1); setError('');}}>Register</button>
                </div>

                {mode === 'register' && <StepIndicator />}
                {error && <div className="error-msg">⚠️ {error}</div>}

                <form onSubmit={mode === 'login' || step === 5 ? submit : (e) => e.preventDefault()} className="login-form">
                    
                    {/* LOGIN MODE */}
                    {mode === 'login' && (
                        <>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input name="phone" type="tel" placeholder="10-digit mobile number" value={form.phone} onChange={handle} required />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={handle} required />
                            </div>
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Please wait…' : 'Login →'}
                            </button>
                        </>
                    )}

                    {/* REGISTER MODE */}
                    {mode === 'register' && (
                        <>
                            {step === 1 && (
                                <div className="step-content">
                                    <h3 style={{marginBottom: 15, color: '#334155'}}>1. Basic Details</h3>
                                    <div className="input-group">
                                        <label>Full Name *</label>
                                        <input name="name" placeholder="Your name" value={form.name} onChange={handle} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Phone Number *</label>
                                        <input name="phone" type="tel" placeholder="10-digit mobile number" value={form.phone} onChange={handle} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Password *</label>
                                        <input name="password" type="password" placeholder="Create a password" value={form.password} onChange={handle} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Email Address</label>
                                        <input name="email" type="email" placeholder="Optional" value={form.email} onChange={handle} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <div className="input-group" style={{flex: 1}}>
                                            <label>Date of Birth</label>
                                            <input name="dob" type="date" value={form.dob} onChange={handle} />
                                        </div>
                                        <div className="input-group" style={{flex: 1}}>
                                            <label>Gender</label>
                                            <select name="gender" value={form.gender} onChange={handle}>
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="step-content">
                                    <h3 style={{marginBottom: 15, color: '#334155'}}>2. Identity (KYC)</h3>
                                    <div className="input-group">
                                        <label>Aadhaar Number *</label>
                                        <input name="aadhaarNumber" placeholder="12-digit Aadhaar Number" value={form.aadhaarNumber} onChange={handle} required maxLength={12}/>
                                    </div>
                                    <div className="input-group">
                                        <label>PAN Card Number *</label>
                                        <input name="panNumber" placeholder="ABCDE1234F" value={form.panNumber} onChange={handle} required maxLength={10} style={{textTransform: 'uppercase'}}/>
                                    </div>
                                    <p style={{fontSize: 12, color: '#64748b', marginTop: 10}}>* Note: Document uploads will be requested upon admin verification.</p>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="step-content">
                                    <h3 style={{marginBottom: 15, color: '#334155'}}>3. Address & Location</h3>
                                    <div className="input-group" style={{ marginTop: '15px' }}>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                <button type="button" onClick={detectLocation} disabled={locationLoading} style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                    {locationLoading ? 'Detecting...' : '📡 Auto-Detect GPS'}
                                                </button>
                                                <button type="button" onClick={() => setShowMapPicker(true)} style={{ flex: 1, padding: '8px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                    📍 Pin on Map
                                                </button>
                                            </div>
                                            {form.location.coordinates[0] !== 0 && (
                                                <div style={{ fontSize: '12px', color: '#059669', marginBottom: '10px', textAlign: 'center', background: '#ecfdf5', padding: '4px', borderRadius: '4px' }}>
                                                    ✅ Location Pinned! (Lat: {form.location.coordinates[1].toFixed(4)}, Lng: {form.location.coordinates[0].toFixed(4)})
                                                </div>
                                            )}
                                            <input name="address" placeholder="Full Address / Door No *" value={form.address} onChange={handle} required style={{ marginBottom: '8px', boxSizing: 'border-box', width: '100%' }} />
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <input name="city" placeholder="City *" value={form.city} onChange={handle} required style={{ flex: 1, boxSizing: 'border-box' }} />
                                                <input name="pincode" placeholder="Pincode *" value={form.pincode} onChange={handle} required style={{ flex: 1, boxSizing: 'border-box' }} />
                                            </div>
                                            <input name="state" placeholder="State / Region" value={form.state} onChange={handle} style={{ boxSizing: 'border-box', width: '100%' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="step-content">
                                    <h3 style={{marginBottom: 15, color: '#334155'}}>4. Vehicle Details</h3>
                                    <div className="input-group">
                                        <label>Vehicle Type *</label>
                                        <select name="vehicleType" value={form.vehicleType} onChange={handle}>
                                            {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Vehicle Number</label>
                                        <input name="vehicleNumber" placeholder="e.g. AP39 AB1234" value={form.vehicleNumber} onChange={handle} />
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="step-content">
                                    <h3 style={{marginBottom: 15, color: '#334155'}}>5. Bank Details</h3>
                                    <div className="input-group">
                                        <label>Account Holder Name *</label>
                                        <input name="bankAccountName" placeholder="As per bank records" value={form.bankAccountName} onChange={handle} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Number *</label>
                                        <input name="bankAccountNumber" placeholder="Account Number" value={form.bankAccountNumber} onChange={handle} required type="password" />
                                    </div>
                                    <div className="input-group">
                                        <label>IFSC Code *</label>
                                        <input name="bankIfsc" placeholder="e.g. SBIN0001234" value={form.bankIfsc} onChange={handle} required style={{textTransform: 'uppercase'}}/>
                                    </div>
                                    <div className="input-group">
                                        <label>Bank Name</label>
                                        <input name="bankName" placeholder="e.g. State Bank of India" value={form.bankName} onChange={handle} />
                                    </div>
                                </div>
                            )}

                            {/* NAVIGATION CONTROLS */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                {step > 1 && (
                                    <button type="button" onClick={prevStep} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        ← Back
                                    </button>
                                )}
                                
                                {step < 5 ? (
                                    <button type="button" onClick={nextStep} style={{ flex: 2, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        Next →
                                    </button>
                                ) : (
                                    <button type="submit" className="btn-submit" disabled={loading} style={{ flex: 2 }}>
                                        {loading ? 'Submitting...' : 'Submit Final →'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </form>
            </div>

            {showMapPicker && (
                <MapPicker 
                    initialLat={form.location.coordinates[0] !== 0 ? form.location.coordinates[1] : null}
                    initialLng={form.location.coordinates[0] !== 0 ? form.location.coordinates[0] : null}
                    onConfirm={(lat, lng, addressText, details) => {
                        setForm(prev => ({
                            ...prev,
                            location: { type: 'Point', coordinates: [lng, lat] },
                            address: addressText || prev.address,
                            city: details?.city || prev.city,
                            state: details?.state || prev.state,
                            pincode: details?.pincode || prev.pincode
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}
        </div>
    );
}
