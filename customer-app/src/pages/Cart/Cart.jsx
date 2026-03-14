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
    const [showInlineForm, setShowInlineForm] = useState(false);
    const [savingAddr, setSavingAddr] = useState(false);
    const [editingAddrId, setEditingAddrId] = useState(null);
    const [newAddr, setNewAddr] = useState({
        name: '', phone: '', street: '', landmark: '', city: '', state: '', pincode: '', addressType: 'Home'
    });

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

    const handleNewAddrChange = (e) => {
        const { name, value } = e.target;
        setNewAddr(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoDetect = () => {
        if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await api.get(`/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
                    if (res.data.success && res.data.data) {
                        const d = res.data.data;
                        setNewAddr(prev => ({
                            ...prev,
                            city: d.city || prev.city,
                            state: d.state || prev.state,
                            pincode: d.pincode || prev.pincode,
                            street: d.address || prev.street
                        }));
                    }
                } catch { /* ignore */ }
            },
            () => alert('Unable to detect location')
        );
    };

    const handleSaveAddr = async () => {
        if (!newAddr.name || !newAddr.phone || !newAddr.street || !newAddr.city || !newAddr.state || !newAddr.pincode) {
            alert('Please fill all required fields');
            return;
        }
        try {
            setSavingAddr(true);
            let res;
            if (editingAddrId) {
                res = await api.put(`/addresses/${editingAddrId}`, newAddr);
            } else {
                res = await api.post('/addresses', newAddr);
            }
            if (res.data.success) {
                await fetchAddresses();
                setShowInlineForm(false);
                setEditingAddrId(null);
                setNewAddr({ name: '', phone: '', street: '', landmark: '', city: '', state: '', pincode: '', addressType: 'Home' });
                // auto-select the newly added/edited address
                const refreshed = await api.get('/addresses');
                if (refreshed.data.success) {
                    const list = refreshed.data.data || [];
                    setAddresses(list);
                    if (!editingAddrId) {
                        setSelectedAddress(list[list.length - 1] || null);
                    } else {
                        setSelectedAddress(list.find(a => a._id === editingAddrId) || list[0] || null);
                    }
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save address');
        } finally {
            setSavingAddr(false);
        }
    };

    const handleEditClick = (e, addr) => {
        e.stopPropagation();
        setNewAddr(addr);
        setEditingAddrId(addr._id);
        setShowInlineForm(true);
    };

    const handleAddNewClick = () => {
        setNewAddr({ name: '', phone: '', street: '', landmark: '', city: '', state: '', pincode: '', addressType: 'Home' });
        setEditingAddrId(null);
        setShowInlineForm(true);
    };

    const inlineInputStyle = {
        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
        fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none'
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
                            <div className="addr-edit" onClick={(e) => {
                                setShowAddressPicker(true);
                                handleEditClick(e, selectedAddress);
                            }}>✏️</div>
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
                                <p className="no-addr-text">No saved addresses. Tap the button below to add one.</p>
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
                                ))
                            )}

                            {/* Add Address Button - inside scrollable area */}
                            <button
                                className="add-addr-btn"
                                onClick={handleAddNewClick}
                                style={{ margin: '8px 0 0', width: '100%' }}
                            >
                                ➕ Add New Address
                            </button>

                            {/* Inline Address Form */}
                            {showInlineForm && (
                                <div className="inline-addr-form">
                                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{editingAddrId ? 'Edit Address' : 'New Address'}</h4>
                                    <button
                                        type="button"
                                        className="auto-detect-btn"
                                        onClick={handleAutoDetect}
                                        style={{ width: '100%', padding: 10, marginBottom: 10, background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 8, color: '#4f46e5', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                                    >
                                        📍 Auto-detect Location (optional)
                                    </button>
                                    <input name="name" value={newAddr.name} onChange={handleNewAddrChange} placeholder="Full Name *" style={inlineInputStyle} />
                                    <input name="phone" value={newAddr.phone} onChange={handleNewAddrChange} placeholder="Phone (10 digits) *" maxLength={10} style={inlineInputStyle} />
                                    <input name="street" value={newAddr.street} onChange={handleNewAddrChange} placeholder="Street Address *" style={inlineInputStyle} />
                                    <input name="landmark" value={newAddr.landmark || ''} onChange={handleNewAddrChange} placeholder="Landmark (optional)" style={inlineInputStyle} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input name="city" value={newAddr.city} onChange={handleNewAddrChange} placeholder="City *" style={{ ...inlineInputStyle, flex: 1 }} />
                                        <input name="state" value={newAddr.state} onChange={handleNewAddrChange} placeholder="State *" style={{ ...inlineInputStyle, flex: 1 }} />
                                    </div>
                                    <input name="pincode" value={newAddr.pincode} onChange={handleNewAddrChange} placeholder="Pincode *" maxLength={6} style={inlineInputStyle} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['Home', 'Work', 'Other'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setNewAddr(prev => ({ ...prev, addressType: t }))}
                                                style={{ flex: 1, padding: '8px 0', border: newAddr.addressType === t ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: 8, background: newAddr.addressType === t ? '#eef2ff' : '#fff', color: newAddr.addressType === t ? '#4f46e5' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                            >{t}</button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                        <button
                                            type="button"
                                            onClick={() => { setShowInlineForm(false); setEditingAddrId(null); }}
                                            style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                                        >Cancel</button>
                                        <button
                                            type="button"
                                            onClick={handleSaveAddr}
                                            disabled={savingAddr}
                                            style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: savingAddr ? 0.6 : 1 }}
                                        >{savingAddr ? 'Saving...' : 'Save Address'}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
