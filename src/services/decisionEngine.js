const { runAsync, getAsync, allAsync } = require('../db/database');
const llmService = require('./llmService');
const ragService = require('./ragService');
const personalityService = require('./personalityService');

class DecisionEngine {
  constructor() {
    this.wsClients = new Set();
  }

  registerWebSocket(ws) {
    this.wsClients.add(ws);
    ws.on('error', (err) => {
      console.warn('[WebSocket] Client socket error:', err.message);
      this.wsClients.delete(ws);
    });
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  broadcast(event, payload) {
    const data = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(data);
        } catch (e) {
          console.error('Error broadcasting WS event:', e.message);
        }
      }
    }
  }

  /**
   * Main Real-time Processing Pipeline
   */
  async processIncomingMessage({ contactId, text, platform = 'simulator', senderName }) {
    const startTime = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Fetch Contact Details
    let contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    if (!contact) {
      // Auto-create contact if new
      contact = {
        id: contactId,
        name: senderName || `User ${contactId.substring(0, 6)}`,
        handle: contactId,
        avatar: '👤',
        platform,
        mode: 'personal',
        auto_reply: 1,
        delay_mode: 'natural',
        delay_seconds: 2,
        relationship_type: 'friend'
      };
      await runAsync(
        `INSERT INTO contacts (id, name, handle, avatar, platform, mode, auto_reply, delay_mode, delay_seconds, relationship_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contact.id, contact.name, contact.handle, contact.avatar, contact.platform, contact.mode, contact.auto_reply, contact.delay_mode, contact.delay_seconds, contact.relationship_type]
      );
    }

    const mode = contact.mode || 'personal';
    const contactDisplayName = senderName || contact.name;

    // 2. Save Incoming Message to Database
    await runAsync(
      `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status)
       VALUES (?, ?, 'incoming', ?, ?, ?, '{}', 'delivered')`,
      [messageId, contact.id, contactDisplayName, text, mode]
    );

    // Broadcast incoming message event
    this.broadcast('message_received', {
      messageId,
      contactId: contact.id,
      contactName: contact.name,
      mode,
      text,
      direction: 'incoming',
      timestamp: new Date().toISOString()
    });

    // 3. Safety & Urgent Escalation Check
    const escalationCheck = ragService.checkEscalationTriggers(text);
    if (escalationCheck.triggered) {
      const escId = `esc_${Date.now()}`;
      await runAsync(
        `INSERT INTO escalations (id, contact_id, message_id, incoming_text, reason, severity, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [escId, contact.id, messageId, text, escalationCheck.reason, escalationCheck.severity]
      );

      this.broadcast('escalation_triggered', {
        escalationId: escId,
        contactId: contact.id,
        contactName: contact.name,
        text,
        reason: escalationCheck.reason,
        severity: escalationCheck.severity
      });

      return {
        escalated: true,
        reason: escalationCheck.reason,
        severity: escalationCheck.severity,
        response: null
      };
    }

    // Check if auto-reply is disabled
    const settings = await llmService.getSettings();
    const globalAutoReply = settings.global_auto_reply !== 'false';
    if (!contact.auto_reply || !globalAutoReply) {
      return {
        autoReplyDisabled: true,
        message: 'Auto-reply is turned off for this contact or globally.'
      };
    }

    // 4. Retrieve Context & Formulate System Prompt
    let systemPrompt = '';
    let temperature = 0.7;
    let max_tokens = 250;
    let retrievedDocs = [];
    let profile = null;
    const recentHistoryRaw = await allAsync(
      `SELECT id, direction, sender_name, text, timestamp FROM messages WHERE contact_id = ? AND id != ? ORDER BY timestamp DESC LIMIT 10`,
      [contact.id, messageId]
    );
    recentHistoryRaw.reverse();
    const recentHistory = recentHistoryRaw.map(h => ({
      role: h.direction === 'incoming' ? 'user' : 'assistant',
      sender_name: h.sender_name,
      text: personalityService.cleanHumanReply(h.text, profile || {}),
      content: personalityService.cleanHumanReply(h.text, profile || {}),
      timestamp: h.timestamp
    }));

    if (mode === 'professional') {
      // Professional Mode RAG Query
      retrievedDocs = await ragService.queryKnowledgeBase(text, 3);
      systemPrompt = ragService.buildProfessionalPrompt({
        retrievedDocs,
        chatHistory: recentHistory,
        userQuestion: text
      });
      temperature = 0.3; // Low temperature for high factual accuracy
      max_tokens = 800;

      this.broadcast('reasoning_trace', {
        contactId: contact.id,
        mode: 'professional',
        retrievedDocsCount: retrievedDocs.length,
        retrievedDocs: retrievedDocs.map(d => ({ title: d.doc_title, category: d.category, score: d.score })),
        systemPromptSnippet: systemPrompt.substring(0, 200) + '...'
      });
    } else {
      // Personal Mode Persona Mirroring
      profile = await getAsync(`SELECT * FROM personality_profiles WHERE contact_id = ?`, [contact.id]);
      if (!profile) {
        profile = personalityService.getDefaultProfile();
      }

      const preferredLanguage = settings.preferred_language || 'tanglish';
      profile.preferred_language = preferredLanguage;

      systemPrompt = personalityService.buildPersonalPrompt({
        userName: settings.user_name || 'Alex Mercer',
        contactName: contact.name,
        profile,
        preferredLanguage,
        codeSwitchingRatio: settings.code_switching_ratio || '98'
      });

      // Quick Answer Reply Optimization
      const isQuickMode = (settings.response_speed_mode || 'quick') === 'quick';
      temperature = 0.75;
      max_tokens = isQuickMode ? 120 : 800;

      this.broadcast('reasoning_trace', {
        contactId: contact.id,
        mode: 'personal',
        formality: profile.formality_level,
        humor: profile.humor_type,
        relationship: contact.relationship_type,
        language: preferredLanguage,
        speedMode: isQuickMode ? 'quick' : 'deep',
        systemPromptSnippet: systemPrompt.substring(0, 200) + '...'
      });
    }

    // 5. Broadcast Typing Indicator
    this.broadcast('typing_started', {
      contactId: contact.id,
      contactName: contact.name,
      mode
    });

    // 6. Generate Response via LLM Multi-Provider
    const isQuickMode = (settings.response_speed_mode || 'quick') === 'quick';
    const llmResult = await llmService.generateResponse({
      system: systemPrompt,
      user: text,
      history: recentHistory,
      temperature,
      max_tokens,
      mode,
      extraContext: {
        retrievedDocs,
        relationshipType: contact.relationship_type,
        isQuickMode
      }
    });

    let rawReply = llmResult.text;
    let finalReply = rawReply;

    // 7. Post-Processing & Texting Quirks
    if (mode === 'personal') {
      finalReply = personalityService.applyTextingQuirks(rawReply, profile);
    } else {
      finalReply = personalityService.cleanHumanReply(rawReply, profile);
    }

    // 8. Natural Human Delay Simulation (Bypassed / Minimized in Quick Answer Mode)
    let delayMs = 1200;
    if (isQuickMode) {
      delayMs = 200; // Instant response in quick mode
    } else if (contact.delay_mode === 'immediate') {
      delayMs = 600;
    } else if (contact.delay_mode === 'delayed') {
      delayMs = (contact.delay_seconds || 5) * 1000;
    } else {
      // Natural mode
      delayMs = personalityService.calculateNaturalDelay(finalReply, profile);
    }

    // Respect natural delay multiplier from settings
    if (!isQuickMode) {
      const multiplier = parseFloat(settings.natural_delay_multiplier || '1.0');
      delayMs = Math.max(300, Math.min(10000, Math.round(delayMs * multiplier)));
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));

    // 9. Save Outgoing Message
    const replyMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const metadata = JSON.stringify({
      provider: llmResult.provider,
      model: llmResult.model,
      durationMs: Date.now() - startTime,
      delaySimulatedMs: delayMs,
      retrievedChunks: retrievedDocs.length,
      mode,
      isFallback: llmResult.isFallback || false,
      error: llmResult.error || null
    });

    await runAsync(
      `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status)
       VALUES (?, ?, 'outgoing', ?, ?, ?, ?, 'delivered')`,
      [replyMessageId, contact.id, settings.user_name || 'GhostReply', finalReply, mode, metadata]
    );

    // Update contact last_active
    await runAsync(`UPDATE contacts SET last_active = CURRENT_TIMESTAMP WHERE id = ?`, [contact.id]);

    const resultPayload = {
      messageId: replyMessageId,
      contactId: contact.id,
      contactName: contact.name,
      direction: 'outgoing',
      text: finalReply,
      mode,
      provider: llmResult.provider,
      model: llmResult.model,
      isFallback: llmResult.isFallback || false,
      error: llmResult.error || null,
      processingTimeMs: Date.now() - startTime,
      delaySimulatedMs: delayMs,
      timestamp: new Date().toISOString()
    };

    // If a fallback occurred, notify listeners with error details
    if (llmResult.isFallback) {
      this.broadcast('provider_fallback_warning', {
        contactId: contact.id,
        contactName: contact.name,
        provider: llmResult.provider,
        error: llmResult.error,
        model: llmResult.model
      });
    }

    // Broadcast message sent
    this.broadcast('message_sent', resultPayload);

    return resultPayload;
  }
}

module.exports = new DecisionEngine();
