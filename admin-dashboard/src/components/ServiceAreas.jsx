import { useState, useEffect } from 'react';
import api from '../utils/api';

// ─── Coverage Status Helpers ───────────────────────────────────────────────
const COVERAGE_CONFIG = {
    'Active':                 { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
    'Low Coverage':           { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    'No Delivery Partners':   { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    'No Sellers':             { bg: '#fce7f3', color: '#9d174d', dot: '#ec4899' },
};

const CoverageBadge = ({ status }) => {
    const cfg = COVERAGE_CONFIG[status] || COVERAGE_CONFIG['Low Coverage'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: cfg.bg, color: cfg.color
        }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
};

const StatCard = ({ icon, label, value, bg, color }) => (
    <div style={{
        background: 'white', borderRadius: 16, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
    }}>
        <div style={{
            width: 48, height: 48, borderRadius: 14, background: bg,
            color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>{icon}</div>
        <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        </div>
    </div>
);

// ─── Component ─────────────────────────────────────────────────────────────
const ServiceAreas = () => {
    const [areas, setAreas] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ type: 'city', name: '', city: '', state: '', pincode: '', isActive: true });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [areasRes, summaryRes] = await Promise.all([
                api.get('/serviceability/areas'),
                api.get('/serviceability/areas/coverage-summary').catch(() => ({ data: { success: false } }))
            ]);
            if (areasRes.data.success) setAreas(areasRes.data.data);
            if (summaryRes.data.success) setSummary(summaryRes.data.data);
        } catch (err) {
            console.error('Error fetching areas:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ type: 'city', name: '', city: '', state: '', pincode: '', isActive: true });
        setEditingId(null);
        setError('');
        setShowForm(false);
    };

    const handleEdit = (area) => {
        setEditingId(area._id);
        setForm({
            type: area.type || 'city',
            name: area.name || '',
            city: area.city || '',
            state: area.state || '',
            pincode: area.pincode || '',
            isActive: area.isActive !== undefined ? area.isActive : true
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name) { setError('Area name is required.'); return; }
        if (form.type === 'city' && !form.city) { setError('City value is required.'); return; }
        if (form.type === 'pincode' && !form.pincode) { setError('Pincode value is required.'); return; }

        const payload = { type: form.type, name: form.name, isActive: form.isActive };
        if (form.type === 'city') { payload.city = form.city; payload.state = form.state; }
        if (form.type === 'pincode') { payload.pincode = form.pincode; }

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/serviceability/areas/${editingId}`, payload);
            } else {
                await api.post('/serviceability/areas', payload);
            }
            resetForm();
            fetchAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save area.');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (area) => {
        try {
            await api.put(`/serviceability/areas/${area._id}`, { isActive: !area.isActive });
            fetchAll();
        } catch (err) {
            console.error('Toggle error:', err);
        }
    };

    const deleteArea = async (id) => {
        if (!window.confirm('Delete this service area? This cannot be undone.')) return;
        try {
            await api.delete(`/serviceability/areas/${id}`);
            fetchAll();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    // Areas needing attention
    const alertAreas = areas.filter(a =>
        a.isActive && a.coverageStatus && a.coverageStatus !== 'Active'
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#64748b' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
                    <p>Loading Service Areas...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 0, maxWidth: 1200 }}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>📍 Service Areas</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Control where the platform operates and monitor coverage.</p>
                </div>
                <button
                    onClick={() => showForm ? resetForm() : setShowForm(true)}
                    style={{
                        padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 14,
                        background: showForm ? '#fee2e2' : 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: showForm ? '#dc2626' : 'white',
                        boxShadow: showForm ? 'none' : '0 4px 12px rgba(102,126,234,0.35)',
                        transition: 'all 0.2s'
                    }}
                >
                    {showForm ? '✕ Cancel' : '+ Add Area'}
                </button>
            </div>

            {/* ── Summary Stat Cards ───────────────────────────────────────── */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                    <StatCard icon="🗺️" label="Total Areas" value={summary.totalAreas} bg="#eff6ff" color="#3b82f6" />
                    <StatCard icon="✅" label="Active Areas" value={summary.activeAreas} bg="#f0fdf4" color="#10b981" />
                    <StatCard icon="⏸️" label="Inactive Areas" value={summary.inactiveAreas} bg="#f8fafc" color="#64748b" />
                    <StatCard icon="🏪" label="Total Sellers" value={summary.totalSellers} bg="#fef3c7" color="#d97706" />
                    <StatCard icon="🛵" label="Delivery Partners" value={summary.totalDPs} bg="#fce7f3" color="#9333ea" />
                </div>
            )}

            {/* ── Alert Banner ─────────────────────────────────────────────── */}
            {alertAreas.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
                    border: '1px solid #fed7aa', borderRadius: 14, padding: '16px 20px',
                    marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12
                }}>
                    <span style={{ fontSize: 22 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14, marginBottom: 4 }}>
                            {alertAreas.length} active area{alertAreas.length > 1 ? 's' : ''} need{alertAreas.length === 1 ? 's' : ''} attention
                        </div>
                        <div style={{ fontSize: 13, color: '#b45309' }}>
                            {alertAreas.map(a => `${a.name} (${a.coverageStatus})`).join(' · ')}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Form ──────────────────────────────────────────── */}
            {showForm && (
                <div style={{
                    background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.07)'
                }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                        {editingId ? '✏️ Edit Service Area' : '➕ Add New Service Area'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={lbl}>Type</label>
                                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, city: '', pincode: '' })} style={inp}>
                                    <option value="city">🏙 City</option>
                                    <option value="pincode">📮 Pincode</option>
                                </select>
                            </div>
                            <div>
                                <label style={lbl}>Area Name / Label *</label>
                                <input type="text" placeholder="e.g. Tirupati Zone" value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
                            </div>
                        </div>

                        {form.type === 'city' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={lbl}>City *</label>
                                    <input type="text" placeholder="e.g. Tirupati" value={form.city}
                                        onChange={e => setForm({ ...form, city: e.target.value })} style={inp} />
                                </div>
                                <div>
                                    <label style={lbl}>State (optional)</label>
                                    <input type="text" placeholder="e.g. Andhra Pradesh" value={form.state}
                                        onChange={e => setForm({ ...form, state: e.target.value })} style={inp} />
                                </div>
                            </div>
                        )}

                        {form.type === 'pincode' && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={lbl}>Pincode *</label>
                                <input type="text" placeholder="e.g. 517501" value={form.pincode} maxLength="6"
                                    onChange={e => setForm({ ...form, pincode: e.target.value })} style={{ ...inp, maxWidth: 200 }} />
                            </div>
                        )}

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.isActive}
                                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Active (customers can shop in this area)</span>
                            </label>
                        </div>

                        {error && (
                            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button type="submit" disabled={saving} style={{
                            padding: '11px 28px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                            boxShadow: '0 4px 12px rgba(102,126,234,0.35)'
                        }}>
                            {saving ? '⏳ Saving...' : editingId ? '✔ Update Area' : '✔ Add Area'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Areas Table ──────────────────────────────────────────────── */}
            {areas.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 60, background: '#f8fafc',
                    borderRadius: 16, border: '1px dashed #cbd5e1'
                }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                    <p style={{ fontSize: 16, color: '#64748b', fontWeight: 600, margin: 0 }}>No service areas configured yet.</p>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0' }}>All users will be able to access the app by default.</p>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    {['Area Name', 'Type', 'Details', 'Sellers', 'Del. Partners', 'Coverage', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {areas.map((area, idx) => (
                                    <tr key={area._id}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: idx % 2 === 0 ? 'white' : '#fafafa',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
                                    >
                                        {/* Name */}
                                        <td style={td}>
                                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{area.name}</span>
                                        </td>

                                        {/* Type badge */}
                                        <td style={td}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                                background: area.type === 'city' ? '#dbeafe' : '#fef3c7',
                                                color: area.type === 'city' ? '#1e40af' : '#92400e'
                                            }}>
                                                {area.type === 'city' ? '🏙 City' : '📮 Pincode'}
                                            </span>
                                        </td>

                                        {/* Details */}
                                        <td style={td}>
                                            <span style={{ color: '#475569', fontSize: 13 }}>
                                                {area.type === 'city' && `${area.city}${area.state ? `, ${area.state}` : ''}`}
                                                {area.type === 'pincode' && area.pincode}
                                            </span>
                                        </td>

                                        {/* Sellers Count */}
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: area.sellerCount > 0 ? '#d1fae5' : '#fee2e2',
                                                color: area.sellerCount > 0 ? '#065f46' : '#991b1b',
                                                fontWeight: 800, fontSize: 13
                                            }}>
                                                {area.sellerCount ?? '-'}
                                            </span>
                                        </td>

                                        {/* Delivery Partners Count */}
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: area.dpCount > 0 ? '#d1fae5' : '#fee2e2',
                                                color: area.dpCount > 0 ? '#065f46' : '#991b1b',
                                                fontWeight: 800, fontSize: 13
                                            }}>
                                                {area.dpCount ?? '-'}
                                            </span>
                                        </td>

                                        {/* Coverage Status */}
                                        <td style={td}>
                                            {area.coverageStatus
                                                ? <CoverageBadge status={area.coverageStatus} />
                                                : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                                            }
                                        </td>

                                        {/* Active Status Toggle */}
                                        <td style={td}>
                                            <button
                                                onClick={() => toggleActive(area)}
                                                style={{
                                                    padding: '5px 14px', borderRadius: 20, border: 'none',
                                                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                    background: area.isActive ? '#d1fae5' : '#f1f5f9',
                                                    color: area.isActive ? '#065f46' : '#64748b'
                                                }}
                                            >
                                                {area.isActive ? '● Active' : '○ Inactive'}
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td style={td}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => handleEdit(area)}
                                                    style={{
                                                        padding: '6px 14px', background: '#eff6ff', color: '#2563eb',
                                                        border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer',
                                                        fontSize: 12, fontWeight: 700, transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => { e.target.style.background = '#dbeafe'; }}
                                                    onMouseLeave={e => { e.target.style.background = '#eff6ff'; }}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button onClick={() => deleteArea(area._id)}
                                                    style={{
                                                        padding: '6px 14px', background: '#fff1f2', color: '#dc2626',
                                                        border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer',
                                                        fontSize: 12, fontWeight: 700, transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => { e.target.style.background = '#fee2e2'; }}
                                                    onMouseLeave={e => { e.target.style.background = '#fff1f2'; }}
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Style tokens ──────────────────────────────────────────────────────────
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };
const inp = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0f172a', background: '#f8fafc' };
const th  = { padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' };
const td  = { padding: '14px 16px', fontSize: 14, verticalAlign: 'middle' };

export default ServiceAreas;
