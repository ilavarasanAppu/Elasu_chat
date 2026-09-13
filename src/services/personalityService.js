const { runAsync, getAsync, allAsync } = require('../db/database');

class PersonalityService {
  constructor() {
    this.commonAbbreviations = {
      'u': 'you',
      'ur': 'your',
      'r': 'are',
      'rn': 'right now',
      'fr': 'for real',
      'fr fr': 'for real for real',
      'lmao': 'laughing',
      'lol': 'laughing',
      'idk': 'i do not know',
      'tbh': 'to be honest',
      'imo': 'in my opinion',
      'brb': 'be right back',
      'wbu': 'what about you',
      'hbu': 'how about you',
      'omg': 'oh my god',
      'omggg': 'oh my god',
      'gimme': 'give me',
      'gonna': 'going to',
      'wanna': 'want to',
      'btw': 'by the way',
      'nvm': 'never mind',
      'tho': 'though',
      'k': 'okay',
      'kk': 'okay',
      'bet': 'deal/agreed'
    };

    this.emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  }

  /**
   * Safely parse JSON strings with fallback value
   */
  safeJsonParse(val, fallback = {}) {
    if (val === null || val === undefined) return fallback;
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  /**
   * Parse WhatsApp Export Text File (_chat.txt)
   */
  parseWhatsAppChat(fileContent, primaryUser = '') {
    const lines = fileContent.split(/\r?\n/);
    const messages = [];
    
    // Patterns for iOS: [24/05/23, 14:20:10] Alex: Hello
    // Patterns for Android: 24/05/2023, 2:20 PM - Alex: Hello
    const iosRegex = /^\[(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s+([^:]+):\s*(.*)$/;
    const androidRegex = /^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)\s+-\s+([^:]+):\s*(.*)$/;

    let currentMsg = null;

    for (const line of lines) {
      if (!line.trim()) continue;

      let match = line.match(iosRegex) || line.match(androidRegex);
      if (match) {
        if (currentMsg) messages.push(currentMsg);

        const date = match[1];
        const time = match[2];
        const sender = match[3].trim();
        const text = match[4].trim();

        // Filter out system events
        if (!text.includes('Messages and calls are end-to-end encrypted') &&
            !text.includes('<Media omitted>') &&
            !text.includes('omitted>')) {
          currentMsg = {
            date,
            time,
            sender,
            text,
            isUser: primaryUser ? sender.toLowerCase().includes(primaryUser.toLowerCase()) : false
          };
        } else {
          currentMsg = null;
        }
      } else if (currentMsg) {
        // Multi-line continuation
        currentMsg.text += `\n${line.trim()}`;
      }
    }

    if (currentMsg) messages.push(currentMsg);
    return messages;
  }

  /**
   * Analyze Parsed Messages & Generate 4-Phase Personality Profile
   */
  analyzeChatHistory(messages, targetContactName = '', userName = 'Alex') {
    if (!messages || messages.length === 0) {
      return this.getDefaultProfile();
    }

    // Split user messages and contact messages
    let userMessages = [];
    let contactMessages = [];

    const senders = {};
    messages.forEach(m => {
      senders[m.sender] = (senders[m.sender] || 0) + 1;
    });

    const senderKeys = Object.keys(senders);
    let detectedUserName = userName;
    if (senderKeys.length >= 2) {
      // Find matching user or take the one with higher frequency or matching name
      const matching = senderKeys.find(s => s.toLowerCase().includes(userName.toLowerCase()));
      detectedUserName = matching || senderKeys[0];
    }

    messages.forEach(m => {
      if (m.sender === detectedUserName || m.isUser) {
        userMessages.push(m.text);
      } else {
        contactMessages.push(m.text);
      }
    });

    if (userMessages.length === 0) {
      userMessages = messages.map(m => m.text);
    }

    // --- Phase 1: Linguistic Pattern Extraction ---
    let totalTokens = 0;
    let totalUppercaseFirst = 0;
    let totalAllLower = 0;
    let totalPunctuation = 0;
    const wordFreq = {};
    const abbreviationsDetected = {};
    const typoPatterns = [];

    userMessages.forEach(msg => {
      const words = msg.split(/\s+/).filter(w => w.length > 0);
      totalTokens += words.length;

      if (msg === msg.toLowerCase()) totalAllLower++;
      if (/^[A-Z]/.test(msg)) totalUppercaseFirst++;
      if (/[.!?…]$/.test(msg)) totalPunctuation++;

      words.forEach(w => {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean) {
          wordFreq[clean] = (wordFreq[clean] || 0) + 1;
          if (this.commonAbbreviations[clean]) {
            abbreviationsDetected[this.commonAbbreviations[clean]] = clean;
          }
        }
      });
    });

    const avgMessageLength = Math.max(1, Math.round(totalTokens / userMessages.length));
    const uniqueWords = Object.keys(wordFreq).length;
    const vocabularyRichness = Number((uniqueWords / Math.max(1, totalTokens)).toFixed(2));
    
    // Formality Score: 0.0 (very informal/slang) to 1.0 (very formal)
    const lowerRatio = totalAllLower / userMessages.length;
    const puncRatio = totalPunctuation / userMessages.length;
    const slangRatio = Object.keys(abbreviationsDetected).length / Math.max(1, uniqueWords);
    let formalityLevel = Math.max(0.05, Math.min(0.95, Number((0.5 + (puncRatio * 0.3) - (lowerRatio * 0.3) - (slangRatio * 0.4)).toFixed(2))));

    // --- Phase 2: Emotional Expression Mapping ---
    const allEmojis = [];
    let messagesWithEmojis = 0;
    const excitementMarkersFound = new Set();
    const greetingsFound = new Set();

    const excitementKeywords = ['omg', 'omggg', 'yooo', 'yesss', 'fr fr', 'let\'s go', 'lets gooo', 'wild', 'lit', 'hyped', '!!'];
    const greetingKeywords = ['yo', 'hey', 'hiiii', 'sup', 'heyy', 'hello', 'good morning', 'gm'];

    userMessages.forEach(msg => {
      const lower = msg.toLowerCase();
      const emojis = msg.match(this.emojiRegex) || [];
      if (emojis.length > 0) {
        messagesWithEmojis++;
        emojis.forEach(e => allEmojis.push(e));
      }

      excitementKeywords.forEach(k => {
        if (lower.includes(k)) excitementMarkersFound.add(k);
      });

      greetingKeywords.forEach(g => {
        if (lower.startsWith(g)) greetingsFound.add(g);
      });
    });

    const emojiCountMap = {};
    allEmojis.forEach(e => emojiCountMap[e] = (emojiCountMap[e] || 0) + 1);
    const favoriteEmojis = Object.keys(emojiCountMap)
      .sort((a, b) => emojiCountMap[b] - emojiCountMap[a])
      .slice(0, 5);

    const emojiFrequency = Number((messagesWithEmojis / Math.max(1, userMessages.length)).toFixed(2));

    // Humor & Emotion classification
    let humorType = 'playful-banter';
    if (favoriteEmojis.includes('💀') || favoriteEmojis.includes('😭')) humorType = 'sarcastic-humor';
    else if (favoriteEmojis.includes('❤️') || favoriteEmojis.includes('🥰') || favoriteEmojis.includes('😘')) humorType = 'affectionate-warm';
    else if (formalityLevel > 0.6) humorType = 'polite-friendly';

    // --- Phase 3: Relationship Dynamics ---
    let contactType = 'friend';
    let intimacyLevel = 0.6;
    if (humorType === 'affectionate-warm' || targetContactName.toLowerCase().includes('wife') || targetContactName.toLowerCase().includes('husband')) {
      contactType = 'spouse';
      intimacyLevel = 0.95;
    } else if (targetContactName.toLowerCase().includes('bro') || targetContactName.toLowerCase().includes('friend') || favoriteEmojis.includes('💀')) {
      contactType = 'friend';
      intimacyLevel = 0.75;
    } else if (targetContactName.toLowerCase().includes('client') || formalityLevel > 0.6) {
      contactType = 'colleague';
      intimacyLevel = 0.3;
    }

    // Extract inside jokes / shared phrases
    const insideJokes = [];
    if (userMessages.some(m => m.toLowerCase().includes('traffikk') || m.toLowerCase().includes('traffic'))) insideJokes.push('stuck in traffic running joke');
    if (userMessages.some(m => m.toLowerCase().includes('taco') || m.toLowerCase().includes('burrito'))) insideJokes.push('taco night craving');
    if (userMessages.some(m => m.toLowerCase().includes('party') || m.toLowerCase().includes('game'))) insideJokes.push('gaming & weekend adventures');

    // Generate Few-Shot Examples from conversation turns
    const fewShotExamples = [];
    for (let i = 0; i < messages.length - 1 && fewShotExamples.length < 4; i++) {
      if (!messages[i].isUser && messages[i + 1].isUser) {
        fewShotExamples.push({
          incoming: messages[i].text.substring(0, 100),
          outgoing: messages[i + 1].text.substring(0, 100)
        });
      }
    }

    return {
      formality_level: formalityLevel,
      avg_message_length: avgMessageLength,
      primary_language: 'en',
      code_switching: 'none',
      vocabulary_richness: vocabularyRichness,
      typo_patterns: JSON.stringify(typoPatterns),
      abbreviation_map: JSON.stringify(abbreviationsDetected),
      excitement_markers: JSON.stringify(Array.from(excitementMarkersFound).length ? Array.from(excitementMarkersFound) : ['omg', 'fr fr', 'yooo']),
      favorite_emojis: JSON.stringify(favoriteEmojis.length ? favoriteEmojis : ['😂', '💀', '🔥']),
      emoji_frequency: emojiFrequency || 0.7,
      humor_type: humorType,
      intimacy_level: intimacyLevel,
      relationship_type: contactType,
      inside_jokes: JSON.stringify(insideJokes),
      few_shot_examples: JSON.stringify(fewShotExamples)
    };
  }

  /**
   * Return Default Persona Profile
   */
  getDefaultProfile() {
    return {
      formality_level: 0.2,
      avg_message_length: 8,
      primary_language: 'en',
      code_switching: 'none',
      typo_patterns: '[]',
      abbreviation_map: JSON.stringify({ you: 'u', 'right now': 'rn', 'are': 'r', 'for real': 'fr' }),
      excitement_markers: JSON.stringify(['yooo', 'fr fr', 'omg', '!!']),
      favorite_emojis: JSON.stringify(['😂', '💀', '🔥']),
      emoji_frequency: 0.75,
      humor_type: 'playful-banter',
      intimacy_level: 0.7,
      relationship_type: 'friend',
      inside_jokes: '[]',
      few_shot_examples: '[]'
    };
  }

  /**
   * Build Personal Mode System Prompt with Tanglish & Multi-Language Support
   */
  buildPersonalPrompt({ userName = 'Alex', contactName = 'Friend', profile = {}, preferredLanguage = 'tanglish', codeSwitchingRatio = '98' }) {
    const abbrevMap = this.safeJsonParse(profile.abbreviation_map, {});
    const excitement = this.safeJsonParse(profile.excitement_markers, []);
    const emojis = this.safeJsonParse(profile.favorite_emojis, []);
    const jokes = this.safeJsonParse(profile.inside_jokes, []);
    const fewShot = this.safeJsonParse(profile.few_shot_examples, []);

    const lang = (preferredLanguage || profile.primary_language || 'tanglish').toLowerCase();

    let languageInstructions = '';
    if (lang === 'tanglish') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: TANGLISH (98% TAMIL + ENGLISH)
═══════════════════════════════════════════════════════════════════
• 98% of your chat response MUST be in TANGLISH (Tamil spoken colloquial language written in English alphabet mixed naturally with English words).
• DO NOT write purely in English. Speak exactly how real Tamilians text on WhatsApp, Signal, and Instagram.
• Real Tanglish Vocabulary & Expressions to use naturally:
  - Intimacy & Affection (for wife/spouse): "chellam", "thangom", "babe", "pattu", "love u", "on the way vandhute irukken 🥰", "seekiram vandhudren"
  - Inquiries & Care: "sapdiya?", "enna pandre?", "epdi irukka?", "enga irukka?", "innaiku dinner ku enna plan?"
  - Casual & Banter: "seri vidu", "seri da", "sema", "pakka", "mudila", "aama", "illa", "aprom peslam", "office la romba work da"
  - Excitement & Fillers: "omggg", "yesss", "da", "di", "pa", "vera level", "super"
• Examples of Natural Tanglish Replies:
  - "hey chellam 🥰 just heading home now! innaiku dinner ku enna plan?"
  - "sapten da! work mudinjidhu, on the way vandhute irukken ❤️"
  - "haha seri vidu 😂 aprom namma peslam!"
  - "omggg sema! wait panren da"`;
    } else if (lang === 'hinglish') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: HINGLISH (HINDI + ENGLISH)
═══════════════════════════════════════════════════════════════════
• Reply in natural conversational HINGLISH (Hindi written in English alphabet mixed with English).
• Real expressions: "kya chal raha hai", "theek hoon", "haan yaar", "abhi thoda busy hoon, baad mein baat karte hain", "sahi hai", "pakka".`;
    } else if (lang === 'tenglish') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: TENGLISH (TELUGU + ENGLISH)
═══════════════════════════════════════════════════════════════════
• Reply in natural conversational TENGLISH (Telugu written in English script mixed with English).
• Real expressions: "ela unnavu", "lunch aindha", "nenu on the way unna", "seri cheppu", "vastunna".`;
    } else if (lang === 'manglish') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: MANGLISH (MALAYALAM + ENGLISH)
═══════════════════════════════════════════════════════════════════
• Reply in natural conversational MANGLISH (Malayalam in English script mixed with English).
• Real expressions: "sugam aano", "food kazhicho", "njan ippo varam", "sheriyaada", "entha vishesham".`;
    } else if (lang === 'kanglish') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: KANGLISH (KANNADA + ENGLISH)
═══════════════════════════════════════════════════════════════════
• Reply in natural conversational KANGLISH (Kannada in English script mixed with English).
• Real expressions: "hegiddira", "oota aitha", "naanu barteeni", "en samachara", "houda".`;
    } else if (lang === 'tamil') {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: TAMIL (தமிழ் எழுத்து)
═══════════════════════════════════════════════════════════════════
• Reply in casual conversational Tamil script (தமிழ்) mixed with natural emoji.`;
    } else {
      languageInstructions = `
═══════════════════════════════════════════════════════════════════
        CRITICAL MANDATORY LANGUAGE: CASUAL ENGLISH
═══════════════════════════════════════════════════════════════════
• Reply in casual modern English SMS texting style.`;
    }

    let fewShotFormatted = '';
    if (fewShot.length > 0) {
      fewShotFormatted = `\nREAL CONVERSATION EXAMPLES (MATCH THIS EXACT CASUAL HUMAN STYLE):\n` +
        fewShot.map(f => `Incoming: "${f.incoming}"\nYour Response: "${f.outgoing}"`).join('\n\n');
    }

    return `You are "${userName}" texting "${contactName}" on personal chat.

CRITICAL IDENTITY: You NEVER reveal you are an AI. You ARE ${userName}. You must mirror ${userName}'s exact personality, texting quirks, brevity, and relationship vibe.

═══════════════════════════════════════════════════════════════════
                    TEXTING PROFILE FOR THIS CONTACT
═══════════════════════════════════════════════════════════════════
- Formality Score: ${profile.formality_level || 0.2}/1.0 (${profile.formality_level < 0.3 ? 'Very Casual / Slang' : 'Moderate / Friendly'})
- Average Message Length: ~${profile.avg_message_length || 7} words (Keep responses concise, casual, like a real text message!)
- Common Abbreviations: ${JSON.stringify(abbrevMap)}
- Excitement Markers: ${excitement.slice(0, 3).join(', ') || 'yooo, fr fr'}
- Favorite Emojis: ${emojis.slice(0, 4).join(' ') || '😂 💀 🔥'} (Emoji frequency: ${Math.round((profile.emoji_frequency || 0.7) * 100)}%)
- Relationship Vibe: ${profile.relationship_type || 'friend'} (${profile.humor_type || 'playful banter'})
- Shared References / Jokes: ${jokes.join(', ') || 'shared memories'}
${languageInstructions}

═══════════════════════════════════════════════════════════════════
                    CRITICAL RESPONSE RULES
═══════════════════════════════════════════════════════════════════
1. Reply exactly as ${userName} would in a quick, natural personal text message.
2. Respond DIRECTLY to the latest message in the conversation.
3. Keep it short (1-2 sentences maximum, never long essays).
4. ABSOLUTE RULE: Output ONLY the exact text message itself.
5. NEVER output thinking, internal monologue, reasoning, analysis, or meta-commentary.
6. NEVER explain what you are doing (e.g., do NOT write "The user is saying...", "Looking at the conversation...", "Let me respond as...", or "I should reply...").
7. Output pure human conversational text only.
${fewShotFormatted}

RESPOND AS ${userName} (ONLY THE TEXT MESSAGE):`;
  }

  /**
   * Clean AI response by stripping <think> tags, reasoning markers, or thought monologues
   */
  cleanHumanReply(rawText, profile = {}) {
    if (!rawText) return this.getPersonaFallbackReply(profile);
    let text = rawText.trim();

    // 1. Remove XML/HTML thought tags: <think>...</think>, <thought>...</thought>
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // Strip unclosed thought tags if generation ended mid-thought
    text = text.replace(/<think>[\s\S]*$/gi, '').trim();
    text = text.replace(/<thought>[\s\S]*$/gi, '').trim();

    // 2. Strip quotation marks wrapping the whole reply
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1).trim();
    }

    // 3. Detect internal reasoning monologue patterns
    const reasoningKeywords = [
      'the user is saying',
      'user is saying',
      'looking at the conversation',
      'in response to the first',
      'in response to the previous',
      'in response to',
      'continuous conversation',
      'i should respond',
      'i should reply',
      'let me respond as',
      'respond as alex',
      'respond naturally',
      'as an ai',
      'my response would be',
      'let me respond',
      'internal monologue',
      'chain of thought',
      'step by step',
      'what alex would'
    ];

    const metaAdjectives = ['short', 'brief', 'concise', 'casual', 'playful', 'friendly', 'quick', 'confused', 'naturally'];
    const lower = text.toLowerCase();
    const hasReasoning = reasoningKeywords.some(kw => lower.includes(kw));

    if (hasReasoning) {
      // Check if a genuine clean message exists after a clear colon or quotes delimiter
      const delimiterMatch = text.match(/(?:let me respond(?: as [a-z0-9_\s]+)?(?: would)?|i should (?:reply|respond)|my response|response|reply)\s*(?:with|is)?\s*[:]\s*["']?([^"'\n\r]+)["']?$/i);
      if (delimiterMatch && delimiterMatch[1] && delimiterMatch[1].trim().length > 1) {
        const extracted = delimiterMatch[1].trim();
        if (!reasoningKeywords.some(kw => extracted.toLowerCase().includes(kw)) && !metaAdjectives.includes(extracted.toLowerCase())) {
          text = extracted;
        } else {
          text = this.getPersonaFallbackReply(profile);
        }
      } else {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let candidate = '';
        if (lines.length > 1) {
          const lastLine = lines[lines.length - 1];
          const lastLineLower = lastLine.toLowerCase();
          if (!reasoningKeywords.some(kw => lastLineLower.includes(kw)) &&
              !metaAdjectives.includes(lastLineLower) &&
              !lastLine.startsWith('*') && !lastLine.startsWith('(') &&
              lastLine.length > 1 && lastLine.length < 200) {
            candidate = lastLine.replace(/^["']|["']$/g, '').trim();
          }
        }

        if (candidate && !reasoningKeywords.some(kw => candidate.toLowerCase().includes(kw)) && !metaAdjectives.includes(candidate.toLowerCase())) {
          text = candidate;
        } else {
          text = this.getPersonaFallbackReply(profile);
        }
      }
    }

    // 4. Strip leftover prefixes like "Alex: " or "Message: "
    text = text.replace(/^(?:alex(?:\s*mercer)?|response|reply|message):\s*/i, '').trim();

    if (!text) {
      return this.getPersonaFallbackReply(profile);
    }

    return text.trim();
  }

  getPersonaFallbackReply(profile = {}) {
    const rel = (profile.relationship_type || '').toLowerCase();
    const lang = (profile.preferred_language || profile.primary_language || 'tanglish').toLowerCase();

    if (lang === 'tanglish') {
      if (rel === 'spouse' || rel === 'partner' || rel.includes('wife') || rel.includes('husband')) {
        const tanglishSpouse = [
          "hey chellam! 🥰 enna pandre?",
          "on the way da, seekiram vandhudren 🥰",
          "hey! ❤️ sapdiya? what u thinking?",
          "yeah babe! innaiku dinner ku enna plan? 🥰"
        ];
        return tanglishSpouse[Math.floor(Math.random() * tanglishSpouse.length)];
      }
      if (Number(profile.formality_level || 0) > 0.6) {
        return "Hello! I will check and update you soon.";
      }
      const tanglishFriend = [
        "yo machi! enna aachu? 😂",
        "seri da, work mudinjadhum peslam!",
        "sema bro! what u up to?",
        "epdi irukka da? all good? 😂"
      ];
      return tanglishFriend[Math.floor(Math.random() * tanglishFriend.length)];
    }

    if (rel === 'spouse' || rel === 'partner' || rel.includes('wife') || rel.includes('husband')) {
      const spouselist = [
        "hey! ❤️ what's up?",
        "yeah babe? 🥰",
        "hey haha what u thinking? 🥰",
        "hey! what's going on? ❤️"
      ];
      return spouselist[Math.floor(Math.random() * spouselist.length)];
    }
    if (Number(profile.formality_level || 0) > 0.6) {
      return "Hello! How can I assist you?";
    }
    const friendlist = [
      "yo! what's up? 😂",
      "hey haha what's good?",
      "yo! what u up to?",
      "hey! what's going on?"
    ];
    return friendlist[Math.floor(Math.random() * friendlist.length)];
  }

  /**
   * Post-process generated response with texting quirks & emoji tuning
   */
  applyTextingQuirks(response, profile = {}) {
    if (!response) return this.getPersonaFallbackReply(profile);
    let text = this.cleanHumanReply(response, profile);

    // Remove any accidental quotation marks wrapping the whole response
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).trim();
    }

    const formality = Number(profile.formality_level || 0.2);

    // If highly informal, enforce all lowercase
    if (formality < 0.25 && !text.includes('http')) {
      text = text.toLowerCase();
    }

    // Apply abbreviations if not present
    const abbrevMap = this.safeJsonParse(profile.abbreviation_map, {});
    for (const [full, short] of Object.entries(abbrevMap)) {
      const reg = new RegExp(`\\b${full}\\b`, 'gi');
      if (Math.random() > 0.3) {
        text = text.replace(reg, short);
      }
    }

    return text;
  }

  /**
   * Calculate realistic human typing delay in milliseconds
   */
  calculateNaturalDelay(message, profile = {}) {
    const wordCount = (message || '').split(/\s+/).length;
    // Base reading & reaction time: 1.2 to 2.5 seconds
    const reactionTime = 1200 + Math.floor(Math.random() * 1000);
    // Typing speed: ~50 words per minute = ~1.2s per 10 words
    const typingTime = Math.min(6000, wordCount * 250);
    return reactionTime + typingTime;
  }
}

module.exports = new PersonalityService();
