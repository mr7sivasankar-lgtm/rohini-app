import { useState, useEffect } from 'react';
import api from '../utils/api';

const ServiceAreas = () => {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        type: 'city',
        name: '',
        city: '',
        state: '',
        pincode: '',
        latitude: '',
        longitude: '',
        radiusKm: 5
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchAreas();
    }, []);

    const fetchAreas = async () => {
        try {
            setLoading(true);
            const res = await api.get('/serviceability/areas');
            if (res.data.success) {
                setAreas(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching areas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name) {
            setError('Name is required');
            return;
        }
        if (form.type === 'city' && !form.city) {
            setError('City name is required');
            return;
        }
        if (form.type === 'pincode' && !form.pincode) {
            setError('Pincode is required');
            return;
        }
        if (form.type === 'radius' && (!form.latitude || !form.longitude)) {
            setError('Latitude and Longitude are required');
            return;
        }

        try {
            setSaving(true);
            const payload = { ...form };
            if (form.type !== 'radius') {
                delete payload.latitude;
                delete payload.longitude;
                delete payload.radiusKm;
            }
            if (form.type !== 'pincode') delete payload.pincode;
            if (form.type !== 'city') delete payload.city;

            if (editingId) {
                await api.put(`/serviceability/areas/${editingId}`, payload);
            } else {
                await api.post('/serviceability/areas', payload);
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ type: 'city', name: '', city: '', state: '', pincode: '', latitude: '', longitude: '', radiusKm: 5 });
            fetchAreas();
        } catch (err) {
            setError(err.response?.data?.message || 'Error saving area');
        } finally {
            setSaving(false);
        }
    };

    const toggleArea = async (id, isActive) => {
        try {
            await api.put(`/serviceability/areas/${id}`, { isActive: !isActive });
            fetchAreas();
        } catch (err) {
            console.error('Error toggling area:', err);
        }
    };

    const deleteArea = async (id) => {
        if (!window.confirm('Delete this service area?')) return;
        try {
            await api.delete(`/serviceability/areas/${id}`);
            fetchAreas();
        } catch (err) {
            console.error('Error deleting area:', err);
        }
    };

    const editArea = (area) => {
        setEditingId(area._id);
        setForm({
            type: area.type,
            name: area.name,
            city: area.city || '',
            state: area.state || '',
            pincode: area.pincode || '',
            latitude: area.latitude || '',
            longitude: area.longitude || '',
            radiusKm: area.radiusKm || 5
        });
        setShowForm(true);
    };

    if (loading) return <div style={{ padding: 24 }}>Loading service areas...</div>;

    return (
        <div style={{ padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>📍 Service Areas</h2>
                <button
                    onClick={() => {
                        if (showForm) {
                            setShowForm(false);
                            setEditingId(null);
                            setForm({ type: 'city', name: '', city: '', state: '', pincode: '', latitude: '', longitude: '', radiusKm: 5 });
                        } else {
                            setShowForm(true);
                        }
                    }}
                    style={{
                        padding: '10px 20px',
                        background: showForm ? '#ef4444' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    {showForm ? '✕ Cancel' : '+ Add Area'}
                </button>
            </div>

            {/* Add Area Form */}
            {showForm && (
                <div style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    border: '1px solid #e2e8f0'
                }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="city">City</option>
                                    <option value="pincode">Pincode</option>
                                    <option value="radius">Radius</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Name / Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Hyderabad Zone"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {form.type === 'city' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <label style={labelStyle}>City</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Hyderabad"
                                        value={form.city}
                                        onChange={e => setForm({ ...form, city: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>State (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Telangana"
                                        value={form.state}
                                        onChange={e => setForm({ ...form, state: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        )}

                        {form.type === 'pincode' && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Pincode</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 500001"
                                    value={form.pincode}
                                    onChange={e => setForm({ ...form, pincode: e.target.value })}
                                    style={inputStyle}
                                    maxLength="6"
                                />
                            </div>
                        )}

                        {form.type === 'radius' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <label style={labelStyle}>Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="17.385"
                                        value={form.latitude}
                                        onChange={e => setForm({ ...form, latitude: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="78.4867"
                                        value={form.longitude}
                                        onChange={e => setForm({ ...form, longitude: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Radius (km)</label>
                                    <input
                                        type="number"
                                        value={form.radiusKm}
                                        onChange={e => setForm({ ...form, radiusKm: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        )}

                        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '10px 24px',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Saving...' : editingId ? 'Update Area' : 'Add Service Area'}
                        </button>
                    </form>
                </div>
            )}

            {/* Areas Table */}
            {areas.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 40,
                    background: '#f8fafc',
                    borderRadius: 12,
                    color: '#94a3b8'
                }}>
                    <p style={{ fontSize: 16 }}>No service areas configured yet.</p>
                    <p style={{ fontSize: 13 }}>All users will be able to access the app by default.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: 'white',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Details</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {areas.map(area => (
                                <tr key={area._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={tdStyle}>{area.name}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            background: area.type === 'city' ? '#dbeafe' : area.type === 'pincode' ? '#fef3c7' : '#d1fae5',
                                            color: area.type === 'city' ? '#1e40af' : area.type === 'pincode' ? '#92400e' : '#065f46'
                                        }}>
                                            {area.type}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        {area.type === 'city' && `${area.city}${area.state ? `, ${area.state}` : ''}`}
                                        {area.type === 'pincode' && area.pincode}
                                        {area.type === 'radius' && `${area.latitude?.toFixed(4)}, ${area.longitude?.toFixed(4)} (${area.radiusKm}km)`}
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => toggleArea(area._id, area.isActive)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 20,
                                                border: 'none',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: area.isActive ? '#d1fae5' : '#fee2e2',
                                                color: area.isActive ? '#065f46' : '#991b1b'
                                            }}
                                        >
                                            {area.isActive ? '● Active' : '○ Disabled'}
                                        </button>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => editArea(area)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#dbeafe',
                                                    color: '#1e40af',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    fontWeight: 600
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteArea(area._id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#fee2e2',
                                                    color: '#dc2626',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    fontWeight: 600
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
};

const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569'
};

const tdStyle = {
    padding: '12px 16px',
    fontSize: 14
};

export default ServiceAreas;
