import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import api, { getImageUrl } from '../../utils/api';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { isAuthenticated } = useAuth();
    const { latitude: userLat, longitude: userLng } = useLocation();

    // Haversine distance helper
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Dynamic Delivery Time logic
    const getDeliveryEstimate = () => {

        const sellerLng = product?.seller?.location?.coordinates?.[0];
        const sellerLat = product?.seller?.location?.coordinates?.[1];

        const dist = calculateDistance(userLat, userLng, sellerLat, sellerLng);
        if (dist === null) return '30-45 mins'; // Default instant fallback

        // Instant Delivery Time Brackets
        if (dist <= 1.5) return '10-15 mins';
        if (dist <= 3) return '15-25 mins';
        if (dist <= 5) return '25-35 mins';
        if (dist <= 8) return '35-45 mins';
        return '45-60 mins';
    };

    const [product, setProduct] = useState(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [imageAnimating, setImageAnimating] = useState(false);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [similarProducts, setSimilarProducts] = useState([]);

    // Review state
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ total: 0, avgRating: 0, distribution: [0, 0, 0, 0, 0] });
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);

    // Swipe handling
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    useEffect(() => {
        fetchProduct();
        fetchReviews();
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/products/${id}`);
            if (response.data.success) {
                const prod = response.data.data;
                setProduct(prod);
                if (prod.sizes && prod.sizes.length > 0) setSelectedSize(prod.sizes[0]);
                if (prod.colors && prod.colors.length > 0) setSelectedColor(prod.colors[0]);
                // fetch similar products using category
                if (prod.category) {
                    const catId = typeof prod.category === 'object' ? prod.category._id : prod.category;
                    fetchSimilar(catId, prod._id);
                }
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilar = async (categoryId, currentId) => {
        try {
            const res = await api.get(`/products?category=${categoryId}&limit=10`);
            if (res.data.success) {
                const items = (res.data.data || []).filter(p => p._id !== currentId);
                setSimilarProducts(items.slice(0, 8));
            }
        } catch (err) {
            console.error('Error fetching similar products:', err);
        }
    };

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/reviews/${id}`);
            if (res.data.success) {
                setReviews(res.data.data);
                setReviewStats(res.data.stats);
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewRating) { alert('Please select a rating'); return; }
        if (!reviewComment.trim()) { alert('Please write a comment'); return; }
        try {
            setSubmittingReview(true);
            const res = await api.post(`/reviews/${id}`, {
                rating: reviewRating,
                title: reviewTitle,
                comment: reviewComment
            });
            if (res.data.success) {
                setReviewRating(0);
                setReviewTitle('');
                setReviewComment('');
                setShowReviewForm(false);
                fetchReviews();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await api.delete(`/reviews/${reviewId}`);
            fetchReviews();
        } catch (err) {
            alert('Error deleting review');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const handleAddToCart = async () => {
        if (!selectedSize) {
            alert('Please select a size');
            return;
        }
        try {
            setAddingToCart(true);
            await addToCart(product._id, quantity, selectedSize, selectedColor);
            alert('Added to cart!');
        } catch (error) {
            alert(error.message || 'Failed to add to cart');
        } finally {
            setAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        await handleAddToCart();
        navigate('/cart');
    };

    const switchImage = (newIndex) => {
        setImageAnimating(true);
        setTimeout(() => {
            setSelectedImage(newIndex);
            setImageAnimating(false);
        }, 150);
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
        if (!product || product.images.length <= 1) return;
        touchEndX.current = e.changedTouches[0].screenX;
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;
        if (diff > threshold) {
            // Swipe left → next image
            const next = selectedImage < product.images.length - 1 ? selectedImage + 1 : 0;
            switchImage(next);
        } else if (diff < -threshold) {
            // Swipe right → previous image
            const prev = selectedImage > 0 ? selectedImage - 1 : product.images.length - 1;
            switchImage(prev);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="empty-state">
                <h2>Product not found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/home')}>
                    Go to Home
                </button>
            </div>
        );
    }

    const discountedPrice = product.sellingPrice || 0;

    const getDiscount = (mrp, selling) => {
        if (mrp > selling) {
            return Math.round(((mrp - selling) / mrp) * 100);
        }
        return 0;
    };
    const discountPercent = getDiscount(product.mrpPrice, product.sellingPrice);

    const categoryName = product.category?.name || '';
    const subcategoryNames = Array.isArray(product.subcategory)
        ? product.subcategory.map(s => s?.name || '').filter(Boolean)
        : (product.subcategory?.name ? [product.subcategory.name] : []);

    const fabricDetails = [
        { label: 'Fabric / Material', value: product.fabric },
        { label: 'Pattern / Design', value: product.pattern },
        { label: 'Fit Type', value: product.fit },
        { label: 'Sleeve Type', value: product.sleeve },
        { label: 'Neck Type', value: product.neck },
        { label: 'Occasion', value: product.occasion },
    ].filter(d => d.value);

    // Map color names to hex for visual swatches
    const COLOR_HEX = {
        'White': '#FFFFFF', 'Off White': '#FAF7F0', 'Cream': '#FEF3C7', 'Beige': '#E8D5B7',
        'Black': '#1a1a1a', 'Charcoal': '#374151', 'Grey': '#6B7280', 'Silver': '#D1D5DB',
        'Red': '#EF4444', 'Maroon': '#7F1D1D', 'Dark Red': '#991B1B', 'Pink': '#EC4899',
        'Baby Pink': '#FBCFE8', 'Hot Pink': '#F472B6', 'Orange': '#F97316', 'Peach': '#FDBA74',
        'Yellow': '#EAB308', 'Gold': '#D97706', 'Mustard': '#CA8A04', 'Green': '#22C55E',
        'Olive': '#65A30D', 'Dark Green': '#15803D', 'Teal': '#0D9488', 'Mint': '#A7F3D0',
        'Cyan': '#06B6D4', 'Sky Blue': '#38BDF8', 'Blue': '#3B82F6', 'Navy': '#1E3A8A',
        'Royal Blue': '#2563EB', 'Purple': '#A855F7', 'Lavender': '#C4B5FD', 'Violet': '#7C3AED',
        'Brown': '#92400E', 'Tan': '#B45309', 'Copper': '#B87333',
    };

    const getSimilarPrice = (p) => {
        return p.sellingPrice || 0;
    };

    return (
        <div className="product-detail-page">
            <div className="product-detail-container">
                {/* Image Gallery */}
                <div className="image-section">
                    <div
                        className="main-image"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        <img
                            className={`main-product-img ${imageAnimating ? 'fade-out' : 'fade-in'}`}
                            src={getImageUrl(product.images[selectedImage])}
                            alt={product.name}
                            onError={(e) => e.target.src = 'https://via.placeholder.com/500x500?text=Product'}
                        />
                        {discountPercent > 0 && (
                            <div className="discount-badge-large">-{discountPercent}%</div>
                        )}
                        {product.images.length > 1 && (
                            <div className="image-counter">{selectedImage + 1} / {product.images.length}</div>
                        )}
                        <button className={`wishlist-heart wishlist-heart-lg ${isInWishlist(product._id) ? 'active' : ''}`} onClick={() => toggleWishlist(product._id)} aria-label="Toggle wishlist">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={isInWishlist(product._id) ? '#ef4444' : 'none'} stroke={isInWishlist(product._id) ? '#ef4444' : '#fff'} strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    {product.images.length > 1 && (
                        <div className="thumbnail-images">
                            {product.images.map((img, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail ${index === selectedImage ? 'active' : ''}`}
                                    onClick={() => switchImage(index)}
                                >
                                    <img
                                        src={getImageUrl(img)}
                                        alt={`${product.name} ${index + 1}`}
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/100x100?text=Img'}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="info-section">

                    {/* Badges */}
                    {(product.trending || product.newArrival || product.bestSeller || product.featured) && (
                        <div className="badges-row">
                            {product.trending && <span className="badge-pill trending">🔥 Trending</span>}
                            {product.newArrival && <span className="badge-pill new-arrival">✨ New Arrival</span>}
                            {product.bestSeller && <span className="badge-pill best-seller">⭐ Best Seller</span>}
                            {product.featured && <span className="badge-pill featured">🌟 Featured</span>}
                        </div>
                    )}

                    <h1 className="product-title">{product.name}</h1>

                    {/* Category / Brand / Gender chips */}
                    <div className="product-meta-chips">
                        {categoryName && <span className="meta-chip">📂 {categoryName}</span>}
                        {subcategoryNames.map((name, idx) => (
                            <span key={idx} className="meta-chip">🏷️ {name}</span>
                        ))}
                        {product.brand && <span className="meta-chip">🏪 {product.brand}</span>}
                        {product.gender && <span className="meta-chip">👤 {product.gender}</span>}
                    </div>

                    <div className="price-section">
                        <span className="current-price-large">₹{discountedPrice.toFixed(2)}</span>
                        {product.mrpPrice > product.sellingPrice && (
                            <>
                                <span className="original-price-large">₹{product.mrpPrice.toFixed(2)}</span>
                                <span className="save-amount">Save ₹{(product.mrpPrice - discountedPrice).toFixed(2)}</span>
                            </>
                        )}
                    </div>

                    <p className="product-description">{product.description}</p>

                    {/* Color Selection */}
                    {product.colors && product.colors.length > 0 && (
                        <div className="option-group">
                            <label>Color: <strong>{selectedColor}</strong></label>
                            <div className="color-options" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                                {product.colors.map((color) => {
                                    const hex = COLOR_HEX[color] || '#999999';
                                    const isLight = ['White', 'Off White', 'Cream', 'Beige', 'Baby Pink', 'Mint', 'Lavender', 'Silver'].includes(color);
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            title={color}
                                            onClick={() => setSelectedColor(color)}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                                                border: selectedColor === color ? '2px solid #4f46e5' : '2px solid transparent',
                                                background: selectedColor === color ? '#eff6ff' : 'transparent'
                                            }}
                                        >
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', background: hex,
                                                border: `1.5px solid ${isLight ? '#d1d5db' : 'transparent'}`,
                                                boxShadow: selectedColor === color ? '0 0 0 2px #6366f1' : '0 1px 3px rgba(0,0,0,0.15)'
                                            }} />
                                            <span style={{ fontSize: 10, color: selectedColor === color ? '#4f46e5' : '#64748b', fontWeight: selectedColor === color ? 700 : 400, textAlign: 'center', maxWidth: 48, lineHeight: 1.2 }}>{color}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Size Selection */}
                    {product.sizes && product.sizes.length > 0 && (
                        <div className="option-group">
                            <label>Size</label>
                            <div className="size-options">
                                {product.sizes.map((size) => (
                                    <div
                                        key={size}
                                        className={`size-option ${selectedSize === size ? 'active' : ''}`}
                                        onClick={() => setSelectedSize(size)}
                                    >
                                        {size}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fabric Details */}
                    {fabricDetails.length > 0 && (
                        <div className="detail-section">
                            <h3 className="detail-section-title">Fabric & Details</h3>
                            <div className="detail-table">
                                {fabricDetails.map(({ label, value }) => (
                                    <div className="detail-row" key={label}>
                                        <span className="detail-label">{label}</span>
                                        <span className="detail-value">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delivery & Returns */}
                    <div className="delivery-section">
                        <div className="delivery-row">
                            <span className="delivery-icon">🚚</span>
                            <div>
                                <span className="delivery-title">Delivery Estimate</span>
                                <span className="delivery-value" style={{ color: '#10b981', fontWeight: 700 }}>⚡ {getDeliveryEstimate()}</span>
                            </div>
                        </div>
                        <div className="delivery-row">
                            <span className="delivery-icon">↩️</span>
                            <div>
                                <span className="delivery-title">Returns</span>
                                <span className="delivery-value">{product.returnPolicy || 'No Returns'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stock Info */}
                    <div className="stock-info">
                        {product.stock > 0 ? (
                            <span className="in-stock">✅ In Stock ({product.stock} available)</span>
                        ) : (
                            <span className="out-of-stock">❌ Out of Stock</span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={handleAddToCart}
                            disabled={addingToCart || product.stock === 0}
                        >
                            {addingToCart ? 'Adding...' : 'Add to Cart'}
                        </button>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleBuyNow}
                            disabled={product.stock === 0}
                        >
                            Buy Now
                        </button>
                    </div>
                </div>

                {/* ── Reviews Section ───────────────── */}
                <div className="reviews-section">
                    <div className="reviews-header">
                        <h2 className="reviews-title">Ratings & Reviews</h2>
                        {isAuthenticated && (
                            <button
                                className="write-review-btn"
                                onClick={() => setShowReviewForm(!showReviewForm)}
                            >
                                {showReviewForm ? 'Cancel' : '✍️ Write Review'}
                            </button>
                        )}
                    </div>

                    {/* Stats Summary */}
                    {reviewStats.total > 0 && (
                        <div className="review-stats">
                            <div className="review-stats-left">
                                <span className="stats-avg">{reviewStats.avgRating}</span>
                                <div className="stats-stars">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <span key={s} className={`star ${s <= Math.round(reviewStats.avgRating) ? 'filled' : ''}`}>★</span>
                                    ))}
                                </div>
                                <span className="stats-count">{reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="stats-bars">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <div key={star} className="bar-row">
                                        <span className="bar-label">{star}★</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${reviewStats.total > 0 ? (reviewStats.distribution[star - 1] / reviewStats.total * 100) : 0}%` }}
                                            />
                                        </div>
                                        <span className="bar-count">{reviewStats.distribution[star - 1]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review Form */}
                    {showReviewForm && (
                        <form className="review-form" onSubmit={handleSubmitReview}>
                            <div className="form-stars">
                                <label>Your Rating</label>
                                <div className="star-picker">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button
                                            type="button"
                                            key={s}
                                            className={`pick-star ${s <= (reviewHover || reviewRating) ? 'active' : ''}`}
                                            onClick={() => setReviewRating(s)}
                                            onMouseEnter={() => setReviewHover(s)}
                                            onMouseLeave={() => setReviewHover(0)}
                                        >★</button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                className="review-input"
                                placeholder="Review title (optional)"
                                value={reviewTitle}
                                onChange={(e) => setReviewTitle(e.target.value)}
                                maxLength={100}
                            />
                            <textarea
                                className="review-textarea"
                                placeholder="Write your review..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                maxLength={500}
                                rows={3}
                                required
                            />
                            <button
                                type="submit"
                                className="submit-review-btn"
                                disabled={submittingReview || !reviewRating}
                            >
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    )}

                    {/* Review List */}
                    <div className="review-list">
                        {reviews.length > 0 ? reviews.map(r => (
                            <div key={r._id} className="review-card">
                                <div className="review-card-top">
                                    <div className="reviewer-avatar">
                                        {(r.user?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="reviewer-info">
                                        <span className="reviewer-name">{r.user?.name || 'User'}</span>
                                        <span className="review-date">{formatDate(r.createdAt)}</span>
                                    </div>
                                    <div className="review-rating-badge">
                                        {r.rating}★
                                    </div>
                                </div>
                                {r.title && <h4 className="review-card-title">{r.title}</h4>}
                                <p className="review-card-comment">{r.comment}</p>
                            </div>
                        )) : (
                            <div className="no-reviews">
                                <span className="no-reviews-icon">💬</span>
                                <p>No reviews yet. Be the first to review!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Similar Products */}
            {similarProducts.length > 0 && (
                <div className="similar-section">
                    <h2 className="similar-title">Similar Products</h2>
                    <div className="similar-scroll">
                        {similarProducts.map((p) => (
                            <div
                                key={p._id}
                                className="similar-card"
                                onClick={() => navigate(`/product/${p._id}`)}
                            >
                                <div className="similar-img-wrap">
                                    <img
                                        src={getImageUrl(p.images?.[0])}
                                        alt={p.name}
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/200x200?text=Product'}
                                    />
                                    {getDiscount(p.mrpPrice, p.sellingPrice) > 0 && (
                                        <span className="similar-discount">-{getDiscount(p.mrpPrice, p.sellingPrice)}%</span>
                                    )}
                                    <button className={`wishlist-heart wishlist-heart-sm ${isInWishlist(p._id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleWishlist(p._id); }} aria-label="Toggle wishlist">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(p._id) ? '#ef4444' : 'none'} stroke={isInWishlist(p._id) ? '#ef4444' : '#fff'} strokeWidth="2">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="similar-info">
                                    <p className="similar-name">{p.name}</p>
                                    <p className="similar-price">₹{getSimilarPrice(p).toFixed(0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
