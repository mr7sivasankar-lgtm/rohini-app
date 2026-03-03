import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;

// Initialize Twilio client only if credentials are provided
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
} else {
    console.warn('⚠️ Twilio credentials not set — OTP will be logged to console only');
}

/**
 * Send OTP via Twilio SMS
 * @param {string} phone - Phone number with country code (e.g., +919700079239)
 * @param {string} otp - The OTP code to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendOTP = async (phone, otp) => {
    // If Twilio is not configured, just log it
    if (!client) {
        console.log(`📱 [DEV MODE] OTP for ${phone}: ${otp}`);
        return true;
    }

    try {
        const message = await client.messages.create({
            body: `Your Rohini verification code is: ${otp}. This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code.`,
            from: twilioPhone,
            to: phone
        });

        console.log(`📱 SMS sent to ${phone} — SID: ${message.sid}`);
        return true;
    } catch (error) {
        console.error('❌ Twilio SMS Error:', error.message);
        return false;
    }
};

export default sendOTP;
