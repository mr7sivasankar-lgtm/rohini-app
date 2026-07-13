import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

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
                setTimeout(registerPush, 500);
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

    // Register push notification for Capacitor Android APK
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
                console.warn('[Push] Push notification permissions denied.');
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
                    await api.post('/push/fcm-token', { token: token.value });
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

    const phoneLogin = async (phone) => {
        try {
            const response = await api.post('/auth/phone-login', { phone });

            if (response.data.success) {
                const { token, user, isNewUser } = response.data.data;
                localStorage.setItem('token', token);
                
                if (!isNewUser) {
                    localStorage.setItem('user', JSON.stringify(user));
                    setUser(user);
                    setTimeout(registerPush, 500); // Register push after login
                }
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
        phoneLogin,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        fetchUser,
        refreshUser: fetchUser  // alias used by EditProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
