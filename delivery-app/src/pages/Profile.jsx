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
    const [form, setForm] = useState({ name: partner?.name || '', vehicleType: partner?.vehicleType || 'Bike', vehicleNumber: partner?.vehicleNumber || '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/delivery/profile').then(res => {
            setProfile(res.data.data);
            setIsOnline(res.data.data.isOnline);
            setForm({ name: res.data.data.name, vehicleType: res.data.data.vehicleType, vehicleNumber: res.data.data.vehicleNumber });
        }).catch(console.error);
    }, []);

    const toggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        try {
            await api.put('/delivery/profile/status', { isOnline: newStatus });
            updatePartner({ isOnline: newStatus });
        } catch { setIsOnline(!newStatus); }
    };

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
                <div className="id-badge">ID: {partner?._id?.slice(-8).toUpperCase()}</div>

                {/* Online Toggle */}
                <div className="status-toggle-wrap">
                    <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                    <label className="toggle">
                        <input type="checkbox" checked={isOnline} onChange={toggleStatus} />
                        <span className="slider"></span>
                    </label>
                </div>
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
                        <label>Vehicle Type</label>
                        <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}>
                            {['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'].map(v => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Vehicle Number</label>
                        <input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} />
                    </div>
                    <button type="submit" className="save-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </form>
            ) : (
                <div className="profile-info-card">
                    <h3>Vehicle Details</h3>
                    <div className="info-row"><span>Type</span><strong>{p?.vehicleType || '—'}</strong></div>
                    <div className="info-row"><span>Number</span><strong>{p?.vehicleNumber || '—'}</strong></div>
                    <div className="info-row"><span>Joined</span><strong>{p?.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong></div>
                </div>
            )}
        </div>
    );
}
