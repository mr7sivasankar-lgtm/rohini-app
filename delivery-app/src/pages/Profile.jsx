import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import MapPicker from '../components/MapPicker/MapPicker';
import './Profile.css';

const GMAP_KEY = 'AIzaSyCXNIpwQ6rNmeH6oLU0j7y1bMECzZ65BpA';

export default function Profile() {
    const { partner, logout, updatePartner } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [form, setForm] = useState({
        name: '', email: '', dob: '', gender: '',
        aadhaarNumber: '', panNumber: '',
        vehicleType: 'Bike', vehicleNumber: '',
        address: '', city: '', state: '', pincode: '',
        bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '',
        profileImage: '',
        documentAadhaar: '', documentPan: '', documentDrivingLicense: '', documentRC: '',
        location: { type: 'Point', coordinates: [0, 0] },
    });

    const [uploading, setUploading] = useState({});

    useEffect(() => {
        api.get('/delivery/profile').then(res => {
            const d = res.data.data;
            setProfile(d);
            setForm({
                name: d.name || '', email: d.email || '',
                dob: d.dob ? new Date(d.dob).toISOString().split('T')[0] : '',
                gender: d.gender || '',
                aadhaarNumber: d.aadhaarNumber || '', panNumber: d.panNumber || '',
                vehicleType: d.vehicleType || 'Bike', vehicleNumber: d.vehicleNumber || '',
                address: d.address || '', city: d.city || '', state: d.state || '', pincode: d.pincode || '',
                bankAccountName: d.bankAccountName || '', bankAccountNumber: d.bankAccountNumber || '',
                bankIfsc: d.bankIfsc || '', bankName: d.bankName || '',
                profileImage: d.profileImage || '',
                documentAadhaar: d.documentAadhaar || '', documentPan: d.documentPan || '',
                documentDrivingLicense: d.documentDrivingLicense || '', documentRC: d.documentRC || '',
                location: d.location || { type: 'Point', coordinates: [0, 0] },
            });
        }).catch(console.error);
    }, []);

    const upd = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    const uploadImage = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(prev => ({ ...prev, [field]: true }));
        setErrorMsg('');
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await api.post('/delivery/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                upd(field, res.data.url);
                setSuccessMsg('✅ Image uploaded! Save to apply.');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setErrorMsg('Upload failed: ' + (err.response?.data?.message || 'Please try again'));
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');
        try {
            const res = await api.put('/delivery/profile', form);
            updatePartner(res.data.data);
            setProfile(res.data.data);
            setEditing(false);
            setSuccessMsg('✅ Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    const p = profile;
    const inp = {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
        background: '#f8fafc', boxSizing: 'border-box', transition: 'border 0.2s',
    };
    const lbl = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px', display: 'block' };
    const sec = { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '16px' };
    const secH = { fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' };

    // Document uploader card component
    const DocCard = ({ field, label, icon }) => (
        <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{icon} {label}</div>
            {form[field] ? (
                <>
                    <a href={form[field]} target="_blank" rel="noopener noreferrer">
                        <img src={form[field]} alt={label}
                            style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', display: 'block' }}
                            onError={e => e.target.style.display = 'none'} />
                    </a>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <label style={{ flex: 1, textAlign: 'center', padding: '6px', background: '#eff6ff', color: '#3b82f6', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: '1px solid #bfdbfe' }}>
                            {uploading[field] ? '⏳' : '🔄'} Reupload
                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => uploadImage(e, field)} />
                        </label>
                        <button type="button" onClick={() => upd(field, '')}
                            style={{ flex: 1, padding: '6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                            🗑️ Remove
                        </button>
                    </div>
                </>
            ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80px', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                    <span style={{ fontSize: '22px' }}>{uploading[field] ? '⏳' : '⬆️'}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{uploading[field] ? 'Uploading...' : `Upload ${label}`}</span>
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => uploadImage(e, field)} />
                </label>
            )}
        </div>
    );

    return (
        <div className="profile-page">
            {/* Map Picker Overlay */}
            {showMapPicker && (
                <MapPicker
                    initialLat={form.location?.coordinates?.[1] || 13.6288}
                    initialLng={form.location?.coordinates?.[0] || 79.4192}
                    onConfirm={(lat, lng, addressText, addrDetails) => {
                        setForm(prev => ({
                            ...prev,
                            location: { type: 'Point', coordinates: [lng, lat] },
                            address: addressText || prev.address,
                            city: addrDetails?.city || prev.city,
                            state: addrDetails?.state || prev.state,
                            pincode: addrDetails?.pincode || prev.pincode,
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}

            {/* Toast Notifications */}
            {successMsg && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#059669', color: 'white', padding: '10px 20px', borderRadius: '30px', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 12px rgba(5,150,105,0.3)', whiteSpace: 'nowrap' }}>
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Header */}
            <div className="profile-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h2>My Profile</h2>
                <button className="edit-btn" onClick={() => { setEditing(!editing); setErrorMsg(''); }}>
                    {editing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {/* Hero Section */}
            <div className="profile-hero">
                {/* Profile photo with upload in edit mode */}
                <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 12px' }}>
                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: form.profileImage ? `url(${form.profileImage}) center/cover` : 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                        {!form.profileImage && '🚴'}
                        {form.profileImage && <img src={form.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    {editing && (
                        <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', fontSize: 13 }}>
                            📷
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadImage(e, 'profileImage')} />
                        </label>
                    )}
                </div>
                <h2>{p?.name || partner?.name}</h2>
                <p>{p?.phone || partner?.phone}</p>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', marginTop: '5px', background: p?.status === 'Approved' ? '#ecfdf5' : '#fffbeb', color: p?.status === 'Approved' ? '#059669' : '#d97706', border: `1px solid ${p?.status === 'Approved' ? '#34d399' : '#fbbf24'}` }}>
                    {p?.status || 'Pending Approval'}
                </div>
                <div className="id-badge" style={{ marginTop: '10px' }}>ID: {partner?._id?.slice(-8).toUpperCase()}</div>
            </div>

            {/* Stats */}
            <div className="profile-stats">
                <div className="pstat"><div className="pstat-val">{p?.totalDeliveries || 0}</div><div className="pstat-label">Total Deliveries</div></div>
                <div className="pstat"><div className="pstat-val">{p?.todayDeliveries || 0}</div><div className="pstat-label">Today</div></div>
                <div className="pstat"><div className="pstat-val">{p?.activeOrdersCount || 0}</div><div className="pstat-label">Active</div></div>
            </div>

            {editing ? (
                /* ══════════ EDIT MODE ══════════ */
                <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 16px' }}>

                    {/* Personal Info */}
                    <div style={sec}>
                        <div style={secH}>👤 Personal Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={lbl}>Full Name *</label>
                                <input style={inp} value={form.name} onChange={e => upd('name', e.target.value)} required />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={lbl}>Email</label>
                                <input style={inp} type="email" value={form.email} onChange={e => upd('email', e.target.value)} />
                            </div>
                            <div>
                                <label style={lbl}>Date of Birth</label>
                                <input style={inp} type="date" value={form.dob} onChange={e => upd('dob', e.target.value)} />
                            </div>
                            <div>
                                <label style={lbl}>Gender</label>
                                <select style={inp} value={form.gender} onChange={e => upd('gender', e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle */}
                    <div style={sec}>
                        <div style={secH}>🏍️ Vehicle Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={lbl}>Vehicle Type</label>
                                <select style={inp} value={form.vehicleType} onChange={e => upd('vehicleType', e.target.value)}>
                                    {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={lbl}>Vehicle Number</label>
                                <input style={{ ...inp, textTransform: 'uppercase' }} value={form.vehicleNumber} onChange={e => upd('vehicleNumber', e.target.value)} placeholder="AP09AB1234" />
                            </div>
                        </div>
                    </div>

                    {/* Identity (KYC) */}
                    <div style={sec}>
                        <div style={secH}>🪪 Identity (KYC)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={lbl}>Aadhaar Number</label>
                                <input style={inp} value={form.aadhaarNumber} onChange={e => upd('aadhaarNumber', e.target.value)} maxLength={12} placeholder="XXXX XXXX XXXX" />
                            </div>
                            <div>
                                <label style={lbl}>PAN Number</label>
                                <input style={{ ...inp, textTransform: 'uppercase' }} value={form.panNumber} onChange={e => upd('panNumber', e.target.value)} maxLength={10} placeholder="ABCDE1234F" />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <DocCard field="documentAadhaar" label="Aadhaar Card" icon="🪪" />
                            <DocCard field="documentPan" label="PAN Card" icon="📋" />
                            <DocCard field="documentDrivingLicense" label="Driving License" icon="🚗" />
                            <DocCard field="documentRC" label="RC Book" icon="📄" />
                        </div>
                    </div>

                    {/* Address & Location */}
                    <div style={sec}>
                        <div style={secH}>📍 Address & Location</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={lbl}>Street / Area</label>
                                <textarea style={{ ...inp, resize: 'none' }} rows={2} value={form.address} onChange={e => upd('address', e.target.value)} placeholder="Door no, street, landmark..." />
                            </div>
                            <div>
                                <label style={lbl}>City</label>
                                <input style={inp} value={form.city} onChange={e => upd('city', e.target.value)} placeholder="Tirupati" />
                            </div>
                            <div>
                                <label style={lbl}>State</label>
                                <input style={inp} value={form.state} onChange={e => upd('state', e.target.value)} placeholder="Andhra Pradesh" />
                            </div>
                            <div>
                                <label style={lbl}>Pincode</label>
                                <input style={inp} value={form.pincode} onChange={e => upd('pincode', e.target.value)} maxLength={6} placeholder="517501" />
                            </div>
                            <div>
                                <label style={lbl}>GPS Coordinates</label>
                                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '10px', fontSize: '12px', color: '#059669', fontWeight: 600, fontFamily: 'monospace' }}>
                                    {form.location?.coordinates?.[0] !== 0
                                        ? `${form.location.coordinates[1].toFixed(5)}, ${form.location.coordinates[0].toFixed(5)}`
                                        : '⚠️ Not set'}
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowMapPicker(true)}
                            style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            🗺️ Pin My Location on Map
                        </button>

                        {/* Show mini Google Maps preview if coords exist */}
                        {form.location?.coordinates?.[0] !== 0 && (
                            <iframe
                                title="Location preview"
                                width="100%" height="160"
                                style={{ border: 'none', borderRadius: '10px', marginTop: '10px' }}
                                loading="lazy"
                                src={`https://www.google.com/maps/embed/v1/place?key=${GMAP_KEY}&q=${form.location.coordinates[1]},${form.location.coordinates[0]}&zoom=16`}
                            />
                        )}
                    </div>

                    {/* Bank Details */}
                    <div style={sec}>
                        <div style={secH}>🏦 Bank Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={lbl}>Account Holder Name</label>
                                <input style={inp} value={form.bankAccountName} onChange={e => upd('bankAccountName', e.target.value)} />
                            </div>
                            <div>
                                <label style={lbl}>Bank Name</label>
                                <input style={inp} value={form.bankName} onChange={e => upd('bankName', e.target.value)} list="bank-list-dp" placeholder="SBI, HDFC..." />
                                <datalist id="bank-list-dp">
                                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Kotak Mahindra Bank'].map(b => <option key={b} value={b} />)}
                                </datalist>
                            </div>
                            <div>
                                <label style={lbl}>Account Number</label>
                                <input style={inp} value={form.bankAccountNumber} onChange={e => upd('bankAccountNumber', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={lbl}>IFSC Code</label>
                                <input style={{ ...inp, textTransform: 'uppercase' }} value={form.bankIfsc} onChange={e => upd('bankIfsc', e.target.value)} placeholder="SBIN0001234" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        style={{ width: '100%', padding: '14px', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '20px' }}>
                        {saving ? '⏳ Saving...' : '💾 Save All Changes'}
                    </button>
                </form>
            ) : (
                /* ══════════ VIEW MODE ══════════ */
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Personal */}
                    <div className="profile-info-card">
                        <h3>Personal Info</h3>
                        {[['Email', p?.email], ['DOB', p?.dob ? new Date(p.dob).toLocaleDateString() : null], ['Gender', p?.gender]].map(([l, v]) => v ? (
                            <div key={l} className="info-row"><span>{l}</span><strong>{v}</strong></div>
                        ) : null)}
                        <div className="info-row"><span>Joined</span><strong>{p?.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong></div>
                    </div>

                    {/* Vehicle */}
                    <div className="profile-info-card">
                        <h3>Vehicle Details</h3>
                        <div className="info-row"><span>Type</span><strong>{p?.vehicleType || '—'}</strong></div>
                        <div className="info-row"><span>Number</span><strong>{p?.vehicleNumber || '—'}</strong></div>
                    </div>

                    {/* KYC */}
                    <div className="profile-info-card">
                        <h3>Identity (KYC)</h3>
                        <div className="info-row"><span>Aadhaar</span><strong>{p?.aadhaarNumber ? `****${p.aadhaarNumber.slice(-4)}` : '—'}</strong></div>
                        <div className="info-row"><span>PAN</span><strong>{p?.panNumber || '—'}</strong></div>

                        {/* Document thumbnails */}
                        {[['documentAadhaar', '🪪 Aadhaar'], ['documentPan', '📋 PAN'], ['documentDrivingLicense', '🚗 Driving License'], ['documentRC', '📄 RC Book']].some(([f]) => p?.[f]) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                                {[['documentAadhaar', '🪪 Aadhaar'], ['documentPan', '📋 PAN'], ['documentDrivingLicense', '🚗 License'], ['documentRC', '📄 RC']].map(([field, label]) =>
                                    p?.[field] ? (
                                        <div key={field} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                                            <a href={p[field]} target="_blank" rel="noopener noreferrer">
                                                <img src={p[field]} alt={label} style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} onError={e => e.target.style.display = 'none'} />
                                            </a>
                                            <div style={{ fontSize: '10px', color: '#3b82f6', marginTop: '2px' }}>Tap to view</div>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        )}
                    </div>

                    {/* Address */}
                    <div className="profile-info-card">
                        <h3>Address & Location</h3>
                        {p?.address && <div className="info-row"><span>Street</span><strong>{p.address}</strong></div>}
                        <div className="info-row"><span>Location</span><strong>{p?.city ? `${p.city}${p.pincode ? ` (${p.pincode})` : ''}` : '—'}</strong></div>
                        {p?.state && <div className="info-row"><span>State</span><strong>{p.state}</strong></div>}

                        {/* Mini Google Maps embed */}
                        {p?.location?.coordinates?.[0] !== 0 && p?.location?.coordinates?.[0] && (
                            <iframe
                                title="Your location"
                                width="100%" height="150"
                                style={{ border: 'none', borderRadius: '10px', marginTop: '12px' }}
                                loading="lazy"
                                src={`https://www.google.com/maps/embed/v1/place?key=${GMAP_KEY}&q=${p.location.coordinates[1]},${p.location.coordinates[0]}&zoom=15`}
                            />
                        )}
                    </div>

                    {/* Bank */}
                    <div className="profile-info-card">
                        <h3>Bank Details</h3>
                        <div className="info-row"><span>Holder</span><strong>{p?.bankAccountName || '—'}</strong></div>
                        <div className="info-row"><span>Acc No.</span><strong>{p?.bankAccountNumber ? `****${p.bankAccountNumber.slice(-4)}` : '—'}</strong></div>
                        <div className="info-row"><span>IFSC</span><strong>{p?.bankIfsc || '—'}</strong></div>
                        <div className="info-row"><span>Bank</span><strong>{p?.bankName || '—'}</strong></div>
                    </div>
                </div>
            )}

            {/* Logout */}
            <div style={{ margin: '8px 16px 40px', textAlign: 'center' }}>
                <button onClick={logout} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '12px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⏻</span> Logout securely
                </button>
            </div>
        </div>
    );
}
