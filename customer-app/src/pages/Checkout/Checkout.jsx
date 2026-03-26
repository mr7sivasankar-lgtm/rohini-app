import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import api, { getImageUrl } from '../../utils/api';
import './Checkout.css';

// Inject Razorpay checkout script once
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) return resolve(true);
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { cart, cartTotal, clearCart } = useCart();

    const passedAddressId = location.state?.addressId || null;

    const [address, setAddress] = useState({
        fullName: user?.name || '',
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
    const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'Online'
    const [adminConfig, setAdminConfig] = useState(null);

    // Auto-fill address from passed addressId and fetch config
    useEffect(() => {
        api.get('/config').then(res => {
            if (res.data.success) setAdminConfig(res.data.data);
        }).catch(() => {});

        if (passedAddressId) {
            api.get('/addresses').then(res => {
                if (res.data.success) {
                    const found = res.data.data.find(a => a._id === passedAddressId);
                    if (found) {
                        setAddress({
                            fullName: found.name || user?.name || '',
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

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let deliveryFee = 0;
    let platformFee = adminConfig ? adminConfig.platformFee : 0;
    let discount = 0;

    if (adminConfig && address.latitude && cart.length > 0) {
        let dist = 0;
        const sellerCoords = cart[0].product?.seller?.location?.coordinates;
        // seller coordinates are [lng, lat]
        if (address.latitude && address.longitude && sellerCoords?.length === 2) {
            dist = calculateDistance(address.latitude, address.longitude, sellerCoords[1], sellerCoords[0]);
        }
        const extraKm = Math.max(0, dist - adminConfig.baseDeliveryDistance);
        deliveryFee = adminConfig.baseDeliveryCharge + Math.ceil(extraKm) * adminConfig.deliveryChargePerKm;
    }

    const totalMrp = cart.reduce((sum, item) => sum + ((item.product.mrp || item.product.price || item.product.sellingPrice || 0) * item.quantity), 0);
    const totalDiscount = totalMrp > cartTotal ? totalMrp - cartTotal : 0;
    const total = cartTotal + deliveryFee + platformFee - discount;

    const buildOrderPayload = () => ({
        items: cart.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            size: item.size,
            color: item.color
        })),
        shippingAddress: address,
        contactInfo: { phone, email },
        deliveryFee,
        platformFee,
        discount
    });

    // ── COD Flow ───────────────────────────────────────────────────────────────
    const handleCOD = async () => {
        try {
            setLoading(true);
            const response = await api.post('/orders', buildOrderPayload());
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

    // ── Online (Razorpay) Flow ─────────────────────────────────────────────────
    const handleOnlinePayment = async () => {
        try {
            setLoading(true);
            setError('');

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                setError('Failed to load payment gateway. Please check your connection.');
                setLoading(false);
                return;
            }

            // Step 1 — create Razorpay order on backend
            const payload = buildOrderPayload();
            const createRes = await api.post('/payment/create-order', payload);
            if (!createRes.data.success) throw new Error(createRes.data.message);

            const { razorpayOrderId, amount, currency, keyId } = createRes.data.data;

            // Step 2 — open Razorpay checkout modal
            await new Promise((resolve, reject) => {
                const options = {
                    key: keyId,
                    amount: Math.round(amount * 100),
                    currency,
                    name: 'Rohini',
                    description: 'Order Payment',
                    order_id: razorpayOrderId,
                    prefill: {
                        name: address.fullName || user?.name || '',
                        email: email || user?.email || '',
                        contact: phone || user?.phone || ''
                    },
                    theme: { color: '#f97316' },
                    handler: async (response) => {
                        try {
                            // Step 3 — verify payment + create DB order
                            const verifyRes = await api.post('/payment/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                                ...payload
                            });

                            if (verifyRes.data.success) {
                                await clearCart();
                                navigate(`/order-success/${verifyRes.data.data.orderId}`);
                                resolve();
                            } else {
                                reject(new Error(verifyRes.data.message || 'Payment verification failed'));
                            }
                        } catch (err) {
                            reject(err);
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            reject(new Error('DISMISSED'));
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (response) => {
                    reject(new Error(response.error?.description || 'Payment failed'));
                });
                rzp.open();
            });

        } catch (err) {
            if (err.message !== 'DISMISSED') {
                setError(err.response?.data?.message || err.message || 'Payment failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!address.fullName || !address.fullAddress || !phone) {
            setError('Please fill in all required fields including Full Name');
            return;
        }
        if (cart.length === 0) {
            setError('Your cart is empty');
            return;
        }

        if (paymentMethod === 'COD') {
            await handleCOD();
        } else {
            await handleOnlinePayment();
        }
    };

    return (
        <div className="checkout-page">
            <div className="checkout-header">
                <button className="back-btn" onClick={() => navigate('/cart')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className="page-title">Checkout</h1>
            </div>

            <form onSubmit={handleSubmit} className="checkout-form">
                {error && <div className="error-message">{error}</div>}

                {/* Shipping Address */}
                <div className="form-section">
                    <div className="section-header">
                        <h2 className="section-title">Shipping Address</h2>
                    </div>
                    <div className="display-card">
                        <p className="display-name">{address.fullName || 'No Name Provided'}</p>
                        <p className="display-text">{address.fullAddress || 'No Address Provided'}</p>
                        <p className="display-text">
                            {[address.city, address.district].filter(Boolean).join(', ')}
                            {address.pincode ? ` - ${address.pincode}` : ''}
                        </p>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                    <div className="section-header">
                        <h2 className="section-title">Contact Information</h2>
                    </div>
                    <div className="display-card">
                        <p className="display-text"><span className="display-label">Phone:</span> {phone || 'Not provided'}</p>
                        {email && <p className="display-text"><span className="display-label">Email:</span> {email}</p>}
                    </div>
                </div>

                {/* Order Summary */}
                <div className="form-section">
                    <h2 className="section-title">Order Summary</h2>
                    
                    <div className="checkout-items-list">
                        {cart.map((item, idx) => (
                            <div key={idx} className="checkout-item">
                                <div className="checkout-item-image">
                                    <img src={getImageUrl(item.product.images?.[0]) || 'https://via.placeholder.com/60'} alt={item.product.name} />
                                    <span className="checkout-item-qty">{item.quantity}</span>
                                </div>
                                <div className="checkout-item-details">
                                    <h4 className="checkout-item-name">{item.product.name}</h4>
                                    <div className="checkout-item-variants">
                                        {item.size && <span>Size: {item.size}</span>}
                                        {item.color && <span>Color: {item.color}</span>}
                                    </div>
                                </div>
                                <div className="checkout-item-price">
                                    ₹{((item.product.sellingPrice || item.product.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="billing-details">
                        <h3 className="billing-title">Price Details ({cart.length} {cart.length === 1 ? 'Item' : 'Items'})</h3>
                        <div className="summary-row">
                            <span>Total MRP</span>
                            <span>₹{totalMrp.toFixed(2)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="summary-row text-success">
                                <span>Discount on MRP</span>
                                <span>-₹{totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="summary-row">
                            <span>Delivery Fee</span>
                            <span className={deliveryFee === 0 ? 'text-success' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
                        </div>
                        <div className="summary-row">
                            <span>Platform Fee</span>
                            <span>₹{platformFee.toFixed(2)}</span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-row summary-total">
                            <span>Total Amount</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="savings-badge">
                                You will save ₹{totalDiscount.toFixed(2)} on this order
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Method */}
                <div className="form-section">
                    <h2 className="section-title">Payment Method</h2>
                    <div className="payment-options-grid">

                        {/* COD option */}
                        <div
                            className={`payment-card ${paymentMethod === 'COD' ? 'payment-card--active' : ''}`}
                            onClick={() => setPaymentMethod('COD')}
                        >
                            <div className="payment-card__radio">
                                <div className={`radio-dot ${paymentMethod === 'COD' ? 'radio-dot--active' : ''}`} />
                            </div>
                            <div className="payment-card__icon">💵</div>
                            <div className="payment-card__info">
                                <div className="payment-card__title">Cash on Delivery</div>
                                <div className="payment-card__sub">Pay when your order arrives</div>
                            </div>
                        </div>

                        {/* Online / Razorpay option */}
                        <div
                            className={`payment-card ${paymentMethod === 'Online' ? 'payment-card--active' : ''}`}
                            onClick={() => setPaymentMethod('Online')}
                        >
                            <div className="payment-card__radio">
                                <div className={`radio-dot ${paymentMethod === 'Online' ? 'radio-dot--active' : ''}`} />
                            </div>
                            <div className="payment-card__icon">💳</div>
                            <div className="payment-card__info">
                                <div className="payment-card__title">Pay Online</div>
                                <div className="payment-card__sub">UPI · Cards · Netbanking</div>
                            </div>
                            {paymentMethod === 'Online' && (
                                <div className="payment-card__badge">Razorpay</div>
                            )}
                        </div>

                    </div>
                </div>

                <button type="submit" className="btn-submit-order" disabled={loading}>
                    {loading
                        ? (paymentMethod === 'Online' ? 'Preparing Payment…' : 'Placing Order…')
                        : (paymentMethod === 'Online' ? `Pay ₹${total.toFixed(2)} Online` : 'Place Order (COD)')
                    }
                </button>
            </form>
        </div>
    );
};

export default Checkout;
