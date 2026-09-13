const { allAsync, getAsync, runAsync } = require('../db/database');

class AccountService {
  /**
   * Retrieve all connected accounts with parsed credentials
   */
  async getAllAccounts() {
    const rows = await allAsync(`SELECT * FROM connected_accounts ORDER BY created_at ASC`);
    return rows.map(r => {
      let creds = {};
      try {
        creds = typeof r.credentials === 'string' ? JSON.parse(r.credentials || '{}') : (r.credentials || {});
      } catch (e) {
        creds = {};
      }
      return {
        id: r.id,
        platform: r.platform,
        accountName: r.account_name,
        identifier: r.identifier,
        credentials: creds,
        mode: r.mode || 'personal',
        autoReply: !!r.auto_reply,
        status: r.status || 'disconnected',
        isActive: !!r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id) {
    const row = await getAsync(`SELECT * FROM connected_accounts WHERE id = ?`, [id]);
    if (!row) return null;
    let creds = {};
    try {
      creds = typeof row.credentials === 'string' ? JSON.parse(row.credentials || '{}') : (row.credentials || {});
    } catch (e) {
      creds = {};
    }
    return {
      id: row.id,
      platform: row.platform,
      accountName: row.account_name,
      identifier: row.identifier,
      credentials: creds,
      mode: row.mode || 'personal',
      autoReply: !!row.auto_reply,
      status: row.status || 'disconnected',
      isActive: !!row.is_active
    };
  }

  /**
   * Add a new account
   */
  async addAccount({ platform, accountName, identifier, credentials = {}, mode = 'personal', autoReply = true }) {
    if (!platform || !accountName) {
      throw new Error('Platform and Account Name are required');
    }

    const id = `acc_${platform.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const credString = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
    const autoReplyVal = autoReply ? 1 : 0;

    await runAsync(
      `INSERT INTO connected_accounts (id, platform, account_name, identifier, credentials, mode, auto_reply, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'disconnected', 1)`,
      [id, platform.toLowerCase(), accountName.trim(), (identifier || '').trim(), credString, mode, autoReplyVal]
    );

    return await this.getAccountById(id);
  }

  /**
   * Update existing account
   */
  async updateAccount(id, updates = {}) {
    const existing = await this.getAccountById(id);
    if (!existing) throw new Error(`Account ${id} not found`);

    const fields = [];
    const params = [];

    if (updates.accountName !== undefined) {
      fields.push('account_name = ?');
      params.push(updates.accountName);
    }
    if (updates.identifier !== undefined) {
      fields.push('identifier = ?');
      params.push(updates.identifier);
    }
    if (updates.credentials !== undefined) {
      fields.push('credentials = ?');
      params.push(typeof updates.credentials === 'string' ? updates.credentials : JSON.stringify(updates.credentials));
    }
    if (updates.mode !== undefined) {
      fields.push('mode = ?');
      params.push(updates.mode);
    }
    if (updates.autoReply !== undefined) {
      fields.push('auto_reply = ?');
      params.push(updates.autoReply ? 1 : 0);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await runAsync(`UPDATE connected_accounts SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    return await this.getAccountById(id);
  }

  /**
   * Delete an account
   */
  async deleteAccount(id) {
    const account = await this.getAccountById(id);
    if (!account) return { success: false, message: 'Account not found' };

    // Stop active service instances if Telegram
    if (account.platform === 'telegram') {
      try {
        const telegramService = require('./telegramService');
        telegramService.stopBot(id);
      } catch (e) {}
    }

    await runAsync(`DELETE FROM connected_accounts WHERE id = ?`, [id]);
    return { success: true, id };
  }

  /**
   * Toggle auto-reply for an account
   */
  async toggleAutoReply(id) {
    const account = await this.getAccountById(id);
    if (!account) throw new Error('Account not found');
    const newState = !account.autoReply;
    await runAsync(`UPDATE connected_accounts SET auto_reply = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newState ? 1 : 0, id]);
    return { id, autoReply: newState };
  }

  /**
   * Start and restore all active accounts on server boot
   */
  async startAllActiveAccounts(decisionEngine) {
    try {
      const accounts = await this.getAllAccounts();
      const telegramService = require('./telegramService');
      if (decisionEngine) {
        telegramService.setDecisionEngine(decisionEngine);
      }

      for (const acc of accounts) {
        if (!acc.isActive) continue;

        // Auto-start Telegram bots with tokens
        if (acc.platform === 'telegram') {
          const token = acc.credentials?.token;
          if (token && token.trim().length > 10) {
            console.log(`[AccountService] Auto-starting Telegram bot for account: ${acc.accountName} (${acc.identifier})`);
            const tryStart = (retries = 3) => {
              telegramService.startBot({
                accountId: acc.id,
                token: token.trim(),
                accountName: acc.accountName,
                mode: acc.mode,
                autoReply: acc.autoReply,
                onMessageCallback: async (msg) => {
                  return await decisionEngine.processIncomingMessage({
                    contactId: msg.contactId,
                    text: msg.text,
                    platform: 'telegram',
                    senderName: msg.senderName,
                    initialMode: acc.mode
                  });
                }
              }).catch(err => {
                if (retries > 1) {
                  console.warn(`[AccountService] Notice: Retrying Telegram bot ${acc.id} in 3s (${err.message})...`);
                  setTimeout(() => tryStart(retries - 1), 3000);
                } else {
                  console.warn(`[AccountService] Failed to auto-start Telegram bot ${acc.id}:`, err.message);
                }
              });
            };
            tryStart();
          }
        }
      }
    } catch (err) {
      console.warn('[AccountService] Error restoring active accounts:', err.message);
    }
  }
}

module.exports = new AccountService();
