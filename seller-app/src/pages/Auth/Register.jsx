import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        ownerName: '',
        phone: '',
        password: '',
        shopName: '',
        shopAddress: '',
        gstin: '',
        location: { type: 'Point', coordinates: [0, 0] }
    });
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await register(formData);
        
        if (result.success) {
            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } else {
            setError(result.message || 'Registration failed. Please try again.');
        }
        setIsLoading(false);
    };

    // Auto-detect a random nearby coordinate for demonstration (in a real app, use map picker)
    const handleAutoLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        location: {
                            type: 'Point',
                            coordinates: [position.coords.longitude, position.coords.latitude]
                        }
                    }));
                    alert("Location captured successfully!");
                },
                (error) => {
                    alert("Error capturing location. Please allow location access.");
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
        }
    };

    if (isSuccess) {
        return (
            <div className="auth-container">
                <div className="auth-card success-card">
                    <div className="success-icon">✅</div>
                    <h2>Registration Successful!</h2>
                    <p>Your shop registration has been submitted and is pending admin approval.</p>
                    <p>You can login to check your status later.</p>
                    <button className="btn-primary" onClick={() => navigate('/login')}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card register-card">
                <div className="auth-brand">
                    <span className="brand-icon">🚀</span>
                    <h2>Register Your Shop</h2>
                    <p>Join our marketplace as a seller</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form two-col-form">
                    <div className="form-group">
                        <label>Owner Name</label>
                        <input
                            type="text"
                            name="ownerName"
                            placeholder="John Doe"
                            value={formData.ownerName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="+919999999999"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Shop Name</label>
                        <input
                            type="text"
                            name="shopName"
                            placeholder="Awesome Fashion Shop"
                            value={formData.shopName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>GSTIN (Optional)</label>
                        <input
                            type="text"
                            name="gstin"
                            placeholder="e.g. 29XXXXX1234X1Z5"
                            value={formData.gstin}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group full-width">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group full-width">
                        <label>Shop Address</label>
                        <textarea
                            name="shopAddress"
                            placeholder="Complete physical address of your shop"
                            value={formData.shopAddress}
                            onChange={handleChange}
                            rows={3}
                            required
                        />
                    </div>
                    <div className="form-group full-width">
                        <button type="button" className="btn-secondary" onClick={handleAutoLocation}>
                            📍 Auto-detect Shop Coordinates
                        </button>
                        {formData.location.coordinates[0] !== 0 && (
                            <span className="location-success-text">Location saved: {formData.location.coordinates[1].toFixed(4)}, {formData.location.coordinates[0].toFixed(4)}</span>
                        )}
                    </div>
                    
                    <button type="submit" className="btn-primary full-width" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Submit Registration'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Sign in here</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
