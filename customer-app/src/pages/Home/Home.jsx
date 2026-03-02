import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { IMAGE_BASE } from '../../utils/api';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

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

    return (
        <div className="home-page">
            {/* Top Header */}
            <div className="home-header">
                <h1 className="shop-title">GRS Fasho</h1>
            </div>

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
                {loading ? (
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
