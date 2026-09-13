const axios = require('axios');
const { getAsync, runAsync } = require('../db/database');
const credentialService = require('./credentialService');

class TelegramService {
  constructor() {
    // Map of accountId -> botState
    // botState: { accountId, token, botInfo, isPolling, lastUpdateId, accountName, mode, autoReply, onMessageCallback }
    this.botPool = new Map();
    this.decisionEngine = null;
  }

  setDecisionEngine(engine) {
    this.decisionEngine = engine;
  }

  /**
   * Verify token validity with Telegram Bot API (getMe)
   */
  async verifyBotToken(token) {
    if (!token || token.trim().length < 10) {
      return { success: false, message: 'Invalid bot token format' };
    }
    const cleanToken = token.trim();
    try {
      const res = await axios.get(`https://api.telegram.org/bot${cleanToken}/getMe`, { timeout: 10000 });
      if (res.data?.ok) {
        return { success: true, bot: res.data.result };
      }
      return { success: false, message: 'Telegram returned non-OK response' };
    } catch (e) {
      return { success: false, message: e.response?.data?.description || e.message };
    }
  }

  /**
   * Get status of a bot or default bot
   */
  getStatus(accountId = 'default') {
    const entry = this.botPool.get(accountId) || this.botPool.get('default');
    if (!entry) {
      return { connected: false, bot: null, polling: false };
    }
    return {
      connected: !!entry.botInfo,
      bot: entry.botInfo,
      polling: entry.isPolling,
      accountId: entry.accountId,
      accountName: entry.accountName
    };
  }

  /**
   * Get status of all active bot instances
   */
  getAllStatuses() {
    const statuses = [];
    for (const [id, entry] of this.botPool.entries()) {
      statuses.push({
        accountId: id,
        accountName: entry.accountName,
        bot: entry.botInfo,
        polling: entry.isPolling,
        connected: !!entry.botInfo
      });
    }
    return statuses;
  }

  /**
   * Start polling for a specific bot account in the pool
   */
  async startBot({ accountId = 'default', token, accountName = 'Telegram Bot', mode = 'personal', autoReply = true, onMessageCallback = null }) {
    let resolvedToken = token;
    if (!resolvedToken || typeof resolvedToken !== 'string' || resolvedToken.trim().length < 10) {
      resolvedToken = credentialService.getTelegramToken(accountId) || credentialService.getTelegramToken('default');
    }
    if (!resolvedToken || resolvedToken.trim().length < 10) {
      throw new Error('Valid Telegram Bot Token is required');
    }
    const cleanToken = resolvedToken.trim();

    // Verify token first
    const verifyRes = await this.verifyBotToken(cleanToken);
    if (!verifyRes.success) {
      throw new Error(`Telegram verification failed: ${verifyRes.message}`);
    }

    // Persist token in local credentials/ folder
    credentialService.saveTelegramToken(accountId, cleanToken);

    // Stop existing instance for this account if running
    this.stopBot(accountId);

    // Clean up any lingering webhooks to avoid 409 Conflict with getUpdates
    try {
      await axios.get(`https://api.telegram.org/bot${cleanToken}/deleteWebhook?drop_pending_updates=false`, { timeout: 8000 });
      console.log(`[TelegramService] Webhook cleared for bot @${verifyRes.bot.username}`);
    } catch (whErr) {
      console.warn(`[TelegramService] Notice on deleteWebhook:`, whErr.message);
    }

    const botEntry = {
      accountId,
      token: cleanToken,
      botInfo: verifyRes.bot,
      isPolling: true,
      lastUpdateId: 0,
      accountName,
      mode,
      autoReply,
      onMessageCallback
    };

    this.botPool.set(accountId, botEntry);

    // Save status in connected_accounts if present
    runAsync(`UPDATE connected_accounts SET status = 'connected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [accountId]).catch(() => {});

    console.log(`[TelegramService] Started sequential long-polling for bot @${verifyRes.bot.username} (Account: ${accountId})`);

    // Sequential non-overlapping long-polling loop
    const pollLoop = async () => {
      if (!botEntry.isPolling) return;

      try {
        const res = await axios.get(`https://api.telegram.org/bot${botEntry.token}/getUpdates`, {
          params: {
            offset: botEntry.lastUpdateId ? botEntry.lastUpdateId + 1 : undefined,
            timeout: 15
          },
          timeout: 25000
        });

