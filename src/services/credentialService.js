const fs = require('fs');
const path = require('path');

/**
 * CredentialService - Centralized Local Credential Management
 * 
 * Ensures all sensitive authentication details (Telegram bot tokens,
 * WhatsApp auth keys/sessions, API keys, etc.) are stored strictly
 * on the local filesystem inside the isolated 'credentials/' folder.
 * 
 * Never committed or pushed to remote repositories.
 */
class CredentialService {
  constructor() {
    this.rootDir = path.join(__dirname, '../../');
    this.credentialsDir = path.join(this.rootDir, 'credentials');
    this.whatsappDir = path.join(this.credentialsDir, 'whatsapp');
    this.telegramFile = path.join(this.credentialsDir, 'telegram.json');
    this.keysFile = path.join(this.credentialsDir, 'keys.json');
    this.legacyWhatsAppDir = path.join(this.rootDir, 'whatsapp_sessions');

    this.initDirectories();
    this.migrateLegacyData();
  }

  /**
   * Initialize credentials directory structure
   */
  initDirectories() {
    try {
      if (!fs.existsSync(this.credentialsDir)) {
        fs.mkdirSync(this.credentialsDir, { recursive: true });
      }
      if (!fs.existsSync(this.whatsappDir)) {
        fs.mkdirSync(this.whatsappDir, { recursive: true });
      }

      // Redundant safety .gitignore inside credentials/ folder
      const credsGitignore = path.join(this.credentialsDir, '.gitignore');
      if (!fs.existsSync(credsGitignore)) {
        fs.writeFileSync(credsGitignore, "# Strictly Local Credentials - Never commit or push\n*\n!.gitignore\n!README.md\n", 'utf8');
      }

      // Explanatory README inside credentials/
      const credsReadme = path.join(this.credentialsDir, 'README.md');
      if (!fs.existsSync(credsReadme)) {
        fs.writeFileSync(
          credsReadme,
          '# Local Credentials Storage\n\n' +
          'All sensitive authentication credentials, WhatsApp Baileys session states,\n' +
          'Telegram bot tokens, and API keys are stored strictly in this directory.\n' +
          'This folder is ignored by git to protect private secrets from exposure on GitHub.\n',
          'utf8'
        );
      }
    } catch (err) {
      console.error('[CredentialService] Error initializing credentials directory:', err.message);
    }
  }

  /**
   * Automatically migrate existing sessions from legacy whatsapp_sessions/ if present
   */
  migrateLegacyData() {
    try {
      if (fs.existsSync(this.legacyWhatsAppDir)) {
        const items = fs.readdirSync(this.legacyWhatsAppDir);
        for (const item of items) {
          const srcPath = path.join(this.legacyWhatsAppDir, item);
          const destPath = path.join(this.whatsappDir, item);
          const stat = fs.statSync(srcPath);

          if (stat.isDirectory()) {
            if (!fs.existsSync(destPath)) {
              fs.cpSync(srcPath, destPath, { recursive: true });
              console.log(`[CredentialService] Migrated WhatsApp session folder: ${item} -> credentials/whatsapp/${item}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[CredentialService] Notice on legacy migration: ${err.message}`);
    }
  }

  /**
   * Get WhatsApp session base directory
   */
  getWhatsAppDir() {
    if (!fs.existsSync(this.whatsappDir)) {
      fs.mkdirSync(this.whatsappDir, { recursive: true });
    }
    return this.whatsappDir;
  }

  /**
   * Get specific WhatsApp account directory
   */
  getWhatsAppAccountDir(accountId = 'acc_wa_primary') {
    const accDir = path.join(this.whatsappDir, accountId);
    if (!fs.existsSync(accDir)) {
      fs.mkdirSync(accDir, { recursive: true });
    }
    return accDir;
  }

  /**
   * Read stored Telegram tokens from credentials/telegram.json
   */
  readTelegramConfig() {
    try {
      if (fs.existsSync(this.telegramFile)) {
        const raw = fs.readFileSync(this.telegramFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[CredentialService] Notice reading telegram.json: ${err.message}`);
    }
    return { default: '', accounts: {}, lastUpdated: null };
  }

  /**
   * Save or update Telegram token for an account
   */
  saveTelegramToken(accountId = 'default', token = '') {
    if (!token || typeof token !== 'string') return;
    const cleanToken = token.trim();
    if (!cleanToken) return;

    try {
      const config = this.readTelegramConfig();
      if (!config.accounts) config.accounts = {};

      config.accounts[accountId] = cleanToken;
      if (accountId === 'default' || !config.default) {
        config.default = cleanToken;
      }
      config.lastUpdated = new Date().toISOString();

      fs.writeFileSync(this.telegramFile, JSON.stringify(config, null, 2), 'utf8');
      console.log(`[CredentialService] Saved Telegram token locally for account: ${accountId}`);
    } catch (err) {
      console.error(`[CredentialService] Error saving Telegram token:`, err.message);
    }
  }

  /**
   * Retrieve Telegram token for an account (with fallback to default)
   */
  getTelegramToken(accountId = 'default') {
    const config = this.readTelegramConfig();
    if (config.accounts && config.accounts[accountId]) {
      return config.accounts[accountId];
    }
    if (config.default) {
      return config.default;
    }
    return null;
  }

  /**
   * Retrieve all stored Telegram tokens
   */
  getAllTelegramTokens() {
    const config = this.readTelegramConfig();
    return config.accounts || {};
  }

  /**
   * Read general API keys from credentials/keys.json
   */
  readKeysConfig() {
    try {
      if (fs.existsSync(this.keysFile)) {
        return JSON.parse(fs.readFileSync(this.keysFile, 'utf8'));
      }
    } catch {}
    return {};
  }

  /**
   * Save an API key locally
   */
  saveApiKey(serviceName, key) {
    if (!serviceName || !key) return;
    try {
      const keys = this.readKeysConfig();
      keys[serviceName] = key.trim();
      keys.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.keysFile, JSON.stringify(keys, null, 2), 'utf8');
    } catch (err) {
      console.error(`[CredentialService] Error saving API key for ${serviceName}:`, err.message);
    }
  }

  /**
   * Retrieve an API key locally
   */
  getApiKey(serviceName) {
    const keys = this.readKeysConfig();
    return keys[serviceName] || process.env[`${serviceName.toUpperCase()}_API_KEY`] || null;
  }
}

module.exports = new CredentialService();
