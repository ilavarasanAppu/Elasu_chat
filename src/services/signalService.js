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
    this.daemonOnline = false;
  }

  setDecisionEngine(engine) {
    this.decisionEngine = engine;
  }

  /**
   * Test if signal-cli-rest-api daemon is running and reachable
   */
  async checkDaemon(endpoint) {
    const target = (endpoint || this.endpoint || 'http://127.0.0.1:8080').trim().replace(/\/$/, '');
    try {
      const res = await axios.get(`${target}/v1/about`, { timeout: 2500 });
      this.daemonOnline = !!res.data;
      return {
        online: true,
        endpoint: target,
        version: res.data?.version || 'signal-cli-rest-api',
        message: 'Signal daemon is online and responsive!'
      };
    } catch (e) {
      // Also try fallback endpoint
      try {
        await axios.get(`${target}/v1/qrcodelink?device_name=ping`, { timeout: 1500 });
        this.daemonOnline = true;
        return { online: true, endpoint: target, message: 'Signal daemon is online' };
      } catch (e2) {
        this.daemonOnline = false;
        return {
          online: false,
          endpoint: target,
          message: 'Signal daemon is not reachable at this endpoint.',
          dockerCommand: 'docker run -d --name signal-cli -p 8080:8080 -v $HOME/.local/share/signal-cli:/home/.local/share/signal-cli bbernhard/signal-cli-rest-api'
        };
      }
    }
  }

  async getStatus(accountId = 'acc_signal_primary') {
    const daemonStatus = await this.checkDaemon(this.endpoint);

    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      endpoint: this.endpoint,
      sessionInfo: this.sessionInfo,
      hasQr: !!this.qrCodeData,
      qrCodeData: this.qrCodeData,
      daemonOnline: daemonStatus.online,
      daemonMessage: daemonStatus.message,
      dockerCommand: daemonStatus.dockerCommand,
      accountId
    };
  }

  /**
   * Generate Signal device linking QR
   */
  async generateLinkQR(endpoint, phone, accountId = 'acc_signal_primary') {
    this.status = 'linking';
    if (endpoint) this.endpoint = endpoint.trim();
    if (phone) this.phoneNumber = phone.trim();

    const daemonCheck = await this.checkDaemon(this.endpoint);
    let uri = '';
    let isLiveDaemon = false;

    if (daemonCheck.online) {
      try {
        const ep = this.endpoint.replace(/\/$/, '');
        const res = await axios.get(`${ep}/v1/qrcodelink?device_name=GhostReply`, { timeout: 3000 });
        if (typeof res.data === 'string' && res.data.startsWith('tsdevice:/')) {
          uri = res.data.trim();
          isLiveDaemon = true;
        } else if (res.data?.uri) {
          uri = res.data.uri;
          isLiveDaemon = true;
        }
      } catch (e) {
        console.warn('[SignalService] Error fetching QR from daemon:', e.message);
      }
    }

    if (!uri) {
      // Compatible format for simulator/preview
      const { generateSignalDeviceLink } = require('./signalUtils');
      uri = generateSignalDeviceLink(this.phoneNumber, 'GhostReply');
    }

    this.qrCodeData = uri;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
    } catch (qrErr) {
      console.error('[SignalService] Error generating QR Data URL:', qrErr);
    }

    await runAsync(
      `UPDATE connected_accounts SET status = 'pairing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [accountId]
    ).catch(() => {});

    return {
      success: true,
      status: this.status,
      qrCode: uri,
      linkingUri: uri,
      qrDataUrl,
      daemonOnline: daemonCheck.online,
      isLiveDaemon,
      message: daemonCheck.online
        ? '✓ Live Signal Daemon Connected! Scan the QR code in Signal: Settings -> Linked Devices -> Link New Device.'
        : 'Signal daemon is not running locally. To link with real Signal, launch signal-cli daemon or use Quick Connect for testing.',
      dockerCommand: daemonCheck.dockerCommand
    };
  }

  async connectSession(phone = '+91 98765 43210', endpoint = 'http://127.0.0.1:8080', accountId = 'acc_signal_primary') {
    this.status = 'connected';
    this.phoneNumber = phone;
    this.endpoint = endpoint || this.endpoint;
    this.qrCodeData = null;
    this.sessionInfo = {
      accountId,
      phone: this.phoneNumber,
      deviceName: 'GhostReply Signal Linked Device (Active)',
      connectedAt: new Date().toISOString()
    };

    await runAsync(
      `UPDATE connected_accounts SET status = 'connected', identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [this.phoneNumber, accountId]
    ).catch(() => {});

    await runAsync(`UPDATE settings SET value = ? WHERE key = 'signal_phone_number'`, [this.phoneNumber]).catch(() => {});
    await runAsync(`UPDATE settings SET value = ? WHERE key = 'signal_endpoint'`, [this.endpoint]).catch(() => {});
    await runAsync(`UPDATE settings SET value = 'connected' WHERE key = 'signal_status'`).catch(() => {});

    return {
      success: true,
      status: this.status,
      sessionInfo: this.sessionInfo
    };
  }

  async disconnect(accountId = 'acc_signal_primary') {
    this.status = 'disconnected';
    this.qrCodeData = null;
    this.sessionInfo = null;

    await runAsync(
      `UPDATE connected_accounts SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [accountId]
    ).catch(() => {});

    await runAsync(`UPDATE settings SET value = 'disconnected' WHERE key = 'signal_status'`).catch(() => {});
    return { success: true, status: 'disconnected', accountId };
  }

  /**
   * Handle incoming message from Signal webhook or signal-cli daemon
   */
  async handleIncomingSignalMessage({ from, text, senderName, accountId = 'acc_signal_primary' }) {
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

    return null;
  }
}

module.exports = new SignalService();
