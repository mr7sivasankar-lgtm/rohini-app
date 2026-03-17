import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useLocation } from '../../contexts/LocationContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import MapPicker from '../../components/MapPicker/MapPicker';
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
    const [showMapPicker, setShowMapPicker] = useState(false);
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

    const handleMapConfirm = async (lat, lng, addressText, details) => {
        setShowMapPicker(false);
        setShowLocationPicker(false);
        await selectLocation({
            latitude: lat,
            longitude: lng,
            locality: details?.locality || addressText,
            city: details?.city || addressText,
            state: details?.state || '',
            pincode: details?.pincode || ''
        });
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

                        <button className="location-auto-btn" onClick={handleAutoDetect} style={{ marginBottom: '10px' }}>
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

                        <button className="location-auto-btn" style={{ background: 'white', color: '#10b981', border: '1.5px dashed #10b981', marginBottom: '10px' }} onClick={() => setShowMapPicker(true)}>
                            📍 Place Pin on Map
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

            {showMapPicker && (
                <MapPicker
                    initialLat={latitude}
                    initialLng={longitude}
                    onConfirm={handleMapConfirm}
                    onClose={() => setShowMapPicker(false)}
                />
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

                {/* Top Rated Shops — Auto Slideshow */}
                <div className="discovery-block">
                    <div className="section-header">
                        <h2>⭐ Top Rated Shops</h2>
                    </div>
                    {loading ? (
                        <div className="loading-state">Finding best shops...</div>
                    ) : topRatedShops.length > 0 ? (
                        <ShopSlideshow shops={topRatedShops} navigate={navigate} />
                    ) : (
                        <div className="empty-state"><p>No shops available at the moment</p></div>
                    )}
                </div>

                {/* Nearby Shops — Vertical list */}
                {latitude && longitude && nearbyShops.length > 0 && (
                    <div className="discovery-block">
                        <div className="section-header">
                            <h2>📍 Nearby Shops</h2>
                        </div>
                        <div className="nearby-shops-list">
                            {nearbyShops.map((shop) => (
                                <ShopCard key={shop._id} shop={shop} onClick={() => navigate(`/shop/${shop._id}`)} nearby />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

/* ----------- helpers ----------- */
const CATEGORY_MAP = {
    women: ['Kurtas', 'Sarees', 'Tops', 'Kurtis'],
    men: ['Shirts', 'T-Shirts', 'Jeans', 'Trousers'],
    kids: ['Boys Wear', 'Girls Wear', 'Baby Clothes', 'Ethnic Kids'],
    all: ['Kurtas', 'Jeans', 'Tops', 'Sarees'],
    clothing: ['Kurtas', 'Sarees', 'Tops', 'Dresses'],
};

const getShopTags = (shop) => {
    if (shop.shopCategory) {
        const key = shop.shopCategory.toLowerCase();
        for (const [k, tags] of Object.entries(CATEGORY_MAP)) {
            if (key.includes(k)) return tags.slice(0, 3);
        }
    }
    return ['Ethnic Wear', 'Tops', 'Kurtas'];
};

/* ---- Auto Slideshow for Top Rated ---- */
const ShopSlideshow = ({ shops, navigate }) => {
    const [active, setActive] = useState(0);
    const timerRef = useRef(null);

    const goTo = (idx) => setActive((idx + shops.length) % shops.length);

    useEffect(() => {
        timerRef.current = setInterval(() => setActive(prev => (prev + 1) % shops.length), 3200);
        return () => clearInterval(timerRef.current);
    }, [shops.length]);

    return (
        <div className="slideshow-wrapper">
            <div className="slideshow-track" style={{ transform: `translateX(-${active * 100}%)` }}>
                {shops.map((shop) => (
                    <div className="slideshow-slide" key={shop._id}>
                        <ShopCard shop={shop} onClick={() => navigate(`/shop/${shop._id}`)} />
                    </div>
                ))}
            </div>

            {/* Dot nav */}
            <div className="slideshow-dots">
                {shops.map((_, i) => (
                    <button key={i} className={`slideshow-dot${i === active ? ' active' : ''}`} onClick={() => goTo(i)} />
                ))}
            </div>

            {/* Prev / Next arrows */}
            <button className="slide-arrow left" onClick={() => goTo(active - 1)}>‹</button>
            <button className="slide-arrow right" onClick={() => goTo(active + 1)}>›</button>
        </div>
    );
};

/* ---- Compact Shop Card ---- */
const ShopCard = ({ shop, onClick, nearby }) => {
    const { isInFavorites, toggleFavorite } = useFavorites();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const isFav = isInFavorites(shop._id);
    const tags = getShopTags(shop);
    const [favToast, setFavToast] = useState(false);

    // Compute display values
    const distKm = shop.distance_km != null
        ? shop.distance_km
        : (shop.distance ? shop.distance / 1000 : null);

    let deliveryLabel = '~35 mins';
    if (shop.delivery_mins != null) {
        const lo = Math.max(5, shop.delivery_mins - 5);
        const hi = shop.delivery_mins + 5;
        deliveryLabel = `~${lo}–${hi} mins`;
    } else if (distKm != null) {
        const mins = Math.ceil((distKm / 20) * 60);
        const lo = Math.max(5, mins - 5);
        const hi = mins + 5;
        deliveryLabel = `~${lo}–${hi} mins`;
    }

    const handleFavClick = (e) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            setFavToast(true);
            setTimeout(() => setFavToast(false), 2500);
            return;
        }
        toggleFavorite(shop._id);
    };

    return (
        <div className="shop-card-compact" onClick={onClick} style={{ position: 'relative' }}>
            {/* Login toast */}
            {favToast && (
                <div className="fav-login-toast" onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}>
                    🔒 Log in to save favourites
                </div>
            )}

            {/* Banner */}
            <div className="scc-banner">
                {shop.bannerImage
                    ? <img src={getImageUrl(shop.bannerImage)} alt={shop.shopName} onError={(e) => { e.target.style.display = 'none'; }} />
                    : <div className="scc-no-banner" />
                }
                <div className="scc-overlay" />

                <div className="scc-top-badges">
                    {shop.isOpen !== undefined && (
                        <span className={`scc-status ${shop.isOpen ? 'open' : 'closed'}`}>
                            {shop.isOpen ? '🟢 Open' : '🔴 Closed'}
                        </span>
                    )}
                </div>

                <button
                    className={`scc-fav-btn ${isFav ? 'active' : ''}`}
                    onClick={handleFavClick}
                    aria-label="Favourite Shop"
                    style={{ pointerEvents: 'all' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>

                <div className="scc-bottom-gradient"></div>
            </div>

            {/* Body */}
            <div className="scc-body">
                <div className="scc-delivery-info">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{deliveryLabel}</span>
                    {distKm != null && (
                        <>
                            <span className="scc-dot">•</span>
                            <span>📍 {distKm.toFixed(1)} km</span>
                        </>
                    )}
                </div>

                <div className="scc-title-row">
                    <span className="scc-name">{shop.shopName}</span>
                    <span className="scc-rating-square">⭐ {shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}</span>
                </div>

                <p className="scc-addr">
                    {tags.join(' • ')} • ₹150 for one
                </p>

                <div className="scc-footer">
                    <span className="scc-btn">Shop Now →</span>
                </div>
            </div>
        </div>
    );
};

export default Home;
