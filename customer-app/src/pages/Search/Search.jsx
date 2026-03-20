import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { getImageUrl } from '../../utils/api';
import FilterSortBar from '../../components/FilterSortBar/FilterSortBar';
import './Search.css';

const Search = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const shopId = searchParams.get('shopId');

    const [products, setProducts] = useState([]);
    const [shopDetails, setShopDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState(query);
    const [activeSort, setActiveSort] = useState('newest');
    const [activeFilters, setActiveFilters] = useState({ priceRange: '', sizes: [], colors: [], inStock: false });
    
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Auto-focus the input when the page opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        if (shopId) {
            fetchShopDetails(shopId);
        }
    }, [shopId]);

    const fetchShopDetails = async (id) => {
        try {
            const res = await api.get(`/sellers/${id}`);
            if (res.data.success) {
                setShopDetails(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching shop details for search context:', error);
        }
    };

    // Debounced live search OR sort/filter changes
    useEffect(() => {
        const q = searchInput.trim();
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (q.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            searchProducts(q, activeSort, activeFilters);
            
            const newParams = new URLSearchParams(searchParams);
            newParams.set('q', q);
            setSearchParams(newParams, { replace: true });
        }, 350);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput, activeSort, activeFilters]);

    const PRICE_RANGES = {
        '0-500':     { min: 0,    max: 500  },
        '500-1000':  { min: 500,  max: 1000 },
        '1000-2000': { min: 1000, max: 2000 },
        '2000+':     { min: 2000, max: null },
    };

    const searchProducts = async (searchQuery, sort, filters) => {
        try {
            setLoading(true);
            
            // Build Query string
            const params = new URLSearchParams();
            params.append('search', searchQuery);
            if (shopId) params.append('sellerId', shopId);
            if (sort && sort !== 'newest') params.append('sort', sort);
            if (filters.inStock) params.append('inStock', 'true');
            
            // Use lookup table for safe price range parsing
            if (filters.priceRange && PRICE_RANGES[filters.priceRange]) {
                const { min, max } = PRICE_RANGES[filters.priceRange];
                params.append('minPrice', min);
                if (max !== null) params.append('maxPrice', max);
            }
            
            // Send sizes and colors as-is (backend does case-insensitive match)
            if (filters.sizes && filters.sizes.length > 0) {
                params.append('sizes', filters.sizes.join(','));
            }
            if (filters.colors && filters.colors.length > 0) {
                params.append('colors', filters.colors.join(','));
            }

            const response = await api.get(`/products?${params.toString()}`);
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSearchInput('');
        setProducts([]);
        setActiveFilters({ priceRange: '', sizes: [], colors: [], inStock: false });
        setActiveSort('newest');
        
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('q');
        setSearchParams(newParams, { replace: true });
        
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="search-page">
            {/* Full-width sticky search header */}
            <div className="search-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="search-input-wrap">
                    <svg className="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder="Search for products..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="search-input-field"
                        enterKeyHint="search"
                        autoComplete="off"
                        autoCorrect="off"
                    />
                    {searchInput && (
                        <button className="search-clear-btn" onClick={handleClear}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
                {shopDetails && (
                    <div className="search-shop-context">
                        Searching only in <strong>{shopDetails.shopName}</strong>
                    </div>
                )}
            </div>

            {/* Filter and Sort Bar */}
            {searchInput.trim() && (
                <FilterSortBar 
                    activeSort={activeSort}
                    onSortChange={setActiveSort}
                    activeFilters={activeFilters}
                    onFilterChange={setActiveFilters}
                    onClearFilters={() => setActiveFilters({ priceRange: '', sizes: [], colors: [], inStock: false })}
                    totalResults={products.length}
                />
            )}

            {/* Search Results */}
            <div className="search-content">
                {searchInput.trim() && (
                    <div className="search-query-info">
                        <p>
                            {loading 
                                ? `Searching for "${searchInput}"...`
                                : products.length > 0 
                                    ? <><strong>{products.length}</strong> results for &quot;{searchInput}&quot;</>
                                    : `No results for "${searchInput}"`
                            }
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Searching...</p>
                    </div>
                ) : products.length > 0 ? (
                    <div className="search-results-grid">
                        {products.map((product) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                onClick={() => navigate(`/product/${product._id}`)}
                            />
                        ))}
                    </div>
                ) : searchInput.trim() ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <h3>No products found</h3>
                        <p>Try a different keyword</p>
                    </div>
                ) : (
                    <div className="search-placeholder">
                        <div className="search-placeholder-icon">
                            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="url(#searchGrad)" strokeWidth="1.2">
                                <defs>
                                    <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#667eea" />
                                        <stop offset="100%" stopColor="#764ba2" />
                                    </linearGradient>
                                </defs>
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <h3>What are you looking for?</h3>
                        <p>Type a product name, category or keyword to get started</p>
                    </div>
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
        <div className="product-card-search" onClick={onClick}>
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
                {product.discount > 0 && (
                    <span className="discount-badge">{product.discount}% OFF</span>
                )}
                <button className={`wishlist-heart ${wishlisted ? 'active' : ''}`} onClick={handleWishlist} aria-label="Toggle wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : '#fff'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-description">{product.description?.substring(0, 60)}...</p>
                <div className="product-price-row">
                    <p className="product-price">₹{finalPrice.toFixed(2)}</p>
                    {product.mrpPrice > product.sellingPrice && (
                        <p className="product-original-price">₹{product.mrpPrice.toFixed(2)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Search;
