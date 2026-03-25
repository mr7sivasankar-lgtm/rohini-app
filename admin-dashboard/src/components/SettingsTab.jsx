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
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
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
            const res = await api.put('/config', config);
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

    const inputStyle = { 
        width: '100%', 
        padding: '14px 16px', 
        fontSize: '15px', 
        border: '1.5px solid',
        borderColor: isEditing ? '#6366f1' : '#e2e8f0', 
        borderRadius: '12px', 
        outline: 'none', 
        boxSizing: 'border-box',
        backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
        color: isEditing ? '#0f172a' : '#64748b',
        transition: 'all 0.3s ease',
        boxShadow: isEditing ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : 'none',
        fontWeight: isEditing ? '500' : '600',
        cursor: isEditing ? 'text' : 'not-allowed'
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        padding: '24px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        marginBottom: '24px'
    };

    const labelStyle = { 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: '700', 
        color: '#334155' 
    };

    const hintStyle = { 
        color: '#94a3b8', 
        fontSize: '12px', 
        display: 'block', 
        marginTop: '6px',
        fontWeight: '500'
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Global Platform Settings</h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Manage commissions, platform fees, and delivery logic</p>
                </div>
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                        background: isEditing ? '#fef2f2' : '#f0f9ff',
                        color: isEditing ? '#ef4444' : '#0ea5e9',
                        border: isEditing ? '1px solid #fecaca' : '1px solid #bae6fd',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isEditing ? '✕ Cancel' : '⚙️ Edit Settings'}
                </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* Revenue & Fees */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💰</div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Revenue & Fees</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        <div>
                            <label style={labelStyle}>Seller Commission (%)</label>
                            <input type="number" name="commissionPercentage" value={config.commissionPercentage} onChange={handleChange} min="0" max="100" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Deducted from selling price</small>
                        </div>
                        <div>
                            <label style={labelStyle}>Platform Fee (₹)</label>
                            <input type="number" name="platformFee" value={config.platformFee} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Charged directly to customer</small>
                        </div>
                    </div>
                </div>

                {/* Payment Gateway */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💳</div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Payment Gateway</h3>
                    </div>
                    <div>
                        <label style={labelStyle}>Gateway Fee (%)</label>
                        <input type="number" name="paymentGatewayPercentage" value={config.paymentGatewayPercentage ?? 2} onChange={handleChange} min="0" max="10" step="0.1" style={inputStyle} disabled={!isEditing} required />
                        <small style={hintStyle}>Estimated payment processing cost deducted from profit. Default: 2%</small>
                    </div>
                </div>

                {/* Delivery Economics */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚚</div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Delivery Economics</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        <div>
                            <label style={labelStyle}>Base Delivery Fee (₹)</label>
                            <input type="number" name="baseDeliveryCharge" value={config.baseDeliveryCharge} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Charge for the first 2 KM</small>
                        </div>
                        <div>
                            <label style={labelStyle}>Charge Per Extra KM (₹)</label>
                            <input type="number" name="deliveryChargePerKm" value={config.deliveryChargePerKm} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Charged for distance beyond 2 KM</small>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Free Delivery Threshold (₹)</label>
                            <input type="number" name="freeDeliveryThreshold" value={config.freeDeliveryThreshold} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Orders above this amount bypass all delivery fees.</small>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', position: 'sticky', bottom: '24px', zIndex: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.5)' }}>
                            <button type="submit" disabled={saving} style={{ 
                                background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', 
                                color: 'white', 
                                padding: '14px 32px', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                cursor: 'pointer', 
                                opacity: saving ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}>
                                {saving ? 'Applying Updates...' : 'Save Configuration Data'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default SettingsTab;
