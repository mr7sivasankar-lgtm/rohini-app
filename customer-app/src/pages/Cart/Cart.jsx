import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import api, { getImageUrl } from '../../utils/api';
import './Cart.css';

const Cart = () => {
    const navigate = useNavigate();
    const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();

    const [updating, setUpdating] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [addrLoading, setAddrLoading] = useState(true);

    const deliveryFee = 0; // Free delivery — admin can configure this
    const total = cartTotal + deliveryFee;

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setAddrLoading(true);
            const res = await api.get('/addresses');
            if (res.data.success) {
                const list = res.data.data || [];
                setAddresses(list);
                // Auto-select default or first address
                const def = list.find(a => a.isDefault) || list[0] || null;
                setSelectedAddress(def);
            }
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setAddrLoading(false);
        }
    };

    const handleQuantityChange = async (itemId, newQty) => {
        if (newQty < 1) return;
        try {
            setUpdating(itemId);
            await updateQuantity(itemId, newQty);
        } catch {
            alert('Failed to update quantity');
        } finally {
            setUpdating(null);
        }
    };

    const handleRemove = async (itemId) => {
        if (window.confirm('Remove this item from cart?')) {
            await removeFromCart(itemId);
        }
    };

    const getItemPrice = (item) => {
        const p = item.product;
        if (!p) return 0;
        return p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
    };

    const handleCheckout = () => {
        if (!selectedAddress) {
            alert('Please select a delivery address to continue.');
            return;
        }
        navigate('/checkout', { state: { addressId: selectedAddress._id } });
    };

    if (cart.length === 0) {
        return (
            <div className="cart-empty">
                <div className="cart-empty-icon">🛒</div>
                <h2>Your cart is empty</h2>
                <p>Add some amazing products to get started!</p>
                <button className="btn btn-primary" onClick={() => navigate('/home')}>
                    Continue Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page">
            {/* Header */}
            <div className="cart-header">
                <h1 className="cart-title">Cart <span className="cart-count">{cart.length}</span></h1>
            </div>

            {/* Shipping Address */}
            <div className="cart-section">
                <div className="section-label">Shipping Address</div>
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
                                <p className="addr-line">📞 {selectedAddress.phone}</p>
                            </div>
                            <div className="addr-edit">✏️</div>
                        </div>
                    ) : (
                        <div className="addr-add">
                            <span>➕ Add Delivery Address</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Items */}
            <div className="cart-section">
                <div className="section-label">Your Items</div>
                <div className="cart-items-list">
                    {cart.map((item) => (
                        <div key={item._id} className="cart-item-card">
                            <div className="cart-item-img-wrap">
                                <img
                                    src={getImageUrl(item.product?.images?.[0])}
                                    alt={item.product?.name}
                                    className="cart-item-img"
                                    onError={(e) => e.target.src = 'https://via.placeholder.com/90x90?text=Img'}
                                />
                            </div>
                            <div className="cart-item-body">
                                <div className="cart-item-top">
                                    <p className="cart-item-name">{item.product?.name}</p>
                                    <button className="cart-delete-btn" onClick={() => handleRemove(item._id)}>🗑</button>
                                </div>
                                <div className="cart-item-variants">
                                    {item.color && <span className="variant-chip">{item.color}</span>}
                                    {item.size && <span className="variant-chip">Size {item.size}</span>}
                                </div>
                                <div className="cart-item-bottom">
                                    <p className="cart-item-price">₹{(getItemPrice(item) * item.quantity).toFixed(0)}</p>
                                    <div className="qty-row">
                                        <button
                                            className="qty-btn"
                                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                            disabled={updating === item._id || item.quantity <= 1}
                                        >−</button>
                                        <span className="qty-num">{item.quantity}</span>
                                        <button
                                            className="qty-btn"
                                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                            disabled={updating === item._id || item.quantity >= item.product?.stock}
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky Order Summary */}
            <div className="order-summary-bar">
                <div className="summary-rows">
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>₹{cartTotal.toFixed(0)}</span>
                    </div>
                    {deliveryFee > 0 && (
                        <div className="summary-row">
                            <span>Delivery</span>
                            <span>₹{deliveryFee}</span>
                        </div>
                    )}
                    {deliveryFee === 0 && (
                        <div className="summary-row">
                            <span>Delivery</span>
                            <span style={{ color: '#2f9e44', fontWeight: 700 }}>FREE 🎉</span>
                        </div>
                    )}
                    <div className="summary-divider" />
                    <div className="summary-row summary-total-row">
                        <span>Total</span>
                        <span>₹{total.toFixed(0)}</span>
                    </div>
                </div>
                <button className="checkout-btn" onClick={handleCheckout}>
                    Checkout →
                </button>
            </div>

            {/* Address Picker Modal */}
            {showAddressPicker && (
                <div className="modal-overlay" onClick={() => setShowAddressPicker(false)}>
                    <div className="addr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="addr-modal-header">
                            <h3>Select Address</h3>
                            <button className="modal-close" onClick={() => setShowAddressPicker(false)}>✕</button>
                        </div>
                        <div className="addr-modal-list">
                            {addresses.length === 0 ? (
                                <p className="no-addr-text">No saved addresses. Go to Profile → Addresses to add one.</p>
                            ) : (
                                addresses.map((addr) => (
                                    <div
                                        key={addr._id}
                                        className={`addr-option ${selectedAddress?._id === addr._id ? 'selected' : ''}`}
                                        onClick={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
                                    >
                                        <div className="addr-radio">
                                            <div className={`radio-dot ${selectedAddress?._id === addr._id ? 'active' : ''}`} />
                                        </div>
                                        <div className="addr-option-text">
                                            <p className="addr-option-name">
                                                {addr.name}
                                                <span className="addr-type-badge">{addr.addressType}</span>
                                                {addr.isDefault && <span className="default-badge">Default</span>}
                                            </p>
                                            <p className="addr-option-line">{addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                                            <p className="addr-option-line">{addr.city}, {addr.state} – {addr.pincode}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            className="add-addr-btn"
                            onClick={() => { setShowAddressPicker(false); navigate('/addresses'); }}
                        >
                            ➕ Add New Address
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
