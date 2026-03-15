import { useState, useEffect } from 'react';
import API from '../utils/api';

const VAPID_PUBLIC_KEY = 'BEqEqMLzN2d9Fwj_bCPNdXwzBTEp6sYpUVDOUOTU05wWC4YrWFT7tWTlvdMJAtUr8D7KfX8WCzZUzdaRDUUE0';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [supported, setSupported] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            setSupported(true);
            try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                setSubscribed(!!sub);
            } catch {}
        };
        check();
    }, []);

    const subscribe = async () => {
        if (!supported || loading) return;
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            await API.post('/push/subscribe', { subscription });
            setSubscribed(true);
        } catch (err) {
            console.error('Push subscribe error:', err);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
            await API.post('/push/unsubscribe');
            setSubscribed(false);
        } catch (err) {
            console.error('Push unsubscribe error:', err);
        } finally {
            setLoading(false);
        }
    };

    return { supported, subscribed, loading, subscribe, unsubscribe };
}
