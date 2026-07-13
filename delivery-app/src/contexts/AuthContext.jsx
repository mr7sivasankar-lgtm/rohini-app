import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('deliveryToken');
        const saved = localStorage.getItem('deliveryPartner');
        if (token && saved) {
            setPartner(JSON.parse(saved));
            setTimeout(registerPush, 500);
        }
        setLoading(false);
    }, []);

    // Register push notification for Capacitor Android APK (Delivery Partner)
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
                console.warn('[Push] Partner push notification permissions denied.');
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
                    await api.post('/push/fcm-token/partner', { token: token.value });
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

    // ── Phone-only auth (no OTP) ──────────────────────────────────────────────

    const phoneLogin = async (phone) => {
        try {
            const res = await api.post('/delivery/phone-login', { phone });
            if (res.data.success) {
                const { token, partner: p } = res.data.data;
                localStorage.setItem('deliveryToken', token);
                localStorage.setItem('deliveryPartner', JSON.stringify(p));
                setPartner(p);
                setTimeout(registerPush, 500);
            }
            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    };



    const sendOTP = async (phone) => {
        try {
            const res = await api.post('/delivery/send-otp', { phone });
            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    };

    const verifyOTP = async (phone, otp) => {
        try {
            const res = await api.post('/delivery/verify-otp', { phone, otp });
            if (res.data.success) {
                const { token, partner: p } = res.data.data;
                localStorage.setItem('deliveryToken', token);
                localStorage.setItem('deliveryPartner', JSON.stringify(p));
                setPartner(p);
                setTimeout(registerPush, 500);
            }
            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    };

    // ── Password-based auth (legacy / kept for admin use) ────────────────────

    const login = async (phone, password) => {
        const res = await api.post('/delivery/login', { phone, password });
        const { token, partner: p } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(p));
        setPartner(p);
        setTimeout(registerPush, 500);
        return p;
    };

    const register = async (data) => {
        const res = await api.post('/delivery/register', data);
        const { token, partner: p } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(p));
        setPartner(p);
        setTimeout(registerPush, 500);
        return p;
    };

    const logout = () => {
        localStorage.removeItem('deliveryToken');
        localStorage.removeItem('deliveryPartner');
        setPartner(null);
    };

    const updatePartner = (data) => {
        const updated = { ...partner, ...data };
        setPartner(updated);
        localStorage.setItem('deliveryPartner', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ partner, loading, phoneLogin, sendOTP, verifyOTP, login, register, logout, updatePartner }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
