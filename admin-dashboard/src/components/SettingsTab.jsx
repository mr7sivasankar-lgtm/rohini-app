import { useState, useEffect } from 'react';
import api from '../utils/api';

const SettingsTab = () => {
    const [config, setConfig] = useState({
        commissionPercentage: 5,
        platformFee: 10,
        deliveryChargePerKm: 10,
        baseDeliveryCharge: 40,
        freeDeliveryThreshold: 500
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/adminConfig');
            if (res.data.success && res.data.data) {
                setConfig(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching admin config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/adminConfig', config);
            if (res.data.success) {
                alert('Platform settings updated successfully!');
                fetchConfig();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading settings...</div>;

    const inputStyle = { width: '100%', padding: '12px', fontSize: 14, border: '1.5px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' };

    return (
        <div>
            <div className="page-header">
                <h1>Global Platform Settings</h1>
                <p>Manage commissions, platform fees, and delivery logic</p>
            </div>
            
            <div className="card" style={{ maxWidth: 600, padding: 32 }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a' }}>💰 Revenue & Fees</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Seller Commission (%)</label>
                                <input type="number" name="commissionPercentage" value={config.commissionPercentage} onChange={handleChange} min="0" max="100" style={inputStyle} required />
                                <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>Deducted from selling price</small>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Platform Fee (₹)</label>
                                <input type="number" name="platformFee" value={config.platformFee} onChange={handleChange} min="0" style={inputStyle} required />
                                <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>Charged to customer</small>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a' }}>💳 Payment Gateway</h3>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Gateway Fee (%)</label>
                            <input type="number" name="paymentGatewayPercentage" value={config.paymentGatewayPercentage ?? 2} onChange={handleChange} min="0" max="10" step="0.1" style={inputStyle} required />
                            <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>Estimated payment processing cost deducted from profit. Default: 2%</small>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a' }}>🚚 Delivery Economics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Base Delivery Fee (₹)</label>
                                <input type="number" name="baseDeliveryCharge" value={config.baseDeliveryCharge} onChange={handleChange} min="0" style={inputStyle} required />
                                <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>For first 2 KM</small>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Charge Per Extra KM (₹)</label>
                                <input type="number" name="deliveryChargePerKm" value={config.deliveryChargePerKm} onChange={handleChange} min="0" style={inputStyle} required />
                                <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>Beyond 2 KM</small>
                            </div>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Free Delivery Threshold (₹)</label>
                            <input type="number" name="freeDeliveryThreshold" value={config.freeDeliveryThreshold} onChange={handleChange} min="0" style={inputStyle} required />
                            <small style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 4 }}>Orders above this bypass delivery fees completely.</small>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button type="submit" disabled={saving} style={{ background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Save Configuration Data'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsTab;
