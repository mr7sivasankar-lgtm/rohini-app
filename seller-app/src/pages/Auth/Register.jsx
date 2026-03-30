import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapPicker from '../../components/MapPicker/MapPicker';
import api from '../../utils/api';
import './Auth.css';

const SHOP_CATEGORIES = [
    'Clothing Store', 'Boutique', 'Tailor', 'Men Clothing',
    'Women Clothing', 'Kids Clothing', 'Mixed Fashion Store',
];

const INDIAN_BANKS = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank', 'IDFC First Bank',
    'Bank of India', 'Indian Bank', 'Central Bank of India', 'UCO Bank',
    'Indian Overseas Bank', 'Federal Bank', 'South Indian Bank', 'Karnataka Bank',
    'Andhra Bank', 'Vijaya Bank', 'Syndicate Bank', 'Allahabad Bank',
    'Dena Bank', 'Corporation Bank', 'City Union Bank', 'Lakshmi Vilas Bank',
    'RBL Bank', 'Bandhan Bank', 'AU Small Finance Bank', 'Ujjivan Small Finance Bank',
    'Jana Small Finance Bank', 'Equitas Small Finance Bank', 'Post Office (India Post)',
];

const StepIndicator = ({ step, maxSteps = 6 }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '14px', left: 0, right: 0, height: '4px', background: '#e2e8f0', zIndex: 0, borderRadius: '2px' }}>
            <div style={{ width: `${((step - 1) / (maxSteps - 1)) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease', borderRadius: '2px' }} />
        </div>
        {Array.from({ length: maxSteps }).map((_, i) => (
            <div key={i} style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: step >= i + 1 ? '#3b82f6' : '#fff',
                color: step >= i + 1 ? '#fff' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px', zIndex: 1,
                border: `2px solid ${step >= i + 1 ? '#3b82f6' : '#cbd5e1'}`,
                transition: 'all 0.3s'
            }}>
                {i + 1}
            </div>
        ))}
    </div>
);

const Register = () => {
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [devOtp, setDevOtp] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [commissionRate, setCommissionRate] = useState(null); // dynamic from backend

    const [form, setForm] = useState({
        ownerName: '', email: '', password: '', confirmPassword: '',
        shopName: '', shopCategory: 'Mixed Fashion Store', gstNumber: '', businessPan: '',
        shopAddress: '', city: '', state: '', pincode: '',
        bankAccountName: '', bankName: '', bankAccountNumber: '', bankIfsc: '', upiId: '',
        openingTime: '10:00', closingTime: '21:00', commissionAgreementAccepted: false
    });

    const [location, setLocation] = useState({ coordinates: [0, 0] });
    const [docs, setDocs] = useState({
        shopLogo: null, documentAadhaar: null, documentPan: null,
        documentShopPhoto: null, documentCancelledCheque: null
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    const navigate = useNavigate();

    // Fetch platform commission rate on mount
    useEffect(() => {
        api.get('/config').then(res => {
            if (res.data.success && res.data.data?.commissionPercentage) {
                setCommissionRate(res.data.data.commissionPercentage);
            }
        }).catch(() => {});
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setDocs({ ...docs, [e.target.name]: e.target.files[0] });

    const nextStep = () => {
        setError('');
        if (step === 3) {
            if (!form.ownerName || !form.password || !form.shopName) return setError('Please fill all mandatory Basic & Shop Info.');
            if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
        }
        if (step === 4) {
            if (!form.shopAddress || !form.city || !form.pincode) return setError('Please fill your complete address.');
        }
        if (step === 5) {
            if (!form.bankAccountName || !form.bankAccountNumber || !form.bankIfsc) return setError('Please fill your mandatory banking details.');
            if (!docs.documentAadhaar) return setError('Aadhaar card upload is required.');
            if (!docs.documentPan) return setError('PAN card upload is required.');
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) return setError('Please enter a valid 10-digit phone number.');
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/send-otp', { phone: `+91${phone}` });
            if (res.data.success) { setStep(2); if (res.data.otp) setDevOtp(res.data.otp); }
            else setError(res.data.message);
        } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP'); }
        finally { setIsLoading(false); }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/verify-otp', { phone: `+91${phone}`, otp });
            if (res.data.success) { setPhoneVerified(true); setStep(3); }
            else setError(res.data.message);
        } catch (err) { setError(err.response?.data?.message || 'OTP verification failed'); }
        finally { setIsLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.commissionAgreementAccepted) return setError('You must accept the commission agreement to register.');
        setIsLoading(true);
        const payload = new FormData();
        payload.append('phone', `+91${phone}`);
        Object.keys(form).forEach(key => payload.append(key, form[key]));
        const [lng, lat] = location.coordinates;
        if (lng !== 0) { payload.append('longitude', lng); payload.append('latitude', lat); }
        Object.keys(docs).forEach(key => { if (docs[key]) payload.append(key, docs[key]); });
        try {
            const res = await api.post('/sellers/register', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) setIsSuccess(true);
            else setError(res.data.message);
        } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
        finally { setIsLoading(false); }
    };

    if (isSuccess) {
        return (
            <div className="auth-container">
                <div className="auth-card success-card" style={{ textAlign: 'center' }}>
                    <div className="success-icon" style={{ fontSize: '50px' }}>🎉</div>
                    <h2>Registration Complete!</h2>
                    <p>Your shop <strong>{form.shopName}</strong> has been submitted.</p>
                    <div style={{ margin: '15px 0', padding: '10px', background: '#fef3c7', color: '#b45309', borderRadius: '8px', fontWeight: 'bold' }}>⏳ Pending Admin Approval</div>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>We are reviewing your documents. You will be notified once approved.</p>
                    <button className="btn-primary" onClick={() => navigate('/login')}>Return to Login</button>
                </div>
            </div>
        );
    }

    const commission = commissionRate !== null ? commissionRate : '...';

    return (
        <>
            <div className="auth-container" style={{ padding: '20px 0' }}>
                <div className="auth-card register-card" style={{ maxWidth: step >= 3 ? '600px' : '400px', margin: '0 auto', transition: 'max-width 0.3s' }}>

                    <div className="auth-brand" style={{ marginBottom: '15px' }}>
                        <span className="brand-icon">🚀</span>
                        <h2>Seller Registration</h2>
                        <p style={{ marginTop: '5px' }}>Join our multi-vendor platform</p>
                    </div>

                    <StepIndicator step={step} maxSteps={6} />
                    {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}

                    {/* STEP 1: Phone */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="auth-form">
                            <h3>📱 Phone Verification</h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '15px' }}>We'll send a 6-digit OTP to confirm your identity.</p>
                            <div className="form-group phone-input-wrapper">
                                <label>Mobile Number</label>
                                <div className="phone-row">
                                    <span className="phone-prefix">+91</span>
                                    <input type="tel" placeholder="9700079239" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary full-width" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send OTP'}</button>
                            <div className="auth-footer"><p>Already a seller? <Link to="/login">Sign in</Link></p></div>
                        </form>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <h3>🔐 Enter OTP</h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '15px' }}>Sent to +91 {phone}</p>
                            {devOtp && <p style={{ background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Dev OTP: {devOtp}</p>}
                            <div className="form-group">
                                <label>6-Digit Code</label>
                                <input type="text" placeholder="• • • • • •" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="otp-input" required />
                            </div>
                            <button type="submit" className="btn-primary full-width" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Verify OTP'}</button>
                            <button type="button" className="btn-link" onClick={() => setStep(1)} disabled={isLoading}>← Change phone number</button>
                        </form>
                    )}

                    {/* STEP 3: Shop & Owner Info */}
                    {step === 3 && (
                        <div className="auth-form">
                            <h3>🏪 Shop & Owner Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group"><label>Owner Name *</label><input type="text" name="ownerName" value={form.ownerName} onChange={handleChange} required /></div>
                                <div className="form-group"><label>Email (Optional)</label><input type="email" name="email" value={form.email} onChange={handleChange} /></div>
                                <div className="form-group"><label>Password *</label><input type="password" name="password" value={form.password} onChange={handleChange} required /></div>
                                <div className="form-group"><label>Confirm *</label><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required /></div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Shop Name *</label><input type="text" name="shopName" value={form.shopName} onChange={handleChange} required /></div>
                                <div className="form-group"><label>Shop Category</label><select name="shopCategory" value={form.shopCategory} onChange={handleChange} className="styled-select">{SHOP_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div className="form-group"><label>GSTIN (Optional)</label><input type="text" name="gstNumber" value={form.gstNumber} onChange={handleChange} style={{ textTransform: 'uppercase' }} /></div>
                                <div className="form-group"><label>Business PAN (Optional)</label><input type="text" name="businessPan" value={form.businessPan} onChange={handleChange} style={{ textTransform: 'uppercase' }} maxLength={10} /></div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Location */}
                    {step === 4 && (
                        <div className="auth-form">
                            <h3>📍 Shop Location</h3>
                            <button type="button" onClick={() => setShowMapPicker(true)} style={{ width: '100%', padding: '14px', marginBottom: '12px', background: '#eff6ff', border: '2px dashed #3b82f6', color: '#2563eb', borderRadius: '10px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                                📍 Pin My Shop on Map
                            </button>
                            {location.coordinates[0] !== 0 && (
                                <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
                                    ✅ Location pinned — Lat: {location.coordinates[1].toFixed(4)}, Lng: {location.coordinates[0].toFixed(4)}
                                </div>
                            )}
                            {/* Full-width stacked layout — avoids overflow on mobile */}
                            <div className="form-group full-width"><label>Full Address *</label><textarea name="shopAddress" value={form.shopAddress} onChange={handleChange} rows={2} required /></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="form-group"><label>City *</label><input type="text" name="city" value={form.city} onChange={handleChange} required placeholder="e.g. Tirupati" /></div>
                                <div className="form-group"><label>State *</label><input type="text" name="state" value={form.state} onChange={handleChange} required placeholder="e.g. Andhra Pradesh" /></div>
                                <div className="form-group"><label>Pincode *</label><input type="text" name="pincode" value={form.pincode} onChange={handleChange} required inputMode="numeric" maxLength={6} placeholder="6-digit pincode" /></div>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Bank & Documents */}
                    {step === 5 && (
                        <div className="auth-form">
                            <h3>🏦 Bank & KYC Documents</h3>
                            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>Only Aadhaar & PAN are mandatory for KYC. Bank details are required for payouts.</p>

                            {/* Bank Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                <div className="form-group"><label>Account Holder Name *</label><input type="text" name="bankAccountName" value={form.bankAccountName} onChange={handleChange} required /></div>
                                <div className="form-group">
                                    <label>Bank Name *</label>
                                    {/* Bank name with datalist autocomplete */}
                                    <input
                                        type="text"
                                        name="bankName"
                                        value={form.bankName}
                                        onChange={handleChange}
                                        list="bank-list"
                                        placeholder="Type to search bank..."
                                        required
                                        autoComplete="off"
                                    />
                                    <datalist id="bank-list">
                                        {INDIAN_BANKS.map(b => <option key={b} value={b} />)}
                                    </datalist>
                                </div>
                                <div className="form-group"><label>Account Number *</label><input type="text" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} required /></div>
                                <div className="form-group"><label>IFSC Code *</label><input type="text" name="bankIfsc" value={form.bankIfsc} onChange={handleChange} style={{ textTransform: 'uppercase' }} required /></div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>UPI ID (Optional)</label><input type="text" name="upiId" value={form.upiId} onChange={handleChange} placeholder="merchant@upi" /></div>
                            </div>

                            {/* Documents */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="form-group">
                                    <label>Aadhaar Card Upload * <span style={{ color: '#ef4444', fontSize: '12px' }}>(required)</span></label>
                                    <input type="file" name="documentAadhaar" onChange={handleFileChange} />
                                </div>
                                <div className="form-group">
                                    <label>PAN Card Upload * <span style={{ color: '#ef4444', fontSize: '12px' }}>(required)</span></label>
                                    <input type="file" name="documentPan" onChange={handleFileChange} />
                                </div>
                                <div className="form-group">
                                    <label>Shop Photo Image <span style={{ color: '#64748b', fontSize: '12px' }}>(optional)</span></label>
                                    <input type="file" name="documentShopPhoto" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <div className="form-group">
                                    <label>Cancelled Cheque / Passbook Image <span style={{ color: '#64748b', fontSize: '12px' }}>(optional)</span></label>
                                    <input type="file" name="documentCancelledCheque" onChange={handleFileChange} />
                                </div>
                                <div className="form-group">
                                    <label>Store Logo Image <span style={{ color: '#64748b', fontSize: '12px' }}>(optional)</span></label>
                                    <input type="file" name="shopLogo" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: Review & Submit */}
                    {step === 6 && (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <h3>📜 Final Review & Agreement</h3>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h4 style={{ color: '#b91c1c', marginTop: 0, marginBottom: '8px' }}>Platform Commission Agreement</h4>
                                <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
                                    By proceeding, you agree to the platform logistics model.{' '}
                                    {commissionRate !== null
                                        ? <><strong>The platform deducts a {commissionRate}% commission</strong> on all fulfilled orders.</>
                                        : 'A platform commission will be deducted on all fulfilled orders.'
                                    }{' '}
                                    All deliveries are fulfilled exclusively via our in-house delivery partner network.
                                </p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', cursor: 'pointer', marginBottom: '20px' }}>
                                <input type="checkbox" name="commissionAgreementAccepted" checked={form.commissionAgreementAccepted} onChange={e => setForm({ ...form, commissionAgreementAccepted: e.target.checked })} style={{ marginTop: '3px', transform: 'scale(1.2)' }} />
                                <span>
                                    I explicitly agree to the{commissionRate !== null ? ` ${commissionRate}%` : ''} platform commission and terms of service.
                                    I understand my account will be manually vetted by an Administrator before activation.
                                </span>
                            </label>
                            <button type="submit" className="btn-primary full-width" disabled={isLoading || !form.commissionAgreementAccepted} style={{ padding: '14px', fontSize: '16px' }}>
                                {isLoading ? 'Submitting Application...' : 'Submit Shop Application'}
                            </button>
                        </form>
                    )}

                    {/* Navigation */}
                    {step >= 3 && step <= 6 && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button type="button" onClick={prevStep} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Back</button>
                            {step < 6 && (
                                <button type="button" onClick={nextStep} style={{ flex: 1, padding: '12px', border: 'none', background: '#3b82f6', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Continue →</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MapPicker Modal */}
            {showMapPicker && (
                <MapPicker
                    onConfirm={(lat, lng, addressText, details) => {
                        setLocation({ coordinates: [lng, lat] });
                        setForm(f => ({
                            ...f,
                            shopAddress: addressText || f.shopAddress,
                            city: details?.city || f.city,
                            state: details?.state || f.state,
                            pincode: details?.pincode || f.pincode,
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}
        </>
    );
};

export default Register;
