const { getAsync, runAsync, allAsync } = require('../db/database');

class WhatsAppService {
  constructor() {
    this.status = 'disconnected'; // 'disconnected', 'pairing', 'connected'
    this.qrCodeData = null;
    this.sessionInfo = null;
  }

  getStatus() {
    return {
      status: this.status,
      sessionInfo: this.sessionInfo,
      hasQr: !!this.qrCodeData,
      qrCodeData: this.qrCodeData
    };
  }

  generateMockQR() {
    this.status = 'pairing';
    // Base64 sample SVG QR placeholder
    this.qrCodeData = `2@GHOSTREPLY_WA_SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      status: this.status,
      qrCode: this.qrCodeData,
      message: 'Scan the QR code in WhatsApp on your phone (Linked Devices).'
    };
  }

  connectSession(phoneNumber = '+1 555-0199') {
    this.status = 'connected';
    this.qrCodeData = null;
    this.sessionInfo = {
      phone: phoneNumber,
      name: 'Primary Device (Active)',
      connectedAt: new Date().toISOString()
    };
    return {
      success: true,
      status: this.status,
      sessionInfo: this.sessionInfo
    };
  }

  disconnect() {
    this.status = 'disconnected';
    this.qrCodeData = null;
    this.sessionInfo = null;
    return { success: true, status: 'disconnected' };
  }
}

module.exports = new WhatsAppService();