        if (res.data?.ok && Array.isArray(res.data.result) && res.data.result.length > 0) {
          for (const update of res.data.result) {
            botEntry.lastUpdateId = Math.max(botEntry.lastUpdateId, update.update_id);
            if (update.message && update.message.text) {
              await this.handleIncomingMessage(botEntry, update.message);
            }
          }
        }
      } catch (err) {
        if (!botEntry.isPolling) return;

        const statusCode = err.response?.status;
        const desc = err.response?.data?.description || err.message;

        if (statusCode === 409) {
          console.warn(`[TelegramService] 409 Conflict for @${botEntry.botInfo?.username} (${desc}). Clearing webhook and waiting 4s...`);
          try {
            await axios.get(`https://api.telegram.org/bot${botEntry.token}/deleteWebhook`);
          } catch (e) {}
          await new Promise(r => setTimeout(r, 4000));
        } else if (statusCode === 401) {
          console.error(`[TelegramService] 401 Unauthorized for bot @${botEntry.botInfo?.username}. Stopping polling.`);
          this.stopBot(accountId);
          return;
        } else {
          // Normal timeout or network hiccup, brief backoff
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (botEntry.isPolling) {
        setImmediate(pollLoop);
      }
    };

    // Kick off sequential loop
    pollLoop();

    return {
      success: true,
      bot: verifyRes.bot,
      accountId,
      polling: true
    };
  }

  /**
   * Handle incoming message from Telegram
   */
  async handleIncomingMessage(botEntry, message) {
    const from = message.from || {};
    const chat = message.chat || {};
    const text = message.text || '';
    if (!text) return;

    const contactId = `tg_${from.id}`;
    const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || `User ${from.id}`;

    console.log(`[TelegramService] Incoming message from ${senderName} (${contactId}) on @${botEntry.botInfo?.username}: "${text}"`);

    let reply = null;

    // Use custom callback or default decision engine
    if (botEntry.onMessageCallback) {
      reply = await botEntry.onMessageCallback({
        contactId,
        text,
        platform: 'telegram',
        senderName,
        chatId: chat.id,
        accountId: botEntry.accountId,
        mode: botEntry.mode
      });
    } else if (this.decisionEngine) {
      reply = await this.decisionEngine.processIncomingMessage({
        contactId,
        text,
        platform: 'telegram',
        senderName
      });
    }

    // Send auto-reply back to Telegram chat if autoReply is enabled
    if (botEntry.autoReply !== false && reply && reply.text) {
      try {
        await this.sendMessage(chat.id, reply.text, botEntry.accountId);
        console.log(`[TelegramService] Sent auto-reply to ${chat.id}: "${reply.text.substring(0, 50)}..."`);
      } catch (sendErr) {
        console.error(`[TelegramService] Failed to send Telegram auto-reply to ${chat.id}:`, sendErr.message);
      }
    }
  }

  /**
   * Send a direct message to a Telegram chat via Telegram Bot API
   */
  async sendMessage(chatId, text, accountId = null) {
    if (!chatId) throw new Error('Telegram chatId is required to send message.');
    if (!text) throw new Error('Message text cannot be empty.');

    // 1. Locate active bot from botPool
    let botEntry = null;
    if (accountId) {
      botEntry = this.botPool.get(accountId);
    }
    if (!botEntry) {
      const activeEntries = Array.from(this.botPool.values()).filter(b => b.isPolling);
      if (activeEntries.length > 0) {
        botEntry = activeEntries[0];
      } else {
        const anyEntries = Array.from(this.botPool.values());
        if (anyEntries.length > 0) botEntry = anyEntries[0];
      }
    }

    // 2. Fallback to credentialService, settings, or connected_accounts if botPool doesn't have an active instance
    let token = botEntry?.token;
    if (!token) {
      token = credentialService.getTelegramToken(accountId) || credentialService.getTelegramToken('default');
    }

    if (!token) {
      const row = await getAsync(`SELECT value FROM settings WHERE key = 'telegram_bot_token'`);
      if (row && row.value && row.value.trim().length > 10) {
        token = row.value.trim();
        credentialService.saveTelegramToken(accountId, token);
      }
    }

    if (!token) {
      const accRow = await getAsync(`SELECT credentials FROM connected_accounts WHERE platform = 'telegram' AND status = 'connected' LIMIT 1`);
      if (accRow && accRow.credentials) {
        try {
          const creds = JSON.parse(accRow.credentials);
          if (creds.token) {
            token = creds.token.trim();
            credentialService.saveTelegramToken(accountId, token);
          }
        } catch {}
      }
    }

    if (!token || token.trim().length < 10) {
      throw new Error('No active Telegram bot or token configured. Please configure your bot token in Settings.');
    }

    const cleanToken = token.trim();
    const cleanChatId = String(chatId).replace(/^tg_/, '').trim();

    const res = await axios.post(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      chat_id: cleanChatId,
      text: text
    }, { timeout: 10000 });

    if (!res.data || !res.data.ok) {
      throw new Error(res.data?.description || 'Telegram API returned non-OK response');
    }

    console.log(`[TelegramService] Outgoing message delivered to Telegram chat ${cleanChatId} (msg_id: ${res.data.result?.message_id})`);
    return {
      success: true,
      messageId: res.data.result?.message_id,
      chatId: cleanChatId,
      result: res.data.result
    };
  }

  /**
   * Stop polling for a specific bot account
   */
  stopBot(accountId = 'default') {
    const entry = this.botPool.get(accountId);
    if (entry) {
      entry.isPolling = false;
      this.botPool.delete(accountId);
      console.log(`[TelegramService] Stopped polling for account: ${accountId}`);
      runAsync(`UPDATE connected_accounts SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [accountId]).catch(() => {});
      return true;
    }
    return false;
  }

  // Backward compatibility alias for single bot start
  async startPolling(token, onMessageCallback) {
    return await this.startBot({
      accountId: 'default',
      token,
      onMessageCallback
    });
  }

  // Backward compatibility alias for single bot stop
  stopPolling() {
    return this.stopBot('default');
  }
}

module.exports = new TelegramService();
