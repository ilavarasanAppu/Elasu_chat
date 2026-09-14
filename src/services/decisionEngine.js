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
   * Format a custom system prompt template by interpolating dynamic variables
   */
  formatCustomPrompt(template, vars = {}) {
    if (!template) return '';
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      result = result.replace(regex, val !== undefined && val !== null ? String(val) : '');
    }
    return result;
  }

  /**
   * Main Real-time Processing Pipeline
   */
  async processIncomingMessage({ contactId, text, platform = 'simulator', senderName, initialMode, chatId = null, accountId = null, dispatchToApi = true }) {
    const startTime = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Fetch Contact Details
    let contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    if (!contact) {
      // Auto-create contact if new
      const effectiveMode = initialMode || 'personal';
      contact = {
        id: contactId,
        name: senderName || `User ${contactId.substring(0, 6)}`,
        handle: contactId,
        avatar: '👤',
        platform,
        mode: effectiveMode,
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

      // Create default personality profile record for foreign key integrity
      const defProf = personalityService.getDefaultProfile();
      await runAsync(
        `INSERT OR IGNORE INTO personality_profiles 
         (contact_id, formality_level, avg_message_length, primary_language, code_switching, typo_patterns, abbreviation_map, excitement_markers, favorite_emojis, emoji_frequency, humor_type, intimacy_level, inside_jokes, few_shot_examples)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contact.id,
          defProf.formality_level,
          defProf.avg_message_length,
          defProf.primary_language,
          defProf.code_switching,
          defProf.typo_patterns,
          defProf.abbreviation_map,
          defProf.excitement_markers,
          defProf.favorite_emojis,
          defProf.emoji_frequency,
          defProf.humor_type,
          defProf.intimacy_level,
          defProf.inside_jokes,
          defProf.few_shot_examples
        ]
      ).catch(() => {});
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

    // Fetch profile first so recentHistory can clean replies properly
    let profile = await getAsync(`SELECT * FROM personality_profiles WHERE contact_id = ?`, [contact.id]);
    if (!profile) {
      profile = personalityService.getDefaultProfile();
    }

    const recentHistoryRaw = await allAsync(
      `SELECT id, direction, sender_name, text, timestamp FROM messages WHERE contact_id = ? AND id != ? ORDER BY timestamp DESC LIMIT 10`,
      [contact.id, messageId]
    );
    recentHistoryRaw.reverse();
    const recentHistory = recentHistoryRaw.map(h => ({
      role: h.direction === 'incoming' ? 'user' : 'assistant',
      sender_name: h.sender_name,
      text: personalityService.cleanHumanReply(h.text, profile),
      content: personalityService.cleanHumanReply(h.text, profile),
      timestamp: h.timestamp
    }));

    const isCustomPromptEnabled = settings.custom_system_prompt_enabled === 'true';

    if (mode === 'professional') {
      // Professional Mode RAG Query
      retrievedDocs = await ragService.queryKnowledgeBase(text, 3);
      
      const docsContext = (retrievedDocs && retrievedDocs.length > 0)
        ? retrievedDocs.map((doc, idx) => `[Source ${idx + 1} - ${doc.doc_title} (${doc.category})]:\n${doc.content}`).join('\n\n')
        : 'No specific documentation found for this query.';
      
      const historyFormatted = (recentHistory && recentHistory.length > 0)
        ? recentHistory.slice(-10).map(h => `${h.sender_name || (h.role === 'user' ? 'Customer' : 'Representative')}: ${h.text || h.content}`).join('\n')
        : 'No previous history.';

      if (isCustomPromptEnabled && settings.custom_system_prompt_professional && settings.custom_system_prompt_professional.trim()) {
        systemPrompt = this.formatCustomPrompt(settings.custom_system_prompt_professional, {
          knowledge_base: docsContext,
          chat_history: historyFormatted,
          user_question: text,
          userName: settings.user_name || 'Elavarasan P',
          contactName: contact.name
        });
      } else if (settings.minimal_system_prompt === 'true') {
        systemPrompt = ragService.buildMinimalProfessionalPrompt({
          retrievedDocs,
          chatHistory: recentHistory,
          userQuestion: text
        });
      } else {
        systemPrompt = ragService.buildProfessionalPrompt({
          retrievedDocs,
          chatHistory: recentHistory,
          userQuestion: text
        });
      }
      temperature = 0.3; // Low temperature for high factual accuracy
      max_tokens = 800;

      if (settings.custom_system_prompt_extra && settings.custom_system_prompt_extra.trim()) {
        systemPrompt += `\n\n═══════════════════════════════════════════════════════════════════\nGLOBAL USER DIRECTIVES & INSTRUCTIONS\n═══════════════════════════════════════════════════════════════════\n${settings.custom_system_prompt_extra.trim()}`;
      }

      this.broadcast('reasoning_trace', {
        contactId: contact.id,
        mode: 'professional',
        retrievedDocsCount: retrievedDocs.length,
        retrievedDocs: retrievedDocs.map(d => ({ title: d.doc_title, category: d.category, score: d.score })),
        systemPromptSnippet: systemPrompt.substring(0, 200) + '...',
        isCustomPrompt: isCustomPromptEnabled && Boolean(settings.custom_system_prompt_professional && settings.custom_system_prompt_professional.trim())
      });
    } else {
      // Personal Mode Persona Mirroring
      const preferredLanguage = settings.preferred_language || 'tanglish';
      profile.preferred_language = preferredLanguage;
      const effectiveUserName = settings.user_name || 'Elavarasan P';

      if (isCustomPromptEnabled && settings.custom_system_prompt_personal && settings.custom_system_prompt_personal.trim()) {
        const historyFormatted = (recentHistory && recentHistory.length > 0)
          ? recentHistory.slice(-10).map(h => `${h.sender_name || (h.role === 'user' ? contact.name : effectiveUserName)}: ${h.text || h.content}`).join('\n')
          : 'No previous history.';

        systemPrompt = this.formatCustomPrompt(settings.custom_system_prompt_personal, {
          userName: effectiveUserName,
          contactName: contact.name,
          language: preferredLanguage,
          codeSwitchingRatio: settings.code_switching_ratio || '98',
          relationship: contact.relationship_type || 'friend',
          formality: profile.formality_level || '0.2',
          humor: profile.humor_type || 'playful banter',
          chat_history: historyFormatted,
          user_question: text
        });
      } else if (settings.minimal_system_prompt === 'true') {
        systemPrompt = personalityService.buildMinimalPersonalPrompt({
          userName: effectiveUserName,
          contactName: contact.name,
          profile,
          preferredLanguage,
          codeSwitchingRatio: settings.code_switching_ratio || '98'
        });
      } else {
        systemPrompt = personalityService.buildPersonalPrompt({
          userName: effectiveUserName,
          contactName: contact.name,
          profile,
          preferredLanguage,
          codeSwitchingRatio: settings.code_switching_ratio || '98'
        });
      }

      if (settings.custom_system_prompt_extra && settings.custom_system_prompt_extra.trim()) {
        systemPrompt += `\n\n═══════════════════════════════════════════════════════════════════\nGLOBAL USER DIRECTIVES & INSTRUCTIONS\n═══════════════════════════════════════════════════════════════════\n${settings.custom_system_prompt_extra.trim()}`;
      }

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
        systemPromptSnippet: systemPrompt.substring(0, 200) + '...',
        isCustomPrompt: isCustomPromptEnabled && Boolean(settings.custom_system_prompt_personal && settings.custom_system_prompt_personal.trim())
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
      isBackupModel: llmResult.isBackupModel || false,
      aiAttempt: llmResult.aiAttempt || 1,
      error: llmResult.error || null,
      model1Error: llmResult.model1Error || null,
      model2Error: llmResult.model2Error || null,
      debug: llmResult.debug || null
    });

    await runAsync(
      `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status)
       VALUES (?, ?, 'outgoing', ?, ?, ?, ?, 'delivered')`,
      [replyMessageId, contact.id, settings.user_name || 'GhostReply', finalReply, mode, metadata]
    );

    // Update contact last_active
    const nowIso = new Date().toISOString();
    await runAsync(`UPDATE contacts SET last_active = ? WHERE id = ?`, [nowIso, contact.id]);

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
      isBackupModel: llmResult.isBackupModel || false,
      aiAttempt: llmResult.aiAttempt || 1,
      error: llmResult.error || null,
      model1Error: llmResult.model1Error || null,
      model2Error: llmResult.model2Error || null,
      debug: llmResult.debug || null,
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
        model: llmResult.model,
        aiAttempt: llmResult.aiAttempt || 3
      });
    }

    // 10. Automatically Dispatch AI Reply Over Platform API (Telegram, WhatsApp, Signal)
    let apiDispatch = { attempted: false, success: false, error: null };
    if (dispatchToApi !== false) {
      apiDispatch = await this.dispatchPlatformAutoReply(contact, finalReply, { platform, chatId, accountId });
    }

    resultPayload.dispatched = Boolean(apiDispatch.success);
    resultPayload.apiDispatch = apiDispatch;

    // Broadcast message sent
    this.broadcast('message_sent', resultPayload);

    return resultPayload;
  }

  /**
   * Centralized platform outbound dispatcher: delivers AI replies over Telegram, WhatsApp, Signal APIs
   */
  async dispatchPlatformAutoReply(contact, replyText, options = {}) {
    if (!replyText || !contact) return { attempted: false, success: false };

    const platform = (options.platform || contact.platform || '').toLowerCase();
    const contactId = String(contact.id || '');
    const handle = String(contact.handle || '');

    // 1. Telegram Dispatch
    const isTelegram = platform === 'telegram' || contactId.startsWith('tg_') || handle.startsWith('tg_') || Boolean(options.chatId);
    if (isTelegram) {
      let tgChatId = null;
      if (options.chatId) {
        tgChatId = String(options.chatId);
      } else if (contactId.startsWith('tg_')) {
        tgChatId = contactId.replace(/^tg_/, '');
      } else if (handle.startsWith('tg_')) {
        tgChatId = handle.replace(/^tg_/, '');
      } else if (/^\d+$/.test(handle.trim())) {
        tgChatId = handle.trim();
      }

      if (tgChatId) {
        try {
          const telegramService = require('./telegramService');
          const tgResult = await telegramService.sendMessage(tgChatId, replyText, options.accountId);
          console.log(`[DecisionEngine -> Telegram API] AI auto-reply delivered to chat ${tgChatId} (msg_id: ${tgResult?.messageId})`);
          return { attempted: true, success: true, platform: 'telegram', result: tgResult };
        } catch (tgErr) {
          console.error(`[DecisionEngine -> Telegram Error] Chat ${tgChatId}:`, tgErr.message);
          return { attempted: true, success: false, platform: 'telegram', error: tgErr.message };
        }
      }
    }

    // 2. WhatsApp Dispatch
    const isWhatsApp = platform === 'whatsapp' || contactId.startsWith('wa_') || handle.startsWith('wa_') || /^\+?\d{8,15}$/.test(handle.replace(/[\s\-\(\)]/g, ''));
    if (isWhatsApp) {
      let waNumber = null;
      if (options.remoteJid) {
        waNumber = options.remoteJid.replace(/@.+/, '');
      } else if (contactId.startsWith('wa_')) {
        waNumber = contactId.replace(/^wa_/, '');
      } else if (handle.startsWith('wa_')) {
        waNumber = handle.replace(/^wa_/, '');
      } else if (/^\+?\d+$/.test(handle.replace(/[\s\-\(\)]/g, ''))) {
        waNumber = handle.replace(/[\s\-\(\)\+]/g, '');
      }

      if (waNumber) {
        try {
          const whatsappService = require('./whatsappService');
          const waResult = await whatsappService.sendMessage(waNumber, replyText);
          console.log(`[DecisionEngine -> WhatsApp API] AI auto-reply delivered to +${waNumber}`);
          return { attempted: true, success: true, platform: 'whatsapp', result: waResult };
        } catch (waErr) {
          console.warn(`[DecisionEngine -> WhatsApp Notice] Could not deliver to +${waNumber}:`, waErr.message);
          return { attempted: true, success: false, platform: 'whatsapp', error: waErr.message };
        }
      }
    }

    // 3. Signal Dispatch
    const isSignal = platform === 'signal' || contactId.startsWith('signal_');
    if (isSignal) {
      try {
        const signalService = require('./signalService');
        if (typeof signalService.sendMessage === 'function') {
          const sigTarget = contact.handle || contactId.replace(/^signal_/, '');
          const sigResult = await signalService.sendMessage(sigTarget, replyText);
          return { attempted: true, success: true, platform: 'signal', result: sigResult };
        }
      } catch (sigErr) {
        console.warn(`[DecisionEngine -> Signal Notice] Error:`, sigErr.message);
        return { attempted: true, success: false, platform: 'signal', error: sigErr.message };
      }
    }

    return { attempted: false, success: false };
  }
}

module.exports = new DecisionEngine();
