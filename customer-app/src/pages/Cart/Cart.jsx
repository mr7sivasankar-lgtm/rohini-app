import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import api, { getImageUrl } from '../../utils/api';
import './Cart.css';

const Cart = () => {
    const navigate = useNavigate();
    const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();

    const [updating, setUpdating] = useState(null);

    const [adminConfig, setAdminConfig] = useState(null);

    let platformFee = adminConfig ? adminConfig.platformFee : 0;
    const total = cartTotal + platformFee;

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
            if (res.data.success) {
                setAdminConfig(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch admin config', err);
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
        return p.sellingPrice || 0;
    };

    const handleCheckout = () => {
        navigate('/checkout');
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
                                {item.product?.seller && (
                                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px', fontWeight: '500' }}>
                                        Sold by: {item.product.seller.shopName}
                                    </p>
                                )}
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
                    <div className="summary-row">
                        <span>Delivery Fee</span>
                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Calculated at checkout</span>
                    </div>
                    <div className="summary-row">
                        <span>Platform Fee</span>
                        <span>₹{platformFee.toFixed(0)}</span>
                    </div>
                    <div className="summary-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '12px 0 8px 0', width: '100%' }} />
                    <div className="summary-row summary-total-row">
                        <span>Total</span>
                        <span>₹{total.toFixed(0)}</span>
                    </div>
                </div>
                <button className="checkout-btn" onClick={handleCheckout}>
                    Checkout →
                </button>
            </div>


        </div>
    );
};

export default Cart;
