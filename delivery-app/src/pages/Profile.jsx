import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Profile.css';

export default function Profile() {
    const { partner, logout, updatePartner } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isOnline, setIsOnline] = useState(partner?.isOnline || false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ 
        name: partner?.name || '', vehicleType: partner?.vehicleType || 'Bike', vehicleNumber: partner?.vehicleNumber || '',
        email: partner?.email || '', dob: partner?.dob ? new Date(partner.dob).toISOString().split('T')[0] : '', 
        gender: partner?.gender || '', aadhaarNumber: partner?.aadhaarNumber || '', panNumber: partner?.panNumber || '',
        bankAccountName: partner?.bankAccountName || '', bankAccountNumber: partner?.bankAccountNumber || '', 
        bankIfsc: partner?.bankIfsc || '', bankName: partner?.bankName || ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/delivery/profile').then(res => {
            setProfile(res.data.data);
            setIsOnline(res.data.data.isOnline);
            setForm({ 
                name: res.data.data.name, vehicleType: res.data.data.vehicleType, vehicleNumber: res.data.data.vehicleNumber,
                email: res.data.data.email || '', dob: res.data.data.dob ? new Date(res.data.data.dob).toISOString().split('T')[0] : '',
                gender: res.data.data.gender || '', aadhaarNumber: res.data.data.aadhaarNumber || '', panNumber: res.data.data.panNumber || '',
                bankAccountName: res.data.data.bankAccountName || '', bankAccountNumber: res.data.data.bankAccountNumber || '',
                bankIfsc: res.data.data.bankIfsc || '', bankName: res.data.data.bankName || ''
            });
        }).catch(console.error);
    }, []);

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/delivery/profile', form);
            updatePartner(res.data.data);
            setEditing(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    const p = profile;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h2>My Profile</h2>
                <button className="edit-btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            </div>

            {/* Avatar + Status */}
            <div className="profile-hero">
                <div className="profile-avatar">🚴</div>
                <h2>{p?.name || partner?.name}</h2>
                <p>{p?.phone || partner?.phone}</p>
                <div style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', marginTop: '5px',
                    background: p?.status === 'Approved' ? '#ecfdf5' : p?.status === 'Rejected' ? '#fef2f2' : '#fffbeb',
                    color: p?.status === 'Approved' ? '#059669' : p?.status === 'Rejected' ? '#dc2626' : '#d97706',
                    border: `1px solid ${p?.status === 'Approved' ? '#34d399' : p?.status === 'Rejected' ? '#f87171' : '#fbbf24'}`
                }}>
                    {p?.status || 'Pending Approval'}
                </div>
                <div className="id-badge" style={{marginTop: '10px'}}>ID: {partner?._id?.slice(-8).toUpperCase()}</div>

            </div>

            {/* Stats */}
            <div className="profile-stats">
                <div className="pstat"><div className="pstat-val">{p?.totalDeliveries || 0}</div><div className="pstat-label">Total Deliveries</div></div>
                <div className="pstat"><div className="pstat-val">{p?.todayDeliveries || 0}</div><div className="pstat-label">Today</div></div>
                <div className="pstat"><div className="pstat-val">{p?.activeOrdersCount || 0}</div><div className="pstat-label">Active</div></div>
            </div>

            {/* Edit form or static info */}
            {editing ? (
                <form className="profile-form" onSubmit={saveProfile}>
                    <h3>Edit Profile</h3>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Date of Birth</label>
                        <input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Gender</label>
                        <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <h4 style={{marginTop: 15, marginBottom: -10, color: '#475569'}}>Identity</h4>
                    <div className="input-group">
                        <label>Aadhaar Number</label>
                        <input value={form.aadhaarNumber} onChange={e => setForm(p => ({ ...p, aadhaarNumber: e.target.value }))} maxLength={12}/>
                    </div>
                    <div className="input-group">
                        <label>PAN Number</label>
                        <input value={form.panNumber} onChange={e => setForm(p => ({ ...p, panNumber: e.target.value }))} style={{textTransform: 'uppercase'}} maxLength={10}/>
                    </div>

                    <h4 style={{marginTop: 15, marginBottom: -10, color: '#475569'}}>Vehicle</h4>
                    <div className="input-group">
                        <label>Vehicle Type</label>
                        <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}>
                            {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Vehicle Number</label>
                        <input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} />
                    </div>

                    <h4 style={{marginTop: 15, marginBottom: -10, color: '#475569'}}>Bank</h4>
                    <div className="input-group">
                        <label>Account Holder Name</label>
                        <input value={form.bankAccountName} onChange={e => setForm(p => ({ ...p, bankAccountName: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Account Number</label>
                        <input value={form.bankAccountNumber} onChange={e => setForm(p => ({ ...p, bankAccountNumber: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>IFSC Code</label>
                        <input value={form.bankIfsc} onChange={e => setForm(p => ({ ...p, bankIfsc: e.target.value }))} style={{textTransform: 'uppercase'}}/>
                    </div>
                    <div className="input-group">
                        <label>Bank Name</label>
                        <input value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} />
                    </div>

                    <button type="submit" className="save-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </form>
            ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    <div className="profile-info-card">
                        <h3>Personal Info</h3>
                        <div className="info-row"><span>Email</span><strong>{p?.email || '—'}</strong></div>
                        <div className="info-row"><span>DOB</span><strong>{p?.dob ? new Date(p.dob).toLocaleDateString() : '—'}</strong></div>
                        <div className="info-row"><span>Gender</span><strong>{p?.gender || '—'}</strong></div>
                        <div className="info-row"><span>Location</span><strong>{p?.city ? `${p.city} ${p.pincode ? `(${p.pincode})` : ''}` : '—'}</strong></div>
                        <div className="info-row"><span>Joined</span><strong>{p?.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong></div>
                    </div>
                    
                    <div className="profile-info-card">
                        <h3>Identity (KYC)</h3>
                        <div className="info-row"><span>Aadhaar</span><strong>{p?.aadhaarNumber ? `********${p.aadhaarNumber.slice(-4)}` : '—'}</strong></div>
                        <div className="info-row"><span>PAN</span><strong>{p?.panNumber || '—'}</strong></div>
                    </div>

                    <div className="profile-info-card">
                        <h3>Vehicle Details</h3>
                        <div className="info-row"><span>Type</span><strong>{p?.vehicleType || '—'}</strong></div>
                        <div className="info-row"><span>Number</span><strong>{p?.vehicleNumber || '—'}</strong></div>
                    </div>

                    <div className="profile-info-card">
                        <h3>Bank Details</h3>
                        <div className="info-row"><span>Holder</span><strong>{p?.bankAccountName || '—'}</strong></div>
                        <div className="info-row"><span>Acc No.</span><strong>{p?.bankAccountNumber ? `********${p.bankAccountNumber.slice(-4)}` : '—'}</strong></div>
                        <div className="info-row"><span>IFSC</span><strong>{p?.bankIfsc || '—'}</strong></div>
                        <div className="info-row"><span>Bank</span><strong>{p?.bankName || '—'}</strong></div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button 
                    onClick={logout} 
                    style={{ 
                        background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', 
                        padding: '12px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', 
                        width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', 
                        alignItems: 'center', gap: '8px' 
                    }}
                >
                    <span style={{ fontSize: '18px' }}>⏻</span> Logout securely
                </button>
            </div>
        </div>
    );
}
