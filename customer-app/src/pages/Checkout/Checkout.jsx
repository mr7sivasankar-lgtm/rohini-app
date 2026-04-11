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

    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [addrLoading, setAddrLoading] = useState(true);

    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'Online'
    const [adminConfig, setAdminConfig] = useState(null);

    // === Promo Code State ===
    const [promoEligible, setPromoEligible] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(false);
    const [promoMessage, setPromoMessage] = useState('');

    useEffect(() => {
        fetchConfig();
        fetchAddresses();
        fetchPromoEligibility();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
            if (res.data.success) setAdminConfig(res.data.data);
        } catch (err) {}
    };

    const fetchPromoEligibility = async () => {
        try {
            const res = await api.get('/orders/check-promo-eligibility');
            if (res.data.success && res.data.eligible) {
                setPromoEligible(true);
                setPromoCode(res.data.promoCode);
                setPromoMessage(res.data.message);
            }
        } catch (err) {
            // silently fail — promo is optional
        }
    };

    const fetchAddresses = async () => {
        try {
            setAddrLoading(true);
            const res = await api.get('/addresses');
            if (res.data.success) {
                const list = res.data.data || [];
                setAddresses(list);
                const def = list.find(a => a.isDefault) || list[0] || null;
                setSelectedAddress(def);
            }
        } catch (err) {
        } finally {
            setAddrLoading(false);
        }
    };

    const handleEditClick = (e, addr) => {
        e.stopPropagation();
        navigate(`/addresses/edit/${addr._id}`);
    };



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

    if (adminConfig && cart.length > 0) {
        let dist = 5; // Default to 5km if coordinates missing
        const sellerCoords = cart[0].product?.seller?.location?.coordinates;
        
        if (selectedAddress?.latitude && selectedAddress?.longitude && sellerCoords?.length === 2) {
            dist = calculateDistance(
                selectedAddress.latitude, 
                selectedAddress.longitude, 
                sellerCoords[1], 
                sellerCoords[0]
            );
        }
        
        const extraKm = Math.max(0, dist - (adminConfig.baseDeliveryDistance ?? 2));
        deliveryFee = (adminConfig.baseDeliveryCharge ?? 20) + Math.ceil(extraKm) * (adminConfig.deliveryChargePerKm ?? 5);
    }

    // Promo: waive delivery fee for customer if applied
    const originalDeliveryFee = deliveryFee;
    if (promoApplied) deliveryFee = 0;

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
        shippingAddress: {
            fullName: selectedAddress?.name || user?.name || '',
            fullAddress: `${selectedAddress?.street || ''}${selectedAddress?.landmark ? ', ' + selectedAddress.landmark : ''}`,
            city: selectedAddress?.city || '',
            district: selectedAddress?.state || '',
            pincode: selectedAddress?.pincode || '',
            latitude: selectedAddress?.latitude || null,
            longitude: selectedAddress?.longitude || null
        },
        contactInfo: { phone: selectedAddress?.phone || user?.phone || '', email: email || user?.email || '' },
        deliveryFee,
        platformFee,
        discount,
        promoCode: promoApplied ? promoCode : ''
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
                        name: selectedAddress?.name || user?.name || '',
                        email: email || user?.email || '',
                        contact: selectedAddress?.phone || user?.phone || ''
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

        if (!selectedAddress) {
            setError('Please select a shipping address');
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
                    
                    <div className="address-card" onClick={() => setShowAddressPicker(true)}>
                        {addrLoading ? (
                            <p className="addr-loading">Loading address…</p>
                        ) : selectedAddress ? (
                            <div className="addr-content">
                                <div className="addr-icon">📍</div>
                                <div className="addr-text">
                                    <p className="addr-name">{selectedAddress.name} <span className="addr-type-badge">{selectedAddress.addressType}</span></p>
                                    <p className="addr-line">{selectedAddress.street}{selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ''}</p>
                                    <p className="addr-line">{selectedAddress.city}, {selectedAddress.state} – {selectedAddress.pincode}</p>
                                    <p className="addr-line" style={{ marginTop: '4px', fontWeight: 600 }}>📞 {selectedAddress.phone}</p>
                                </div>
                                <div className="addr-edit" onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddressPicker(true);
                                    handleEditClick(e, selectedAddress);
                                }}>✏️</div>
                            </div>
                        ) : (
                            <div className="addr-add">
                                <span>➕ Select or Add Delivery Address</span>
                            </div>
                        )}
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

                        {/* === Welcome Promo Banner === */}
                        {promoEligible && (
                            <div style={{
                                background: promoApplied
                                    ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                                    : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                                border: `1.5px solid ${promoApplied ? '#86efac' : '#fde68a'}`,
                                borderRadius: '14px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                    <span style={{ fontSize: '22px' }}>{promoApplied ? '✅' : '🎁'}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '13px', color: promoApplied ? '#15803d' : '#92400e' }}>
                                            {promoApplied ? 'FREE Delivery Applied!' : `Use code: ${promoCode}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: promoApplied ? '#16a34a' : '#b45309', marginTop: '2px' }}>
                                            {promoApplied
                                                ? `You saved ₹${originalDeliveryFee.toFixed(0)} on delivery 🎉`
                                                : promoMessage || 'Get FREE delivery on your first order!'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPromoApplied(p => !p)}
                                    style={{
                                        background: promoApplied ? '#fee2e2' : '#f97316',
                                        color: promoApplied ? '#dc2626' : 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '7px 14px',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                    }}
                                >
                                    {promoApplied ? 'Remove' : 'Apply'}
                                </button>
                            </div>
                        )}

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {promoApplied && originalDeliveryFee > 0 && (
                                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '13px' }}>
                                        ₹{originalDeliveryFee.toFixed(0)}
                                    </span>
                                )}
                                <span className={deliveryFee === 0 ? 'text-success' : ''}>
                                    {deliveryFee === 0 ? 'FREE 🎁' : `₹${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
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
                        {(totalDiscount > 0 || promoApplied) && (
                            <div className="savings-badge">
                                You will save ₹{(totalDiscount + (promoApplied ? originalDeliveryFee : 0)).toFixed(2)} on this order
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

            {/* Address Picker Modal */}
            {showAddressPicker && (
                <div className="modal-overlay" onClick={() => setShowAddressPicker(false)}>
                    <div className="addr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="addr-modal-header">
                            <h3>Select Address</h3>
                            <button type="button" className="modal-close" onClick={() => setShowAddressPicker(false)}>✕</button>
                        </div>
                        <div className="addr-modal-list">
                            {addresses.length === 0 ? (
                                <p className="no-addr-text">No saved addresses. Tap the button below to add one.</p>
                            ) : (
                                addresses.map((addr) => (
                                    <div key={addr._id}>
                                        <div
                                            className={`addr-option ${selectedAddress?._id === addr._id ? 'selected' : ''}`}
                                            onClick={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
                                        >
                                            <div className="addr-radio">
                                                <div className={`radio-dot ${selectedAddress?._id === addr._id ? 'active' : ''}`} />
                                            </div>
                                            <div className="addr-option-text" style={{ flex: 1 }}>
                                                <p className="addr-option-name">
                                                    {addr.name}
                                                    <span className="addr-type-badge">{addr.addressType}</span>
                                                    {addr.isDefault && <span className="default-badge">Default</span>}
                                                </p>
                                                <p className="addr-option-line">{addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                                                <p className="addr-option-line">{addr.city}, {addr.state} – {addr.pincode}</p>
                                            </div>
                                            <div 
                                                className="addr-edit" 
                                                onClick={(e) => handleEditClick(e, addr)}
                                                style={{ padding: '8px', cursor: 'pointer', fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center' }}
                                            >
                                                ✏️
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Add Address Button */}
                            <button
                                type="button"
                                className="add-addr-btn"
                                onClick={() => navigate('/addresses/new')}
                                style={{ margin: '8px 0 0', width: '100%' }}
                            >
                                ➕ Add New Address
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Checkout;
