/**
 * Signal Device Link URI Generator
 * 
 * Generates properly formatted Signal device linking URIs (tsdevice:/ protocol)
 * 
 * Note: For real Signal integration, you need:
 * 1. signal-cli installed (https://github.com/AsamK/signal-cli)
 * 2. signal-cli REST daemon running (signal-cli-rest-api)
 * 3. The daemon provides real device linking QR codes
 * 
 * This generates a compatible URI format when the daemon is not available.
 */

const crypto = require('crypto');

/**
 * Generate a Signal device link URI in proper tsdevice:/ format
 * @param {string} phoneNumber - The Signal phone number
 * @param {string} deviceName - Name of the device to register
 * @returns {string} - tsdevice:/ URI for QR code generation
 */
function generateSignalDeviceLink(phoneNumber, deviceName = 'GhostReply') {
  // Clean phone number - extract digits only
  const cleanPhone = phoneNumber?.replace(/[^0-9]/g, '') || '';
  
  // Generate a proper UUID v4 format
  const uuid = crypto.randomUUID();
  
  // Generate a device ID (typically 8-12 hex characters)
  const deviceId = crypto.randomBytes(6).toString('hex');
  
  // Generate a placeholder public key (real Signal uses Curve25519 keys)
  // Format: base64-encoded 32-byte public key
  const pubKey = crypto.randomBytes(32).toString('base64');
  
  // Build the tsdevice:/ URI
  // Real Signal format includes: uuid, di (device id), key (public key)
  const uri = `tsdevice:/?uuid=${uuid}&di=${deviceId}&key=${encodeURIComponent(pubKey)}`;
  
  return uri;
}

/**
 * Parse a Signal device link URI to extract components
 * @param {string} uri - The tsdevice:/ URI
 * @returns {object} - Parsed components
 */
function parseSignalDeviceLink(uri) {
  if (!uri || !uri.startsWith('tsdevice:/')) {
    return null;
  }
  
  const params = new URLSearchParams(uri.replace('tsdevice:/', ''));
  
  return {
    uuid: params.get('uuid') || params.get('param1'),
    deviceId: params.get('di') || params.get('device_id'),
    publicKey: params.get('key') || params.get('pub_key'),
    raw: uri
  };
}

/**
 * Check if a URI is a valid Signal device link format
 * @param {string} uri 
 * @returns {boolean}
 */
function isValidSignalLink(uri) {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('tsdevice:/');
}

module.exports = {
  generateSignalDeviceLink,
  parseSignalDeviceLink,
  isValidSignalLink
};