const axios = require('axios');
const { getAsync, allAsync, runAsync } = require('../db/database');

class LLMService {
  async getSettings() {
    const rows = await allAsync(`SELECT key, value FROM settings`);
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return settings;
  }

  /**
   * Helper to strip thinking/thought tags from text
   */
  cleanOutput(raw) {
    if (!raw) return '';
    let text = raw.trim();
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    text = text.replace(/<think>[\s\S]*$/gi, '').trim();
    text = text.replace(/<thought>[\s\S]*$/gi, '').trim();
    return text;
  }

  /**
   * Unified Dispatcher for LLM Providers
   * @param {Object} params 
   * @param {string} params.system - System Prompt
   * @param {string} params.user - User message
   * @param {Array} params.history - Array of {role: 'user'|'assistant', content: string}
   * @param {number} params.temperature - Temperature (0.0 - 1.0)
   * @param {number} params.max_tokens - Max tokens
   * @param {string} params.mode - 'personal' or 'professional'
   * @param {Object} params.extraContext - context info
   */
  async generateResponse({ system, user, history = [], temperature = 0.7, max_tokens = 300, mode = 'personal', extraContext = {} }) {
    const settings = await this.getSettings();
    const provider = settings.active_provider || 'mock';

    try {
      let res;
      switch (provider.toLowerCase()) {
        case 'ollama':
          res = await this.callOllama({ system, user, history, temperature, max_tokens, settings, extraContext });
          break;
        case 'lmstudio':
          res = await this.callLMStudio({ system, user, history, temperature, max_tokens, settings });
          break;
        case 'openai':
          res = await this.callOpenAI({ system, user, history, temperature, max_tokens, settings });
          break;
        case 'gemini':
          res = await this.callGemini({ system, user, history, temperature, max_tokens, settings });
          break;
        case 'openrouter':
          res = await this.callOpenRouter({ system, user, history, temperature, max_tokens, settings });
          break;
        case 'nvidia':
          res = await this.callNvidia({ system, user, history, temperature, max_tokens, settings });
          break;
        case 'mock':
        default:
          res = await this.callSmartMock({ system, user, history, mode, extraContext, settings });
          break;
      }
      return {
        ...res,
        text: this.cleanOutput(res.text)
      };
    } catch (err) {
      const detailedError = err.response?.data?.error?.message || err.message;
      console.warn(`[LLMService] Provider ${provider} failed (${detailedError}). Falling back to Smart Fallback Engine...`);
      const fallbackResponse = await this.callSmartMock({ system, user, history, mode, extraContext, settings });
      return {
        text: this.cleanOutput(fallbackResponse.text),
        provider: `${provider} (Fallback: ${detailedError})`,
        model: 'smart-fallback',
        isFallback: true,
        error: detailedError
      };
    }
  }

  // 1. Ollama Integration (Supports OpenAI compatible endpoint and native /api/chat)
  async callOllama({ system, user, history, temperature, max_tokens, settings, extraContext = {} }) {
    let endpoint = (settings.ollama_endpoint || 'http://127.0.0.1:11434').trim().replace(/\/$/, '');
    let model = settings.ollama_model || 'llama3.2:latest';
    
    // Construct messages array
    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    // Quick Answer Reply Optimization: fast timeout so user doesn't wait minutes if remote cloud model is queueing
    const isQuickMode = (settings.response_speed_mode || 'quick') === 'quick' || extraContext.isQuickMode;
    const requestTimeout = isQuickMode ? 4000 : 60000;
    const numPredict = isQuickMode ? Math.min(max_tokens || 80, 80) : (max_tokens || 150);

    // Function to query available installed models from Ollama /api/tags
    const getInstalledModels = async () => {
      try {
        const baseEp = endpoint.replace(/\/v1$/, '');
        const res = await axios.get(`${baseEp}/api/tags`, { timeout: 4000 });
        return (res.data?.models || []).map(m => m.name);
      } catch {
        return [];
      }
    };

    // Helper to strip thinking tags from text
    const cleanOutput = (raw) => {
      if (!raw) return '';
      let text = raw.trim();
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      return text;
    };

    // Helper to attempt inference via native Ollama /api/chat (Primary & Cleanest for Ollama)
    const tryNativeChatEndpoint = async (targetModel) => {
      const baseEp = endpoint.replace(/\/v1$/, '');
      const targetUrl = `${baseEp}/api/chat`;
      const res = await axios.post(targetUrl, {
        model: targetModel,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: numPredict
        }
      }, { timeout: requestTimeout });

      const msg = res.data?.message;
      let content = cleanOutput(msg?.content || '');
      return content.trim();
    };

