import { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

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
                    setTimeout(registerPush, 500);
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

    // Register push notification for Capacitor Android APK (Seller)
    const registerPush = async () => {
        try {
            if (!Capacitor.isNativePlatform()) {
                console.log('[Push] Running on web, skipping native push registration.');
                return;
            }

            let permStatus = await PushNotifications.checkPermissions();
            
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn('[Push] Seller push notification permissions denied.');
                return;
            }

            // Create high priority notification channel for Android heads-up display
            await PushNotifications.createChannel({
                id: 'high-priority',
                name: 'High Priority Alerts',
                description: 'Alerts for incoming orders, status changes and support updates',
                importance: 5, // IMPORTANCE_HIGH (Android triggers heads-up banner)
                visibility: 1, // VISIBILITY_PUBLIC
                sound: 'default',
                vibration: true
            });

            await PushNotifications.register();

            // Store FCM token in backend
            PushNotifications.addListener('registration', async (token) => {
                console.log('[Push] FCM registration success, token:', token.value);
                try {
                    await api.post('/push/fcm-token/seller', { token: token.value });
                } catch (apiErr) {
                    console.error('[Push] Failed to register FCM token with server:', apiErr.message);
                }
            });

            PushNotifications.addListener('registrationError', (error) => {
                console.error('[Push] FCM registration error:', error);
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('[Push] Notification received in foreground:', notification);
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                console.log('[Push] Action performed on notification:', action);
                const url = action.notification.data?.url;
                if (url) {
                    window.location.href = url;
                }
            });

        } catch (err) {
            console.warn('[Push] Capacitor registration error:', err.message);
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
