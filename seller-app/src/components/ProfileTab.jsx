import { useState, useEffect } from 'react';
import api from '../utils/api';
import MapPicker from './MapPicker/MapPicker';

const ProfileTab = ({ seller }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        ownerName: '',
        phone: '',
        shopName: '',
        shopAddress: '',
        city: '',
        state: '',
        pincode: '',
        description: '',
        gstNumber: '',
        deliveryRadius: 5,
        minOrderAmount: 0,
        location: {
            type: 'Point',
            coordinates: [0, 0]
        }
    });

    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [bannerPreview, setBannerPreview] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        if (seller) {
            setFormData({
                ownerName: seller.ownerName || '',
                phone: seller.phone || '',
                shopName: seller.shopName || '',
                shopAddress: seller.shopAddress || '',
                city: seller.city || '',
                state: seller.state || '',
                pincode: seller.pincode || '',
                description: seller.description || '',
                gstNumber: seller.gstNumber || '',
                deliveryRadius: seller.deliveryRadius || 5,
                minOrderAmount: seller.minOrderAmount || 0,
                location: seller.location || { type: 'Point', coordinates: [0, 0] }
            });
            if (seller.bannerImage) setBannerPreview(seller.bannerImage);
            if (seller.logoImage) setLogoPreview(seller.logoImage);
        }
    }, [seller]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setErrorMsg('Geolocation is not supported by your browser.');
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    location: { type: 'Point', coordinates: [longitude, latitude] }
                }));
                // Also reverse geocode to fill city/state/pincode
                try {
                    const res = await api.get(`/serviceability/geocode/reverse?lat=${latitude}&lon=${longitude}`);
                    if (res.data.success && res.data.data) {
                        const d = res.data.data;
                        setFormData(prev => ({
                            ...prev,
                            city: d.city || prev.city,
                            state: d.state || prev.state,
                            pincode: d.pincode || prev.pincode
                        }));
                    }
                } catch (_) { /* silently ignore */ }
                setLocationLoading(false);
                setSuccessMsg('✅ GPS & address details captured!');
                setTimeout(() => setSuccessMsg(''), 3000);
            },
            (error) => {
                setLocationLoading(false);
                if (error.code === 1) setErrorMsg('Please allow location access to detect your shop coordinates.');
                else setErrorMsg('Make sure your device location is turned on.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const setUploading = type === 'banner' ? setUploadingBanner : setUploadingLogo;
        const fieldName = type === 'banner' ? 'bannerImage' : 'logoImage';
        const setPreview = type === 'banner' ? setBannerPreview : setLogoPreview;

        setUploading(true);
        setErrorMsg('');
        try {
            const form = new FormData();
            form.append('image', file);
            const res = await api.post('/sellers/upload-image', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                const url = res.data.url;
                setPreview(url);
                setFormData(prev => ({ ...prev, [fieldName]: url }));
                setSuccessMsg(`✅ ${type === 'banner' ? 'Banner' : 'Logo'} uploaded! Save to apply.`);
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch (err) {
            setErrorMsg('Image upload failed: ' + (err.response?.data?.message || 'Please try again'));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const res = await api.put('/sellers/profile', formData);
            if (res.data.success) {
                setSuccessMsg('✅ Shop profile successfully updated!');
                setIsEditing(false); // Return to view mode instantly
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
            
            {showMapPicker && (
                <MapPicker
                    initialLat={formData.location?.coordinates[1] || 13.6288}
                    initialLng={formData.location?.coordinates[0] || 79.4192}
                    onConfirm={(lat, lng, addressText, addrDetails) => {
                        setFormData(prev => ({
                            ...prev,
                            location: { type: 'Point', coordinates: [lng, lat] },
                            shopAddress: addressText ? (prev.shopAddress || addressText) : prev.shopAddress,
                            city: addrDetails?.city || prev.city,
                            state: addrDetails?.state || prev.state,
                            pincode: addrDetails?.pincode || prev.pincode,
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}

            {/* Notification Toast */}
            {successMsg && (
                <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(5, 150, 105, 0.95)', color: 'white', padding: '12px 24px', borderRadius: '50px', fontSize: '14px', fontWeight: 600, boxShadow: '0 10px 25px rgba(5,150,105,0.3)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease-out' }}>
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', border: '1px solid #fca5a5', marginBottom: '20px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            {!isEditing ? (
                /* ======================= VIEW MODE ======================= */
                <div style={{ background: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    {/* Hero Banner Section */}
                    <div style={{ position: 'relative', height: '220px', background: bannerPreview ? `url(${bannerPreview}) center/cover` : 'linear-gradient(135deg, #1e1b4b, #4338ca, #3b82f6)' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0) 100%)' }}></div>
                        
                        {/* Edit Settings Gear Button */}
                        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
                            <button onClick={() => setIsEditing(true)} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: '18px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
                                ⚙️
                            </button>
                        </div>

                        {/* Floating Profile Info inside Banner */}
                        <div style={{ position: 'absolute', bottom: '24px', left: '32px', display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                            <div style={{ width: '110px', height: '110px', borderRadius: '20px', background: '#fff', border: '4px solid rgba(255,255,255,0.2)', padding: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '32px' }}>🏪</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ paddingBottom: '8px' }}>
                                <h1 style={{ color: 'white', fontSize: '32px', margin: '0 0 6px 0', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {formData.shopName || 'Setup Your Shop'}
                                    {seller?.status && (
                                        <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: seller.status === 'Approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: seller.status === 'Approved' ? '#6ee7b7' : '#fcd34d', border: `1px solid ${seller.status === 'Approved' ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'}`, backdropFilter: 'blur(4px)', fontWeight: 600, textShadow: 'none', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                            {seller.status}
                                        </span>
                                    )}
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    <span>👤 Owner: {formData.ownerName || 'Not Set'}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                                    <span>📞 {formData.phone || 'Not Set'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ padding: '32px', background: '#f8fafc' }}>
                        
                        {/* Description Box */}
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>About the Shop</h3>
                            <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {formData.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No shop description provided yet. Click the gear icon to add one!</span>}
                            </p>
                        </div>

                        {/* Grid Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📍</div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Shop Address</div>
                                        <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, lineHeight: '1.6' }}>
                                            {formData.shopAddress || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}
                                            {(formData.city || formData.state || formData.pincode) && (
                                                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {formData.city && <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>🏙 {formData.city}</span>}
                                                    {formData.state && <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>🗺 {formData.state}</span>}
                                                    {formData.pincode && <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>📮 {formData.pincode}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏢</div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>GSTIN Number</div>
                                        <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{formData.gstNumber || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🚚</div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Delivery Radius</div>
                                        <div style={{ fontSize: '16px', color: '#1e293b', fontWeight: 700 }}>{formData.deliveryRadius} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>km</span></div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>₹</div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Min. Order Amount</div>
                                        <div style={{ fontSize: '16px', color: '#1e293b', fontWeight: 700 }}>{formData.minOrderAmount === 0 ? 'No Minimum' : `₹${formData.minOrderAmount}`}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
                /* ======================= EDIT MODE ======================= */
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
                    
                    <button onClick={() => setIsEditing(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s', zIndex: 10 }} onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                        ✕
                    </button>

                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: '#eff6ff', color: '#3b82f6', width: '36px', height: '36px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚙️</span>
                            Edit Shop Profile
                        </h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Make changes to your shop's appearance and operational settings.</p>
                    </div>

                    {/* Banner Image Upload */}
                    <div style={{ background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '32px', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', height: '180px', background: 'linear-gradient(135deg,#1e293b,#334155)', cursor: 'pointer', transition: 'opacity 0.2s' }} onClick={() => document.getElementById('banner-upload').click()} onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                            {bannerPreview ? (
                                <img src={bannerPreview} alt="Shop banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                                    <span style={{ fontSize: '40px' }}>🖼️</span>
                                    <span style={{ fontSize: '15px', fontWeight: 600 }}>Upload a stunning Shop Banner</span>
                                    <span style={{ fontSize: '13px', opacity: 0.7 }}>Recommended size: 1200×400 px</span>
                                </div>
                            )}
                            {uploadingBanner && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="spinner" style={{ borderTopColor: '#fff', width: '30px', height: '30px' }}></div>
                                </div>
                            )}
                            <div style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(255,255,255,0.95)', color: '#0f172a', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                {uploadingBanner ? '⏳ Uploading...' : '✏️ Change Banner'}
                            </div>
                        </div>
                        <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'banner')} />

                        {/* Logo Upload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                            <div style={{ width: '84px', height: '84px', borderRadius: '16px', border: '2px dashed #cbd5e1', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onClick={() => document.getElementById('logo-upload').click()}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Shop logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        <span style={{ fontSize: '28px' }}>🏪</span>
                                    </div>
                                )}
                                {uploadingLogo && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner" style={{ borderTopColor: '#4f46e5', width: '20px', height: '20px' }}></div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Shop Logo (Avatar)</h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>Appears on the map marker and next to your shop name.</p>
                                <button type="button" onClick={() => document.getElementById('logo-upload').click()} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}>
                                    {uploadingLogo ? 'Uploading...' : '📷 Browse Image'}
                                </button>
                            </div>
                        </div>
                        <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'logo')} />
                    </div>

                    <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shop Name*</label>
                            <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Owner Name*</label>
                            <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GSTIN Number</label>
                            <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="e.g. 29XXXXX1234X1Z5" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Street / Area*</label>
                            <textarea name="shopAddress" value={formData.shopAddress} onChange={handleChange} rows="2" required placeholder="Door no, street, landmark..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s', resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        {/* City / State / Pincode row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Tirupati" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>State</label>
                            <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Andhra Pradesh" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pincode</label>
                            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="e.g. 517501" maxLength="6" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                            {/* GPS Section */}
                            <div style={{ marginTop: '8px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>GPS Coordinates</div>
                                    <div style={{ fontSize: '13px', color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                                        {formData.location?.coordinates[0] !== 0 && formData.location?.coordinates[1] !== 0
                                            ? `Lat: ${formData.location.coordinates[1].toFixed(6)} | Lng: ${formData.location.coordinates[0].toFixed(6)}`
                                            : '⚠️ Coordinates needed for delivery drivers.'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={detectLocation} disabled={locationLoading} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={(e) => { if(!locationLoading) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; } }} onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                                        {locationLoading ? <span className="spinner" style={{width: '14px', height: '14px', borderWidth: '2px'}}></span> : '📡'} Auto-Detect
                                    </button>
                                    <button type="button" onClick={() => setShowMapPicker(true)} style={{ padding: '8px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}>
                                        🗺️ Pin on Map
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shop Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Tell customers about your shop..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s', resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Radius (km)*</label>
                            <input type="number" name="deliveryRadius" value={formData.deliveryRadius} onChange={handleChange} min="1" max="50" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Minimum Order (₹)*</label>
                            <input type="number" name="minOrderAmount" value={formData.minOrderAmount} onChange={handleChange} min="0" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', transition: 'border 0.2s, box-shadow 0.2s' }} onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
                        </div>

                        <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', borderRadius: '14px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 8px 15px rgba(59, 130, 246, 0.25)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onMouseOver={(e) => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(59, 130, 246, 0.35)'; } }} onMouseOut={(e) => { if(!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(59, 130, 246, 0.25)'; } }}>
                                {loading ? <span className="spinner" style={{width: '20px', height: '20px', borderTopColor: '#fff', borderWidth: '3px'}}></span> : '💾'} 
                                {loading ? 'Saving Profile...' : 'Save All Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProfileTab;
