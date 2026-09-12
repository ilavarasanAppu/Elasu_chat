const express = require('express');
const multer = require('multer');
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
      platform: platform || 'webhook'
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
    const { name, handle, avatar, mode, auto_reply, delay_mode, delay_seconds, relationship_type, escalation_contact } = req.body;

    const existing = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Contact not found' });

    await runAsync(
      `UPDATE contacts SET 
        name = COALESCE(?, name),
        handle = COALESCE(?, handle),
        avatar = COALESCE(?, avatar),
        mode = COALESCE(?, mode),
        auto_reply = COALESCE(?, auto_reply),
        delay_mode = COALESCE(?, delay_mode),
        delay_seconds = COALESCE(?, delay_seconds),
        relationship_type = COALESCE(?, relationship_type),
        escalation_contact = COALESCE(?, escalation_contact)
       WHERE id = ?`,
      [name, handle, avatar, mode, auto_reply, delay_mode, delay_seconds, relationship_type, escalation_contact, id]
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
    await runAsync(`DELETE FROM contacts WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 4. Messages History ---
router.get('/contacts/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await allAsync(
      `SELECT * FROM messages WHERE contact_id = ? ORDER BY timestamp ASC LIMIT 50`,
      [id]
    );
    res.json({ success: true, messages });
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

// --- 7. Live Chat Simulation Pipeline ---
router.post('/chat/simulate', async (req, res) => {
  try {
    const { contactId, text, senderName, platform } = req.body;
    if (!contactId || !text) {
      return res.status(400).json({ success: false, message: 'contactId and text are required.' });
    }

    const result = await decisionEngine.processIncomingMessage({
      contactId,
      text,
      senderName,
      platform: platform || 'simulator'
    });

    res.json({ success: true, result });
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
  res.json({ success: true, ...whatsappService.getStatus() });
});

router.post('/integrations/whatsapp/qr', async (req, res) => {
  const qr = await whatsappService.generateMockQR();
  res.json({ success: true, ...qr });
});

router.post('/integrations/whatsapp/connect', (req, res) => {
  const { phone } = req.body;
  const result = whatsappService.connectSession(phone || '+1 555-0199');
  res.json(result);
});

router.post('/integrations/whatsapp/disconnect', (req, res) => {
  const result = whatsappService.disconnect();
  res.json(result);
});

router.post('/integrations/telegram/verify', async (req, res) => {
  const { token } = req.body;
  const result = await telegramService.verifyBotToken(token);
  res.json(result);
});

// --- 10. Signal Messenger Integration ---
router.get('/integrations/signal/status', async (req, res) => {
  try {
    const status = await signalService.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/integrations/signal/link', async (req, res) => {
  try {
    const { phone, endpoint } = req.body || {};
    const qr = await signalService.generateLinkQR(endpoint, phone);
    res.json(qr);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/integrations/signal/connect', async (req, res) => {
  const { phone, endpoint } = req.body;
  const result = await signalService.connectSession(phone, endpoint);
  res.json(result);
});

router.post('/integrations/signal/disconnect', async (req, res) => {
  const result = await signalService.disconnect();
  res.json(result);
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

module.exports = router;
