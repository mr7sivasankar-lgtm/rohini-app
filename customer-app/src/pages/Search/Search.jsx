import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { getImageUrl } from '../../utils/api';
import './Search.css';

const Search = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(query);

    useEffect(() => {
        if (query) {
            searchProducts(query);
            setSearchInput(query);
        } else {
            setLoading(false);
        }
    }, [query]);

    const searchProducts = async (searchQuery) => {
        try {
            setLoading(true);
            const response = await api.get(`/products?search=${encodeURIComponent(searchQuery)}`);
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            navigate(`/search?q=${searchInput.trim()}`);
        }
    };

    return (
        <div className="search-page">
            {/* Header with Back Button */}
            <div className="search-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <form className="search-bar-full" onSubmit={handleSearch}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        autoFocus
                    />
                </form>
            </div>

            {/* Search Results */}
            <div className="search-content">
                {query && (
                    <div className="search-query-info">
                        <p>Search results for "<strong>{query}</strong>"</p>
                        {!loading && <span>{products.length} products found</span>}
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
                ) : query ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <h3>No products found</h3>
                        <p>Try searching with different keywords</p>
                    </div>
                ) : (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <h3>Start searching</h3>
                        <p>Enter a keyword to find products</p>
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
        <div className="product-card-search" onClick={onClick}>
            <div className="product-image-container">
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
                    {product.discount > 0 && (
                        <p className="product-original-price">₹{product.price.toFixed(2)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Search;
