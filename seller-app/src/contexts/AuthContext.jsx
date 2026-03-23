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

    const urlBase64ToUint8Array = (b) => {
        const p = '='.repeat((4 - b.length % 4) % 4);
        const base64 = (b + p).replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(base64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    };

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
            await api.post('/push/subscribe/seller', { subscription: sub });
        } catch (err) {
            console.warn('[Push] Seller registration error:', err.message);
        }
    };

    const login = async (phone, password) => {
        try {
            const response = await api.post('/sellers/login', { phone, password });
            if (response.data.success) {
                localStorage.setItem('sellerToken', response.data.data.token);
                setSeller(response.data.data);
                setTimeout(registerPush, 500);
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
                setTimeout(registerPush, 500);
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
