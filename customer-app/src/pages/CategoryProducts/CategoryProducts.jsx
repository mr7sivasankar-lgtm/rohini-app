import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import api, { getImageUrl } from '../../utils/api';
import FilterSortBar from '../../components/FilterSortBar/FilterSortBar';
import './CategoryProducts.css';

const CategoryProducts = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();

    const [products, setProducts] = useState([]);
    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Sort and Filter State
    const [activeSort, setActiveSort] = useState('newest');
    const [activeFilters, setActiveFilters] = useState({ priceRange: '', sizes: [], colors: [], inStock: false });

    const PRICE_RANGES = {
        '0-500':     { min: 0,    max: 500  },
        '500-1000':  { min: 500,  max: 1000 },
        '1000-2000': { min: 1000, max: 2000 },
        '2000+':     { min: 2000, max: null },
    };

    useEffect(() => {
        fetchCategoryProducts(activeSort, activeFilters);
    }, [categoryId, activeSort, activeFilters]);

    const fetchCategoryProducts = async (sort, filters) => {
        try {
            setLoading(true);
            
            // Build Query string for products
            const params = new URLSearchParams();
            params.append('category', categoryId);
            if (sort && sort !== 'newest') params.append('sort', sort);
            if (filters.inStock) params.append('inStock', 'true');
            
            // Use lookup table for safe price range parsing
            if (filters.priceRange && PRICE_RANGES[filters.priceRange]) {
                const { min, max } = PRICE_RANGES[filters.priceRange];
                params.append('minPrice', min);
                if (max !== null) params.append('maxPrice', max);
            }
            
            // Send sizes/colors to backend
            if (filters.sizes && filters.sizes.length > 0) {
                params.append('sizes', filters.sizes.join(','));
            }
            if (filters.colors && filters.colors.length > 0) {
                params.append('colors', filters.colors.join(','));
            }

            // Fetch category details and filtered products
            const [categoryRes, productsRes] = await Promise.all([
                api.get(`/categories/${categoryId}`),
                api.get(`/products?${params.toString()}`)
            ]);

            if (categoryRes.data.success) {
                setCategory(categoryRes.data.data);
            }
            if (productsRes.data.success) {
                setProducts(productsRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching category products:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="category-products-page">
            {/* Header */}
            <div className="category-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1>{category?.name || 'Category'}</h1>
                <div className="spacer"></div>
            </div>
            
            <FilterSortBar 
                activeSort={activeSort}
                onSortChange={setActiveSort}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                onClearFilters={() => setActiveFilters({ priceRange: '', sizes: [], colors: [], inStock: false })}
                totalResults={products.length}
            />

            {/* Products */}
            <div className="category-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading products...</p>
                    </div>
                ) : products.length > 0 ? (
                    <>
                        <div className="products-info">
                            <p>{products.length} products available</p>
                        </div>
                        <div className="products-grid">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onClick={() => navigate(`/product/${product._id}`)}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M9 3v18M3 9h18M3 15h18M15 3v18" />
                        </svg>
                        <h3>No products yet</h3>
                        <p>This category doesn't have any products at the moment</p>
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
        <div className="product-card" onClick={onClick}>
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

export default CategoryProducts;
