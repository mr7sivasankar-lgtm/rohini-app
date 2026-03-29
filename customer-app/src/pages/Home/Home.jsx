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
    const { user } = useAuth();
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

    const [savedAddresses, setSavedAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    useEffect(() => {
        if (user && showLocationPicker) {
            fetchSavedAddresses();
        }
    }, [user, showLocationPicker]);

    const fetchSavedAddresses = async () => {
        try {
            setLoadingAddresses(true);
            const res = await api.get('/addresses');
            if (res.data.success) {
                setSavedAddresses(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch addresses', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

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

    const handleSavedAddressSelect = async (addr) => {
        setShowLocationPicker(false);
        await selectLocation({
            latitude: addr.latitude,
            longitude: addr.longitude,
            locality: addr.landmark || addr.street.split(',')[0],
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode
        });
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

    // Show city or locality — not the full street address
    const locationLabel = locLoading
        ? 'Detecting...'
        : (city || locality || pincode || 'Set Location');

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
                <span className="greeting-name">
                    Hey {user?.name?.split(' ')[0] || 'there'} 👋
                </span>
            </div>
            {/* Location Picker Modal (Swiggy UI Drawer) */}
            {showLocationPicker && (
                <div className="location-picker-overlay" onClick={() => setShowLocationPicker(false)}>
                    <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="location-picker-header" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowLocationPicker(false)}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Select a location</h3>
                            </div>
                        </div>

                        {/* Search bar — renders in flow, suggestions push content down */}
                        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: locSuggestions.length > 0 ? '0' : '24px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: '52px', gap: '12px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#1a1a2e', background: 'transparent' }}
                                    placeholder="Search for area, street name..."
                                    value={locSearch}
                                    onChange={(e) => handleLocSearchChange(e.target.value)}
                                    autoFocus
                                />
                                {locSearch && (
                                    <button onClick={() => { setLocSearch(''); setLocSuggestions([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', padding: '4px' }}>✕</button>
                                )}
                            </div>

                            {/* Suggestions in-flow: not absolute. They extend inside the white card. */}
                            {locSearching && (
                                <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '14px', borderTop: '1px solid #f1f5f9' }}>Searching...</div>
                            )}
                            {locSuggestions.length > 0 && (
                                <div style={{ borderTop: '1px solid #f1f5f9', maxHeight: '240px', overflowY: 'auto' }}>
                                    {locSuggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectLocation(item)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', borderBottom: idx < locSuggestions.length - 1 ? '1px solid #f8fafc' : 'none' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0 }}>
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{item.locality || item.city || item.displayName?.split(',')[0]}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{[item.city, item.state, item.pincode].filter(Boolean).join(', ')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Only show quick-actions and saved addresses when not actively searching */}
                        {!locSearch && (
                            <>
                                <div className="drawer-actions-container" style={{ marginTop: '24px' }}>
                                    <div className="drawer-action-row" onClick={() => { setShowLocationPicker(false); navigate('/addresses/new'); }}>
                                        <span style={{ color: '#ef4444', fontSize: '24px', fontWeight: '400', width: '24px', textAlign: 'center', lineHeight: 1 }}>+</span>
                                        <span style={{ color: '#ef4444', fontWeight: '600', flex: 1, fontSize: '15px' }}>Add address</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                    </div>

                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0 0 0 44px' }} />

                                    <div className="drawer-action-row" onClick={handleAutoDetect} style={{ alignItems: 'flex-start' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginTop: '2px', width: '24px', flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10" />
                                            <circle cx="12" cy="12" r="3" />
                                            <line x1="12" y1="2" x2="12" y2="6" />
                                            <line x1="12" y1="18" x2="12" y2="22" />
                                            <line x1="2" y1="12" x2="6" y2="12" />
                                            <line x1="18" y1="12" x2="22" y2="12" />
                                        </svg>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '15px' }}>Use your current location</span>
                                            {fullAddress ? (
                                                <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4', display: 'block' }}>{fullAddress}</span>
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>Tap to automatically detect</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {user && savedAddresses.length > 0 && (
                                    <div className="saved-addr-section">
                                        <div className="saved-addr-divider">
                                            <span>SAVED ADDRESSES</span>
                                        </div>
                                        <div className="saved-addr-list">
                                            {savedAddresses.map(addr => (
                                                <div key={addr._id} className="saved-addr-card" onClick={() => handleSavedAddressSelect(addr)}>
                                                    <div className="sac-icon">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                                                            {addr.addressType === 'Home' ? <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> :
                                                             addr.addressType === 'Work' ? <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /> :
                                                             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />}
                                                        </svg>
                                                    </div>
                                                    <div className="sac-body">
                                                        <div className="sac-title">{addr.addressType}</div>
                                                        <div className="sac-text">{addr.street}, {addr.city}, {addr.state}</div>
                                                        <div className="sac-phone">Phone number: +91-{addr.phone}</div>
                                                        <div className="sac-actions">
                                                            <button className="sac-btn" onClick={(e) => { e.stopPropagation(); navigate(`/addresses/edit/${addr._id}`); }}>...</button>
                                                            <button className="sac-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
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

            {/* ── Service Not Available Banner ─────────────────────────── */}
            {serviceable === false && !locLoading && (city || pincode) && (
                <div style={{
                    margin: '20px 16px',
                    background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
                    border: '1.5px solid #fed7aa',
                    borderRadius: 20,
                    padding: '32px 24px',
                    textAlign: 'center',
                    boxShadow: '0 4px 20px rgba(251,146,60,0.15)'
                }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>😔</div>
                    <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#7c2d12' }}>
                        Service Not Available Yet
                    </h2>
                    <p style={{ margin: '0 0 8px', fontSize: 14, color: '#9a3412', lineHeight: 1.6 }}>
                        We haven't expanded to <strong>{city || pincode}</strong> yet.
                    </p>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: '#b45309' }}>
                        We're growing fast! Try a nearby area or check back soon. 🚀
                    </p>
                    <button
                        onClick={() => setShowLocationPicker(true)}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #ea580c, #f97316)',
                            color: 'white', border: 'none', borderRadius: 12,
                            fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(234,88,12,0.4)'
                        }}
                    >
                        📍 Change My Location
                    </button>
                </div>
            )}

            {/* ── Main Content (only when serviceable or no area check) ── */}
            {serviceable !== false && (
                <div className="discovery-block" style={{ marginTop: '16px' }}>
                    <div className="section-header" style={{ padding: '0 20px', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⭐ Top Picks
                        </h2>
                    </div>
                    {loading ? (
                        <div className="loading-state">Loading amazing shops...</div>
                    ) : topRatedShops.length === 0 ? (
                        // No shops registered yet — friendly empty state
                        <div style={{
                            margin: '0 20px 16px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                            border: '1.5px dashed #86efac', borderRadius: 20, padding: '28px 20px', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 48, marginBottom: 10 }}>🏪</div>
                            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#15803d' }}>No Shops Available Yet</h3>
                            <p style={{ margin: 0, fontSize: 13, color: '#16a34a', lineHeight: 1.6 }}>
                                We're onboarding sellers in your area. Check back soon — great shops are coming! 🚀
                            </p>
                        </div>
                    ) : (
                        <HeroSlideshow shops={topRatedShops} banners={banners} navigate={navigate} />
                    )}
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

                {/* Show when location is known but no nearby shops found */}
                {latitude && longitude && !loading && nearbyShops.length === 0 && topRatedShops.length === 0 && (
                    <div style={{
                        margin: '8px 20px 24px', textAlign: 'center',
                        padding: '20px 16px', background: '#f8fafc',
                        borderRadius: 16, border: '1px solid #e2e8f0'
                    }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                            🔍 No shops found near your location yet. More are coming soon!
                        </p>
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

/* ---- Auto Slideshow for Top Rated + Banners (Hero) ---- */
const HeroSlideshow = ({ shops, banners, navigate }) => {
    // 1. Build slides array
    const slides = [];

    // Banners go first
    if (banners && banners.length > 0) {
        banners.forEach(b => slides.push({ type: 'banner', data: b }));
    } else {
        slides.push({ type: 'welcome' });
    }

    // Top rated shops go next
    if (shops && shops.length > 0) {
        shops.forEach(s => slides.push({ type: 'shop', data: s }));
    }

    const [active, setActive] = useState(0);
    const timerRef = useRef(null);

    const goTo = (idx) => setActive((idx + slides.length) % slides.length);

    useEffect(() => {
        timerRef.current = setInterval(() => setActive(prev => (prev + 1) % slides.length), 3500);
        return () => clearInterval(timerRef.current);
    }, [slides.length]);

    if (slides.length === 0) return null;

    return (
        <div className="slideshow-wrapper" style={{ margin: '0', padding: '0 20px', overflow: 'hidden' }}>
            <div className="slideshow-track" style={{
                transform: `translateX(-${active * 100}%)`,
                display: 'flex',
                alignItems: 'stretch',
                transition: 'transform 0.5s cubic-bezier(0.77, 0, 0.175, 1)'
            }}>
                {slides.map((slide, index) => (
                    <div className="slideshow-slide" key={slide.type === 'shop' ? slide.data._id : slide.type === 'banner' ? slide.data._id : `welcome-${index}`} style={{ minWidth: '100%', flexBasis: '100%', padding: '0 4px', boxSizing: 'border-box', flexShrink: 0 }}>

                        {slide.type === 'welcome' && (
                            <div className="banner-placeholder" style={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', height: '180px', overflow: 'hidden', position: 'relative' }}>
                                <div className="placeholder-content" style={{ zIndex: 2, padding: '24px' }}>
                                    <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Welcome</h2>
                                    <p style={{ fontSize: '14px', color: '#a0aec0' }}>Your Style, Delivered Instantly</p>
                                </div>
                            </div>
                        )}

                        {slide.type === 'banner' && (
                            <div className="banner-slide" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', height: '180px' }}>
                                <img src={getImageUrl(slide.data.image)} alt={slide.data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}

                        {slide.type === 'shop' && (
                            <div style={{ height: '100%' }}>
                                <ShopCard shop={slide.data} onClick={() => navigate(`/shop/${slide.data._id}`)} />
                            </div>
                        )}

                    </div>
                ))}
            </div>

            {/* Dot nav */}
            <div className="slideshow-dots" style={{ padding: '12px 0 0 0' }}>
                {slides.map((_, i) => (
                    <button key={i} className={`slideshow-dot${i === active ? ' active' : ''}`} onClick={() => goTo(i)} />
                ))}
            </div>

            {/* Prev / Next arrows */}
            <button className="slide-arrow left" style={{ left: '16px', top: '40%' }} onClick={() => goTo(active - 1)}>‹</button>
            <button className="slide-arrow right" style={{ right: '16px', top: '40%' }} onClick={() => goTo(active + 1)}>›</button>
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
                {(shop.bannerImage || shop.logoImage) ? (
                    <img
                        src={getImageUrl(shop.bannerImage || shop.logoImage)}
                        alt={shop.shopName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = '/default-shop-banner.png'; }}
                    />
                ) : (
                    <img
                        src="/default-shop-banner.png"
                        alt="Default banner"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}
                <div className="scc-overlay" />

                {/* Seller logo badge */}
                {(shop.shopLogo || shop.logoImage) && (
                    <div style={{
                        position: 'absolute', bottom: 8, left: 10,
                        width: 38, height: 38, borderRadius: '50%',
                        border: '2px solid white', background: '#fff',
                        overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                    }}>
                        <img
                            src={getImageUrl(shop.shopLogo || shop.logoImage)}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}

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
                    <span className="scc-category-highlight">{shop.shopCategory || 'Fashion Store'}</span> • {tags.join(', ')}
                </p>

                <div className="scc-footer">
                    {shop.startingPrice ? (
                        <span className="scc-deliver" style={{ background: '#f8fafc', color: '#64748b', fontSize: '10px', padding: '4px 8px', borderRadius: '6px' }}>
                            {shop.startingCategory} starts at <span style={{ color: '#0f172a', fontWeight: '800' }}>₹{shop.startingPrice}</span>
                        </span>
                    ) : (
                        <span />
                    )}
                    <span className="scc-btn">Shop Now →</span>
                </div>
            </div>
        </div>
    );
};

export default Home;
