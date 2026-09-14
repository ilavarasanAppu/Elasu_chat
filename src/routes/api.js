const express = require('express');
const multer = require('multer');
const axios = require('axios');
const router = express.Router();

const { getDb, runAsync, allAsync, getAsync } = require('../db/database');
const llmService = require('../services/llmService');
const ragService = require('../services/ragService');
const personalityService = require('../services/personalityService');
const decisionEngine = require('../services/decisionEngine');
const whatsappService = require('../services/whatsappService');
const telegramService = require('../services/telegramService');
const signalService = require('../services/signalService');
const voiceService = require('../services/voiceService');
const accountService = require('../services/accountService');
const credentialService = require('../services/credentialService');

// Multer memory storage for chat & doc uploads
const upload = multer({ storage: multer.memoryStorage() });

// --- 1. Health, Schema & OpenAPI ---
router.get('/health', async (req, res) => {
  const settings = await llmService.getSettings();
  res.json({
    status: 'ok',
    app: 'GhostReply Dual-Mode Assistant',
    version: '1.0.0',
    active_provider: settings.active_provider || 'mock',
    timestamp: new Date().toISOString()
  });
});

// Serve OpenAPI Specification directly for AI Automation tools (Zapier, n8n, Make, Swagger)
router.get('/openapi.json', (req, res) => {
  const openApiPath = require('path').join(__dirname, '../../schema/openapi.json');
  if (require('fs').existsSync(openApiPath)) {
    res.sendFile(openApiPath);
  } else {
    res.status(404).json({ error: 'OpenAPI specification not found' });
  }
});

// Serve JSON Schema for Webhook Automation
router.get('/schema/automation', (req, res) => {
  const schemaPath = require('path').join(__dirname, '../../schema/automation-schema.json');
  if (require('fs').existsSync(schemaPath)) {
    res.sendFile(schemaPath);
  } else {
    res.status(404).json({ error: 'Automation schema not found' });
  }
});