    // Helper to attempt inference via OpenAI-compatible endpoint (Fallback)
    const tryOpenAIEndpoint = async (targetModel) => {
      const baseEp = endpoint.replace(/\/v1$/, '');
      const targetUrl = `${baseEp}/v1/chat/completions`;
      const res = await axios.post(targetUrl, {
        model: targetModel,
        messages,
        temperature,
        max_tokens: numPredict,
        stream: false
      }, { timeout: requestTimeout });

      const choiceMsg = res.data?.choices?.[0]?.message;
      let content = cleanOutput(choiceMsg?.content || '');
      return content.trim();
    };

    try {
      // Primary: Native Ollama /api/chat (properly isolates content from thinking)
      let reply = '';
      try {
        reply = await tryNativeChatEndpoint(model);
      } catch (nativeErr) {
        if (nativeErr.response?.status === 404) throw nativeErr;
        // If native endpoint encounters format error, try OpenAI-compatible endpoint
        reply = await tryOpenAIEndpoint(model);
      }

      if (!reply) {
        reply = await tryOpenAIEndpoint(model);
      }

      if (!reply) {
        throw new Error('Ollama model produced empty response');
      }

      return { text: reply, provider: 'Ollama', model };
    } catch (err) {
      const is404 = err.response && (err.response.status === 404 || (err.response.data && JSON.stringify(err.response.data).includes('not found')));

      if (is404) {
        console.warn(`[LLMService] Ollama model "${model}" not found (404). Checking installed models...`);
        const installed = await getInstalledModels();
        if (installed.length > 0) {
          const fallbackModel = installed[0];
          console.log(`[LLMService] Auto-switching Ollama model from "${model}" to installed model "${fallbackModel}"...`);
          // Save auto-discovered model to DB settings so future calls use it directly
          try {
            await runAsync(`UPDATE settings SET value = ? WHERE key = 'ollama_model'`, [fallbackModel]);
          } catch (dbErr) {
            console.warn('[LLMService] Could not update settings for auto-switched model:', dbErr.message);
          }

          let reply = '';
          try {
            reply = await tryNativeChatEndpoint(fallbackModel);
          } catch {
            reply = await tryOpenAIEndpoint(fallbackModel);
          }

          if (reply) {
            return { text: reply, provider: 'Ollama', model: fallbackModel };
          }
        }
      }

      throw err;
    }
  }

  // 2. LM Studio Integration (OpenAI Compatible)
  async callLMStudio({ system, user, history, temperature, max_tokens, settings }) {
    let endpoint = (settings.lmstudio_endpoint || 'http://127.0.0.1:1234/v1').trim().replace(/\/$/, '');
    const model = settings.lmstudio_model || 'local-model';

    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    const targetUrl = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;

    const res = await axios.post(targetUrl, {
      model,
      messages,
      temperature,
      max_tokens
    }, { timeout: 60000 });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'LM Studio', model };
  }

  // 3. OpenAI & Compatible Providers (Groq, DeepSeek, Together, vLLM, etc.)
  async callOpenAI({ system, user, history, temperature, max_tokens, settings }) {
    let endpoint = (settings.openai_endpoint || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
    const apiKey = settings.openai_api_key;
    const model = settings.openai_model || 'gpt-4o-mini';

    if (!apiKey && !endpoint.includes('localhost') && !endpoint.includes('127.0.0.1')) {
      throw new Error('OpenAI API Key is missing');
    }

    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    const targetUrl = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;

    const res = await axios.post(targetUrl, {
      model,
      messages,
      temperature,
      max_tokens
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'OpenAI Compatible', model };
  }

  // 4. Google Gemini API
  async callGemini({ system, user, history = [], temperature, max_tokens, settings }) {
    const apiKey = (settings.gemini_api_key || '').trim();
    let rawModel = (settings.gemini_model || 'gemini-3.8-flash').trim();
    let model = rawModel.replace(/^models\//, '') || 'gemini-3.8-flash';

    // Proactively remap retired or unavailable models to prevent 404
    if (model === 'gemini-2.5-pro' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash' || model === 'gemini-2.5-flash-lite') {
      console.warn(`[Gemini] Model "${model}" is retired by Google. Auto-mapping to gemini-3.8-flash...`);
      model = 'gemini-3.8-flash';
    }

    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please enter your API Key in Settings.');
    }

    // Google Gemini Generative Language REST API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Build strictly alternating multi-turn conversation for Gemini API:
    // 1. Alternating turns: user -> model -> user -> model ...
    // 2. First turn MUST be 'user'
    // 3. Consecutive turns with same role must be merged
    // 4. Cannot have empty parts
    const rawTurns = [];
    (history || []).forEach(h => {
      const role = (h.direction === 'incoming' || h.role === 'user') ? 'user' : 'model';
      const text = (h.text || h.content || '').trim();
      if (text) {
        rawTurns.push({ role, text });
      }
    });

    const sanitizedContents = [];
    for (const turn of rawTurns) {
      if (sanitizedContents.length === 0) {
        if (turn.role === 'user') {
          sanitizedContents.push({ role: 'user', parts: [{ text: turn.text }] });
        }
        // If first history message was from model, skip it to guarantee first turn is user
      } else {
        const lastTurn = sanitizedContents[sanitizedContents.length - 1];
        if (lastTurn.role === turn.role) {
          // Merge consecutive same-role turns to avoid 400 Bad Request
          lastTurn.parts[0].text += `\n${turn.text}`;
        } else {
          sanitizedContents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }

    // Add current user prompt
    const userPrompt = (user || '').trim();
    if (!userPrompt) {
      throw new Error('User prompt cannot be empty');
    }

    if (sanitizedContents.length === 0) {
      sanitizedContents.push({ role: 'user', parts: [{ text: userPrompt }] });
    } else {
      const lastTurn = sanitizedContents[sanitizedContents.length - 1];
      if (lastTurn.role === 'user') {
        // Merge into last user turn if previous turn was also user
        lastTurn.parts[0].text += `\n${userPrompt}`;
      } else {
        sanitizedContents.push({ role: 'user', parts: [{ text: userPrompt }] });
      }
    }

    // Allocate sufficient tokens for thinking models (Gemini 2.5/3.x models spend tokens on reasoning)
    const effectiveMaxTokens = Math.max(max_tokens || 1000, 1000);

    const payload = {
      contents: sanitizedContents,
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        maxOutputTokens: effectiveMaxTokens
      }
    };

    // system_instruction is supported in Gemini v1beta REST API
    if (system && system.trim()) {
      payload.system_instruction = {
        parts: [{ text: system.trim() }]
      };
    }

    try {
      const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const candidate = res.data?.candidates?.[0];
      const reply = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';

      if (!reply && candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Gemini generation stopped: ${candidate.finishReason}`);
      }

      if (!reply) {
        throw new Error('Gemini returned an empty reply. Check safety filters or model name.');
      }

      return { text: reply.trim(), provider: 'Google Gemini', model };
    } catch (err) {
      const apiMsg = err.response?.data?.error?.message;
      const statusCode = err.response?.status;

      // Auto-recovery: If selected model is retired (404), quota-blocked, or experiencing temporary high demand (503)
      const isRetriableError = apiMsg && (
        apiMsg.includes('no longer available') ||
        apiMsg.includes('Quota exceeded') ||
        apiMsg.includes('limit: 0') ||
        apiMsg.includes('high demand') ||
        statusCode === 503 ||
        statusCode === 404
      );

      if (isRetriableError) {
        const fallbackTarget = (model === 'gemini-2.5-flash') ? 'gemini-3.8-flash' : 'gemini-2.5-flash';
        console.warn(`[Gemini] Model "${model}" hit (${apiMsg}). Auto-switching to ${fallbackTarget}...`);
        try {
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackTarget}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const fbRes = await axios.post(fallbackUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
          });
          const fbCandidate = fbRes.data?.candidates?.[0];
          const fbReply = fbCandidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
          if (fbReply) {
            runAsync(`UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'gemini_model'`, [fallbackTarget]).catch(() => {});
            return {
              text: fbReply.trim(),
              provider: 'Google Gemini',
              model: `${fallbackTarget} (auto-recovered from ${model})`
            };
          }
        } catch (retryErr) {
          console.warn(`[Gemini] Fallback to ${fallbackTarget} failed:`, retryErr.message);
        }
      }

      if (apiMsg) {
        throw new Error(`Gemini API Error (${statusCode || 400}): ${apiMsg}`);
      }
      throw err;
    }
  }

  // 5. OpenRouter Integration
  async callOpenRouter({ system, user, history, temperature, max_tokens, settings }) {
    const apiKey = settings.openrouter_api_key;
    const model = settings.openrouter_model || 'meta-llama/llama-3.3-70b-instruct';

    if (!apiKey) {
      throw new Error('OpenRouter API Key is missing');
    }

    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ghostreply.ai',
        'X-Title': 'GhostReply Dual-Mode Assistant',
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'OpenRouter', model };
  }

  // 6. NVIDIA API (NVIDIA NIM endpoints)
  async callNvidia({ system, user, history, temperature, max_tokens, settings }) {
    let endpoint = (settings.nvidia_endpoint || 'https://integrate.api.nvidia.com/v1').trim().replace(/\/$/, '');
    const apiKey = settings.nvidia_api_key;
    const model = settings.nvidia_model || 'meta/llama-3.1-70b-instruct';

    if (!apiKey) {
      throw new Error('NVIDIA API Key is missing');
    }

    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    const targetUrl = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;

    const res = await axios.post(targetUrl, {
      model,
      messages,
      temperature,
      max_tokens
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'NVIDIA NIM', model };
  }

  // 7. Context-Aware Smart Fallback Generator (Instant simulation & testing)
  async callSmartMock({ system, user, history, mode, extraContext = {}, settings = {} }) {
    const lowerUser = (user || '').toLowerCase();
    const preferredLanguage = settings.preferred_language || 'tanglish';

    if (mode === 'professional') {
      // Professional Mode intelligent generator
      const doc = extraContext.retrievedDocs && extraContext.retrievedDocs.length > 0
        ? extraContext.retrievedDocs[0].content
        : null;

      if (lowerUser.includes('refund') || lowerUser.includes('return') || lowerUser.includes('money back')) {
        return {
          text: "Yes, we offer refunds within 30 days for unused products in original packaging, in accordance with our return policy. Would you like me to initiate a return request for you?",
          provider: "Smart Fallback Engine",
          model: "professional-rag-engine"
        };
      } else if (lowerUser.includes('price') || lowerUser.includes('pricing') || lowerUser.includes('cost') || lowerUser.includes('tier') || lowerUser.includes('plan')) {
        return {
          text: "Our subscription plans start at $29/month for Starter (5,000 automated replies), $99/month for Professional (unlimited replies & RAG sync), and custom Enterprise plans with 99.99% SLA. Annual billing includes a 20% discount. Would you like a breakdown for your team?",
          provider: "Smart Fallback Engine",
          model: "professional-rag-engine"
        };
      } else if (lowerUser.includes('security') || lowerUser.includes('encrypt') || lowerUser.includes('privacy') || lowerUser.includes('gdpr')) {
        return {
          text: "We take privacy and security seriously. All chats are protected with AES-256 local-first encryption, and we are fully SOC-2 Type II and GDPR compliant. We never share or sell chat logs. Let me know if you need our full security whitepaper.",
          provider: "Smart Fallback Engine",
          model: "professional-rag-engine"
        };
      } else if (doc) {
        return {
          text: `Thank you for reaching out. Based on our documentation: ${doc.substring(0, 160).trim()}... Please let me know if you would like more details or further assistance.`,
          provider: "Smart Fallback Engine",
          model: "professional-rag-engine"
        };
      } else {
        return {
          text: "Thank you for reaching out. I want to make sure I give you accurate information on this. Let me verify the details with our documentation and get back to you shortly.",
          provider: "Smart Fallback Engine",
          model: "professional-rag-engine"
        };
      }
    } else {
      // Personal Mode Persona Mirroring
      const relation = extraContext.relationshipType || 'friend';

      if (preferredLanguage === 'tanglish') {
        if (relation === 'spouse' || relation === 'partner' || relation.includes('wife')) {
          if (lowerUser.includes('home') || lowerUser.includes('where') || lowerUser.includes('coming') || lowerUser.includes('vandh')) {
            return {
              text: "on the way vandhute irukken da chellam! reach aagidren in 10 mins 🥰❤️",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('dinner') || lowerUser.includes('food') || lowerUser.includes('eat') || lowerUser.includes('sapdi') || lowerUser.includes('taco')) {
            return {
              text: "omggg yesss! innaiku nalla food order panlama chellam? sema craving irukku 😋🥰",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('office') || lowerUser.includes('work') || lowerUser.includes('busy')) {
            return {
              text: "office la sema work da chellam, wrapping this up right now and heading over to u ❤️🥰",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('enna pandre') || lowerUser.includes('what doing') || lowerUser.includes('sup') || lowerUser.includes('hai') || lowerUser.includes('hey')) {
            return {
              text: "konjam work da chellam, but almost done! nee sapdiya? what u thinking? 🥰",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else {
            return {
              text: "got it chellam ❤️ wrapping this up rn and coming over to u 🥰",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          }
        } else {
          // Friend / Bro / Casual Tanglish
          if (lowerUser.includes('party') || lowerUser.includes('weekend') || lowerUser.includes('meet') || lowerUser.includes('innaiki')) {
            return {
              text: "sema machi! innaiki evening kandippa meet pannuvom 🔥😂",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('game') || lowerUser.includes('play') || lowerUser.includes('hop on') || lowerUser.includes('discord')) {
            return {
              text: "seri da machi, 10 mins la login panren, waiting la iru 🎮🔥",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('work') || lowerUser.includes('office') || lowerUser.includes('busy')) {
            return {
              text: "office la sema headache da machi 😭 mudinjathum call panren",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('json') || lowerUser.includes('store') || lowerUser.includes('db') || lowerUser.includes('database')) {
            return {
              text: "aama da! sqlite database la ghostreply.db table messages la clean ah store aagudhu 👍",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('fallback') || lowerUser.includes('gemini') || lowerUser.includes('quota') || lowerUser.includes('rate limit')) {
            return {
              text: "aama da, Gemini quota free tier limit aayirukku (429)! adhanala Smart Fallback la dynamic ah reply panren 👍",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('orey') || lowerUser.includes('same') || lowerUser.includes('repeat') || lowerUser.includes('yenna')) {
            return {
              text: "haha illada 😂 Gemini rate limit hit aana udaney fallback switch aachu. ippo sollu enna seiyalam?",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('hi') || lowerUser.includes('hello') || lowerUser.includes('hai') || lowerUser.includes('vanakkam')) {
            const greetings = [
              "vanakkam da machan! enna vishayam innaiku? 😂",
              "hey da! epdi irukka? enna panitu irukka rn?",
              "yo bro! solluda, what's up innaiku? 🔥"
            ];
            return {
              text: greetings[Math.floor(Math.random() * greetings.length)],
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else if (lowerUser.includes('epdi irukka') || lowerUser.includes('how are you') || lowerUser.includes('sugama')) {
            return {
              text: "nalla irukken da machan! unakku epdi pogudhu innaiku? sema chill ah? 🔥",
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          } else {
            const randomCasual = [
              "machan sema da! 😂 apram enna vishayam? epdi poguthu?",
              "seri da paathukalam! Vera enna vishayam sollu? 🔥",
              "haha aama da! aprom innaiku plan enna?",
              "pakka da! konjam busy, but sollu enna matter? 👍",
              "mudila da 😂 innaiku full busy! nee enna pandre rn?"
            ];
            return {
              text: randomCasual[Math.floor(Math.random() * randomCasual.length)],
              provider: "Smart Fallback Engine",
              model: "persona-mirror-engine"
            };
          }
        }
      }

      // Default Global English fallback
      if (relation === 'spouse' || relation === 'partner') {
        if (lowerUser.includes('home') || lowerUser.includes('where') || lowerUser.includes('coming')) {
          return {
            text: "soon soon 😂 stuck in traffikk u know how it issss. love u ❤️",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else if (lowerUser.includes('dinner') || lowerUser.includes('food') || lowerUser.includes('eat') || lowerUser.includes('taco')) {
          return {
            text: "omggg yesss lets do tacos tonight!! craving it all day 🌮😋",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else if (lowerUser.includes('cat') || lowerUser.includes('feed')) {
          return {
            text: "yess fed the little monster right before heading out 😂❤️",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else {
          return {
            text: "got it my love ❤️ wrapping this up right now and heading over to u 🥰",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        }
      } else {
        // Friend / Bro / Casual
        if (lowerUser.includes('party') || lowerUser.includes('wild') || lowerUser.includes('last night')) {
          return {
            text: "fr fr 💀 cant believe what happened lmao u good tho?",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else if (lowerUser.includes('game') || lowerUser.includes('play') || lowerUser.includes('hop on') || lowerUser.includes('discord')) {
          return {
            text: "bettt gimme like 10 mins wrapping up some stuff then hopping on 🎮🔥",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else if (lowerUser.includes('sup') || lowerUser.includes('yo') || lowerUser.includes('hey')) {
          return {
            text: "yo yo what's good bro? chilling rn wbu",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        } else {
          return {
            text: "lmaooo fr tho 😂 bet we will sort it out later today",
            provider: "Smart Fallback Engine",
            model: "persona-mirror-engine"
          };
        }
      }
    }
  }

  // Ping / Connection verification for any provider
  async testConnection(provider, customConfig = {}) {
    const settings = await this.getSettings();
    const active = { ...settings, ...customConfig };

    try {
      switch (provider.toLowerCase()) {
        case 'ollama': {
          let ep = (active.ollama_endpoint || 'http://127.0.0.1:11434').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/api/tags`, { timeout: 5000 });
          const models = (res.data?.models || []).map(m => m.name);
          return { success: true, message: `Connected to Ollama! Found ${models.length} local models.`, models };
        }
        case 'lmstudio': {
          let ep = (active.lmstudio_endpoint || 'http://127.0.0.1:1234/v1').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/models`, { timeout: 5000 });
          const models = (res.data?.data || []).map(m => m.id);
          return { success: true, message: `Connected to LM Studio! Found ${models.length} active models.`, models };
        }
        case 'openai': {
          let ep = (active.openai_endpoint || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
          const apiKey = active.openai_api_key;
          if (!apiKey) return { success: false, message: 'OpenAI API key is missing.' };
          const res = await axios.get(`${ep}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 7000
          });
          const models = (res.data?.data || []).slice(0, 15).map(m => m.id);
          return { success: true, message: `Connected to OpenAI Compatible API!`, models };
        }
        case 'gemini': {
          const apiKey = (active.gemini_api_key || '').trim();
          if (!apiKey) return { success: false, message: 'Gemini API key is missing. Please enter your API key.' };
          let model = (active.gemini_model || 'gemini-3.8-flash').trim().replace(/^models\//, '');
          if (model === 'gemini-2.5-pro' || model === 'gemini-1.5-pro') model = 'gemini-3.8-flash';

          // 1. Test models list endpoint
          const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { timeout: 8000 });
          const models = (res.data?.models || []).map(m => m.name.replace('models/', ''));

          // 2. Perform live reply verification with selected model
          const startTime = Date.now();
          let replySample = 'OK';
          let latency = 0;
          try {
            const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const genRes = await axios.post(genUrl, {
              contents: [{ role: 'user', parts: [{ text: 'Ping! Reply with "OK".' }] }],
              generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
            }, { timeout: 10000 });
            latency = Date.now() - startTime;
            replySample = genRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
            return {
              success: true,
              message: `✓ Connected to Google Gemini! Model "${model}" verified in ${latency}ms (Reply: "${replySample}"). Found ${models.length} available models.`,
              models,
              model,
              latency,
              reply: replySample
            };
          } catch (genErr) {
            const genErrMsg = genErr.response?.data?.error?.message || genErr.message;
            return {
              success: false,
              message: `API Key is valid (${models.length} models found), but model "${model}" failed to generate: ${genErrMsg}. We recommend selecting "gemini-3.8-flash" or "gemini-2.5-flash".`,
              models
            };
          }
        }
        case 'openrouter': {
          const apiKey = active.openrouter_api_key;
          if (!apiKey) return { success: false, message: 'OpenRouter API key is missing.' };
          const res = await axios.get('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 7000
          });
          return { success: true, message: `Connected to OpenRouter! Key label: ${res.data?.data?.label || 'Active'}` };
        }
        case 'nvidia': {
          const apiKey = active.nvidia_api_key;
          if (!apiKey) return { success: false, message: 'NVIDIA API key is missing.' };
          let ep = (active.nvidia_endpoint || 'https://integrate.api.nvidia.com/v1').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 8000
          });
          const models = (res.data?.data || []).slice(0, 15).map(m => m.id);
          return { success: true, message: `Connected to NVIDIA NIM API! Found ${models.length} models.`, models };
        }
        case 'mock':
        default:
          return { success: true, message: 'Smart Fallback Engine is ready (No external API required).' };
      }
    } catch (err) {
      return { success: false, message: `Connection test failed: ${err.message}` };
    }
  }
  // Fetch available models list from any provider for dropdown population
  async fetchModels(provider, customConfig = {}) {
    const settings = await this.getSettings();
    const active = { ...settings, ...customConfig };

    try {
      switch (provider.toLowerCase()) {
        case 'ollama': {
          let ep = (active.ollama_endpoint || 'http://127.0.0.1:11434').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/api/tags`, { timeout: 8000 });
          const models = (res.data?.models || []).map(m => ({
            id: m.name,
            name: m.name,
            size: m.size ? `${(m.size / 1e9).toFixed(1)}GB` : null
          }));
          return { success: true, models, message: `Found ${models.length} models` };
        }
        case 'lmstudio': {
          let ep = (active.lmstudio_endpoint || 'http://127.0.0.1:1234/v1').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/models`, { timeout: 8000 });
          const models = (res.data?.data || []).map(m => ({
            id: m.id,
            name: m.id,
            owned_by: m.owned_by || null
          }));
          return { success: true, models, message: `Found ${models.length} models` };
        }
        case 'openai': {
          let ep = (active.openai_endpoint || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
          const apiKey = active.openai_api_key;
          if (!apiKey && !ep.includes('localhost') && !ep.includes('127.0.0.1')) {
            return { success: false, message: 'API key required', models: [] };
          }
          const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
          const res = await axios.get(`${ep}/models`, { headers, timeout: 10000 });
          const rawModels = res.data?.data || [];
          const models = rawModels
            .filter(m => m.id && !m.id.includes('embedding') && !m.id.includes('tts') && !m.id.includes('whisper') && !m.id.includes('dall-e'))
            .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
            .map(m => ({
              id: m.id,
              name: m.id,
              owned_by: m.owned_by || null
            }));
          return { success: true, models, message: `Found ${models.length} chat models` };
        }
        case 'gemini': {
          const apiKey = (active.gemini_api_key || '').trim();
          if (!apiKey) {
            // Provide curated modern default models even before key is entered
            return {
              success: true,
              models: [
                { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Flagship)', description: 'Fastest next-gen flagship high efficiency' },
                { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Hybrid Reasoning)', description: 'High capability dynamic thinking flash' },
                { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Production balanced flash model' },
                { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Ultra low latency & lightweight' },
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Stable)', description: 'Proven high speed production model' },
                { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Always points to newest stable flash version' }
              ],
              message: 'Showing default Gemini models (Enter API Key to load account models)'
            };
          }

          const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { timeout: 10000 });
          const rawModels = res.data?.models || [];
          
          // Filter to models supporting generateContent and exclude embeddings, tts, retired, and interactions-only models
          const validModels = rawModels.filter(m => {
            const methods = m.supportedGenerationMethods || [];
            const name = (m.name || '').toLowerCase();
            return methods.includes('generateContent') &&
              !name.includes('embedding') &&
              !name.includes('aqa') &&
              !name.includes('imagen') &&
              !name.includes('whisper') &&
              !name.includes('tts') &&
              !name.includes('image') &&
              !name.includes('lyria') &&
              !name.includes('transcribe') &&
              !name.includes('banana') &&
              !name.includes('robotics') &&
              !name.includes('antigravity') &&
              !name.includes('deep-research') &&
              !name.includes('customtools') &&
              !name.includes('computer-use') &&
              !name.includes('bison') &&
              !name.includes('2.5-pro') &&
              !name.includes('2.5-flash-lite');
          });

          // Priority ranking to place latest & best Gemini models at the top
          const getPriority = (id) => {
            const lower = id.toLowerCase();
            if (lower === 'gemini-3.8-flash') return 120;
            if (lower === 'gemini-3.7-flash') return 115;
            if (lower === 'gemini-3.6-flash') return 110;
            if (lower === 'gemini-3.5-flash') return 105;
            if (lower === 'gemini-3.1-flash-lite') return 100;
            if (lower === 'gemini-3.1-flash-lite-preview') return 95;
            if (lower === 'gemini-flash-latest') return 90;
            if (lower === 'gemini-2.5-flash') return 85;
            if (lower === 'gemini-flash-lite-latest') return 80;
            if (lower.includes('3.5-flash-lite')) return 75;
            if (lower.includes('3-flash')) return 70;
            if (lower.includes('gemma')) return 60;
            return 40;
          };

          validModels.sort((a, b) => {
            const idA = a.name.replace('models/', '');
            const idB = b.name.replace('models/', '');
            const pDiff = getPriority(idB) - getPriority(idA);
            if (pDiff !== 0) return pDiff;
            return idA.localeCompare(idB);
          });

          const models = validModels.map(m => {
            const cleanId = m.name.replace('models/', '');
            return {
              id: cleanId,
              name: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
              description: m.description || null
            };
          });

          return { success: true, models, message: `Found ${models.length} active generative models` };
        }
        case 'openrouter': {
          const apiKey = active.openrouter_api_key;
          if (!apiKey) return { success: false, message: 'OpenRouter API key required', models: [] };
          const res = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
          });
          const rawModels = res.data?.data || [];
          const models = rawModels
            .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
            .map(m => ({
              id: m.id,
              name: m.name || m.id,
              context_length: m.context_length || null,
              pricing: m.pricing ? `$${m.pricing.prompt}/prompt` : null
            }));
          return { success: true, models, message: `Found ${models.length} models` };
        }
        case 'nvidia': {
          const apiKey = active.nvidia_api_key;
          if (!apiKey) return { success: false, message: 'NVIDIA API key required', models: [] };
          let ep = (active.nvidia_endpoint || 'https://integrate.api.nvidia.com/v1').trim().replace(/\/$/, '');
          const res = await axios.get(`${ep}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
          });
          const models = (res.data?.data || []).map(m => ({
            id: m.id,
            name: m.id,
            owned_by: m.owned_by || null
          }));
          return { success: true, models, message: `Found ${models.length} models` };
        }
        case 'mock':
        default:
          return { success: true, models: [
            { id: 'smart-fallback', name: 'Smart Fallback Engine' },
            { id: 'persona-mirror-engine', name: 'Persona Mirror (Personal)' },
            { id: 'professional-rag-engine', name: 'Professional RAG Engine' }
          ], message: 'Built-in fallback models' };
      }
    } catch (err) {
      return { success: false, message: `Failed to fetch models: ${err.message}`, models: [] };
    }
  }

  // Live generation test confirming that the provider & model actively reply
  async testLiveGeneration(provider, customConfig = {}) {
    const settings = await this.getSettings();
    const activeProvider = provider || customConfig.active_provider || settings.active_provider || 'mock';
    const active = { ...settings, ...customConfig, active_provider: activeProvider };
    const model = active[`${activeProvider}_model`] || 'default';
    const startTime = Date.now();

    try {
      let res;
      switch (activeProvider.toLowerCase()) {
        case 'ollama':
          res = await this.callOllama({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'lmstudio':
          res = await this.callLMStudio({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'openai':
          res = await this.callOpenAI({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'gemini':
          res = await this.callGemini({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'openrouter':
          res = await this.callOpenRouter({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'nvidia':
          res = await this.callNvidia({ system: 'You are an AI ping tester.', user: 'Hello, reply with "OK".', history: [], temperature: 0.1, max_tokens: 15, settings: active });
          break;
        case 'mock':
        default:
          res = await this.callSmartMock({ system: 'Mock Test', user: 'ping', history: [], mode: 'personal', settings: active });
          break;
      }

      const latency = Date.now() - startTime;
      const cleanReply = this.cleanOutput(res.text);

      return {
        success: true,
        isFallback: false,
        provider: res.provider || activeProvider,
        model: res.model || model,
        latency,
        reply: cleanReply,
        message: `✓ Confirmed! ${res.provider || activeProvider} (${res.model || model}) is active and replying (${latency}ms). Reply: "${cleanReply.substring(0, 80)}"`
      };
    } catch (err) {
      const latency = Date.now() - startTime;
      const detailedError = err.response?.data?.error?.message || err.message;
      return {
        success: false,
        isFallback: true,
        provider: activeProvider,
        model,
        latency,
        error: detailedError,
        message: `AI Model test failed for ${activeProvider} (${model}): ${detailedError}`
      };
    }
  }
}

module.exports = new LLMService();
