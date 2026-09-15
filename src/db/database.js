const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../ghostreply.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH);
    dbInstance.run('PRAGMA foreign_keys = ON;');
    dbInstance.run('PRAGMA journal_mode = WAL;');
    dbInstance.run('PRAGMA busy_timeout = 5000;');
  }
  return dbInstance;
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function initDatabase() {
  const db = getDb();
  
  // 1. Settings Table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Contacts Table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT,
      avatar TEXT,
      platform TEXT DEFAULT 'simulator',
      mode TEXT DEFAULT 'personal', -- 'personal' or 'professional'
      auto_reply INTEGER DEFAULT 1,
      delay_mode TEXT DEFAULT 'natural', -- 'immediate', 'natural', 'delayed'
      delay_seconds INTEGER DEFAULT 3,
      escalation_contact TEXT,
      relationship_type TEXT DEFAULT 'friend', -- 'spouse', 'friend', 'parent', 'sibling', 'colleague', 'client'
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Personality Profiles Table (Personal Mode)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS personality_profiles (
      contact_id TEXT PRIMARY KEY,
      formality_level REAL DEFAULT 0.2,
      avg_message_length INTEGER DEFAULT 8,
      primary_language TEXT DEFAULT 'en',
      code_switching TEXT DEFAULT 'none',
      typo_patterns TEXT DEFAULT '[]',
      abbreviation_map TEXT DEFAULT '{}',
      excitement_markers TEXT DEFAULT '["omg", "fr", "yooo", "!!"]',
      favorite_emojis TEXT DEFAULT '["😂", "💀", "🔥", "😭"]',
      emoji_frequency REAL DEFAULT 0.8,
      humor_type TEXT DEFAULT 'sarcastic-banter',
      intimacy_level REAL DEFAULT 0.8,
      inside_jokes TEXT DEFAULT '[]',
      shared_topics TEXT DEFAULT '[]',
      few_shot_examples TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `);

  // 4. Knowledge Base Documents (Professional Mode RAG)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      content TEXT NOT NULL,
      chunk_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Knowledge Base Chunks
  await runAsync(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
    )
  `);

  // 6. Messages Table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      direction TEXT NOT NULL, -- 'incoming' or 'outgoing'
      sender_name TEXT NOT NULL,
      text TEXT NOT NULL,
      mode TEXT NOT NULL, -- 'personal' or 'professional'
      metadata TEXT DEFAULT '{}',
      status TEXT DEFAULT 'delivered', -- 'delivered', 'pending', 'escalated'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `);

  // 7. Escalations Table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS escalations (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      message_id TEXT,
      incoming_text TEXT NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT DEFAULT 'high', -- 'low', 'medium', 'high', 'emergency'
      status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
      human_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `);

  // 8. Connected Accounts Table (Multi-Account Facility)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS connected_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL, -- 'telegram', 'whatsapp', 'signal'
      account_name TEXT NOT NULL,
      identifier TEXT, -- @botusername, phone number, etc.
      credentials TEXT, -- JSON string
      mode TEXT DEFAULT 'personal', -- 'personal' or 'professional'
      auto_reply INTEGER DEFAULT 1,
      status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'pairing'
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure contacts table has chat customization and control columns
  const contactCustomizationCols = [
    { name: 'notifications_enabled', type: 'INTEGER DEFAULT 1' },
    { name: 'chat_font', type: "TEXT DEFAULT 'Inter'" },
    { name: 'chat_theme', type: "TEXT DEFAULT 'emerald'" },
    { name: 'chat_background', type: "TEXT DEFAULT 'doodle'" },
    { name: 'chat_font_size', type: "TEXT DEFAULT 'medium'" },
    { name: 'chat_bubble_style', type: "TEXT DEFAULT 'rounded'" }
  ];

  for (const col of contactCustomizationCols) {
    try {
      await runAsync(`ALTER TABLE contacts ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column exists or syntax already applied
    }
  }

  // Seed default settings if empty
  await seedDefaultSettings();
  // Migrate legacy placeholder name if present
  try {
    await runAsync(`UPDATE settings SET value = 'Elavarasan P' WHERE key = 'user_name' AND value = 'Alex Mercer'`);
    await runAsync(`UPDATE settings SET value = 'Dual-Mode AI Operator' WHERE key = 'user_persona_title' AND value = 'Tech Lead & Founder'`);
    const avatarRow = await getAsync(`SELECT key FROM settings WHERE key = 'user_avatar_initials'`);
    if (!avatarRow) {
      await runAsync(`INSERT INTO settings (key, value) VALUES ('user_avatar_initials', 'EP')`);
    }
    const thinkRow = await getAsync(`SELECT key FROM settings WHERE key = 'model_think_mode'`);
    if (!thinkRow) {
      await runAsync(`INSERT INTO settings (key, value) VALUES ('model_think_mode', 'false')`);
    }
    const minPromptRow = await getAsync(`SELECT key FROM settings WHERE key = 'minimal_system_prompt'`);
    if (!minPromptRow) {
      await runAsync(`INSERT INTO settings (key, value) VALUES ('minimal_system_prompt', 'false')`);
    }

    // Ensure Local Model default settings are present
    for (const [k, v] of [
      ['local_endpoint', 'http://127.0.0.1:8000/v1'],
      ['local_model', 'local-model'],
      ['local_api_key', '']
    ]) {
      const row = await getAsync(`SELECT key FROM settings WHERE key = ?`, [k]);
      if (!row) {
        await runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, [k, v]);
      }
    }

    // Ensure Direct AI Assistant contact exists for Direct LLM & attachment testing
    const directAiContact = await getAsync(`SELECT id FROM contacts WHERE id = 'contact_direct_ai'`);
    if (!directAiContact) {
      await runAsync(`
        INSERT INTO contacts (id, name, handle, avatar, platform, mode, auto_reply, delay_mode, delay_seconds, relationship_type)
        VALUES ('contact_direct_ai', '🤖 Direct AI Assistant', '@direct_ai', '🤖', 'simulator', 'direct', 1, 'immediate', 0, 'assistant')
      `).catch(() => {});
      await runAsync(`
        INSERT OR IGNORE INTO personality_profiles (contact_id, formality_level, notes)
        VALUES ('contact_direct_ai', 0.5, 'Direct LLM assistant mode with zero artificial delay and full attachment support')
      `).catch(() => {});
    }
  } catch (e) {
    // Migration error ignored
  }
  // Seed sample contacts and knowledge docs
  await seedInitialData();
  // Seed initial connected accounts if empty
  await seedConnectedAccounts();
}

async function seedDefaultSettings() {
  const defaultSettings = [
    ['active_provider', 'ollama'],
    ['user_name', 'Elavarasan P'],
    ['user_persona_title', 'Dual-Mode AI Operator'],
    ['user_avatar_initials', 'EP'],
    
    // Ollama settings
    ['ollama_endpoint', 'http://127.0.0.1:11434'],
    ['ollama_model', 'nemotron-3-ultra:cloud'],
    
    // LM Studio settings
    ['lmstudio_endpoint', 'http://127.0.0.1:1234/v1'],
    ['lmstudio_model', 'local-model'],

    // Local Model settings (Custom Local Server: LocalAI, vLLM, llama.cpp, Jan, TextGen)
    ['local_endpoint', 'http://127.0.0.1:8000/v1'],
    ['local_model', 'local-model'],
    ['local_api_key', ''],
    
    // OpenAI Compatible settings
    ['openai_endpoint', 'https://api.openai.com/v1'],
    ['openai_api_key', ''],
    ['openai_model', 'gpt-4o-mini'],
    
    // Google Gemini settings
    ['gemini_api_key', ''],
    ['gemini_model', 'gemini-3.8-flash'],
    
    // OpenRouter settings
    ['openrouter_api_key', ''],
    ['openrouter_model', 'meta-llama/llama-3.3-70b-instruct'],
    
    // NVIDIA NIM settings
    ['nvidia_api_key', ''],
    ['nvidia_endpoint', 'https://integrate.api.nvidia.com/v1'],
    ['nvidia_model', 'meta/llama-3.1-70b-instruct'],

    // Global Auto-Reply Switch
    ['global_auto_reply', 'true'],
    ['safety_escalation_enabled', 'true'],
    ['natural_delay_multiplier', '1.0'],

    // Custom System Prompt Controls
    ['custom_system_prompt_enabled', 'false'],
    ['custom_system_prompt_personal', ''],
    ['custom_system_prompt_professional', ''],
    ['custom_system_prompt_extra', ''],

    // Language & Code-Switching (Default: Tanglish Tamil+English 98%)
    ['preferred_language', 'tanglish'], // 'tanglish', 'english', 'hinglish', 'tenglish', 'manglish', 'kanglish', 'tamil'
    ['code_switching_ratio', '98'], // 98% mix

    // Response Speed & Token Optimization
    ['response_speed_mode', 'quick'], // 'quick' (instant/fast sub-2s) or 'deep' (deliberate thinking)

    // AI Model Think Mode (Reasoning / Chain-of-Thought)
    ['model_think_mode', 'false'], // 'false' (disabled/suppress <think>) or 'true' (enabled)

    // Minimal System Prompt Mode (Fast & compact ~40 tokens)
    ['minimal_system_prompt', 'false'],

    // Debug Mode Telemetry Switch
    ['debug_mode', 'false'],

    // Voice Studio (ASR & TTS Voice Rhythm / Emotion)
    ['voice_pitch', '1.0'],
    ['voice_rate', '1.05'],
    ['voice_emotion', 'warm'], // 'warm', 'playful', 'calm', 'expressive'
    ['voice_timbre', 'default'],
    ['voice_asr_lang', 'ta-IN'],

    // Signal App Integration
    ['signal_endpoint', 'http://127.0.0.1:8080'],
    ['signal_phone_number', ''],
    ['signal_status', 'disconnected']
  ];

  for (const [key, value] of defaultSettings) {
    const row = await getAsync(`SELECT key FROM settings WHERE key = ?`, [key]);
    if (!row) {
      await runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }
}

async function seedInitialData() {
  const contactCount = await getAsync(`SELECT COUNT(*) as count FROM contacts`);
  if (contactCount && contactCount.count > 0) return;

  // 1. Sample Personal Contacts
  const contacts = [
    {
      id: 'contact_wife',
      name: 'Maya (Wife)',
      handle: '+1 (555) 234-5678',
      avatar: '👩‍❤️‍👨',
      platform: 'whatsapp',
      mode: 'personal',
      relationship_type: 'spouse',
      delay_mode: 'natural',
      delay_seconds: 2,
      profile: {
        formality_level: 0.1,
        avg_message_length: 7,
        primary_language: 'en',
        abbreviation_map: JSON.stringify({ you: 'u', 'right now': 'rn', 'are': 'r', 'traffic': 'traffikk', 'love': 'luvvv' }),
        excitement_markers: JSON.stringify(['omggg', 'yesss', '❤️❤️', '🥰']),
        favorite_emojis: JSON.stringify(['😂', '🥰', '😘', '❤️', '😤']),
        emoji_frequency: 0.9,
        humor_type: 'playful-affectionate',
        intimacy_level: 1.0,
        inside_jokes: JSON.stringify(['burrito night disaster', 'ikea shelf incident', 'our cat snores']),
        few_shot_examples: JSON.stringify([
          { incoming: 'When u coming home? 😤', outgoing: 'soon soon 😂 stuck in traffikk u know how it issss' },
          { incoming: 'Did you feed the cat??', outgoing: 'yess did it before leaving! love u ❤️' },
          { incoming: 'wanna grab tacos tonight?', outgoing: 'omggg yesss taco tuesday lets gooo 🌮😋' }
        ])
      }
    },
    {
      id: 'contact_friend',
      name: 'Jake (Best Friend)',
      handle: '+1 (555) 876-5432',
      avatar: '⚡',
      platform: 'telegram',
      mode: 'personal',
      relationship_type: 'friend',
      delay_mode: 'natural',
      delay_seconds: 3,
      profile: {
        formality_level: 0.05,
        avg_message_length: 6,
        primary_language: 'en',
        abbreviation_map: JSON.stringify({ you: 'u', 'for real': 'fr fr', 'laughing': 'lmao', 'brother': 'bro', 'though': 'tho', 'cant': 'cant' }),
        excitement_markers: JSON.stringify(['fr fr', 'yooo', '💀', 'wild']),
        favorite_emojis: JSON.stringify(['💀', '🔥', '😂', '👀']),
        emoji_frequency: 0.7,
        humor_type: 'sarcastic-banter',
        intimacy_level: 0.7,
        inside_jokes: JSON.stringify(['halo tournament 2022', 'overcooked pizza', 'crypto diamond hands']),
        few_shot_examples: JSON.stringify([
          { incoming: 'bro that party was wild last night 💀', outgoing: 'fr fr 💀 cant believe what happened lmao u good tho?' },
          { incoming: 'hop on discord later?', outgoing: 'bettt gimme 20 mins finishing this work stuff' },
          { incoming: 'did u see the game score?', outgoing: 'bro they choked so hard im dying 😂😭' }
        ])
      }
    },
    {
      id: 'contact_client',
      name: 'David Vance (Enterprise Lead)',
      handle: 'david.vance@apexcloud.io',
      avatar: '💼',
      platform: 'simulator',
      mode: 'professional',
      relationship_type: 'client',
      delay_mode: 'immediate',
      delay_seconds: 1
    },
    {
      id: 'contact_support',
      name: 'Sarah Connor (Support Ticket #408)',
      handle: '+1 (555) 408-1122',
      avatar: '🎫',
      platform: 'whatsapp',
      mode: 'professional',
      relationship_type: 'client',
      delay_mode: 'immediate',
      delay_seconds: 1
    }
  ];

  for (const c of contacts) {
    await runAsync(
      `INSERT OR IGNORE INTO contacts (id, name, handle, avatar, platform, mode, relationship_type, delay_mode, delay_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.handle, c.avatar, c.platform, c.mode, c.relationship_type, c.delay_mode, c.delay_seconds]
    );

    if (c.profile) {
      await runAsync(
        `INSERT OR IGNORE INTO personality_profiles (contact_id, formality_level, avg_message_length, primary_language, abbreviation_map, excitement_markers, favorite_emojis, emoji_frequency, humor_type, intimacy_level, inside_jokes, few_shot_examples)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id,
          c.profile.formality_level,
          c.profile.avg_message_length,
          c.profile.primary_language,
          c.profile.abbreviation_map,
          c.profile.excitement_markers,
          c.profile.favorite_emojis,
          c.profile.emoji_frequency,
          c.profile.humor_type,
          c.profile.intimacy_level,
          c.profile.inside_jokes,
          c.profile.few_shot_examples
        ]
      );
    }
  }

  // 2. Sample Knowledge Base Docs (Professional RAG)
  const docs = [
    {
      id: 'doc_refund_policy',
      title: 'Company Refund & Returns Policy',
      category: 'policies',
      content: `GhostReply & CloudFlow Refund Policy (Effective 2026):
1. 30-Day Money-Back Guarantee: Customers are eligible for a 100% refund on all standard subscription plans within 30 days of initial purchase.
2. Physical Goods / Hardware: Must be returned in original packaging within 30 days in unused condition for a full refund.
3. Non-Refundable Items: Custom enterprise integrations, dedicated engineering setup fees, and services already rendered beyond 30 days are non-refundable.
4. Process: Refunds are processed back to the original payment method within 3 to 5 business days after approval.`
    },
    {
      id: 'doc_pricing_sla',
      title: 'Subscription Tiers & SLA Support Matrix',
      category: 'pricing',
      content: `CloudFlow Platform Pricing & SLA Matrix:
- Starter Tier: $29/month. Includes up to 5,000 automated replies, standard community support with 24-hour email SLA.
- Professional Tier: $99/month. Includes unlimited replies, WhatsApp Web & Telegram sync, RAG document indexing, 4-hour SLA.
- Enterprise Tier: Custom pricing starting at $499/month. Dedicated instance, custom LLM fine-tuning, 99.99% uptime guarantee, 1-hour critical response SLA, dedicated account manager.
- Payment Terms: Monthly or annual billing. Annual billing provides a 20% discount.`
    },
    {
      id: 'doc_security_privacy',
      title: 'Security, Encryption & Privacy Guidelines',
      category: 'security',
      content: `Security & Privacy Architecture:
1. End-to-End Encryption: All personal chat history and contact information are stored locally or in encrypted vaults with AES-256.
2. No Cloud Chat Scraping: GhostReply never uploads private family/social chats to unapproved third-party cloud aggregators.
3. Compliance: SOC-2 Type II certified and GDPR compliant. Users can purge their entire chat index and vector store at any time via Settings -> Purge Data.`
    }
  ];

  for (const doc of docs) {
    await runAsync(
      `INSERT OR IGNORE INTO knowledge_docs (id, title, category, content, chunk_count)
       VALUES (?, ?, ?, ?, 1)`,
      [doc.id, doc.title, doc.category, doc.content]
    );

    await runAsync(
      `INSERT OR IGNORE INTO knowledge_chunks (id, doc_id, chunk_index, content, keywords)
       VALUES (?, ?, 0, ?, ?)`,
      [`chunk_${doc.id}_0`, doc.id, doc.content, doc.title.toLowerCase()]
    );
  }
}

async function seedConnectedAccounts() {
  const defaultAccounts = [
    {
      id: 'acc_wa_primary',
      platform: 'whatsapp',
      account_name: 'Personal WhatsApp',
      identifier: '+1 (555) 234-5678',
      credentials: JSON.stringify({ session_dir: 'credentials/whatsapp/acc_wa_primary' }),
      mode: 'personal',
      auto_reply: 1,
      status: 'connected',
      is_active: 1
    },
    {
      id: 'acc_tg_primary',
      platform: 'telegram',
      account_name: 'Personal Telegram Bot',
      identifier: '@GhostReplyAssistantBot',
      credentials: JSON.stringify({ token: '' }),
      mode: 'personal',
      auto_reply: 1,
      status: 'disconnected',
      is_active: 1
    },
    {
      id: 'acc_signal_primary',
      platform: 'signal',
      account_name: 'Signal Personal Device',
      identifier: '+91 98765 43210',
      credentials: JSON.stringify({ endpoint: 'http://127.0.0.1:8080' }),
      mode: 'personal',
      auto_reply: 1,
      status: 'disconnected',
      is_active: 1
    }
  ];

  for (const acc of defaultAccounts) {
    await runAsync(
      `INSERT OR IGNORE INTO connected_accounts (id, platform, account_name, identifier, credentials, mode, auto_reply, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [acc.id, acc.platform, acc.account_name, acc.identifier, acc.credentials, acc.mode, acc.auto_reply, acc.status, acc.is_active]
    );
  }
}

module.exports = {
  getDb,
  runAsync,
  allAsync,
  getAsync,
  initDatabase,
  seedConnectedAccounts
};