// --- Webhook Trigger for AI Automation (Zapier, n8n, Make, Flowise, Custom APIs) ---
router.post('/webhook/trigger', async (req, res) => {
  try {
    const { contactId, senderName, text, platform, forceMode } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Field "text" is required.' });
    }

    const cid = contactId || 'webhook_client';
    
    // If forceMode provided, ensure contact exists with that mode
    if (forceMode) {
      let existing = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [cid]);
      if (existing) {
        await runAsync(`UPDATE contacts SET mode = ? WHERE id = ?`, [forceMode, cid]);
      } else {
        await runAsync(
          `INSERT INTO contacts (id, name, handle, avatar, platform, mode, auto_reply, delay_mode, delay_seconds)
           VALUES (?, ?, ?, '🤖', ?, ?, 1, 'immediate', 1)`,
          [cid, senderName || 'Webhook User', cid, platform || 'webhook', forceMode]
        );
      }
    }

    const result = await decisionEngine.processIncomingMessage({
      contactId: cid,
      text,
      senderName: senderName || 'Webhook User',
      platform: platform || 'webhook',
      dispatchToApi: true
    });

    res.json({
      success: true,
      reply: result.text,
      mode: result.mode,
      escalated: !!result.escalated,
      escalationReason: result.reason || null,
      provider: result.provider,
      model: result.model,
      delaySimulatedMs: result.delaySimulatedMs || 0,
      processingTimeMs: result.processingTimeMs || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 2. System Settings & Provider Configuration ---
router.get('/settings', async (req, res) => {
  try {
    const settings = await llmService.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await runAsync(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [key, String(value)]
      );

      // Persist credentials in local credentials folder
      if (key === 'telegram_bot_token' && value) {
        credentialService.saveTelegramToken('default', String(value));
      } else if (key.endsWith('_api_key') && value) {
        credentialService.saveApiKey(key.replace('_api_key', ''), String(value));
      }
    }
    const settings = await llmService.getSettings();
    res.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/provider/test', async (req, res) => {
  try {
    const { provider, config } = req.body;
    const result = await llmService.testConnection(provider, config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Test live AI model response generation & working confirmation
router.post('/provider/test-live', async (req, res) => {
  try {
    const { provider, config } = req.body;
    const result = await llmService.testLiveGeneration(provider, config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, isFallback: true });
  }
});

// Fetch available models from a provider API
router.post('/provider/models', async (req, res) => {
  try {
    const { provider, config } = req.body;
    const result = await llmService.fetchModels(provider, config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, models: [] });
  }
});

// --- Debug Telemetry Endpoints ---
router.get('/debug/latest', (req, res) => {
  try {
    const debug = llmService.getLastDebugInfo();
    res.json({
      success: true,
      debug: debug || null,
      message: debug ? 'Latest debug trace retrieved' : 'No debug trace recorded yet'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/debug/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await getAsync(`SELECT id, direction, sender_name, text, mode, metadata, timestamp FROM messages WHERE id = ?`, [messageId]);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    let metadata = {};
    if (msg.metadata) {
      try {
        metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
      } catch (e) {}
    }
    res.json({
      success: true,
      messageId: msg.id,
      text: msg.text,
      metadata,
      debug: metadata.debug || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 3. Contacts Management ---
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await allAsync(`
      SELECT c.*, p.formality_level, p.humor_type, p.avg_message_length
      FROM contacts c
      LEFT JOIN personality_profiles p ON c.id = p.contact_id
      ORDER BY c.last_active DESC
    `);
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const { name, handle, avatar, platform, mode, relationship_type, delay_mode, delay_seconds } = req.body;
    const id = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    await runAsync(
      `INSERT INTO contacts (id, name, handle, avatar, platform, mode, relationship_type, delay_mode, delay_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name || 'New Contact',
        handle || '',
        avatar || '👤',
        platform || 'simulator',
        mode || 'personal',
        relationship_type || 'friend',
        delay_mode || 'natural',
        delay_seconds || 3
      ]
    );

    // Create default personality profile
    const defaultProf = personalityService.getDefaultProfile();
    await runAsync(
      `INSERT INTO personality_profiles (contact_id, formality_level, avg_message_length, primary_language, abbreviation_map, excitement_markers, favorite_emojis, emoji_frequency, humor_type, intimacy_level, inside_jokes, few_shot_examples)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        defaultProf.formality_level,
        defaultProf.avg_message_length,
        defaultProf.primary_language,
        defaultProf.abbreviation_map,
        defaultProf.excitement_markers,
        defaultProf.favorite_emojis,
        defaultProf.emoji_frequency,
        defaultProf.humor_type,
        defaultProf.intimacy_level,
        defaultProf.inside_jokes,
        defaultProf.few_shot_examples
      ]
    );

    const created = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json({ success: true, contact: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, handle, avatar, mode, auto_reply, delay_mode, delay_seconds, relationship_type, escalation_contact,
      notifications_enabled, chat_font, chat_theme, chat_background, chat_font_size, chat_bubble_style
    } = req.body;

    const existing = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Contact not found' });

    const updatedName = name !== undefined ? name : existing.name;
    const updatedHandle = handle !== undefined ? handle : existing.handle;
    const updatedAvatar = avatar !== undefined ? avatar : existing.avatar;
    const updatedMode = mode !== undefined ? mode : existing.mode;
    const updatedAutoReply = auto_reply !== undefined ? (auto_reply ? 1 : 0) : existing.auto_reply;
    const updatedDelayMode = delay_mode !== undefined ? delay_mode : existing.delay_mode;
    const updatedDelaySec = delay_seconds !== undefined ? Number(delay_seconds) : existing.delay_seconds;
    const updatedRelType = relationship_type !== undefined ? relationship_type : existing.relationship_type;
    const updatedEscContact = escalation_contact !== undefined ? escalation_contact : existing.escalation_contact;
    const updatedNotif = notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : (existing.notifications_enabled !== undefined ? existing.notifications_enabled : 1);
    const updatedFont = chat_font !== undefined ? chat_font : (existing.chat_font || 'Inter');
    const updatedTheme = chat_theme !== undefined ? chat_theme : (existing.chat_theme || 'emerald');
    const updatedBg = chat_background !== undefined ? chat_background : (existing.chat_background || 'doodle');
    const updatedFontSize = chat_font_size !== undefined ? chat_font_size : (existing.chat_font_size || 'medium');
    const updatedBubbleStyle = chat_bubble_style !== undefined ? chat_bubble_style : (existing.chat_bubble_style || 'rounded');

    await runAsync(
      `UPDATE contacts SET 
        name = ?,
        handle = ?,
        avatar = ?,
        mode = ?,
        auto_reply = ?,
        delay_mode = ?,
        delay_seconds = ?,
        relationship_type = ?,
        escalation_contact = ?,
        notifications_enabled = ?,
        chat_font = ?,
        chat_theme = ?,
        chat_background = ?,
        chat_font_size = ?,
        chat_bubble_style = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedHandle,
        updatedAvatar,
        updatedMode,
        updatedAutoReply,
        updatedDelayMode,
        updatedDelaySec,
        updatedRelType,
        updatedEscContact,
        updatedNotif,
        updatedFont,
        updatedTheme,
        updatedBg,
        updatedFontSize,
        updatedBubbleStyle,
        id
      ]
    );

    const updated = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json({ success: true, contact: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM messages WHERE contact_id = ?`, [id]);
    await runAsync(`DELETE FROM personality_profiles WHERE contact_id = ?`, [id]);
    await runAsync(`DELETE FROM escalations WHERE contact_id = ?`, [id]);
    await runAsync(`DELETE FROM contacts WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Contact and all related chat history deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 4. Messages History ---
router.get('/contacts/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await allAsync(
      `SELECT * FROM messages WHERE contact_id = ? ORDER BY timestamp ASC LIMIT 80`,
      [id]
    );
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear Chat: Delete all messages for a specific contact while keeping the contact
router.delete('/contacts/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM messages WHERE contact_id = ?`, [id]);
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 5. Personality Profile Management ---
router.get('/contacts/:id/personality', async (req, res) => {
  try {
    const { id } = req.params;
    let profile = await getAsync(`SELECT * FROM personality_profiles WHERE contact_id = ?`, [id]);
    if (!profile) {
      profile = personalityService.getDefaultProfile();
      profile.contact_id = id;
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/contacts/:id/personality', async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;

    await runAsync(
      `INSERT OR REPLACE INTO personality_profiles 
       (contact_id, formality_level, avg_message_length, primary_language, code_switching, typo_patterns, abbreviation_map, excitement_markers, favorite_emojis, emoji_frequency, humor_type, intimacy_level, inside_jokes, few_shot_examples, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        p.formality_level ?? 0.2,
        p.avg_message_length ?? 8,
        p.primary_language || 'en',
        p.code_switching || 'none',
        typeof p.typo_patterns === 'object' ? JSON.stringify(p.typo_patterns) : (p.typo_patterns || '[]'),
        typeof p.abbreviation_map === 'object' ? JSON.stringify(p.abbreviation_map) : (p.abbreviation_map || '{}'),
        typeof p.excitement_markers === 'object' ? JSON.stringify(p.excitement_markers) : (p.excitement_markers || '[]'),
        typeof p.favorite_emojis === 'object' ? JSON.stringify(p.favorite_emojis) : (p.favorite_emojis || '[]'),
        p.emoji_frequency ?? 0.7,
        p.humor_type || 'playful-banter',
        p.intimacy_level ?? 0.7,
        typeof p.inside_jokes === 'object' ? JSON.stringify(p.inside_jokes) : (p.inside_jokes || '[]'),
        typeof p.few_shot_examples === 'object' ? JSON.stringify(p.few_shot_examples) : (p.few_shot_examples || '[]'),
        p.notes || ''
      ]
    );

    const updated = await getAsync(`SELECT * FROM personality_profiles WHERE contact_id = ?`, [id]);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload & Parse WhatsApp / Telegram Chat File
router.post('/personality/upload-chat', upload.single('chatFile'), async (req, res) => {
  try {
    const file = req.file;
    const { contactId, primaryUser } = req.body;
    if (!file) return res.status(400).json({ success: false, message: 'No chat file uploaded' });

    const rawContent = file.buffer.toString('utf-8');
    let parsedMessages = [];

    if (file.originalname.endsWith('.json')) {
      // Telegram Export format
      try {
        const json = JSON.parse(rawContent);
        const list = json.messages || json.chats?.list?.[0]?.messages || [];
        parsedMessages = list.filter(m => m.type === 'message' && typeof m.text === 'string').map(m => ({
          date: m.date,
          time: '',
          sender: m.from || m.actor || 'User',
          text: m.text,
          isUser: primaryUser ? (m.from || '').toLowerCase().includes(primaryUser.toLowerCase()) : false
        }));
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid Telegram JSON format' });
      }
    } else {
      // WhatsApp Export .txt format
      parsedMessages = personalityService.parseWhatsAppChat(rawContent, primaryUser);
    }

    if (parsedMessages.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not extract valid chat turns from file.' });
    }

    const contact = contactId ? await getAsync(`SELECT * FROM contacts WHERE id = ?`, [contactId]) : null;
    const contactName = contact ? contact.name : 'Target Contact';

    const analysis = personalityService.analyzeChatHistory(parsedMessages, contactName, primaryUser || 'Alex');

    if (contactId) {
      // Persist to contact
      await runAsync(
        `INSERT OR REPLACE INTO personality_profiles 
         (contact_id, formality_level, avg_message_length, primary_language, code_switching, typo_patterns, abbreviation_map, excitement_markers, favorite_emojis, emoji_frequency, humor_type, intimacy_level, inside_jokes, few_shot_examples, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          contactId,
          analysis.formality_level,
          analysis.avg_message_length,
          analysis.primary_language,
          analysis.code_switching,
          analysis.typo_patterns,
          analysis.abbreviation_map,
          analysis.excitement_markers,
          analysis.favorite_emojis,
          analysis.emoji_frequency,
          analysis.humor_type,
          analysis.intimacy_level,
          analysis.inside_jokes,
          analysis.few_shot_examples
        ]
      );
    }

    res.json({
      success: true,
      message: `Parsed ${parsedMessages.length} chat turns successfully!`,
      turnsCount: parsedMessages.length,
      analysis
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 6. RAG Knowledge Base ---
router.get('/knowledge', async (req, res) => {
  try {
    const docs = await allAsync(`
      SELECT d.*, COUNT(c.id) as chunk_count
      FROM knowledge_docs d
      LEFT JOIN knowledge_chunks c ON d.id = c.doc_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/knowledge', async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const chunks = ragService.chunkText(content, 350, 60);

    await runAsync(
      `INSERT INTO knowledge_docs (id, title, category, content, chunk_count) VALUES (?, ?, ?, ?, ?)`,
      [docId, title, category || 'general', content, chunks.length]
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `chunk_${docId}_${i}`;
      await runAsync(
        `INSERT INTO knowledge_chunks (id, doc_id, chunk_index, content, keywords) VALUES (?, ?, ?, ?, ?)`,
        [chunkId, docId, i, chunks[i], title.toLowerCase()]
      );
    }

    const created = await getAsync(`SELECT * FROM knowledge_docs WHERE id = ?`, [docId]);
    res.json({ success: true, document: created, chunksCreated: chunks.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM knowledge_chunks WHERE doc_id = ?`, [id]);
    await runAsync(`DELETE FROM knowledge_docs WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Document deleted from knowledge base.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rag/test-query', async (req, res) => {
  try {
    const { query, topK } = req.body;
    const results = await ragService.queryKnowledgeBase(query, topK || 3);
    const escalation = ragService.checkEscalationTriggers(query);
    res.json({ success: true, results, escalation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 7. Live Chat Simulation Pipeline (STUDIO ONLY - NEVER SENDS TO EXTERNAL APIS) ---
router.post('/chat/simulate', async (req, res) => {
  try {
    const { contactId, text, senderName, dispatchToApi } = req.body;
    if (!contactId || !text) {
      return res.status(400).json({ success: false, message: 'contactId and text are required.' });
    }

    const contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    const isRealPlatformContact = contact && (contact.platform === 'telegram' || contact.platform === 'whatsapp' || contact.platform === 'signal' || contact.id.startsWith('tg_') || contact.id.startsWith('wa_'));
    const shouldDispatch = dispatchToApi !== undefined ? Boolean(dispatchToApi) : Boolean(isRealPlatformContact);

    const result = await decisionEngine.processIncomingMessage({
      contactId,
      text,
      senderName,
      platform: contact?.platform || 'simulator',
      dispatchToApi: shouldDispatch
    });

    res.json({ success: true, simulatedOnly: !shouldDispatch, dispatched: Boolean(result?.dispatched), result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Normal Send: Direct Outgoing Response from Owner or AI (USES TELEGRAM/WHATSAPP APIS) ---
router.post('/chat/send', async (req, res) => {
  try {
    const { contactId, text, senderName, mode } = req.body;
    if (!contactId || !text) {
      return res.status(400).json({ success: false, message: 'contactId and text are required.' });
    }

    const contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    const settings = await llmService.getSettings();
    const effectiveSender = senderName || settings.user_name || 'GhostReply (Owner)';
    const effectiveMode = mode || contact.mode || 'personal';
    const messageId = `msg_owner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const metadata = JSON.stringify({
      isManual: true,
      sender: 'owner',
      provider: 'Owner / Direct',
      model: 'manual-response'
    });

    // 1. Insert outgoing message in SQLite
    await runAsync(
      `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status, timestamp)
       VALUES (?, ?, 'outgoing', ?, ?, ?, ?, 'delivered', ?)`,
      [messageId, contactId, effectiveSender, text, effectiveMode, metadata, nowIso]
    );

    // 2. Update contact last_active
    await runAsync(`UPDATE contacts SET last_active = ? WHERE id = ?`, [nowIso, contactId]);

    const payload = {
      messageId,
      contactId,
      contactName: contact.name,
      direction: 'outgoing',
      sender_name: effectiveSender,
      text,
      mode: effectiveMode,
      provider: 'Owner / Direct',
      model: 'manual-response',
      timestamp: nowIso
    };

    // 3. Broadcast to all active WebSockets for instant UI reflection
    decisionEngine.broadcast('message_sent', payload);

    // 4. Dispatch via Telegram Bot API or WhatsApp API if this is a real messaging platform contact
    let telegramDispatch = { attempted: false, success: false, error: null };
    let whatsappDispatch = { attempted: false, success: false, error: null };

    // Check if this contact is a Telegram contact
    const isTelegram = contactId.startsWith('tg_') || 
                       contact.platform === 'telegram' || 
                       (contact.handle && contact.handle.startsWith('tg_'));

    if (isTelegram) {
      telegramDispatch.attempted = true;
      let tgChatId = null;
      if (contactId.startsWith('tg_')) {
        tgChatId = contactId.replace(/^tg_/, '');
      } else if (contact.handle && contact.handle.startsWith('tg_')) {
        tgChatId = contact.handle.replace(/^tg_/, '');
      } else if (contact.handle && /^\d+$/.test(contact.handle.trim())) {
        tgChatId = contact.handle.trim();
      }

      if (tgChatId) {
        try {
          const tgResult = await telegramService.sendMessage(tgChatId, text);
          telegramDispatch.success = true;
          telegramDispatch.result = tgResult;
          console.log(`[API /chat/send] Telegram API message sent to chat ${tgChatId} (msg_id: ${tgResult?.messageId})`);
        } catch (tgErr) {
          console.error(`[API /chat/send] Telegram API Error for chat ${tgChatId}:`, tgErr.message);
          telegramDispatch.error = tgErr.message;
        }
      } else {
        telegramDispatch.error = 'Could not resolve numeric Telegram chatId from contact.';
      }
    }

    // Check if this contact is a WhatsApp contact
    const isWhatsApp = contactId.startsWith('wa_') || 
                       contact.platform === 'whatsapp' || 
                       (contact.handle && contact.handle.startsWith('wa_'));

    if (isWhatsApp) {
      whatsappDispatch.attempted = true;
      let waNumber = null;
      if (contactId.startsWith('wa_')) {
        waNumber = contactId.replace(/^wa_/, '');
      } else if (contact.handle && contact.handle.startsWith('wa_')) {
        waNumber = contact.handle.replace(/^wa_/, '');
      } else if (contact.handle && /^\+?\d+$/.test(contact.handle.replace(/[\s\-\(\)]/g, ''))) {
        waNumber = contact.handle.replace(/[\s\-\(\)\+]/g, '');
      }

      if (waNumber) {
        try {
          if (whatsappService.activeSocket && whatsappService.status === 'connected') {
            await whatsappService.activeSocket.sendMessage(`${waNumber}@s.whatsapp.net`, { text });
            whatsappDispatch.success = true;
            console.log(`[API /chat/send] WhatsApp message sent to ${waNumber}`);
          } else {
            whatsappDispatch.error = 'WhatsApp client is not currently connected.';
          }
        } catch (waErr) {
          console.error(`[API /chat/send] WhatsApp Error for ${waNumber}:`, waErr.message);
          whatsappDispatch.error = waErr.message;
        }
      }
    }

    res.json({
      success: true,
      message: payload,
      telegramDispatch,
      whatsappDispatch
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 8. Escalation Safety Queue ---
router.get('/escalations', async (req, res) => {
  try {
    const escalations = await allAsync(`
      SELECT e.*, c.name as contact_name, c.handle as contact_handle, c.mode as contact_mode
      FROM escalations e
      JOIN contacts c ON e.contact_id = c.id
      ORDER BY e.created_at DESC
    `);
    res.json({ success: true, escalations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/escalations/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, humanReply } = req.body;

    const escalation = await getAsync(`SELECT * FROM escalations WHERE id = ?`, [id]);
    if (!escalation) return res.status(404).json({ success: false, message: 'Escalation not found.' });

    await runAsync(
      `UPDATE escalations SET status = ?, human_reply = ? WHERE id = ?`,
      [status || 'resolved', humanReply || '', id]
    );

    // If human reply is provided, send it back to contact as outgoing message
    if (humanReply && humanReply.trim().length > 0) {
      const msgId = `msg_human_${Date.now()}`;
      await runAsync(
        `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status)
         VALUES (?, ?, 'outgoing', 'Human Operator', ?, 'escalation', '{"human_intervention":true}', 'delivered')`,
        [msgId, escalation.contact_id, humanReply]
      );

      decisionEngine.broadcast('message_sent', {
        messageId: msgId,
        contactId: escalation.contact_id,
        direction: 'outgoing',
        text: humanReply,
        mode: 'escalation',
        provider: 'Human Operator',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Escalation updated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 9. WhatsApp & Telegram Integrations ---
router.get('/integrations/whatsapp/status', (req, res) => {
  const accountId = req.query.accountId || 'acc_wa_primary';
  res.json({ success: true, ...whatsappService.getStatus(accountId) });
});

// WhatsApp 8-digit Pairing Code
router.post('/integrations/whatsapp/pairing-code', async (req, res) => {
  try {
    const { phone, accountId } = req.body || {};
    const result = await whatsappService.generatePairingCode(phone, accountId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/integrations/whatsapp/qr', async (req, res) => {
  const accountId = req.body?.accountId || 'acc_wa_primary';
  const qr = await whatsappService.generateRealQR(accountId);
  res.json(qr);
});

router.post('/integrations/whatsapp/connect', async (req, res) => {
  const { phone, accountId, method } = req.body || {};
  const result = await whatsappService.connectSession(phone || '+1 (555) 234-5678', accountId || 'acc_wa_primary', method || 'simulated');
  res.json(result);
});

router.post('/integrations/whatsapp/disconnect', async (req, res) => {
  const { accountId } = req.body || {};
  const result = await whatsappService.disconnect(accountId || 'acc_wa_primary');
  res.json(result);
});

// Telegram Token Verification
router.post('/integrations/telegram/verify', async (req, res) => {
  const { token } = req.body || {};
  const result = await telegramService.verifyBotToken(token);
  res.json(result);
});

// Telegram Status
router.get('/integrations/telegram/status', (req, res) => {
  const accountId = req.query.accountId || 'default';
  const status = telegramService.getStatus(accountId);
  res.json({ success: true, ...status });
});

// Telegram Start Polling (Persists token & launches sequential long-polling)
router.post('/integrations/telegram/start', async (req, res) => {
  try {
    const { token, accountId = 'acc_tg_primary', accountName = 'Personal Telegram Bot', mode = 'personal', autoReply = true } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, message: 'Bot token required' });
    }

    // Verify token first
    const verifyResult = await telegramService.verifyBotToken(token);
    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }

    // Persist token in DB settings and local credentials/ folder
    await runAsync(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('telegram_bot_token', ?, CURRENT_TIMESTAMP)`, [token.trim()]);
    credentialService.saveTelegramToken(accountId, token.trim());

    // Upsert or update connected_accounts
    const botUser = verifyResult.bot?.username ? `@${verifyResult.bot.username}` : (verifyResult.bot?.first_name || 'Bot');
    const existingAcc = await getAsync(`SELECT id FROM connected_accounts WHERE id = ?`, [accountId]);
    if (existingAcc) {
      await runAsync(
        `UPDATE connected_accounts SET identifier = ?, credentials = ?, status = 'connected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [botUser, JSON.stringify({ token: token.trim() }), accountId]
      );
    } else {
      await runAsync(
        `INSERT INTO connected_accounts (id, platform, account_name, identifier, credentials, mode, auto_reply, status, is_active)
         VALUES (?, 'telegram', ?, ?, ?, ?, 1, 'connected', 1)`,
        [accountId, accountName, botUser, JSON.stringify({ token: token.trim() }), mode]
      );
    }

    // Wire up decisionEngine
    telegramService.setDecisionEngine(decisionEngine);

    // Start polling with message callback
    const startResult = await telegramService.startBot({
      accountId,
      token,
      accountName,
      mode,
      autoReply: autoReply !== false,
      onMessageCallback: async (msg) => {
        return await decisionEngine.processIncomingMessage({
          contactId: msg.contactId,
          text: msg.text,
          platform: 'telegram',
          senderName: msg.senderName,
          initialMode: mode
        });
      }
    });

    res.json({
      success: true,
      message: `✓ Connected! Telegram bot @${verifyResult.bot.username} is now live and polling for messages.`,
      bot: verifyResult.bot,
      polling: true,
      accountId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/integrations/telegram/stop', (req, res) => {
  const { accountId = 'acc_tg_primary' } = req.body || {};
  telegramService.stopBot(accountId);
  res.json({ success: true, message: 'Telegram polling stopped', polling: false, accountId });
});

// --- 10. Signal Messenger Integration ---
router.get('/integrations/signal/status', async (req, res) => {
  try {
    const accountId = req.query.accountId || 'acc_signal_primary';
    const status = await signalService.getStatus(accountId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/integrations/signal/daemon-check', async (req, res) => {
  const endpoint = req.query.endpoint || 'http://127.0.0.1:8080';
  const result = await signalService.checkDaemon(endpoint);
  res.json({ success: true, ...result });
});

router.post('/integrations/signal/link', async (req, res) => {
  try {
    const { phone, endpoint, accountId } = req.body || {};
    const qr = await signalService.generateLinkQR(endpoint, phone, accountId);
    res.json(qr);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/integrations/signal/connect', async (req, res) => {
  const { phone, endpoint, accountId } = req.body || {};
  const result = await signalService.connectSession(phone, endpoint, accountId);
  res.json(result);
});

router.post('/integrations/signal/disconnect', async (req, res) => {
  const { accountId } = req.body || {};
  const result = await signalService.disconnect(accountId);
  res.json(result);
});

// --- 11. Multi-Account Management Endpoints ---
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await accountService.getAllAccounts();
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const account = await accountService.addAccount(req.body);
    res.json({ success: true, account });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const updated = await accountService.updateAccount(req.params.id, req.body);
    res.json({ success: true, account: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const result = await accountService.deleteAccount(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accounts/:id/toggle-auto-reply', async (req, res) => {
  try {
    const result = await accountService.toggleAutoReply(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/integrations/signal/receive', async (req, res) => {
  try {
    const from = req.body.from || req.body.sender || req.body.source;
    const text = req.body.text || req.body.message || req.body.body;
    const senderName = req.body.senderName || req.body.name || from;
    const result = await signalService.handleIncomingSignalMessage({ from, text, senderName });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 11. Voice Studio & Audio Rhythm Endpoints ---
router.get('/voice/config', async (req, res) => {
  try {
    const settings = await llmService.getSettings();
    res.json({
      success: true,
      emotionProfiles: voiceService.getEmotionProfiles(),
      languageSpeechMap: voiceService.getLanguageMap(),
      currentSettings: {
        preferred_language: settings.preferred_language || 'tanglish',
        code_switching_ratio: settings.code_switching_ratio || '98',
        response_speed_mode: settings.response_speed_mode || 'quick',
        voice_pitch: settings.voice_pitch || '1.0',
        voice_rate: settings.voice_rate || '1.05',
        voice_emotion: settings.voice_emotion || 'warm',
        voice_timbre: settings.voice_timbre || 'default',
        voice_asr_lang: settings.voice_asr_lang || 'ta-IN'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/voice/config', async (req, res) => {
  try {
    const { pitch, rate, emotion, preferred_language, response_speed_mode, asr_lang } = req.body;
    if (pitch !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'voice_pitch'`, [String(pitch)]);
    if (rate !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'voice_rate'`, [String(rate)]);
    if (emotion !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'voice_emotion'`, [String(emotion)]);
    if (preferred_language !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'preferred_language'`, [String(preferred_language)]);
    if (response_speed_mode !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'response_speed_mode'`, [String(response_speed_mode)]);
    if (asr_lang !== undefined) await runAsync(`UPDATE settings SET value = ? WHERE key = 'voice_asr_lang'`, [String(asr_lang)]);

    res.json({ success: true, message: 'Voice and language settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server graceful shutdown endpoint
router.post('/server/stop', (req, res) => {
  res.json({ success: true, message: 'GhostReply server shutdown initiated.' });
  setTimeout(() => {
    console.log('[Server] Shutdown requested via /api/server/stop.');
    process.exit(0);
  }, 500);
});

module.exports = router;
