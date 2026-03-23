// Seller App Service Worker
// Plays loud alert sound for new orders — critical notification

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try { data = event.data.json(); }
        catch { data = { title: 'Rohini Seller', body: event.data.text() }; }
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/vite.svg',
        badge: '/vite.svg',
        tag: data.tag || 'seller-notification',
        renotify: true,
        vibrate: [500, 200, 500, 200, 500], // Aggressive vibration for new orders
        requireInteraction: true, // Keep notification on screen until seller dismisses
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Rohini Seller', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
