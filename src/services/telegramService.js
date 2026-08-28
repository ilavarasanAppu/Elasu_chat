const axios = require('axios');
const { getAsync, runAsync } = require('../db/database');

class TelegramService {
  constructor() {
    this.botInfo = null;
    this.isPolling = false;
    this.pollingInterval = null;
    this.lastUpdateId = 0;
  }

  async verifyBotToken(token) {
    if (!token || token.trim().length < 10) {
      return { success: false, message: 'Invalid bot token format' };
    }
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 10000 });
      if (res.data?.ok) {
        this.botInfo = res.data.result;
        return { success: true, bot: res.data.result };
      }
      return { success: false, message: 'Telegram returned non-OK response' };
    } catch (e) {
      return { success: false, message: e.response?.data?.description || e.message };
    }
  }

  getStatus() {
    return {
      connected: !!this.botInfo,
      bot: this.botInfo,
      polling: this.isPolling
    };
  }

  startPolling(token, onMessageCallback) {
    if (this.isPolling) return;
    this.isPolling = true;

    this.pollingInterval = setInterval(async () => {
      try {
        const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
          params: { offset: this.lastUpdateId + 1, timeout: 5 },
          timeout: 10000
        });

        if (res.data?.ok && res.data.result?.length > 0) {
          for (const update of res.data.result) {
            this.lastUpdateId = update.update_id;
            if (update.message && update.message.text) {
              const from = update.message.from;
              const text = update.message.text;
              const contactId = `tg_${from.id}`;
              const senderName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || `User ${from.id}`;

              if (onMessageCallback) {
                const reply = await onMessageCallback({
                  contactId,
                  text,
                  platform: 'telegram',
                  senderName
                });

                // Send reply back to Telegram
                if (reply && reply.text) {
                  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                    chat_id: update.message.chat.id,
                    text: reply.text
                  }).catch(err => console.error('TG Send Error:', err.message));
                }
              }
            }
          }
        }
      } catch (err) {
        // Polling error non-blocking
      }
    }, 4000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }
}

module.exports = new TelegramService();
