import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
        } else {
            setCart([]);
        }
    }, [isAuthenticated]);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const response = await api.get('/cart');
            if (response.data.success) {
                setCart(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (productId, quantity, size, color) => {
        try {
            const response = await api.post('/cart', {
                productId,
                quantity,
                size,
                color
            });

            if (response.data.success) {
                setCart(response.data.data);
                return response.data;
            }
        } catch (error) {
            throw error.response?.data || error;
        }
    };

    const updateQuantity = async (itemId, quantity) => {
        try {
            const response = await api.put(`/cart/${itemId}`, { quantity });
            if (response.data.success) {
                setCart(response.data.data);
            }
        } catch (error) {
            throw error.response?.data || error;
        }
    };

    const removeFromCart = async (itemId) => {
        try {
            const response = await api.delete(`/cart/${itemId}`);
            if (response.data.success) {
                setCart(response.data.data);
            }
        } catch (error) {
            console.error('Error removing from cart:', error);
        }
    };

    const clearCart = async () => {
        try {
            await api.delete('/cart');
            setCart([]);
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    };

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

    const cartTotal = cart.reduce((total, item) => {
        if (item.product) {
            const price = item.product.discount > 0
                ? item.product.price * (1 - item.product.discount / 100)
                : item.product.price;
            return total + (price * item.quantity);
        }
        return total;
    }, 0);

    const value = {
        cart,
        loading,
        cartCount,
        cartTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        fetchCart
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
