const axios = require('axios');
const { getAsync, allAsync } = require('../db/database');

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
      switch (provider.toLowerCase()) {
        case 'ollama':
          return await this.callOllama({ system, user, history, temperature, max_tokens, settings });
        case 'lmstudio':
          return await this.callLMStudio({ system, user, history, temperature, max_tokens, settings });
        case 'openai':
          return await this.callOpenAI({ system, user, history, temperature, max_tokens, settings });
        case 'gemini':
          return await this.callGemini({ system, user, history, temperature, max_tokens, settings });
        case 'openrouter':
          return await this.callOpenRouter({ system, user, history, temperature, max_tokens, settings });
        case 'nvidia':
          return await this.callNvidia({ system, user, history, temperature, max_tokens, settings });
        case 'mock':
        default:
          return await this.callSmartMock({ system, user, history, mode, extraContext });
      }
    } catch (err) {
      console.warn(`[LLMService] Provider ${provider} failed (${err.message}). Falling back to Smart Fallback Engine...`);
      const fallbackResponse = await this.callSmartMock({ system, user, history, mode, extraContext });
      return {
        text: fallbackResponse.text,
        provider: `${provider} (Fallback: ${err.message})`,
        model: 'smart-fallback',
        isFallback: true,
        error: err.message
      };
    }
  }

  // 1. Ollama Integration (Supports OpenAI compatible endpoint and native)
  async callOllama({ system, user, history, temperature, max_tokens, settings }) {
    let endpoint = (settings.ollama_endpoint || 'http://127.0.0.1:11434').trim().replace(/\/$/, '');
    const model = settings.ollama_model || 'llama3.2:latest';
    
    // Construct messages array
    const messages = [{ role: 'system', content: system }];
    history.forEach(h => messages.push({ role: h.role || (h.direction === 'incoming' ? 'user' : 'assistant'), content: h.text || h.content }));
    messages.push({ role: 'user', content: user });

    const targetUrl = endpoint.endsWith('/v1') ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;

    const res = await axios.post(targetUrl, {
      model,
      messages,
      temperature,
      max_tokens
    }, { timeout: 30000 });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'Ollama', model };
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
    }, { timeout: 30000 });

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
      timeout: 35000
    });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'OpenAI Compatible', model };
  }

  // 4. Google Gemini API
  async callGemini({ system, user, history, temperature, max_tokens, settings }) {
    const apiKey = settings.gemini_api_key;
    const model = settings.gemini_model || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing');
    }

    // Google Gemini Generative Language REST API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    // System instruction can be prepended or passed as system_instruction
    const systemInstruction = {
      role: 'system',
      parts: [{ text: system }]
    };

    history.forEach(h => {
      const role = (h.direction === 'incoming' || h.role === 'user') ? 'user' : 'model';
      contents.push({
        role,
        parts: [{ text: h.text || h.content }]
      });
    });

    contents.push({
      role: 'user',
      parts: [{ text: user }]
    });

    const payload = {
      system_instruction: systemInstruction,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    };

    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 35000
    });

    const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text: reply.trim(), provider: 'Google Gemini', model };
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
      timeout: 40000
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
      timeout: 40000
    });

    const reply = res.data?.choices?.[0]?.message?.content || '';
    return { text: reply.trim(), provider: 'NVIDIA NIM', model };
  }

  // 7. Context-Aware Smart Fallback Generator (Instant simulation & testing)
  async callSmartMock({ system, user, history, mode, extraContext = {} }) {
    const lowerUser = (user || '').toLowerCase();

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
          const apiKey = active.gemini_api_key;
          if (!apiKey) return { success: false, message: 'Gemini API key is missing.' };
          const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { timeout: 7000 });
          const models = (res.data?.models || []).map(m => m.name.replace('models/', ''));
          return { success: true, message: `Connected to Google Gemini! Found ${models.length} models.`, models };
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
}

module.exports = new LLMService();
