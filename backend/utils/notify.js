import { sendFCM } from './fcm.js';

/**
 * Send a push notification using Firebase Cloud Messaging (FCM).
 * Silently ignores if token is null/undefined.
 *
 * @param {string} token - The FCM registration token
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} [payload.icon] - URL to icon image (optional for FCM)
 * @param {string} [payload.url] - URL/Route path to handle on click
 * @param {string} [payload.tag] - Notification tag (deduplication)
 */
export const sendPush = async (token, payload) => {
    if (!token) return;

    try {
        await sendFCM(token, {
            title: payload.title || 'Rohini',
            body: payload.body || '',
            data: {
                url: payload.url || '/',
                tag: payload.tag || '',
                icon: payload.icon || ''
            }
        });
    } catch (err) {
        console.error('[Push Notification Error]:', err.message);
    }
};

