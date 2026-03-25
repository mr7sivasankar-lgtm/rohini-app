import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useLocation as useLocCtx } from '../../contexts/LocationContext';
import api, { getImageUrl } from '../../utils/api';
import FilterSortBar from '../../components/FilterSortBar/FilterSortBar';
import './ShopProfile.css';

// Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ShopProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isInFavorites, toggleFavorite } = useFavorites();
    const { latitude: custLat, longitude: custLng } = useLocCtx();
    const isFav = isInFavorites(id);


    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters and Categories
    const [activeCategory, setActiveCategory] = useState('All');
    const [categories, setCategories] = useState(['All']);
    const [activeSort, setActiveSort] = useState('newest');
    const [activeFilters, setActiveFilters] = useState({ priceRange: '', sizes: [], colors: [], inStock: false });

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

                // Extract unique category names (p.category is a populated object, not a string)
                const uniqueCats = ['All', ...new Set(prods.map(p => p.category?.name).filter(Boolean))];
                setCategories(uniqueCats);
            }

            // ── Unique visitor tracking (24-hour cooldown via localStorage) ──
            const storageKey = `viewed_seller_${id}`;
            const lastViewed = localStorage.getItem(storageKey);
            const isFirstVisitToday = !lastViewed || Date.now() - Number(lastViewed) > 24 * 60 * 60 * 1000;
            if (isFirstVisitToday) {
                api.post(`/sellers/${id}/view`).catch(() => { }); // fire-and-forget
                localStorage.setItem(storageKey, String(Date.now()));
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

    // 1. Category Filter
    if (activeCategory !== 'All') {
        displayProducts = displayProducts.filter(p => p.category?.name === activeCategory || p.category === activeCategory);
    }

    // 2. In Stock Filter
    if (activeFilters.inStock) {
        displayProducts = displayProducts.filter(p => p.stock > 0);
    }

    // 3. Price Range Filter
    const PRICE_RANGES = {
        '0-500': { min: 0, max: 500 },
        '500-1000': { min: 500, max: 1000 },
        '1000-2000': { min: 1000, max: 2000 },
        '2000+': { min: 2000, max: null },
    };
    if (activeFilters.priceRange && PRICE_RANGES[activeFilters.priceRange]) {
        const { min, max } = PRICE_RANGES[activeFilters.priceRange];
        displayProducts = displayProducts.filter(p => {
            const finalPrice = p.sellingPrice || 0;
            if (max === null) return finalPrice >= min;
            return finalPrice >= min && finalPrice <= max;
        });
    }

    // 4. Sizes Filter
    if (activeFilters.sizes && activeFilters.sizes.length > 0) {
        displayProducts = displayProducts.filter(p => {
            if (!p.sizes) return false;
            // Assuming p.sizes is an array of strings like ['S', 'M']
            return activeFilters.sizes.some(size => p.sizes.includes(size));
        });
    }

    // 5. Colors Filter
    if (activeFilters.colors && activeFilters.colors.length > 0) {
        displayProducts = displayProducts.filter(p => {
            if (!p.colors) return false;
            return activeFilters.colors.some(color => p.colors.includes(color));
        });
    }

    // 6. Sorting
    if (activeSort === 'price_asc') {
        displayProducts.sort((a, b) => {
            const pA = a.sellingPrice || 0;
            const pB = b.sellingPrice || 0;
            return pA - pB;
        });
    } else if (activeSort === 'price_desc') {
        displayProducts.sort((a, b) => {
            const pA = a.sellingPrice || 0;
            const pB = b.sellingPrice || 0;
            return pB - pA;
        });
    } else if (activeSort === 'popularity' || activeSort === 'top_rated') {
        // Fallback to highest sales or highest rating if available, otherwise fallback to standard newest
        displayProducts.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    } else if (activeSort === 'discount_desc') {
        displayProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else {
        // default: newest
        displayProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Compute distance and delivery time from customer location → shop coordinates
    let distKm = null;
    let deliveryTimeStr = '~35 mins';
    if (shop && shop.location && shop.location.coordinates && custLat && custLng) {
        const [shopLng, shopLat] = shop.location.coordinates;
        distKm = Math.round(haversineKm(custLat, custLng, shopLat, shopLng) * 10) / 10;
        const mins = Math.ceil((distKm / 20) * 60);
        const lo = Math.max(5, mins - 5);
        const hi = mins + 5;
        deliveryTimeStr = `~${lo}–${hi} mins`;
    }

    return (
        <div className="shop-profile-page">
            <div className="shop-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <button className={`shop-fav-btn ${isFav ? 'active' : ''}`} onClick={() => toggleFavorite(id)} aria-label="Favorite Shop">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <div className="shop-banner-container" style={{ position: 'relative' }}>
                    {(shop.bannerImage || shop.logoImage) ? (
                        <img
                            src={getImageUrl(shop.bannerImage || shop.logoImage)}
                            alt={shop.shopName}
                            className="shop-banner-img"
                            onError={(e) => { e.target.src = '/default-shop-banner.png'; }}
                        />
                    ) : (
                        <img
                            src="/default-shop-banner.png"
                            alt="Default banner"
                            className="shop-banner-img"
                        />
                    )}

                    {/* Logo badge */}
                    {(shop.shopLogo || shop.logoImage) && (
                        <div style={{
                            position: 'absolute', bottom: -20, left: 16,
                            width: 56, height: 56, borderRadius: '14px',
                            border: '3px solid white', background: '#fff',
                            overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            <img
                                src={getImageUrl(shop.shopLogo || shop.logoImage)}
                                alt={shop.shopName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>
                <div className="shop-info-card" style={{ paddingTop: (shop.shopLogo || shop.logoImage) ? '28px' : undefined }}>
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
                        {distKm != null && (
                            <>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-value">📍 {distKm} km</span>
                                    <span className="stat-label">Distance</span>
                                </div>
                            </>
                        )}
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
                <div style={{ position: 'relative', zIndex: 20 }}>
                    <FilterSortBar
                        activeSort={activeSort}
                        onSortChange={setActiveSort}
                        activeFilters={activeFilters}
                        onFilterChange={setActiveFilters}
                        onClearFilters={() => setActiveFilters({ priceRange: '', sizes: [], colors: [], inStock: false })}
                        totalResults={displayProducts.length}
                    />
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
    const getDiscount = (mrp, selling) => {
        if (mrp > selling) {
            return Math.round(((mrp - selling) / mrp) * 100);
        }
        return 0;
    };

    const finalPrice = product.sellingPrice || 0;
    const discountPercent = getDiscount(product.mrpPrice, product.sellingPrice);

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
                <div className="product-price-row">
                    <p className="product-price">₹{finalPrice.toFixed(0)}</p>
                    {product.mrpPrice > finalPrice && (
                        <p className="product-original-price">₹{(product.mrpPrice || finalPrice).toFixed(0)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopProfile;
