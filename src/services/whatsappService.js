const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { getAsync, runAsync, allAsync } = require('../db/database');
const credentialService = require('./credentialService');

class WhatsAppService {
  constructor() {
    this.status = 'disconnected';
    this.activeSocket = null;
    this.qrCodeData = null;
    this.qrDataUrl = null;
    this.qrCodeImagePath = null;
    this.activePairingCode = null;
    this.activePairingPhone = null;
    this.sessionInfo = null;
    this.decisionEngine = null;
    this.sessionDir = credentialService.getWhatsAppDir();
    this.isConnecting = false;

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Auto-restore session if registered credentials exist
    this.autoRestoreSession().catch(() => {});
  }

  setDecisionEngine(engine) {
    this.decisionEngine = engine;
  }

  getStatus(accountId = 'acc_wa_primary') {
    return {
      status: this.status,
      sessionInfo: this.sessionInfo,
      hasQr: !!this.qrCodeData,
      qrCodeData: this.qrCodeData,
      qrDataUrl: this.qrDataUrl,
      qrCodeImagePath: this.qrCodeImagePath,
      pairingCode: this.activePairingCode,
      pairingPhone: this.activePairingPhone,
      accountId
    };
  }

  /**
   * Auto-restore existing authenticated session on server startup
   */
  async autoRestoreSession(accountId = 'acc_wa_primary') {
    const accDir = path.join(this.sessionDir, accountId);
    const credsPath = path.join(accDir, 'creds.json');
    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (creds && creds.me && creds.registered) {
          console.log(`[WhatsAppService] Found registered credentials for ${accountId} (${creds.me.id}). Connecting...`);
          await this.startBaileysSocket(accountId, false);
          return true;
        }
      } catch (e) {
        console.warn(`[WhatsAppService] Notice on auto-restore: ${e.message}`);
      }
    }
    return false;
  }

  /**
   * Internal Baileys Socket Initializer
   */
  async startBaileysSocket(accountId = 'acc_wa_primary', isPairingMode = false) {
    if (this.activeSocket && (this.status === 'connected' || this.isConnecting)) {
      return this.activeSocket;
    }

    this.isConnecting = true;
    const accDir = path.join(this.sessionDir, accountId);
    if (!fs.existsSync(accDir)) {
      fs.mkdirSync(accDir, { recursive: true });
    }

    let waVersion = [2, 3000, 1043857760];
    try {
      const vResult = await fetchLatestBaileysVersion();
      if (vResult?.version) waVersion = vResult.version;
    } catch {}

    const { state, saveCreds } = await useMultiFileAuthState(accDir);

    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      printQRInTerminal: false,
      syncFullHistory: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000
    });

    this.activeSocket = sock;

    // Listen to credentials updates
    sock.ev.on('creds.update', saveCreds);

    // Listen to connection updates (QR code, open, close)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = 'pairing';
        this.qrCodeData = qr;
        try {
          this.qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 280,
            color: { dark: '#0b141a', light: '#ffffff' }
          });
          if (!fs.existsSync(accDir)) fs.mkdirSync(accDir, { recursive: true });
          const qrImagePath = path.join(accDir, 'current_qr.png');
          const qrBuffer = await QRCode.toBuffer(qr, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
          fs.writeFileSync(qrImagePath, qrBuffer);
          this.qrCodeImagePath = qrImagePath;
        } catch (qrErr) {
          console.error('[WhatsAppService] Error rendering QR code image:', qrErr.message);
        }

        console.log(`[WhatsAppService] New Authentic WhatsApp QR Code Ready for account: ${accountId}`);

        if (this.decisionEngine) {
          this.decisionEngine.broadcast('whatsapp_qr_ready', {
            accountId,
            qr,
            qrDataUrl: this.qrDataUrl
          });
        }
      }

      if (connection === 'open') {
        this.isConnecting = false;
        this.status = 'connected';
        this.qrCodeData = null;
        this.qrDataUrl = null;
        this.activePairingCode = null;

        const userId = sock.user?.id || '';
        const cleanPhone = userId.split(':')[0].split('@')[0] || this.activePairingPhone || '';

        this.sessionInfo = {
          accountId,
          phone: cleanPhone,
          name: sock.user?.name || `WhatsApp (+${cleanPhone})`,
          connectedAt: new Date().toISOString()
        };

        // Persist session info file
        fs.writeFileSync(path.join(accDir, 'active_session.json'), JSON.stringify(this.sessionInfo, null, 2));

        // Update database connected_accounts and settings
        await runAsync(
          `UPDATE connected_accounts SET status = 'connected', identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [cleanPhone, accountId]
        ).catch(() => {});

        await runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_phone_number', ?, CURRENT_TIMESTAMP)`,
          [cleanPhone]
        ).catch(() => {});

        await runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_status', 'connected', CURRENT_TIMESTAMP)`
        ).catch(() => {});

        console.log(`[WhatsAppService] ✓ Authenticated & Connected to WhatsApp! Phone: +${cleanPhone}`);

        if (this.decisionEngine) {
          this.decisionEngine.broadcast('whatsapp_status_changed', {
            status: 'connected',
            sessionInfo: this.sessionInfo,
            accountId
          });
        }
      }

      if (connection === 'close') {
        this.isConnecting = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.warn(`[WhatsAppService] Connection closed for ${accountId}. Reason: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

        if (!shouldReconnect) {
          this.status = 'disconnected';
          this.sessionInfo = null;
          this.qrCodeData = null;
          this.qrDataUrl = null;
          this.activePairingCode = null;

          try { fs.rmSync(accDir, { recursive: true, force: true }); } catch {}

          await runAsync(
            `UPDATE connected_accounts SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [accountId]
          ).catch(() => {});

          await runAsync(
            `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_status', 'disconnected', CURRENT_TIMESTAMP)`
          ).catch(() => {});

          if (this.decisionEngine) {
            this.decisionEngine.broadcast('whatsapp_status_changed', {
              status: 'disconnected',
              accountId
            });
          }
        } else {
          // Reconnect automatically after brief backoff
          setTimeout(() => {
            if (this.status !== 'disconnected') {
              this.startBaileysSocket(accountId, false).catch(() => {});
            }
          }, 4000);
        }
      }
    });

    // Listen to incoming messages for auto-replying
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (!messages || messages.length === 0) return;

      for (const m of messages) {
        // Skip messages sent by self or non-user messages
        if (m.key.fromMe) continue;
        const remoteJid = m.key.remoteJid || '';
        if (remoteJid.includes('@broadcast') || remoteJid.includes('status@broadcast')) continue;

        const text = m.message?.conversation ||
                     m.message?.extendedTextMessage?.text ||
                     m.message?.imageMessage?.caption ||
                     '';

        if (!text || !text.trim()) continue;

        const cleanNumber = remoteJid.replace(/@.+/, '');
        const contactId = `wa_${cleanNumber}`;
        const senderName = m.pushName || `User ${cleanNumber.substring(cleanNumber.length - 4)}`;

        console.log(`[WhatsAppService] Incoming message from ${senderName} (+${cleanNumber}): "${text}"`);

        let reply = null;
        if (this.decisionEngine) {
          reply = await this.decisionEngine.processIncomingMessage({
            contactId,
            text,
            platform: 'whatsapp',
            senderName
          });
        }

        // Send auto-reply back through WhatsApp socket if reply exists
        if (reply && reply.text) {
          try {
            await sock.sendMessage(remoteJid, { text: reply.text });
            console.log(`[WhatsAppService] Sent WhatsApp auto-reply to +${cleanNumber}: "${reply.text.substring(0, 40)}..."`);
          } catch (sendErr) {
            console.error(`[WhatsAppService] Error sending WhatsApp message:`, sendErr.message);
          }
        }
      }
    });

    this.isConnecting = false;
    return sock;
  }

  /**
   * Request an authentic 8-digit WhatsApp Phone Pairing Code from WhatsApp's Servers
   */
  async generatePairingCode(phoneNumber, accountId = 'acc_wa_primary') {
    if (!phoneNumber || phoneNumber.trim().length < 7) {
      throw new Error('Valid phone number with country code is required (e.g. +91 98765 43210)');
    }

    // Clean phone number to digits only
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    this.status = 'pairing';
    this.activePairingPhone = cleanPhone;

    // Save phone in DB settings so user never has to re-type on refresh
    await runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_phone_number', ?, CURRENT_TIMESTAMP)`,
      [cleanPhone]
    ).catch(() => {});

    // Ensure socket is active
    let sock = this.activeSocket;
    if (!sock || this.status === 'disconnected') {
      sock = await this.startBaileysSocket(accountId, true);
    }

    // Wait a brief moment for socket handshaking before requesting pairing code
    await new Promise(r => setTimeout(r, 2000));

    try {
      console.log(`[WhatsAppService] Requesting authentic 8-digit pairing code from WhatsApp servers for +${cleanPhone}...`);
      const rawCode = await sock.requestPairingCode(cleanPhone);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      this.activePairingCode = formattedCode;

      console.log(`[WhatsAppService] ✓ Authentic WhatsApp Pairing Code Received: ${formattedCode}`);

      // Save pairing state
      const accDir = path.join(this.sessionDir, accountId);
      if (!fs.existsSync(accDir)) fs.mkdirSync(accDir, { recursive: true });
      fs.writeFileSync(path.join(accDir, 'pairing_state.json'), JSON.stringify({
        accountId,
        phone: cleanPhone,
        pairingCode: formattedCode,
        status: 'pairing',
        createdAt: new Date().toISOString()
      }, null, 2));

      await runAsync(
        `UPDATE connected_accounts SET status = 'pairing', identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [cleanPhone, accountId]
      ).catch(() => {});

      return {
        success: true,
        status: 'pairing',
        pairingCode: formattedCode,
        phoneNumber: cleanPhone,
        expiresInSeconds: 120,
        instructions: [
          '1. Open WhatsApp on your phone',
          '2. Go to Settings > Linked Devices > Link a Device',
          '3. Tap "Link with phone number instead" at the bottom',
          `4. Enter the 8-digit code: ${formattedCode}`
        ]
      };
    } catch (err) {
      console.error('[WhatsAppService] Error requesting pairing code from WhatsApp:', err);
      throw new Error(`WhatsApp Pairing Failed: ${err.message || 'Unable to generate code'}. Make sure phone number includes country code without + (e.g. 919876543210).`);
    }
  }

  /**
   * Generate an authentic WhatsApp Multi-Device QR Code
   */
  async generateRealQR(accountId = 'acc_wa_primary') {
    this.status = 'pairing';

    // Start socket to fetch real live QR from WhatsApp servers
    await this.startBaileysSocket(accountId, false);

    // If QR was already received within the last 20s, return immediately
    if (this.qrCodeData && this.qrDataUrl) {
      return {
        success: true,
        status: this.status,
        qrCode: this.qrCodeData,
        qrDataUrl: this.qrDataUrl,
        message: 'Scan with WhatsApp: Settings → Linked Devices → Link a Device',
        expiresIn: '60 seconds'
      };
    }

    // Wait up to 6 seconds for QR event
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (this.qrCodeData && this.qrDataUrl) {
        return {
          success: true,
          status: this.status,
          qrCode: this.qrCodeData,
          qrDataUrl: this.qrDataUrl,
          message: 'Scan with WhatsApp: Settings → Linked Devices → Link a Device',
          expiresIn: '60 seconds'
        };
      }
    }

    // Fallback if network was slow: return whatever state is currently available
    return {
      success: true,
      status: this.status,
      qrCode: this.qrCodeData || 'Connecting to WhatsApp...',
      qrDataUrl: this.qrDataUrl || null,
      message: 'Generating live WhatsApp QR Code. Please check in 2 seconds.'
    };
  }

  /**
   * Connect session directly (used for simulator or manual activation)
   */
  async connectSession(phoneNumber = '+1 (555) 234-5678', accountId = 'acc_wa_primary', method = 'pairing_code') {
    this.status = 'connected';
    this.qrCodeData = null;
    this.qrDataUrl = null;
    this.activePairingCode = null;

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    this.sessionInfo = {
      accountId,
      phone: cleanPhone || phoneNumber,
      name: `WhatsApp (${phoneNumber})`,
      connectedAt: new Date().toISOString(),
      method
    };

    const accDir = path.join(this.sessionDir, accountId);
    if (!fs.existsSync(accDir)) fs.mkdirSync(accDir, { recursive: true });

    fs.writeFileSync(path.join(accDir, 'active_session.json'), JSON.stringify(this.sessionInfo, null, 2));

    await runAsync(
      `UPDATE connected_accounts SET status = 'connected', identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [phoneNumber, accountId]
    ).catch(() => {});

    await runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_status', 'connected', CURRENT_TIMESTAMP)`
    ).catch(() => {});

    await runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_phone_number', ?, CURRENT_TIMESTAMP)`,
      [phoneNumber]
    ).catch(() => {});

    return {
      success: true,
      status: this.status,
      sessionInfo: this.sessionInfo
    };
  }

  /**
   * Disconnect WhatsApp session
   */
  async disconnect(accountId = 'acc_wa_primary') {
    this.status = 'disconnected';
    this.qrCodeData = null;
    this.qrDataUrl = null;
    this.sessionInfo = null;
    this.activePairingCode = null;
    this.activePairingPhone = null;

    if (this.activeSocket) {
      try {
        if (this.activeSocket.ev?.removeAllListeners) {
          this.activeSocket.ev.removeAllListeners();
        }
        this.activeSocket.end();
      } catch {}
      this.activeSocket = null;
    }

    const accDir = path.join(this.sessionDir, accountId);
    if (fs.existsSync(accDir)) {
      try { fs.rmSync(accDir, { recursive: true, force: true }); } catch (e) {}
    }

    await runAsync(
      `UPDATE connected_accounts SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [accountId]
    ).catch(() => {});

    await runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('whatsapp_status', 'disconnected', CURRENT_TIMESTAMP)`
    ).catch(() => {});

    return { success: true, status: 'disconnected', accountId };
  }
}

module.exports = new WhatsAppService();
