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
    
    // Filters and Categories
    const [activeCategory, setActiveCategory] = useState('All');
    const [categories, setCategories] = useState(['All']);
    const [showSort, setShowSort] = useState(false);
    const [sortBy, setSortBy] = useState('recommended');

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
            if (productsRes.data.success) {
                const prods = productsRes.data.data;
                setProducts(prods);
                
                // Extract unique categories from shop's products
                const uniqueCats = ['All', ...new Set(prods.map(p => p.category).filter(Boolean))];
                setCategories(uniqueCats);
            }
        } catch (error) {
            console.error('Error fetching shop:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Loading shop details...</div>;
    if (!shop) return <div className="empty-state">Shop not found</div>;

    // Filter and Sort Products
    let displayProducts = [...products];
    if (activeCategory !== 'All') {
        displayProducts = displayProducts.filter(p => p.category === activeCategory);
    }
    if (sortBy === 'price_low') displayProducts.sort((a, b) => a.price - b.price);
    if (sortBy === 'price_high') displayProducts.sort((a, b) => b.price - a.price);

    // Calculate delivery time based on distance (roughly 4 mins per km + 20 mins base prep)
    let deliveryTimeStr = '~35 mins';
    if (shop.distance) {
        const distKm = shop.distance / 1000;
        const mins = Math.round(20 + (distKm * 4));
        deliveryTimeStr = `~${mins} mins`;
        if (shop.distanceText) deliveryTimeStr = `~${shop.durationText || mins + ' mins'}`;
    }

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
                            <span className="stat-value">🛵 {deliveryTimeStr}</span>
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
                {/* Categories Scroll Tab */}
                {categories.length > 1 && (
                    <div className="shop-categories-scroll">
                        {categories.map(cat => (
                            <button 
                                key={cat} 
                                className={`shop-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sort / Filter Controls */}
                <div className="shop-filter-bar">
                    <button className="sf-btn" onClick={() => setSortBy(prev => prev === 'price_low' ? 'recommended' : 'price_low')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                        {sortBy === 'price_low' ? 'Price: Low' : 'Sort'}
                    </button>
                    <div className="sf-divider"></div>
                    <button className="sf-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        Filter
                    </button>
                </div>

                {displayProducts.length > 0 ? (
                    <div className="products-grid">
                        {displayProducts.map((product) => (
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
