import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { getImageUrl } from '../../utils/api';
import './ShopProfile.css';

const ShopProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShopDetails();
    }, [id]);

    const fetchShopDetails = async () => {
        try {
            setLoading(true);
            const [shopRes, productsRes] = await Promise.all([
                api.get(`/sellers/${id}`),
                api.get(`/products?sellerId=${id}`)
            ]);

            if (shopRes.data.success) setShop(shopRes.data.data);
            if (productsRes.data.success) setProducts(productsRes.data.data);
        } catch (error) {
            console.error('Error fetching shop:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Loading shop details...</div>;
    if (!shop) return <div className="empty-state">Shop not found</div>;

    return (
        <div className="shop-profile-page">
            <div className="shop-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <div className="shop-banner-container">
                    {shop.bannerImage ? (
                        <img src={getImageUrl(shop.bannerImage)} alt={shop.shopName} className="shop-banner-img" />
                    ) : (
                        <div className="shop-banner-placeholder"></div>
                    )}
                </div>
                <div className="shop-info-card">
                    <div className="shop-title-row">
                        <h1 className="shop-title">{shop.shopName}</h1>
                        <span className="shop-rating">⭐ {shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}</span>
                    </div>
                    <p className="shop-address">📍 {shop.shopAddress || 'Local Market'}</p>
                    <p className="shop-desc">{shop.description || 'Welcome to our shop! Check out our collection below.'}</p>
                    <div className="shop-stats">
                        <div className="stat-item">
                            <span className="stat-value">🛵 ~20 Mins</span>
                            <span className="stat-label">Delivery Time</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-value">{products.length}</span>
                            <span className="stat-label">Products</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shop-products-section">
                <h2 className="section-title">All Products</h2>
                {products.length > 0 ? (
                    <div className="products-grid">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} onClick={() => navigate(`/product/${product._id}`)} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">No products found in this shop.</div>
                )}
            </div>
        </div>
    );
};

const ProductCard = ({ product, onClick }) => {
    const { isInWishlist, toggleWishlist } = useWishlist();
    const wishlisted = isInWishlist(product._id);
    const finalPrice = product.discount > 0
        ? product.price * (1 - product.discount / 100)
        : product.price;

    const handleWishlist = (e) => {
        e.stopPropagation();
        toggleWishlist(product._id);
    };

    return (
        <div className="product-card-modern" onClick={onClick}>
            <div className={`product-image-container ${product.stock === 0 ? 'out-of-stock-container' : ''}`}>
                {product.images && product.images.length > 0 ? (
                    <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/200x250/f3f4f6/9ca3af?text=No+Image';
                        }}
                    />
                ) : (
                    <div className="placeholder-image">No Image</div>
                )}
                {product.stock === 0 && (
                    <div className="out-of-stock-overlay">
                        <span>Out of Stock</span>
                    </div>
                )}
                <button className={`wishlist-heart ${wishlisted ? 'active' : ''}`} onClick={handleWishlist}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : '#fff'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            <div className="product-info">
                <span className="product-title">{product.name}</span>
                <p className="product-price">₹{finalPrice.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default ShopProfile;
