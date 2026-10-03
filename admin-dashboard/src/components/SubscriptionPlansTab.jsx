import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const SubscriptionPlansTab = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editPlan, setEditPlan] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ planId: '', name: '', price: '', duration: 1, durationType: 'DAY', description: '', isActive: true });

    useEffect(() => { fetchPlans(); }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await api.get('/subscriptions/admin/plans');
            if (res.data.success) setPlans(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openNew = () => { setEditPlan(null); setForm({ planId: '', name: '', price: '', duration: 1, durationType: 'DAY', description: '', isActive: true }); setShowForm(true); };
    const openEdit = (plan) => { setEditPlan(plan); setForm({ planId: plan.planId, name: plan.name, price: plan.price, duration: plan.duration, durationType: plan.durationType, description: plan.description || '', isActive: plan.isActive }); setShowForm(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) { alert('Name and price are required'); return; }
        try {
            setSaving(true);
            if (editPlan) {
                await api.put(`/subscriptions/admin/plans/${editPlan._id}`, form);
            } else {
                if (!form.planId) { alert('Plan ID is required'); return; }
                await api.post('/subscriptions/admin/plans', form);
            }
            setShowForm(false);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save plan');
        } finally { setSaving(false); }
    };

    const handleDelete = async (plan) => {
        if (!window.confirm(`Delete plan "${plan.name}" (${plan.planId})?\n\nThis cannot be undone.`)) return;
        try {
            await api.delete(`/subscriptions/admin/plans/${plan._id}`);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete plan');
        }
    };

    const inp = { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Subscription Plans</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Configure seller subscription plans and pricing</p>
                </div>
                <button onClick={openNew} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>+ New Plan</button>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {plans.map(plan => (
                        <div key={plan._id} style={{ background: 'white', borderRadius: 16, padding: 20, border: `2px solid ${plan.isActive ? '#86efac' : '#e2e8f0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{plan.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ID: {plan.planId}</div>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: plan.isActive ? '#dcfce7' : '#f1f5f9', color: plan.isActive ? '#16a34a' : '#64748b' }}>
                                    {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#16a34a', marginBottom: 4 }}>₹{plan.price}</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{plan.duration} {plan.durationType.toLowerCase()} access</div>
                            {plan.description && <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>{plan.description}</div>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => openEdit(plan)} style={{ flex: 1, padding: '9px', background: '#eff6ff', color: '#2563eb', border: '1px solid #93c5fd', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✏️ Edit</button>
                                <button onClick={() => handleDelete(plan)} style={{ flex: 1, padding: '9px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>🗑️ Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>{editPlan ? 'Edit Plan' : 'New Subscription Plan'}</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gap: 14 }}>
                                {!editPlan && (
                                    <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>PLAN ID *</label>
                                        <input value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value.toUpperCase() }))} required placeholder="e.g. DAILY" style={inp} /></div>
                                )}
                                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>PLAN NAME *</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Daily Seller" style={inp} /></div>
                                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>PRICE (₹) *</label>
                                    <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required min="1" placeholder="25" style={inp} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>DURATION</label>
                                        <input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} min="1" style={inp} /></div>
                                    <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>TYPE</label>
                                        <select value={form.durationType} onChange={e => setForm(p => ({ ...p, durationType: e.target.value }))} style={inp}>
                                            <option value="DAY">Day</option>
                                            <option value="WEEK">Week</option>
                                            <option value="MONTH">Month</option>
                                        </select></div>
                                </div>
                                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>DESCRIPTION</label>
                                    <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={inp} /></div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>Plan is Active</span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 2, padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving...' : 'Save Plan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPlansTab;
