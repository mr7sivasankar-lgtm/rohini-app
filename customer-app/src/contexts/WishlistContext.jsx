import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within WishlistProvider');
    }
    return context;
};

export const WishlistProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // Fetch wishlist on login
    useEffect(() => {
        if (isAuthenticated) {
            fetchWishlist();
        } else {
            setWishlistIds(new Set());
        }
    }, [isAuthenticated]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const response = await api.get('/wishlist');
            if (response.data.success) {
                const ids = new Set(response.data.data.map(item => item._id));
                setWishlistIds(ids);
            }
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const isInWishlist = useCallback((productId) => {
        return wishlistIds.has(productId);
    }, [wishlistIds]);

    const toggleWishlist = async (productId) => {
        if (!isAuthenticated) return;

        const wasInWishlist = wishlistIds.has(productId);

        // Optimistic update
        setWishlistIds(prev => {
            const next = new Set(prev);
            if (wasInWishlist) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });

        try {
            if (wasInWishlist) {
                await api.delete(`/wishlist/${productId}`);
            } else {
                await api.post('/wishlist', { productId });
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
            // Revert on failure
            setWishlistIds(prev => {
                const next = new Set(prev);
                if (wasInWishlist) {
                    next.add(productId);
                } else {
                    next.delete(productId);
                }
                return next;
            });
        }
    };

    const value = {
        wishlistIds,
        isInWishlist,
        toggleWishlist,
        loading
    };

    return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
