import { useState, useEffect } from 'react';
import api from '../utils/api';
import MapPicker from './MapPicker/MapPicker';

const ProfileTab = ({ seller }) => {
    const [formData, setFormData] = useState({
        ownerName: '',
        phone: '',
        shopName: '',
        shopAddress: '',
        description: '',
        gstNumber: '',
        deliveryRadius: 5,
        minOrderAmount: 0,
        location: {
            type: 'Point',
            coordinates: [0, 0] // [longitude, latitude]
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
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude] // MongoDB goes Longitude, Latitude
                    }
                }));
                setLocationLoading(false);
                setSuccessMsg('✅ GPS Coordinates captured successfully!');
                setTimeout(() => setSuccessMsg(''), 3000);
            },
            (error) => {
                setLocationLoading(false);
                console.error('Error getting location:', error);
                if (error.code === 1) {
                    setErrorMsg('Please allow location access to detect your shop coordinates.');
                } else {
                    setErrorMsg('Make sure your device location is turned on.');
                }
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
                setSuccessMsg(`✅ ${type === 'banner' ? 'Banner' : 'Logo'} uploaded! Save below to apply.`);
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
                setSuccessMsg('✅ Profile updated successfully!');
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-tab">
            {showMapPicker && (
                <MapPicker
                    initialLat={formData.location?.coordinates[1] || 13.6288}
                    initialLng={formData.location?.coordinates[0] || 79.4192}
                    onConfirm={(lat, lng, addressText) => {
                        setFormData(prev => ({
                            ...prev,
                            location: {
                                type: 'Point',
                                coordinates: [lng, lat]
                            },
                            shopAddress: addressText ? (prev.shopAddress || addressText) : prev.shopAddress,
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}

            <div className="section-header">
                <h2>Shop Profile Settings</h2>
                <p>Update your shop details and operational settings</p>
            </div>

            {successMsg && <div className="alert alert-success">{successMsg}</div>}
            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

            {/* Banner Image Upload */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: '160px', background: 'linear-gradient(135deg,#1a1a2e,#533483,#0f3460)', cursor: 'pointer' }}
                    onClick={() => document.getElementById('banner-upload').click()}>
                    {bannerPreview ? (
                        <img src={bannerPreview} alt="Shop banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ fontSize: '36px' }}>🖼️</span>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Click to upload Shop Banner</span>
                            <span style={{ fontSize: '12px', opacity: 0.7 }}>Recommended: 1200×400 px</span>
                        </div>
                    )}
                    {uploadingBanner && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" style={{ borderTopColor: '#fff' }}></div>
                        </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: 'white', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                        {uploadingBanner ? 'Uploading...' : '✏️ Change Banner'}
                    </div>
                </div>
                <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'banner')} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '12px', border: '2px dashed #cbd5e1', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative', background: '#f8fafc' }}
                        onClick={() => document.getElementById('logo-upload').click()}>
                        {logoPreview ? (
                            <img src={logoPreview} alt="Shop logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', color: '#94a3b8' }}>
                                <span style={{ fontSize: '22px' }}>🏪</span>
                            </div>
                        )}
                        {uploadingLogo && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" style={{ borderTopColor: '#fff', width: '18px', height: '18px' }}></div>
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>Shop Logo</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Shown as badge on your shop card</div>
                        <button type="button" onClick={() => document.getElementById('logo-upload').click()} style={{ padding: '6px 14px', border: '1px solid #4f46e5', color: '#4f46e5', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>
                            {uploadingLogo ? 'Uploading...' : '📷 Upload Logo'}
                        </button>
                    </div>
                </div>
                <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'logo')} />
            </div>

            <form onSubmit={handleSave} className="profile-form">
                <div className="form-group">
                    <label>Shop Name</label>
                    <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Owner Name</label>
                    <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>GSTIN</label>
                    <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="e.g. 29XXXXX1234X1Z5" />
                </div>

                <div className="form-group full-width" style={{ position: 'relative' }}>
                    <label>Shop Address</label>
                    <textarea name="shopAddress" value={formData.shopAddress} onChange={handleChange} rows="2" required />
                    
                    <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>GPS Coordinates</div>
                            <div style={{ fontSize: '13px', color: '#065f46', fontWeight: 600, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'inline-block' }}>
                                {formData.location?.coordinates[0] !== 0 && formData.location?.coordinates[1] !== 0
                                    ? `Lat: ${formData.location.coordinates[1].toFixed(6)}, Lng: ${formData.location.coordinates[0].toFixed(6)}`
                                    : 'Coordinates needed for delivery partner navigation.'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={detectLocation}
                                disabled={locationLoading}
                                style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {locationLoading ? 'Detecting...' : '📡 Auto-Detect'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowMapPicker(true)}
                                style={{ padding: '8px 16px', background: '#f0fdf4', border: '1px solid #10b981', color: '#059669', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                🗺️ Place Pin on Map
                            </button>
                        </div>
                    </div>
                </div>

                <div className="form-group full-width">
                    <label>Shop Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Tell customers about your shop..." />
                </div>

                <div className="form-group">
                    <label>Delivery Radius (in km)</label>
                    <input type="number" name="deliveryRadius" value={formData.deliveryRadius} onChange={handleChange} min="1" max="50" required />
                </div>

                <div className="form-group">
                    <label>Minimum Order Amount (₹)</label>
                    <input type="number" name="minOrderAmount" value={formData.minOrderAmount} onChange={handleChange} min="0" required />
                </div>

                <div className="form-group full-width" style={{ marginTop: '20px' }}>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileTab;
