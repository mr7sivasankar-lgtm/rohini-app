import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('deliveryToken');
        const saved = localStorage.getItem('deliveryPartner');
        if (token && saved) {
            setPartner(JSON.parse(saved));
        }
        setLoading(false);
    }, []);

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
            await api.post('/push/subscribe/partner', { subscription: sub });
        } catch (err) {
            console.warn('[Push] Partner registration error:', err.message);
        }
    };

    const login = async (phone, password) => {
        const res = await api.post('/delivery/login', { phone, password });
        const { token, partner } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(partner));
        setPartner(partner);
        setTimeout(registerPush, 500);
        return partner;
    };

    const register = async (data) => {
        const res = await api.post('/delivery/register', data);
        const { token, partner } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(partner));
        setPartner(partner);
        setTimeout(registerPush, 500);
        return partner;
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
        <AuthContext.Provider value={{ partner, loading, login, register, logout, updatePartner }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
