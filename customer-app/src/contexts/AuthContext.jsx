import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser && savedUser !== 'undefined') {
            try {
                setUser(JSON.parse(savedUser));
                fetchUser();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data.success) {
                setUser(response.data.data);
                localStorage.setItem('user', JSON.stringify(response.data.data));
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            logout();
        }
    };

    const sendOTP = async (phone) => {
        try {
            const response = await api.post('/auth/send-otp', { phone });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    };

    const verifyOTP = async (phone, otp) => {
        try {
            const response = await api.post('/auth/verify-otp', { phone, otp });

            if (response.data.success) {
                const { token, user } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setUser(user);
            }

            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    };

    const updateProfile = async (data) => {
        try {
            const response = await api.put('/auth/update-profile', data);
            if (response.data.success) {
                setUser(response.data.data);
                localStorage.setItem('user', JSON.stringify(response.data.data));
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        loading,
        sendOTP,
        verifyOTP,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        fetchUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
