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
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/config', config);
            if (res.data.success) {
                alert('Platform settings updated successfully!');
                fetchConfig();
                setIsEditing(false);
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
        padding: '16px 20px', 
        fontSize: '16px', 
        border: isEditing ? '2px solid #3b82f6' : '1px solid transparent',
        borderRadius: '16px', 
        outline: 'none', 
        boxSizing: 'border-box',
        backgroundColor: isEditing ? '#ffffff' : '#f1f5f9',
        color: isEditing ? '#0f172a' : '#475569',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontWeight: '600',
        cursor: isEditing ? 'text' : 'not-allowed',
        boxShadow: isEditing ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none'
    };

    const cardStyle = {
        background: '#ffffff',
        padding: '32px',
        borderRadius: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        marginBottom: '32px',
        border: '1px solid #f1f5f9'
    };

    const labelStyle = { 
        display: 'block', 
        marginBottom: '10px', 
        fontSize: '14px', 
        fontWeight: '700', 
        color: '#1e293b',
        letterSpacing: '0.3px'
    };

    const hintStyle = { 
        color: '#64748b', 
        fontSize: '13px', 
        display: 'block', 
        marginTop: '8px',
        fontWeight: '500'
    };

    const IconRevenue = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    );

    const IconPayment = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
    );

    const IconDelivery = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
    );

    return (
        <div style={{ padding: '40px 24px', maxWidth: '880px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Global Configuration</h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '16px', fontWeight: '500' }}>Manage core platform rules, fees, and logistics parameters</p>
                </div>
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                        background: isEditing ? '#f8fafc' : '#1e293b',
                        color: isEditing ? '#475569' : '#ffffff',
                        border: isEditing ? '1px solid #e2e8f0' : 'none',
                        padding: '12px 24px',
                        borderRadius: '14px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: isEditing ? 'none' : '0 4px 12px rgba(30, 41, 59, 0.2)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    {isEditing ? (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            Lock Settings
                        </>
                    ) : (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            Edit Settings
                        </>
                    )}
                </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* Revenue & Fees */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconRevenue />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Revenue & Commissions</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                        <div>
                            <label style={labelStyle}>Seller Commission (%)</label>
                            <input type="number" name="commissionPercentage" value={config.commissionPercentage} onChange={handleChange} min="0" max="100" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Percentage deducted from the final selling price</small>
                        </div>
                        <div>
                            <label style={labelStyle}>Platform Fee (₹)</label>
                            <input type="number" name="platformFee" value={config.platformFee} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Flat fee charged directly to the customer</small>
                        </div>
                    </div>
                </div>

                {/* Payment Gateway */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconPayment />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Payment Processing</h3>
                    </div>
                    <div>
                        <label style={labelStyle}>Gateway Fee (%)</label>
                        <input type="number" name="paymentGatewayPercentage" value={config.paymentGatewayPercentage ?? 2} onChange={handleChange} min="0" max="10" step="0.1" style={inputStyle} disabled={!isEditing} required />
                        <small style={hintStyle}>Estimated transaction fee deducted from total profit. Default is 2.0%</small>
                    </div>
                </div>

                {/* Delivery Economics */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconDelivery />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Delivery Logistics</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                        <div>
                            <label style={labelStyle}>Base Delivery Fee (₹)</label>
                            <input type="number" name="baseDeliveryCharge" value={config.baseDeliveryCharge} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Base charge covering the first 2 KM of delivery</small>
                        </div>
                        <div>
                            <label style={labelStyle}>Charge Per Extra KM (₹)</label>
                            <input type="number" name="deliveryChargePerKm" value={config.deliveryChargePerKm} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Dynamic fee applied to distance beyond 2 KM</small>
                        </div>
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                            <label style={labelStyle}>Free Delivery Threshold (₹)</label>
                            <input type="number" name="freeDeliveryThreshold" value={config.freeDeliveryThreshold} onChange={handleChange} min="0" style={inputStyle} disabled={!isEditing} required />
                            <small style={hintStyle}>Carts exceeding this total will completely waive delivery charges.</small>
                        </div>
                    </div>
                </div>

                {/* Welcome Promo */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                            🎁
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Welcome Promo (New Users)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={labelStyle}>Enable Welcome Promo</label>
                            <div
                                onClick={() => isEditing && setConfig(prev => ({ ...prev, welcomePromoEnabled: !prev.welcomePromoEnabled }))}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: isEditing ? 'pointer' : 'not-allowed' }}
                            >
                                <div style={{ width: 52, height: 28, borderRadius: 14, background: config.welcomePromoEnabled ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
                                    <div style={{ position: 'absolute', top: 3, left: config.welcomePromoEnabled ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s' }} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: config.welcomePromoEnabled ? '#16a34a' : '#94a3b8' }}>
                                    {config.welcomePromoEnabled ? 'Active — Showing to new users' : 'Inactive'}
                                </span>
                            </div>
                            <small style={hintStyle}>New users (0 prior orders) will see the promo banner at checkout.</small>
                        </div>
                        <div>
                            <label style={labelStyle}>Promo Code</label>
                            <input
                                type="text"
                                name="welcomePromoCode"
                                value={config.welcomePromoCode || 'WELCOME'}
                                onChange={e => setConfig(prev => ({ ...prev, welcomePromoCode: e.target.value.toUpperCase() }))}
                                maxLength={20}
                                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace', fontSize: '18px' }}
                                disabled={!isEditing}
                            />
                            <small style={hintStyle}>Code shown to customers to get free delivery on their first order.</small>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={labelStyle}>Total Redemptions</label>
                            <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '28px', fontWeight: 800, color: '#f97316' }}>{config.welcomePromoUsageCount || 0}</span>
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>users used this promo</span>
                            </div>
                            <small style={hintStyle}>Auto-increments each time a new user successfully redeems the promo.</small>
                        </div>
                    </div>
                </div>

                <div style={{ 
                    marginTop: '16px', 
                    opacity: isEditing ? 1 : 0, 
                    pointerEvents: isEditing ? 'auto' : 'none', 
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    position: 'sticky',
                    bottom: '32px',
                    zIndex: 50
                }}>
                    <button type="submit" disabled={saving} style={{ 
                        background: '#2563eb', 
                        color: '#ffffff', 
                        padding: '16px 40px', 
                        border: 'none', 
                        borderRadius: '16px', 
                        fontSize: '16px', 
                        fontWeight: '800', 
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                        transition: 'transform 0.2s ease',
                        transform: saving ? 'scale(0.98)' : 'scale(1)'
                    }}>
                        {saving ? 'Applying...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsTab;
