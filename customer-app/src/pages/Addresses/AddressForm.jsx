import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import MapPicker from '../../components/MapPicker/MapPicker';
import './AddressForm.css';

const AddressForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [mapStepCompleted, setMapStepCompleted] = useState(isEditMode);
    
    // Address UI specific states
    const [mapTitle, setMapTitle] = useState('');
    const [mapDesc, setMapDesc] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        street: '',
        floor: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        addressType: 'Home',
        isDefault: true,
        latitude: null,
        longitude: null
    });

    // Pre-fill receiver details from user profile (only for new addresses)
    useEffect(() => {
        if (!isEditMode && user) {
            // user.phone may be stored as "+919700079239" — strip country code for the 10-digit field
            const rawPhone = (user.phone || '').replace(/^\+91/, '').trim();
            setFormData(prev => ({
                ...prev,
                name: prev.name || user.name || '',
                phone: prev.phone || rawPhone
            }));
        }
    }, [user, isEditMode]);
    
    const [errors, setErrors] = useState({});

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
                        phone: address.phone,
                        street: address.street,
                        floor: address.floor || '',
                        landmark: address.landmark || '',
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                        addressType: address.addressType,
                        isDefault: address.isDefault,
                        latitude: address.latitude || null,
                        longitude: address.longitude || null
                    });
                    setMapDesc(address.street);
                    setMapTitle(address.city);
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
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.street.trim()) newErrors.street = 'Complete address is required';
        if (!formData.phone.trim() || formData.phone.length !== 10) newErrors.phone = 'Valid 10-digit number required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setLoading(true);
            const url = isEditMode ? `/addresses/${id}` : '/addresses';
            const method = isEditMode ? 'put' : 'post';
            
            // Format before sending
            const submitData = { ...formData };
            if (submitData.floor) {
                // Prepend floor to street if backend doesn't explicitly handle floor field
                submitData.street = `${submitData.floor}, ${submitData.street}`;
            }

            const response = await api[method](url, submitData);

            if (response.data.success) {
                navigate(-1); // Go back smoothly
            }
        } catch (error) {
            console.error('Error saving address:', error);
            alert(error.response?.data?.message || 'Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    // If map step not done, render map
    if (!mapStepCompleted) {
        return (
            <MapPicker
                initialLat={formData.latitude}
                initialLng={formData.longitude}
                onConfirm={(lat, lng, addrText, details) => {
                    const title = details?.locality || details?.city || addrText.split(',')[0];
                    setMapTitle(title);
                    setMapDesc(addrText);
                    setFormData(p => ({
                        ...p,
                        latitude: lat,
                        longitude: lng,
                        street: addrText,
                        city: details?.city || p.city,
                        state: details?.state || p.state,
                        pincode: details?.pincode || p.pincode
                    }));
                    setMapStepCompleted(true);
                }}
                onClose={() => navigate(-1)}
            />
        );
    }

    // Step 2: Address Details
    return (
        <div className="address-form-page">
            <div className="form-header-clean">
                <button onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h1>Enter address details</h1>
            </div>

            <div className="address-form">
                
                {/* 1. Receiver info block */}
                <div className="form-block">
                    <span className="form-block-title">Receiver's details</span>
                    
                    <div className="input-row">
                        <input
                            type="text"
                            name="name"
                            className="clean-input"
                            placeholder="Receiver's name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="input-row">
                        <div className="phone-input-row">
                            <span className="phone-val">+91</span>
                            <input
                                type="tel"
                                name="phone"
                                className="clean-input"
                                placeholder="Receiver's contact"
                                maxLength="10"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>
                </div>

                {/* 2. Address Map Summary Block */}
                <div className="map-summary-box">
                    <div className="msb-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div className="msb-content">
                        <h4 className="msb-title">{mapTitle || 'Picked Location'}</h4>
                        <p className="msb-desc">{mapDesc || formData.street}</p>
                    </div>
                    <button className="msb-change" type="button" onClick={() => setMapStepCompleted(false)}>
                        CHANGE
                    </button>
                </div>

                {/* 3. Address Text Block */}
                <div className="form-block">
                    <div className="input-row">
                        <input
                            type="text"
                            name="street"
                            className="clean-input"
                            placeholder="Complete Address *"
                            value={formData.street}
                            onChange={handleChange}
                        />
                        {errors.street && <span className="error-text">{errors.street}</span>}
                    </div>

                    <div className="input-row">
                        <input
                            type="text"
                            name="floor"
                            className="clean-input"
                            placeholder="Floor (Optional)"
                            value={formData.floor}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="input-row">
                        <input
                            type="text"
                            name="landmark"
                            className="clean-input"
                            placeholder="Nearby Landmark (Optional)"
                            value={formData.landmark}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* 4. Tag Pill Block */}
                <div className="form-block" style={{ paddingBottom: '32px' }}>
                    <span className="form-block-title">Tag this location for later</span>
                    <div className="address-pills">
                        {['Home', 'Work', 'Hotel', 'Other'].map(type => (
                            <button
                                key={type}
                                type="button"
                                className={`pill-btn ${formData.addressType === type ? 'active' : ''}`}
                                onClick={() => setFormData(p => ({ ...p, addressType: type }))}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* Bottom confirmation Bar */}
            <div className="address-bottom-bar">
                <button className="bottom-btn" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Saving address...' : 'Confirm address'}
                </button>
            </div>
        </div>
    );
};

export default AddressForm;
