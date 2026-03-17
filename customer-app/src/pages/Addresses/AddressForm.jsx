import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import MapPicker from '../../components/MapPicker/MapPicker';
import './AddressForm.css';


const AddressForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        street: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        addressType: 'Home',
        isDefault: false,
        latitude: null,
        longitude: null
    });
    const [errors, setErrors] = useState({});
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchAddress();
        }
    }, [id]);

    const fetchAddress = async () => {
        try {
            setLoading(true);
            const response = await api.get('/addresses');

            if (response.data.success) {
                const address = response.data.data.find(addr => addr._id === id);
                if (address) {
                    setFormData({
                        name: address.name,
                        street: address.street,
                        landmark: address.landmark || '',
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                        phone: address.phone,
                        addressType: address.addressType,
                        isDefault: address.isDefault,
                        latitude: address.latitude || null,
                        longitude: address.longitude || null
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching address:', error);
            alert('Failed to load address details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.street.trim()) newErrors.street = 'Street address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';

        if (!formData.pincode.trim()) {
            newErrors.pincode = 'Pincode is required';
        } else if (!/^\d{6}$/.test(formData.pincode)) {
            newErrors.pincode = 'Pincode must be exactly 6 digits';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = 'Phone number must be exactly 10 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode
                ? `/addresses/${id}`
                : '/addresses';

            const method = isEditMode ? 'put' : 'post';

            const response = await api[method](url, formData);

            if (response.data.success) {
                navigate('/addresses');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            alert(error.response?.data?.message || 'Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="address-form-page">
            {/* Map Picker Modal */}
            {showMapPicker && (
                <MapPicker
                    initialLat={formData.latitude || 13.6288}
                    initialLng={formData.longitude || 79.4192}
                    onConfirm={(lat, lng, addressText) => {
                        setFormData(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng,
                            street: addressText ? (prev.street || addressText) : prev.street,
                        }));
                        setShowMapPicker(false);
                    }}
                    onClose={() => setShowMapPicker(false)}
                />
            )}

            {/* Header */}
            <div className="form-header">
                <button className="back-button" onClick={() => navigate('/addresses')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1>{isEditMode ? 'Edit Address' : 'Add New Address'}</h1>
            </div>

            {/* Form */}
            <form className="address-form" onSubmit={handleSubmit}>
                {/* Location Buttons */}
                <div className="form-group location-btn-group">
                    <button
                        type="button"
                        className="detect-location-btn"
                        onClick={async () => {
                            if (!navigator.geolocation) { alert('Geolocation not supported by your browser'); return; }
                            setDetectingLocation(true);
                            navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                    try {
                                        const res = await api.get(`/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
                                        if (res.data.success && res.data.data) {
                                            const d = res.data.data;
                                            setFormData(prev => ({
                                                ...prev,
                                                city: d.city || prev.city,
                                                state: d.state || prev.state,
                                                pincode: d.pincode || prev.pincode,
                                                street: d.address || prev.street,
                                                latitude: pos.coords.latitude,
                                                longitude: pos.coords.longitude
                                            }));
                                        }
                                    } catch { alert('Could not detect location'); }
                                    setDetectingLocation(false);
                                },
                                () => { alert('Location permission denied'); setDetectingLocation(false); }
                            );
                        }}
                        disabled={detectingLocation}
                    >
                        {detectingLocation ? '⏳ Detecting...' : '📡 Auto-detect My Location'}
                    </button>

                    <button
                        type="button"
                        className="map-pin-btn"
                        onClick={() => setShowMapPicker(true)}
                    >
                        🗺️ Place Pin on Map
                    </button>

                    {formData.latitude && formData.longitude && (
                        <div className="location-saved-badge">
                            ✅ Location pinned: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                        </div>
                    )}
                </div>


                {/* Full Name */}
                <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                {/* Phone Number */}
                <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <div className="phone-input">
                        <span className="phone-prefix">+91</span>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="10-digit mobile number"
                            maxLength="10"
                            className={errors.phone ? 'error' : ''}
                        />
                    </div>
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                {/* Street Address */}
                <div className="form-group">
                    <label htmlFor="street">Street Address *</label>
                    <textarea
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        placeholder="House/Flat No., Building Name, Street Name"
                        rows="3"
                        className={errors.street ? 'error' : ''}
                    />
                    {errors.street && <span className="error-text">{errors.street}</span>}
                </div>

                {/* Landmark */}
                <div className="form-group">
                    <label htmlFor="landmark">Landmark (Optional)</label>
                    <input
                        type="text"
                        id="landmark"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleChange}
                        placeholder="Nearby landmark"
                    />
                </div>

                {/* City & State */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="city">City *</label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="City"
                            className={errors.city ? 'error' : ''}
                        />
                        {errors.city && <span className="error-text">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="state">State *</label>
                        <input
                            type="text"
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="State"
                            className={errors.state ? 'error' : ''}
                        />
                        {errors.state && <span className="error-text">{errors.state}</span>}
                    </div>
                </div>

                {/* Pincode */}
                <div className="form-group">
                    <label htmlFor="pincode">Pincode *</label>
                    <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="6-digit pincode"
                        maxLength="6"
                        className={errors.pincode ? 'error' : ''}
                    />
                    {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                </div>

                {/* Address Type */}
                <div className="form-group">
                    <label>Address Type</label>
                    <div className="address-type-buttons">
                        {['Home', 'Work', 'Other'].map(type => (
                            <button
                                key={type}
                                type="button"
                                className={`type-btn ${formData.addressType === type ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, addressType: type }))}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Set as Default */}
                <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                        <span>Set as default address</span>
                        <input
                            type="checkbox"
                            className="modern-toggle"
                            name="isDefault"
                            checked={formData.isDefault}
                            onChange={handleChange}
                        />
                    </label>
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => navigate('/addresses')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : isEditMode ? 'Update Address' : 'Save Address'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddressForm;
