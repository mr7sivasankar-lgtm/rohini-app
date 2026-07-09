import axios from 'axios';

const apiKey = process.env.FAST2SMS_API_KEY;

if (apiKey) {
    console.log('✅ Fast2SMS service initialized');
} else {
    console.warn('⚠️ Fast2SMS API key not set — OTP will be logged to console only');
}

/**
 * Send OTP via Fast2SMS SMS API
 * @param {string} phone - Phone number (e.g., +919700079239 or 9700079239)
 * @param {string} otp - The 6-digit OTP code to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendOTP = async (phone, otp) => {
    // If API Key is not set, fallback to console log (Dev mode)
    if (!apiKey) {
        console.log(`📱 [DEV MODE] OTP for ${phone}: ${otp}`);
        return true;
    }

    // Clean phone number (strip +91 prefix and non-digits)
    const cleanPhone = phone.replace('+91', '').replace(/\D/g, '');

    try {
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: apiKey,
                variables_values: otp,
                route: 'otp',
                numbers: cleanPhone
            }
        });

        if (response.data && response.data.return === true) {
            console.log(`📱 SMS sent to ${cleanPhone} via Fast2SMS:`, response.data.message);
            return true;
        } else {
            console.error('❌ Fast2SMS Response Error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Fast2SMS API Error:', error.response ? error.response.data : error.message);
        return false;
    }
};

export default sendOTP;
