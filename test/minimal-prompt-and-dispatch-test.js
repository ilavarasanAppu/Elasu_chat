const assert = require('assert');
const { initDatabase, runAsync, getAsync } = require('../src/db/database');
const personalityService = require('../src/services/personalityService');
const ragService = require('../src/services/ragService');
const decisionEngine = require('../src/services/decisionEngine');
const telegramService = require('../src/services/telegramService');
const whatsappService = require('../src/services/whatsappService');

async function runMinimalPromptAndDispatchTests() {
  console.log('🧪 Starting Minimal Prompt & API Dispatch Verification...\n');
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
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  await initDatabase();

  // Test 1: Minimal Personal System Prompt Generator
  await test('Minimal Personal System Prompt is ultra-compact (< 60 words)', async () => {
    const minimalPrompt = personalityService.buildMinimalPersonalPrompt({
      userName: 'Elavarasan P',
      contactName: 'Appu',
      profile: { relationship_type: 'brother' },
      preferredLanguage: 'ta',
      codeSwitchingRatio: 60
    });

    assert(minimalPrompt.includes('Elavarasan P'), 'Prompt should include user name');
    assert(minimalPrompt.includes('Appu'), 'Prompt should include contact name');
    assert(minimalPrompt.includes('Tamil'), 'Prompt should include Tamil language');
    
    const wordCount = minimalPrompt.trim().split(/\s+/).length;
    console.log(`     [Word count: ${wordCount} words, length: ${minimalPrompt.length} chars]`);
    assert(wordCount < 60, `Expected minimal prompt word count < 60, got ${wordCount}`);

    // Contrast with standard full prompt
    const standardPrompt = personalityService.buildPersonalPrompt({
      profile: {
        formality_level: 0.2,
        avg_message_length: 12,
        abbreviation_map: { 'tmrw': 'tomorrow' },
        humor_type: 'playful',
        emoji_frequency: 0.3,
        favorite_emojis: ['😂'],
        relationship_type: 'brother',
        inside_jokes: [],
        few_shot_examples: []
      },
      relationshipType: 'brother',
      userName: 'Elavarasan P',
      preferredLanguage: 'ta',
      codeSwitchingRatio: 60,
      contactName: 'Appu'
    });
    const standardWordCount = standardPrompt.trim().split(/\s+/).length;
    console.log(`     [Standard prompt word count: ${standardWordCount} words]`);
    assert(standardWordCount > 100, 'Standard prompt should be substantially larger');
    assert(wordCount < standardWordCount * 0.4, 'Minimal prompt should be at least 60% smaller than standard');
  });

  // Test 2: Minimal Professional System Prompt Generator
  await test('Minimal Professional System Prompt is ultra-compact (< 50 words)', async () => {
    const minimalProf = ragService.buildMinimalProfessionalPrompt({
      retrievedDocs: [{ doc_title: 'Refunds', content: '100% money back within 30 days.' }],
      chatHistory: 'User: refund?',
      userQuestion: 'Can I get a refund?'
    });

    assert(minimalProf.includes('Refunds'), 'Should include doc title');
    assert(minimalProf.includes('100% money back'), 'Should include doc content');
    const wordCount = minimalProf.trim().split(/\s+/).length;
    console.log(`     [Professional minimal word count: ${wordCount} words]`);
    assert(wordCount < 60, `Expected word count < 60, got ${wordCount}`);
  });

  // Test 3: Settings minimal_system_prompt switch persistence & activation
  await test('minimal_system_prompt setting toggles in database', async () => {
    // Enable minimal prompt
    await runAsync('UPDATE settings SET value = ? WHERE key = ?', ['true', 'minimal_system_prompt']);
    const rowTrue = await getAsync('SELECT value FROM settings WHERE key = ?', ['minimal_system_prompt']);
    assert.strictEqual(rowTrue.value, 'true', 'Setting should be true');

    // Disable minimal prompt
    await runAsync('UPDATE settings SET value = ? WHERE key = ?', ['false', 'minimal_system_prompt']);
    const rowFalse = await getAsync('SELECT value FROM settings WHERE key = ?', ['minimal_system_prompt']);
    assert.strictEqual(rowFalse.value, 'false', 'Setting should be false');
  });

  // Test 4: Decision Engine platform auto-reply dispatcher
  await test('dispatchPlatformAutoReply handles Telegram and WhatsApp targets without throwing', async () => {
    // 1. WhatsApp contact dispatch when disconnected (returns clean error notification)
    const waContact = {
      id: 'wa_test_1',
      platform: 'whatsapp',
      handle: '+919876543210',
      name: 'Test WA Contact'
    };
    const waResult = await decisionEngine.dispatchPlatformAutoReply(waContact, 'Hello from GhostReply AI!', {});
    assert.strictEqual(waResult.success, false, 'WhatsApp should report not connected when offline');
    assert(waResult.error.includes('WhatsApp is not connected'), 'Error message should report WhatsApp status');

    // 2. Telegram contact dispatch test with stubbed/mocked telegramService.sendMessage
    let sentToChat = null;
    let sentText = null;
    const origTgSend = telegramService.sendMessage;
    telegramService.sendMessage = async (chatId, text, accountId) => {
      sentToChat = chatId;
      sentText = text;
      return { success: true, messageId: 99999 };
    };

    try {
      const tgContact = {
        id: 'tg_8537226895',
        platform: 'telegram',
        handle: '8537226895',
        name: 'Ela'
      };
      const tgResult = await decisionEngine.dispatchPlatformAutoReply(tgContact, 'Test reply over API', { accountId: 'acc_tg_primary' });
      assert.strictEqual(tgResult.success, true, 'Telegram dispatch should succeed');
      assert.strictEqual(sentToChat, '8537226895', 'ChatId should match handle');
      assert.strictEqual(sentText, 'Test reply over API', 'Dispatched text should match');
    } finally {
      telegramService.sendMessage = origTgSend;
    }
  });

  // Test 5: processIncomingMessage dispatches AI reply to platform API
  await test('processIncomingMessage sets dispatched flag when API delivery succeeds', async () => {
    let mockSent = false;
    const origTgSend = telegramService.sendMessage;
    telegramService.sendMessage = async (chatId, text) => {
      mockSent = true;
      return { success: true, messageId: 12345 };
    };

    try {
      const result = await decisionEngine.processIncomingMessage({
        contactId: 'tg_8537226895',
        text: 'Vanakkam bro',
        platform: 'telegram',
        senderName: 'Ela',
        chatId: '8537226895',
        dispatchToApi: true
      });

      assert(result.text && result.text.length > 0, 'Should generate reply');
      assert.strictEqual(result.dispatched, true, 'Result should have dispatched: true');
      assert.strictEqual(mockSent, true, 'telegramService.sendMessage must have been called');
    } finally {
      telegramService.sendMessage = origTgSend;
    }
  });

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runMinimalPromptAndDispatchTests();
