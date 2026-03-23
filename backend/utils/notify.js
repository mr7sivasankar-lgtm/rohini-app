import webpush from 'web-push';

/**
 * Send a Web Push notification to a single subscription object.
 * Silently ignores if subscription is null/undefined.
 *
 * @param {Object} subscription - The push subscription { endpoint, keys }
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} [payload.icon] - URL to icon image
 * @param {number[]} [payload.vibrate] - Vibration pattern e.g. [300,100,300]
 * @param {string} [payload.sound] - Sound hint (used by SW)
 * @param {string} [payload.url] - URL to open on click
 * @param {string} [payload.tag] - Notification tag (deduplication)
 */
export const sendPush = async (subscription, payload) => {
    if (!subscription || !subscription.endpoint) return;
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('[Push] VAPID keys not configured — skipping push');
        return;
    }

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
        // 410 Gone = subscription is expired/invalid; just log and move on
        if (err.statusCode === 410 || err.statusCode === 404) {
            console.warn('[Push] Subscription expired:', err.statusCode);
        } else {
            console.error('[Push] Send error:', err.message);
        }
    }
};
