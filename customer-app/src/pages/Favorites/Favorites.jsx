import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../../contexts/FavoritesContext';
import api, { getImageUrl } from '../../utils/api';
import './Favorites.css';

const Favorites = () => {
    const navigate = useNavigate();
    const { favoriteIds, toggleFavorite, loading: ctxLoading } = useFavorites();
    const [favoriteShops, setFavoriteShops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFavoriteShops();
    }, [favoriteIds]);

    const fetchFavoriteShops = async () => {
        try {
            setLoading(true);
            const response = await api.get('/favorites');
            if (response.data.success) {
                setFavoriteShops(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const getShopTags = (shop) => {
        if (!shop.shopCategory) return ['Mixed Fashion Store'];
        const cat = shop.shopCategory.toLowerCase();
        
        const tagMap = {
            'women': ['Womenswear', 'Dresses', 'Tops', 'Kurtas'],
            'men': ['Menswear', 'Shirts', 'T-Shirts', 'Jeans'],
            'kids': ['Kidswear', 'Toys', 'Accessories'],
            'accessories': ['Accessories', 'Jewelry', 'Bags'],
            'footwear': ['Footwear', 'Shoes', 'Sandals']
        };

        for (const [key, tags] of Object.entries(tagMap)) {
            if (cat.includes(key)) return tags.slice(0, 3);
        }
        return [shop.shopCategory];
    };

    if (loading && favoriteShops.length === 0) {
        return (
            <div className="favorites-page">
                <div className="favorites-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h2>Favorite Shops</h2>
                </div>
                <div className="favorites-loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="favorites-page">
            <div className="favorites-header">
                <button className="back-btn-top" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <h2>Favorite Shops</h2>
            </div>

            <div className="favorites-content">
                {favoriteShops.length === 0 ? (
                    <div className="empty-favorites">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <h3>No Favorites Yet</h3>
                        <p>You haven't added any shops to your favorites.</p>
                        <button className="browse-btn" onClick={() => navigate('/home')}>
                            Explore Shops
                        </button>
                    </div>
                ) : (
                    <div className="favorites-grid">
                        {favoriteShops.map((shop) => {
                            const tags = getShopTags(shop);
                            const isFav = favoriteIds.has(shop._id);
                            
                            return (
                                <div key={shop._id} className="fav-shop-card" onClick={() => navigate(`/shop/${shop._id}`)}>
                                    <div className="fav-shop-banner">
                                        {shop.bannerImage ? (
                                            <img src={getImageUrl(shop.bannerImage)} alt={shop.shopName} />
                                        ) : (
                                            <div className="fav-no-banner" />
                                        )}
                                        <div className="fav-banner-overlay" />
                                        
                                        <button 
                                            className={`fav-heart-btn ${isFav ? 'active' : ''}`} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(shop._id);
                                            }}
                                            aria-label="Toggle Favorite"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="fav-shop-info">
                                        <div className="fav-shop-title-row">
                                            <h4>{shop.shopName}</h4>
                                            <span className="fav-rating">⭐ {shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}</span>
                                        </div>
                                        <p className="fav-shop-tags">
                                            {tags.join(' • ')}
                                        </p>
                                        <p className="fav-shop-address">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {shop.shopAddress || 'Local Market'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
