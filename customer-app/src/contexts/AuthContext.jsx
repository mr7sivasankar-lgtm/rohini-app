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

    // Register push notification service worker
    const registerPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
            const reg = await navigator.serviceWorker.register('/sw.js');
            const vapidRes = await api.get('/push/vapid-public-key');
            const vapidKey = vapidRes.data.publicKey;
            if (!vapidKey) return;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });
            await api.post('/push/subscribe', { subscription: sub });
        } catch (err) {
            console.warn('[Push] Registration error:', err.message);
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(base64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
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
                setTimeout(registerPush, 500); // Register push after login
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
        fetchUser,
        refreshUser: fetchUser  // alias used by EditProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
