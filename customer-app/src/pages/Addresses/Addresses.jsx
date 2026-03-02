import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Addresses.css';

const Addresses = () => {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/addresses');

            if (response.data.success) {
                setAddresses(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
            setError('Failed to load addresses');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefault = async (addressId) => {
        try {
            const response = await api.put(
                `/addresses/${addressId}/default`,
                {}
            );

            if (response.data.success) {
                fetchAddresses(); // Refresh list
            }
        } catch (error) {
            console.error('Error setting default address:', error);
            alert('Failed to set default address');
        }
    };

    const handleDelete = async (addressId) => {
        if (!window.confirm('Are you sure you want to delete this address?')) {
            return;
        }

        try {
            const response = await api.delete(
                `/addresses/${addressId}`
            );

            if (response.data.success) {
                fetchAddresses(); // Refresh list
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            alert('Failed to delete address');
        }
    };

    if (loading) {
        return (
            <div className="addresses-page">
                <div className="addresses-header">
                    <button className="back-button" onClick={() => navigate('/profile')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1>My Addresses</h1>
                </div>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading addresses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="addresses-page">
            {/* Header */}
            <div className="addresses-header">
                <button className="back-button" onClick={() => navigate('/profile')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1>My Addresses</h1>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            {/* Add New Address Button */}
            <div className="add-address-container">
                <button
                    className="add-address-btn"
                    onClick={() => navigate('/addresses/new')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add New Address
                </button>
            </div>

            {/* Addresses List */}
            {addresses.length === 0 ? (
                <div className="empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <path d="M9 22V12h6v10" />
                    </svg>
                    <h2>No Addresses Saved</h2>
                    <p>Add your delivery address to start shopping</p>
                    <button
                        className="empty-state-btn"
                        onClick={() => navigate('/addresses/new')}
                    >
                        Add Your First Address
                    </button>
                </div>
            ) : (
                <div className="addresses-list">
                    {addresses.map((address) => (
                        <div key={address._id} className="address-card">
                            {/* Default Badge */}
                            {address.isDefault && (
                                <div className="default-badge">Default</div>
                            )}

                            {/* Address Type */}
                            <div className="address-type-badge">
                                {address.addressType}
                            </div>

                            {/* Address Details */}
                            <div className="address-details">
                                <h3>{address.name}</h3>
                                <p className="address-street">{address.street}</p>
                                {address.landmark && (
                                    <p className="address-landmark">Near: {address.landmark}</p>
                                )}
                                <p className="address-city">
                                    {address.city}, {address.state} - {address.pincode}
                                </p>
                                <p className="address-phone">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    +91 {address.phone}
                                </p>
                            </div>

                            {/* Address Actions */}
                            <div className="address-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => navigate(`/addresses/edit/${address._id}`)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                </button>

                                {!address.isDefault && (
                                    <button
                                        className="action-btn default-btn"
                                        onClick={() => handleSetDefault(address._id)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        Set Default
                                    </button>
                                )}

                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(address._id)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Addresses;
