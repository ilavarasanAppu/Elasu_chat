const assert = require('assert');
const { initDatabase, getAsync, allAsync, runAsync } = require('../src/db/database');
const llmService = require('../src/services/llmService');
const ragService = require('../src/services/ragService');
const personalityService = require('../src/services/personalityService');
const decisionEngine = require('../src/services/decisionEngine');

async function runTests() {
  console.log('🧪 Starting GhostReply System Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Database Initialization & Seeds
  await test('Database & Initial Seeds Loaded', async () => {
    await initDatabase();
    const contacts = await allAsync('SELECT * FROM contacts');
    assert(contacts.length >= 4, `Expected at least 4 seeded contacts, got ${contacts.length}`);
    
    const docs = await allAsync('SELECT * FROM knowledge_docs');
    assert(docs.length >= 3, `Expected at least 3 knowledge docs, got ${docs.length}`);

    const settings = await llmService.getSettings();
    assert(settings.active_provider !== undefined, 'Settings table active_provider must exist');
  });

  // Test 2: RAG Chunking & Semantic Querying
  await test('RAG Chunking and Knowledge Base Retrieval', async () => {
    const text = "Our refund policy guarantees 100% money back within 30 days of purchase for unused products. After 30 days, returns are evaluated on a case-by-case basis.";
    const chunks = ragService.chunkText(text, 20, 5);
    assert(chunks.length > 0, 'Chunks should not be empty');

    const results = await ragService.queryKnowledgeBase('Can I get a refund for my purchase?', 3);
    assert(results.length > 0, 'Should find at least 1 matching document for refund query');
    assert(results[0].doc_title.toLowerCase().includes('refund'), 'Top result should be refund policy');
  });

  // Test 3: Safety & Emergency Escalation Detection
  await test('Escalation Trigger Detection', async () => {
    const safeCheck = ragService.checkEscalationTriggers('What are your office hours?');
    assert(!safeCheck.triggered, 'Normal query should not trigger escalation');

    const urgentCheck = ragService.checkEscalationTriggers('Please call me immediately, it is an emergency hospital situation!');
    assert(urgentCheck.triggered, 'Emergency query must trigger escalation');
    assert.strictEqual(urgentCheck.severity, 'emergency');

    const disputeCheck = ragService.checkEscalationTriggers('I want to speak with your manager or lawyer about a refund dispute.');
    assert(disputeCheck.triggered, 'Lawyer/Manager dispute must trigger escalation');
  });

  // Test 4: WhatsApp Chat Parser & 4-Phase Personality Extraction
  await test('WhatsApp Export Parser & Persona Extraction', async () => {
    const sampleChat = `
[24/05/23, 14:00:10] Maya: When u coming home? 😤
[24/05/23, 14:01:25] Alex: soon soon 😂 stuck in traffikk u know how it issss
[24/05/23, 14:02:00] Maya: Did you feed the cat??
[24/05/23, 14:02:40] Alex: yess did it before leaving! love u ❤️
[24/05/23, 14:05:10] Maya: wanna grab tacos tonight?
[24/05/23, 14:06:00] Alex: omggg yesss taco tuesday lets gooo 🌮😋
    `.trim();

    const parsed = personalityService.parseWhatsAppChat(sampleChat, 'Alex');
    assert.strictEqual(parsed.length, 6, `Expected 6 parsed messages, got ${parsed.length}`);

    const profile = personalityService.analyzeChatHistory(parsed, 'Maya (Wife)', 'Alex');
    assert(profile.formality_level < 0.3, `Expected low formality (<0.3) for casual slang, got ${profile.formality_level}`);
    assert(profile.favorite_emojis.includes('😂') || profile.favorite_emojis.includes('❤️'), 'Emojis should be extracted');
    assert.strictEqual(profile.relationship_type, 'spouse');
  });

  // Test 5: Multi-Provider LLM Dispatcher
  await test('Smart Fallback Engine in Personal & Professional Modes', async () => {
    // Personal Mode
    const personalRes = await llmService.generateResponse({
      system: 'You are Alex texting Maya',
      user: 'When u coming home? 😤',
      mode: 'personal',
      extraContext: { relationshipType: 'spouse' }
    });
    assert(personalRes.text.length > 0, 'Personal mode reply should not be empty');

    // Professional Mode
    const retrievedDocs = await ragService.queryKnowledgeBase('Do you offer refunds?', 1);
    const profRes = await llmService.generateResponse({
      system: 'You are professional support',
      user: 'Do you offer refunds?',
      mode: 'professional',
      extraContext: { retrievedDocs }
    });
    assert(profRes.text.toLowerCase().includes('refund'), 'Professional mode reply should cite refund policy');
  });

  // Test 6: Decision Pipeline Full Execution
  await test('Decision Engine Pipeline Simulation', async () => {
    // 1. Simulate Personal message to Wife
    const resultPersonal = await decisionEngine.processIncomingMessage({
      contactId: 'contact_wife',
      text: 'Are we doing dinner tonight? 🥰',
      senderName: 'Maya (Wife)'
    });
    assert(!resultPersonal.escalated, 'Personal message should not be escalated');
    assert(resultPersonal.text && resultPersonal.text.length > 0, 'Should generate personal response');
    assert.strictEqual(resultPersonal.mode, 'personal');

    // 2. Simulate Emergency Escalation
    const resultEscalation = await decisionEngine.processIncomingMessage({
      contactId: 'contact_friend',
      text: 'EMERGENCY: Call me now please hospital!',
      senderName: 'Jake'
    });
    assert(resultEscalation.escalated, 'Emergency message must trigger escalation');
    assert.strictEqual(resultEscalation.severity, 'emergency');
  });

  // Test 7: Provider Connection Ping Verification
  await test('Provider Connection Verification Engine', async () => {
    const mockTest = await llmService.testConnection('mock');
    assert.strictEqual(mockTest.success, true, 'Mock provider test should succeed');

    const ollamaTest = await llmService.testConnection('ollama', { ollama_endpoint: 'http://127.0.0.1:11434' });
    assert(typeof ollamaTest.success === 'boolean', 'Ollama test should return boolean result');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
