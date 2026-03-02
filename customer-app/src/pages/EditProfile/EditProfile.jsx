import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import './EditProfile.css';

const EditProfile = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (user) {
            // Strip +91 prefix if present to match the input format
            const phoneWithoutPrefix = user.phone ? user.phone.replace(/^\+91/, '') : '';

            setFormData({
                name: user.name || '',
                phone: phoneWithoutPrefix
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Clear success message
        if (successMessage) {
            setSuccessMessage('');
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
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
            const token = localStorage.getItem('token');

            // Only send changed fields
            const updateData = { name: formData.name };

            // Strip +91 from user.phone for comparison
            const currentPhone = user.phone ? user.phone.replace(/^\+91/, '') : '';

            // Only include phone if it has changed
            if (formData.phone !== currentPhone) {
                // Add +91 prefix when sending to backend
                updateData.phone = `+91${formData.phone}`;
            }

            const response = await api.put(
                '/auth/update-profile',
                updateData
            );

            if (response.data.success) {
                setSuccessMessage('Profile updated successfully!');

                // Update user data in context
                if (refreshUser) {
                    await refreshUser();
                }

                // Redirect after a short delay
                setTimeout(() => {
                    navigate('/profile');
                }, 1500);
            }
        } catch (error) {
            console.error('Error updating profile:', error);

            if (error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: 'Failed to update profile' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edit-profile-page">
            {/* Header */}
            <div className="edit-profile-header">
                <button className="back-button" onClick={() => navigate('/profile')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1>Edit Profile</h1>
            </div>

            {/* Form */}
            <form className="edit-profile-form" onSubmit={handleSubmit}>
                {/* Success Message */}
                {successMessage && (
                    <div className="success-message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Error Message */}
                {errors.general && (
                    <div className="error-message">
                        <span>{errors.general}</span>
                    </div>
                )}

                {/* Profile Icon */}
                <div className="profile-icon-container">
                    <div className="profile-icon-large">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                </div>

                {/* Name Field */}
                <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                {/* Phone Number Field */}
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
                    <p className="field-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        This is your login phone number
                    </p>
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => navigate('/profile')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;
