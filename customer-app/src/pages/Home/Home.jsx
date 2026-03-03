import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useLocation } from '../../contexts/LocationContext';
import api, { IMAGE_BASE } from '../../utils/api';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { locality, city, pincode, fullAddress, serviceable, loading: locLoading, detectLocation, setManualPincode, permissionDenied } = useLocation();
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [manualPin, setManualPin] = useState('');
    const [pinError, setPinError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-rotate banners
    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBanner((prev) => (prev + 1) % banners.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [banners]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bannersRes, productsRes] = await Promise.all([
                api.get('/banners'),
                api.get('/products')
            ]);

            if (bannersRes.data.success) setBanners(bannersRes.data.data);
            if (productsRes.data.success) setProducts(productsRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${searchQuery}`);
        }
    };

    const handleManualPincode = async () => {
        if (!manualPin || manualPin.length !== 6) {
            setPinError('Enter a valid 6-digit pincode');
            return;
        }
        setPinError('');
        await setManualPincode(manualPin);
        setShowLocationPicker(false);
        setManualPin('');
    };

    const handleAutoDetect = () => {
        detectLocation();
        setShowLocationPicker(false);
    };

    const locationLabel = locLoading
        ? 'Detecting...'
        : (fullAddress || pincode || 'Set Location');

    return (
        <div className="home-page">
            {/* Top Header */}
            <div className="home-header">
                <div className="header-location" onClick={() => setShowLocationPicker(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="header-location-text">
                        <span className="header-location-label">{locationLabel}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
                <h1 className="shop-title">GRS Fasho</h1>
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <div className="location-picker-overlay" onClick={() => setShowLocationPicker(false)}>
                    <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="location-picker-header">
                            <h3>Choose your location</h3>
                            <button className="location-picker-close" onClick={() => setShowLocationPicker(false)}>✕</button>
                        </div>

                        <button className="location-auto-btn" onClick={handleAutoDetect}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <line x1="12" y1="18" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="6" y2="12" />
                                <line x1="18" y1="12" x2="22" y2="12" />
                            </svg>
                            Use Current Location
                        </button>

                        <div className="location-divider">
                            <span>or enter pincode</span>
                        </div>

                        <div className="location-manual">
                            <input
                                type="tel"
                                placeholder="Enter 6-digit pincode"
                                value={manualPin}
                                onChange={(e) => setManualPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength="6"
                            />
                            <button onClick={handleManualPincode}>Go</button>
                        </div>
                        {pinError && <p className="location-pin-error">{pinError}</p>}

                        {fullAddress && (
                            <div className="location-current-info">
                                <small>📍 Current: {fullAddress}{pincode ? ` — ${pincode}` : ''}</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="search-container">
                <form className="search-bar" onSubmit={handleSearch}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            {/* Banner Section */}
            {banners.length > 0 ? (
                <div className="banner-section">
                    <div className="banner-slider" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                        {banners.map((banner, index) => (
                            <div key={banner._id || index} className="banner-slide">
                                <img src={`${IMAGE_BASE}${banner.image}`} alt={banner.title} />
                            </div>
                        ))}
                    </div>
                    <div className="banner-dots">
                        {banners.map((_, index) => (
                            <span
                                key={index}
                                className={`dot ${index === currentBanner ? 'active' : ''}`}
                                onClick={() => setCurrentBanner(index)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="banner-section">
                    <div className="banner-placeholder">
                        <div className="placeholder-content">
                            <h2>Welcome</h2>
                            <p>Your Style, Delivered Instantly</p>
                        </div>
                    </div>
                    <div className="banner-dots">
                        <span className="dot active" />
                    </div>
                </div>
            )}

            <div className="categories-section">
                <div className="section-header">
                    <h2>Categories</h2>
                    <button className="see-all-btn" onClick={() => navigate('/categories')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="8" height="8" rx="3" />
                            <rect x="13" y="3" width="8" height="8" rx="3" />
                            <rect x="3" y="13" width="8" height="8" rx="3" />
                            <rect x="13" y="13" width="8" height="8" rx="3" />
                        </svg>
                    </button>
                </div>
                {categories.length > 0 ? (
                    <div className="categories-scroll">
                        {categories.slice(0, 10).map((category) => (
                            <div
                                key={category._id}
                                className="category-item"
                                onClick={() => navigate(`/category/${category._id}`)}
                            >
                                <div className="category-circle">
                                    {category.image ? (
                                        <img src={`${IMAGE_BASE}${category.image}`} alt={category.name} />
                                    ) : (
                                        <div className="category-placeholder">
                                            {category.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className="category-name">{category.name}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="categories-scroll">
                        {[
                            { name: 'Jeans', image: '/category-icons/jeans.png' },
                            { name: 'T-Shirt', image: '/category-icons/T-shirts.png' },
                            { name: 'Shorts', image: '/category-icons/shorts.png' },
                            { name: 'Kurtas', image: '/category-icons/Kurtas.png' },
                            { name: 'Sarees', image: '/category-icons/Sarees.png' },
                            { name: 'Shirts', image: '/category-icons/shirts.png' },
                            { name: 'Trousers', image: '/category-icons/Trousers.png' },
                            { name: 'Tops', image: '/category-icons/Tops.png' }
                        ].map((category, index) => (
                            <div
                                key={index}
                                className="category-item"
                                onClick={() => navigate(`/search?q=${category.name}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="category-circle">
                                    <img
                                        src={category.image}
                                        alt={category.name}
                                        className="category-image"
                                    />
                                </div>
                                <span className="category-name">{category.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Just For You Section */}
            <div className="products-section">
                <div className="section-header">
                    <h2>
                        Just For You
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </h2>
                </div>
                {serviceable === false ? (
                    <div className="not-serviceable-card">
                        <div className="not-serviceable-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="1.5">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <h3 className="not-serviceable-title">We're Not Here Yet!</h3>
                        <p className="not-serviceable-area">{fullAddress || 'Your area'}</p>
                        <p className="not-serviceable-msg">
                            Currently we are not servicing your area.<br />
                            We will be there soon. 🚀
                        </p>
                    </div>
                ) : loading ? (
                    <div className="loading-state">Loading products...</div>
                ) : products.length > 0 ? (
                    <div className="products-grid">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} onClick={() => navigate(`/product/${product._id}`)} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No products available at the moment</p>
                    </div>
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
            <div className="product-image-container">
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
                <button className={`wishlist-heart ${wishlisted ? 'active' : ''}`} onClick={handleWishlist} aria-label="Toggle wishlist">
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

export default Home;
