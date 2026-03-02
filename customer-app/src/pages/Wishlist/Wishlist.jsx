import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { IMAGE_BASE } from '../../utils/api';
import './Wishlist.css';

const Wishlist = () => {
    const navigate = useNavigate();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const response = await api.get('/wishlist');
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (productId) => {
        await toggleWishlist(productId);
        setProducts(prev => prev.filter(p => p._id !== productId));
    };

    const getPrice = (product) => {
        if (product.discount > 0) return product.price * (1 - product.discount / 100);
        return product.price;
    };

    return (
        <div className="wishlist-page">
            {/* Header */}
            <div className="wishlist-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1>My Wishlist</h1>
                <div className="spacer"></div>
            </div>

            <div className="wishlist-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading wishlist...</p>
                    </div>
                ) : products.length > 0 ? (
                    <>
                        <p className="wishlist-count">{products.length} item{products.length !== 1 ? 's' : ''} in your wishlist</p>
                        <div className="wishlist-grid">
                            {products.map((product) => (
                                <div key={product._id} className="wishlist-card" onClick={() => navigate(`/product/${product._id}`)}>
                                    <div className="wishlist-img-wrap">
                                        {product.images && product.images.length > 0 ? (
                                            <img
                                                src={`${IMAGE_BASE}${product.images[0]}`}
                                                alt={product.name}
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/200x250/f3f4f6/9ca3af?text=No+Image';
                                                }}
                                            />
                                        ) : (
                                            <div className="placeholder-image">No Image</div>
                                        )}
                                        {product.discount > 0 && (
                                            <span className="discount-badge">{product.discount}% OFF</span>
                                        )}
                                        <button
                                            className="wishlist-heart active"
                                            onClick={(e) => { e.stopPropagation(); handleRemove(product._id); }}
                                            aria-label="Remove from wishlist"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="wishlist-info">
                                        <h3 className="wishlist-name">{product.name}</h3>
                                        <div className="wishlist-price-row">
                                            <span className="wishlist-price">₹{getPrice(product).toFixed(0)}</span>
                                            {product.discount > 0 && (
                                                <span className="wishlist-original">₹{product.price.toFixed(0)}</span>
                                            )}
                                        </div>
                                        {product.stock > 0 ? (
                                            <span className="stock-tag in-stock">In Stock</span>
                                        ) : (
                                            <span className="stock-tag out-stock">Out of Stock</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-heart">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3>Your wishlist is empty</h3>
                        <p>Tap the heart icon on products to save them here</p>
                        <button className="btn btn-primary" onClick={() => navigate('/home')}>
                            Browse Products
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
