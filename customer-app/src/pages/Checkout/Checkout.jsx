import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import api from '../../utils/api';
import './Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { cart, cartTotal, clearCart } = useCart();

    const passedAddressId = location.state?.addressId || null;

    const [address, setAddress] = useState({
        fullAddress: '',
        city: '',
        district: '',
        pincode: '',
        latitude: null,
        longitude: null
    });

    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-fill address from passed addressId
    useEffect(() => {
        if (passedAddressId) {
            api.get('/addresses').then(res => {
                if (res.data.success) {
                    const found = res.data.data.find(a => a._id === passedAddressId);
                    if (found) {
                        setAddress({
                            fullAddress: `${found.street}${found.landmark ? ', ' + found.landmark : ''}`,
                            city: found.city,
                            district: found.state,
                            pincode: found.pincode,
                            latitude: found.latitude || null,
                            longitude: found.longitude || null
                        });
                        if (found.phone) setPhone(found.phone);
                    }
                }
            }).catch(() => { });
        }
    }, [passedAddressId]);

    const deliveryFee = 0; // Free delivery — admin can configure this
    const total = cartTotal + deliveryFee;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!address.fullAddress || !phone) {
            setError('Please fill in all required fields');
            return;
        }

        if (cart.length === 0) {
            setError('Your cart is empty');
            return;
        }

        try {
            setLoading(true);

            const orderData = {
                items: cart.map(item => ({
                    product: item.product._id,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color
                })),
                shippingAddress: address,
                contactInfo: {
                    phone,
                    email
                },
                deliveryFee
            };

            const response = await api.post('/orders', orderData);

            if (response.data.success) {
                await clearCart();
                navigate(`/order-success/${response.data.data.orderId}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-page">
            <h1 className="page-title">Checkout</h1>

            <form onSubmit={handleSubmit} className="checkout-form">
                {error && <div className="error-message">{error}</div>}

                {/* Shipping Address */}
                <div className="form-section">
                    <h2 className="section-title">Shipping Address</h2>

                    <div className="form-group">
                        <label>Address *</label>
                        <textarea
                            className="input"
                            rows="3"
                            value={address.fullAddress}
                            onChange={(e) => setAddress({ ...address, fullAddress: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                className="input"
                                value={address.city}
                                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>District</label>
                            <input
                                type="text"
                                className="input"
                                value={address.district}
                                onChange={(e) => setAddress({ ...address, district: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Pincode</label>
                        <input
                            type="text"
                            className="input"
                            value={address.pincode}
                            onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                            maxLength="6"
                        />
                    </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                    <h2 className="section-title">Contact Information</h2>

                    <div className="form-group">
                        <label>Phone *</label>
                        <input
                            type="tel"
                            className="input"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {/* Order Summary */}
                <div className="form-section">
                    <h2 className="section-title">Order Summary</h2>

                    <div className="summary-row">
                        <span>Items ({cart.length})</span>
                        <span>₹{cartTotal.toFixed(2)}</span>
                    </div>

                    <div className="summary-row">
                        <span>Delivery Fee</span>
                        <span>₹{deliveryFee.toFixed(2)}</span>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="summary-row summary-total">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>

                    <div className="payment-method">
                        <label>Payment Method</label>
                        <div className="payment-option">💵 Cash on Delivery</div>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                    {loading ? 'Placing Order...' : 'Place Order'}
                </button>
            </form>
        </div>
    );
};

export default Checkout;
