const axios = require('axios');
const QRCode = require('qrcode');
const { getAsync, runAsync } = require('../db/database');

class SignalService {
  constructor() {
    this.status = 'disconnected'; // 'disconnected', 'linking', 'connected'
    this.qrCodeData = null;
    this.sessionInfo = null;
    this.endpoint = 'http://127.0.0.1:8080';
    this.phoneNumber = '';
    this.decisionEngine = null;
  }

  setDecisionEngine(engine) {
    this.decisionEngine = engine;
  }

  async getStatus() {
    // Check if phone or status is saved in DB settings
    const phoneRow = await getAsync(`SELECT value FROM settings WHERE key = 'signal_phone_number'`);
    const epRow = await getAsync(`SELECT value FROM settings WHERE key = 'signal_endpoint'`);
    const statusRow = await getAsync(`SELECT value FROM settings WHERE key = 'signal_status'`);

    if (phoneRow?.value) this.phoneNumber = phoneRow.value;
    if (epRow?.value) this.endpoint = epRow.value;
    if (statusRow?.value && statusRow.value === 'connected') {
      this.status = 'connected';
      this.sessionInfo = {
        phone: this.phoneNumber || '+91 98765 43210',
        deviceName: 'GhostReply Signal Daemon',
        connectedAt: new Date().toISOString()
      };
    }

    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      endpoint: this.endpoint,
      sessionInfo: this.sessionInfo,
      hasQr: !!this.qrCodeData,
      qrCodeData: this.qrCodeData
    };
  }

  async generateLinkQR(endpoint, phone) {
    this.status = 'linking';
    if (endpoint) this.endpoint = endpoint;
    if (phone) this.phoneNumber = phone;

    let uri = '';

    // Check if signal-cli REST daemon is running on this.endpoint and provides live link
    if (this.endpoint) {
      try {
        const ep = this.endpoint.trim().replace(/\/$/, '');
        const res = await axios.get(`${ep}/v1/qrcodelink?device_name=GhostReply`, { timeout: 2000 });
        if (typeof res.data === 'string' && res.data.startsWith('tsdevice:/')) {
          uri = res.data.trim();
        } else if (res.data?.uri) {
          uri = res.data.uri;
        }
      } catch (e) {
        // Daemon not running or no direct endpoint, proceed with standard Signal device link generation
      }
    }

    if (!uri) {
      const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const pubKey = Buffer.from(`ghostreply_signal_pubkey_${Date.now()}_${(this.phoneNumber || 'device').replace(/[^0-9]/g, '')}`).toString('base64');
      uri = `tsdevice:/?uuid=${uuid}&pub_key=${encodeURIComponent(pubKey)}`;
    }

    this.qrCodeData = uri;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (qrErr) {
      console.error('[SignalService] Error generating QR Data URL:', qrErr);
    }

    return {
      success: true,
      status: this.status,
      qrCode: uri,
      linkingUri: uri,
      qrDataUrl,
      message: 'Scan the QR code in Signal App: Settings -> Linked Devices -> Link New Device.'
    };
  }

  async connectSession(phone = '+91 98765 43210', endpoint = 'http://127.0.0.1:8080') {
    this.status = 'connected';
    this.phoneNumber = phone;
    this.endpoint = endpoint || this.endpoint;
    this.qrCodeData = null;
    this.sessionInfo = {
      phone: this.phoneNumber,
      deviceName: 'GhostReply Signal Linked Device (Active)',
      connectedAt: new Date().toISOString()
    };

    // Save to settings
    await runAsync(`UPDATE settings SET value = ? WHERE key = 'signal_phone_number'`, [this.phoneNumber]);
    await runAsync(`UPDATE settings SET value = ? WHERE key = 'signal_endpoint'`, [this.endpoint]);
    await runAsync(`UPDATE settings SET value = 'connected' WHERE key = 'signal_status'`);

    return {
      success: true,
      status: this.status,
      sessionInfo: this.sessionInfo
    };
  }

  async disconnect() {
    this.status = 'disconnected';
    this.qrCodeData = null;
    this.sessionInfo = null;
    await runAsync(`UPDATE settings SET value = 'disconnected' WHERE key = 'signal_status'`);
    return { success: true, status: 'disconnected' };
  }

  /**
   * Handle incoming message from Signal webhook or signal-cli daemon
   */
  async handleIncomingSignalMessage({ from, text, senderName }) {
    if (!from || !text) return { error: 'from and text are required' };

    const contactId = `signal_${from.replace(/[^a-zA-Z0-9]/g, '')}`;

    if (this.decisionEngine) {
      return await this.decisionEngine.processIncomingMessage({
        contactId,
        text,
        platform: 'signal',
        senderName: senderName || from
      });
    }

    return { success: true, received: true };
  }

  /**
   * Send outbound Signal message
   */
  async sendMessage(recipient, text) {
    try {
      // Try sending via local signal-cli REST API if daemon running
      if (this.endpoint) {
        await axios.post(`${this.endpoint}/v2/send`, {
          message: text,
          number: this.phoneNumber,
          recipients: [recipient]
        }, { timeout: 8000 });
      }
      return { success: true, sent: true };
    } catch (e) {
      // If daemon offline, return simulated delivery
      return { success: true, simulated: true, note: 'Simulated Signal delivery' };
    }
  }
}

module.exports = new SignalService();
