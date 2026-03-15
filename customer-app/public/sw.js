self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try { data = event.data.json(); }
        catch { data = { title: 'Notification', body: event.data.text() }; }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Rohini Update', {
            body: data.body || '',
            icon: data.icon || '/vite.svg',
            badge: data.badge || '/vite.svg',
            tag: 'rohini-order-update',
            renotify: true,
            vibrate: [200, 100, 200],
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
