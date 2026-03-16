import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within FavoritesProvider');
    }
    return context;
};

export const FavoritesProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // Fetch favorite shops on login
    useEffect(() => {
        if (isAuthenticated) {
            fetchFavorites();
        } else {
            setFavoriteIds(new Set());
        }
    }, [isAuthenticated]);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const response = await api.get('/favorites');
            if (response.data.success) {
                const ids = new Set(response.data.data.map(shop => shop._id));
                setFavoriteIds(ids);
            }
        } catch (error) {
            console.error('Error fetching favorite shops:', error);
        } finally {
            setLoading(false);
        }
    };

    const isInFavorites = useCallback((sellerId) => {
        return favoriteIds.has(sellerId);
    }, [favoriteIds]);

    const toggleFavorite = async (sellerId) => {
        if (!isAuthenticated) return;

        const wasInFavorites = favoriteIds.has(sellerId);

        // Optimistic update
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (wasInFavorites) {
                next.delete(sellerId);
            } else {
                next.add(sellerId);
            }
            return next;
        });

        try {
            if (wasInFavorites) {
                await api.delete(`/favorites/${sellerId}`);
            } else {
                await api.post('/favorites', { sellerId });
            }
        } catch (error) {
            console.error('Favorite toggle error:', error);
            // Revert on failure
            setFavoriteIds(prev => {
                const next = new Set(prev);
                if (wasInFavorites) {
                    next.add(sellerId);
                } else {
                    next.delete(sellerId);
                }
                return next;
            });
        }
    };

    const value = {
        favoriteIds,
        isInFavorites,
        toggleFavorite,
        loading
    };

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
