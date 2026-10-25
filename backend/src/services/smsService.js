/**
 * SMS Service
 * Handles sending SMS notifications (using Twilio)
 */

let client = null;
let twilio = null;

// Initialize Twilio client if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    twilio = require('twilio');
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio SMS service initialized');
  } catch (error) {
    console.log('Twilio initialization failed:', error.message);
  }
} else {
  console.log('SMS Service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
}

/**
 * Send an SMS
 * @param {string} to - Recipient phone number
 * @param {string} message - Message to send
 */
const sendSMS = async (to, message) => {
  try {
    if (!client) {
      console.log('SMS Service not configured. Message:', message);
      return { success: false, reason: 'Twilio not configured' };
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    console.log(`SMS sent to ${to}:`, result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS sending error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send verification SMS
 * @param {string} phone - Recipient phone
 * @param {string} code - Verification code
 */
const sendVerificationSMS = async (phone, code) => {
  const message = `Your verification code is: ${code}. This code expires in 10 minutes.`;
  return sendSMS(phone, message);
};

/**
 * Send policy update notification
 * @param {string} phone - Recipient phone
 * @param {string} policyNumber - Policy number
 * @param {string} status - New status
 */
const sendPolicyUpdateSMS = async (phone, policyNumber, status) => {
  const message = `Your policy ${policyNumber} has been ${status}. Log in to your account for details.`;
  return sendSMS(phone, message);
};

/**
 * Send claim update notification
 * @param {string} phone - Recipient phone
 * @param {string} claimNumber - Claim number
 * @param {string} status - New status
 */
const sendClaimUpdateSMS = async (phone, claimNumber, status) => {
  const message = `Your claim ${claimNumber} status: ${status}. Check your account for details.`;
  return sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendVerificationSMS,
  sendPolicyUpdateSMS,
  sendClaimUpdateSMS
};
