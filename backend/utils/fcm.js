import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { initializeApp, cert, getApp, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFcmInitialized = false;

// Check if firebase service account exists in the project root or specified path
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'firebase-service-account.json');

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        // Avoid double-init if module is imported multiple times
        if (getApps().length === 0) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        isFcmInitialized = true;
        console.log('✅ Firebase Admin SDK Initialized Successfully');
    } else {
        console.warn('⚠️ [FCM] firebase-service-account.json not found. Push notifications will be mocked to console.');
    }
} catch (error) {
    console.error('❌ [FCM] Failed to initialize Firebase Admin SDK:', error.message);
}


/**
 * Send FCM notification to a single token
 * @param {string} token - FCM registration token
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} [payload.data] - Custom data payload (values must be strings)
 */
export const sendFCM = async (token, { title, body, data = {} }) => {
    if (!token) return;
    
    if (!isFcmInitialized) {
        console.log(`[FCM Mock Send] To: ${token} | Title: "${title}" | Body: "${body}" | Data:`, data);
        return;
    }

    // Ensure all data values are strings
    const serializedData = {};
    for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) {
            serializedData[key] = String(data[key]);
        }
    }

    const message = {
        token,
        notification: {
            title,
            body
        },
        data: serializedData,
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                clickAction: 'FCM_PLUGIN_ACTIVITY',
                channelId: 'high-priority',
                importance: 'high'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1
                }
            }
        }
    };

    try {
        const response = await getMessaging().send(message);
        console.log('✨ [FCM] Sent successfully:', response);
        return response;
    } catch (error) {
        console.error('❌ [FCM] Error sending message:', error.message);
        // If token is invalid or unregistered, log warning (similar to WebPush 410)
        if (error.code === 'messaging/registration-token-not-registered') {
            console.warn(`[FCM] Token is no longer registered: ${token}`);
        }
    }
};

/**
 * Send FCM notification to multiple tokens
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} [payload.data] - Custom data payload (values must be strings)
 */
export const sendFCMToMany = async (tokens, { title, body, data = {} }) => {
    const validTokens = tokens.filter(Boolean);
    if (validTokens.length === 0) return;

    if (!isFcmInitialized) {
        console.log(`[FCM Mock Multicast] To: ${validTokens.length} tokens | Title: "${title}" | Body: "${body}" | Data:`, data);
        return;
    }

    const serializedData = {};
    for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) {
            serializedData[key] = String(data[key]);
        }
    }

    const message = {
        tokens: validTokens,
        notification: {
            title,
            body
        },
        data: serializedData,
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                clickAction: 'FCM_PLUGIN_ACTIVITY',
                channelId: 'high-priority',
                importance: 'high'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1
                }
            }
        }
    };

    try {
        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`✨ [FCM] Multicast success. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
        return response;
    } catch (error) {
        console.error('❌ [FCM] Multicast error:', error.message);
    }
};
