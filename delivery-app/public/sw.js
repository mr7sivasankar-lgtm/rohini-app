// Delivery App Service Worker
// Ring bell vibration on new delivery assignment

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try { data = event.data.json(); }
        catch { data = { title: 'Rohini Delivery', body: event.data.text() }; }
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/vite.svg',
        badge: '/vite.svg',
        tag: data.tag || 'delivery-notification',
        renotify: true,
        vibrate: data.vibrate || [300, 100, 300, 100, 300], // Bell pattern
        requireInteraction: true, // Stay on screen until partner taps
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Rohini Delivery', options)
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
