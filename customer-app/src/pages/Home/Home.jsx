import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useLocation } from '../../contexts/LocationContext';
import api, { getImageUrl } from '../../utils/api';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { locality, city, pincode, fullAddress, latitude, longitude, serviceable, loading: locLoading, detectLocation, setManualPincode, searchLocations, selectLocation, permissionDenied } = useLocation();
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [nearbyShops, setNearbyShops] = useState([]);
    const [topRatedShops, setTopRatedShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locSearch, setLocSearch] = useState('');
    const [locSuggestions, setLocSuggestions] = useState([]);
    const [locSearching, setLocSearching] = useState(false);
    const searchTimerRef = useRef(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude]);

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
            const apis = [
                api.get('/banners'),
                api.get('/sellers/top-rated')
            ];

            if (latitude && longitude) {
                apis.push(api.get(`/sellers/nearby?lat=${latitude}&lng=${longitude}`));
            }

            const results = await Promise.all(apis);
            const bannersRes = results[0];
            const topRatedRes = results[1];
            const nearbyRes = results.length > 2 ? results[2] : null;

            if (bannersRes.data.success) setBanners(bannersRes.data.data);
            if (topRatedRes.data.success) setTopRatedShops(topRatedRes.data.data);
            if (nearbyRes && nearbyRes.data.success) setNearbyShops(nearbyRes.data.data);

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

    // Debounced location search for autocomplete
    const handleLocSearchChange = (value) => {
        setLocSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (value.length < 2) {
            setLocSuggestions([]);
            return;
        }

        setLocSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            const results = await searchLocations(value);
            setLocSuggestions(results);
            setLocSearching(false);
        }, 400);
    };

    const handleSelectLocation = async (result) => {
        setShowLocationPicker(false);
        setLocSearch('');
        setLocSuggestions([]);
        await selectLocation(result);
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
                <h1 className="shop-title">Uchicca</h1>
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <div className="location-picker-overlay" onClick={() => setShowLocationPicker(false)}>
                    <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="location-picker-header">
                            <h3>Choose your location</h3>
                            <button className="location-picker-close" onClick={() => { setShowLocationPicker(false); setLocSearch(''); setLocSuggestions([]); }}>✕</button>
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
                            <span>or search your area</span>
                        </div>

                        <div className="location-search-wrap">
                            <input
                                type="text"
                                className="location-search-input"
                                placeholder="Type city, area or pincode..."
                                value={locSearch}
                                onChange={(e) => handleLocSearchChange(e.target.value)}
                                autoFocus
                            />
                            {locSearching && <div className="location-searching">Searching...</div>}

                            {locSuggestions.length > 0 && (
                                <div className="location-suggestions">
                                    {locSuggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="location-suggestion-item"
                                            onClick={() => handleSelectLocation(item)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <div className="suggestion-details">
                                                <div className="suggestion-name">
                                                    {item.locality || item.city || item.displayName?.split(',')[0]}
                                                </div>
                                                <div className="suggestion-sub">
                                                    {[item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {locSearch.length >= 2 && !locSearching && locSuggestions.length === 0 && (
                                <div className="location-no-results">No locations found</div>
                            )}
                        </div>

                        {fullAddress && (
                            <div className="location-current-info">
                                <small>📍 Current: {fullAddress}{pincode ? ` — ${pincode}` : ''}</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Banner Section */}
            {banners.length > 0 ? (
                <div className="banner-section">
                    <div className="banner-slider" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                        {banners.map((banner, index) => (
                            <div key={banner._id || index} className="banner-slide">
                                <img src={getImageUrl(banner.image)} alt={banner.title} />
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
                                        <img src={getImageUrl(category.image)} alt={category.name} />
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

            {/* Shop Discovery Section */}
            <div className="shops-section">
                
                {/* Nearby Shops (Only if location is granted) */}
                {latitude && longitude && nearbyShops.length > 0 && (
                    <div className="discovery-block">
                        <div className="section-header">
                            <h2>
                                Nearby Shops
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </h2>
                        </div>
                        <div className="shops-horizontal-scroll">
                            {nearbyShops.map((shop) => (
                                <ShopCard key={shop._id} shop={shop} onClick={() => navigate(`/shop/${shop._id}`)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Rated Shops */}
                <div className="discovery-block">
                    <div className="section-header">
                        <h2>
                            Top Rated Shops
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </h2>
                    </div>
                    {loading ? (
                        <div className="loading-state">Finding best shops...</div>
                    ) : topRatedShops.length > 0 ? (
                        <div className="shops-grid">
                            {topRatedShops.map((shop) => (
                                <ShopCard key={shop._id} shop={shop} onClick={() => navigate(`/shop/${shop._id}`)} />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No shops available at the moment</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const ShopCard = ({ shop, onClick }) => {
    return (
        <div className="shop-card-modern" onClick={onClick}>
            <div className="shop-banner">
                {shop.bannerImage ? (
                    <img
                        src={getImageUrl(shop.bannerImage)}
                        alt={shop.shopName}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x200/f3f4f6/9ca3af?text=No+Banner';
                        }}
                    />
                ) : (
                    <div className="placeholder-image">No Banner</div>
                )}
                <div className="shop-rating-badge">
                    ⭐ {shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}
                </div>
            </div>
            <div className="shop-info">
                <h3 className="shop-name">{shop.shopName}</h3>
                <p className="shop-meta">📍 {shop.shopAddress ? (shop.shopAddress.substring(0,25) + (shop.shopAddress.length>25 ? '...' : '')) : 'Local Market'} • 🛵 ~20 mins</p>
                <div className="shop-bottom-row">
                    <span className="shop-starting-price">Explore Collection</span>
                </div>
            </div>
        </div>
    );
};

export default Home;
