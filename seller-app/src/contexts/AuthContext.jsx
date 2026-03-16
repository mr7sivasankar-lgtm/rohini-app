import { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('sellerToken');
        if (token) {
            try {
                const response = await api.get('/sellers/profile');
                if (response.data.success) {
                    setSeller(response.data.data);
                } else {
                    localStorage.removeItem('sellerToken');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('sellerToken');
            }
        }
        setLoading(false);
    };

    const login = async (phone, password) => {
        try {
            const response = await api.post('/sellers/login', { phone, password });
            if (response.data.success) {
                localStorage.setItem('sellerToken', response.data.data.token);
                setSeller(response.data.data);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const loginWithOtp = async (phone, otp) => {
        try {
            const response = await api.post('/sellers/login-otp', { phone, otp });
            if (response.data.success) {
                localStorage.setItem('sellerToken', response.data.data.token);
                setSeller(response.data.data);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'OTP verification failed' };
        }
    };

    const register = async (sellerData) => {
        try {
            const response = await api.post('/sellers/register', sellerData);
            if (response.data.success) {
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('sellerToken');
        setSeller(null);
    };

    return (
        <AuthContext.Provider value={{ seller, loading, login, loginWithOtp, register, logout, checkAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
