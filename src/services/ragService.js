const { allAsync, runAsync, getAsync } = require('../db/database');

class RAGService {
  constructor() {
    this.escalationKeywords = [
      'call me', 'urgent', 'emergency', 'hospital', 'suicide', 'police',
      'lawyer', 'lawsuit', 'sue', 'illegal', 'fraud', 'scam', 'refund dispute',
      'speak with human', 'speak with manager', 'supervisor', 'talk to human',
      'human agent', 'live agent', 'escalate', 'breach', 'security vulnerability'
    ];
  }

  /**
   * Split document into overlapping text chunks
   */
  chunkText(text, chunkSize = 400, overlap = 80) {
    if (!text || text.trim().length === 0) return [];
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) {
      return [text.trim()];
    }

    const chunks = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkWords = words.slice(start, end);
      chunks.push(chunkWords.join(' '));
      if (end >= words.length) break;
      start += (chunkSize - overlap);
    }
    return chunks;
  }

  /**
   * Tokenize text for semantic term frequency
   */
  tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  /**
   * Calculate Cosine / TF-IDF Similarity Score between Query and Chunk
   */
  calculateSimilarity(queryTokens, chunkText) {
    const chunkTokens = this.tokenize(chunkText);
    if (chunkTokens.length === 0 || queryTokens.length === 0) return 0;

    const queryFreq = {};
    queryTokens.forEach(t => queryFreq[t] = (queryFreq[t] || 0) + 1);

    const chunkFreq = {};
    chunkTokens.forEach(t => chunkFreq[t] = (chunkFreq[t] || 0) + 1);

    let dotProduct = 0;
    let queryNorm = 0;
    let chunkNorm = 0;

    for (const token in queryFreq) {
      queryNorm += queryFreq[token] * queryFreq[token];
      if (chunkFreq[token]) {
        dotProduct += queryFreq[token] * chunkFreq[token] * 2.0; // Boost exact token matches
      }
    }

    for (const token in chunkFreq) {
      chunkNorm += chunkFreq[token] * chunkFreq[token];
    }

    if (queryNorm === 0 || chunkNorm === 0) return 0;
    return dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(chunkNorm));
  }

  /**
   * Query Knowledge Base Chunks with Top-K matches
   */
  async queryKnowledgeBase(query, topK = 3) {
    const chunks = await allAsync(`
      SELECT c.id, c.doc_id, c.content, d.title as doc_title, d.category
      FROM knowledge_chunks c
      JOIN knowledge_docs d ON c.doc_id = d.id
    `);

    if (!chunks || chunks.length === 0) {
      return [];
    }

    const queryTokens = this.tokenize(query);
    const scoredChunks = chunks.map(chunk => {
      const score = this.calculateSimilarity(queryTokens, chunk.content + ' ' + (chunk.doc_title || ''));
      return {
        ...chunk,
        score
      };
    });

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    const results = scoredChunks.filter(c => c.score > 0.05).slice(0, topK);
    return results;
  }

  /**
   * Check if query requires emergency / safety escalation
   */
  checkEscalationTriggers(query) {
    const lower = (query || '').toLowerCase();
    
    const emergencyList = ['emergency', 'hospital', 'police', 'suicide', 'lawsuit', 'call 911'];
    for (const em of emergencyList) {
      if (lower.includes(em)) {
        return {
          triggered: true,
          keyword: em,
          reason: `Detected emergency keyword: "${em}"`,
          severity: 'emergency'
        };
      }
    }

    for (const kw of this.escalationKeywords) {
      if (lower.includes(kw)) {
        return {
          triggered: true,
          keyword: kw,
          reason: `Detected sensitive/escalation keyword: "${kw}"`,
          severity: 'high'
        };
      }
    }
    return { triggered: false };
  }

  /**
   * Build Professional Mode System Prompt
   */
  buildProfessionalPrompt({ retrievedDocs = [], chatHistory = [], userQuestion = '' }) {
    let docsContext = "No specific documentation found for this query.";
    if (retrievedDocs && retrievedDocs.length > 0) {
      docsContext = retrievedDocs.map((doc, idx) => `[Source ${idx + 1} - ${doc.doc_title} (${doc.category})]:\n${doc.content}`).join('\n\n');
    }

    let historyFormatted = "No previous history.";
    if (chatHistory && chatHistory.length > 0) {
      historyFormatted = chatHistory.slice(-10).map(h => `${h.sender_name || (h.direction === 'incoming' ? 'Customer' : 'Representative')}: ${h.text || h.content}`).join('\n');
    }

    return `You are a professional customer support representative and enterprise assistant for GhostReply.

CRITICAL RULE: You NEVER reveal you are an AI. You ARE the professional representative for the organization.

═══════════════════════════════════════════════════════════════════
                    KNOWLEDGE BASE ACCESS
═══════════════════════════════════════════════════════════════════
${docsContext}

═══════════════════════════════════════════════════════════════════
                    CONVERSATION HISTORY
═══════════════════════════════════════════════════════════════════
${historyFormatted}

CURRENT QUERY: ${userQuestion}

═══════════════════════════════════════════════════════════════════
                    BEHAVIOR & RESPONSE RULES
═══════════════════════════════════════════════════════════════════
1. First, check if answer exists in KNOWLEDGE BASE.
2. If YES: Compose a courteous, direct, and concise response using ONLY verified information.
3. If NO or PARTIAL: Use the escalation phrase below or offer to verify with internal teams.
4. Maintain a professional, courteous, clear, and empathetic tone.
5. Include relevant policy citations when applicable (e.g., "According to our 30-day refund policy...").
6. End with a helpful next step, follow-up offer, or clear closing.

HARD LIMITATIONS:
• NEVER make up pricing, policies, dates, or product features not in the documentation.
• NEVER commit to actions requiring senior approval without verification.
• NEVER provide medical, legal, or financial advice beyond documented scope.

ESCALATION PHRASE (When information is not documented):
"I want to make sure I give you accurate information on this. Let me verify the details with our team and get back to you shortly."

RESPONSE STRUCTURE TEMPLATE:
"[Greeting], [Direct Answer based on docs]. [Additional context/policy citation if relevant]. [Helpful next step or question]. [Professional sign-off]"`;
  }
}

module.exports = new RAGService();
