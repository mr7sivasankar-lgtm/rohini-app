import { useState, useEffect } from 'react';
import api from '../utils/api';

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
            <div className="section-header">
                <h2>Shop Profile Settings</h2>
                <p>Update your shop details and operational settings</p>
            </div>

            {successMsg && <div className="alert alert-success">{successMsg}</div>}
            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

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
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                {formData.location?.coordinates[0] !== 0 && formData.location?.coordinates[1] !== 0 
                                    ? `Lat: ${formData.location.coordinates[1].toFixed(6)}, Lng: ${formData.location.coordinates[0].toFixed(6)}` 
                                    : 'Coordinates needed for delivery partner navigation.'}
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={detectLocation}
                            disabled={locationLoading}
                            style={{ padding: '8px 16px', background: 'white', border: '1px solid #4f46e5', color: '#4f46e5', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {locationLoading ? 'Detecting...' : '📍 Auto-Detect'}
                        </button>
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
