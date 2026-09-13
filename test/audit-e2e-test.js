const assert = require('assert');
const { initDatabase, getDb, getAsync, allAsync, runAsync } = require('../src/db/database');
const personalityService = require('../src/services/personalityService');
const ragService = require('../src/services/ragService');
const decisionEngine = require('../src/services/decisionEngine');

async function runAuditTests() {
  console.log('🧪 Starting GhostReply Comprehensive Audit Verification Suite...\n');
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

  // Test 1: SQLite Pragmas & WAL Mode Active
  await test('SQLite Connection Pragmas (Foreign Keys ON, WAL Mode, Busy Timeout)', async () => {
    await initDatabase();
    const fk = await getAsync('PRAGMA foreign_keys');
    assert.strictEqual(fk.foreign_keys, 1, 'foreign_keys PRAGMA must be 1 (ON)');

    const jm = await getAsync('PRAGMA journal_mode');
    assert.strictEqual(jm.journal_mode.toLowerCase(), 'wal', 'journal_mode must be WAL');

    const bt = await getAsync('PRAGMA busy_timeout');
    assert(bt.timeout >= 5000, `busy_timeout should be at least 5000ms, got ${bt.timeout}`);
  });

  // Test 2: Foreign Key Cascading Deletion
  await test('Foreign Key Cascade Delete Integrity', async () => {
    const testContactId = `contact_cascade_${Date.now()}`;
    await runAsync(
      `INSERT INTO contacts (id, name, handle, avatar, platform, mode, auto_reply)
       VALUES (?, 'Test Cascade', '+1234567890', '👤', 'simulator', 'personal', 1)`,
      [testContactId]
    );

    // Insert message
    const msgId = `msg_cascade_${Date.now()}`;
    await runAsync(
      `INSERT INTO messages (id, contact_id, direction, sender_name, text, mode, metadata, status)
       VALUES (?, ?, 'incoming', 'Test', 'Hello cascade', 'personal', '{}', 'delivered')`,
      [msgId, testContactId]
    );

    // Insert profile
    await runAsync(
      `INSERT INTO personality_profiles (contact_id, formality_level) VALUES (?, 0.5)`,
      [testContactId]
    );

    // Verify records exist
    const msgBefore = await getAsync('SELECT id FROM messages WHERE id = ?', [msgId]);
    assert(msgBefore, 'Message should exist before delete');
    const profBefore = await getAsync('SELECT contact_id FROM personality_profiles WHERE contact_id = ?', [testContactId]);
    assert(profBefore, 'Profile should exist before delete');

    // Delete contact
    await runAsync('DELETE FROM contacts WHERE id = ?', [testContactId]);

    // Verify cascade deleted message and profile
    const msgAfter = await getAsync('SELECT id FROM messages WHERE id = ?', [msgId]);
    assert.strictEqual(msgAfter, undefined, 'Message should be cascade deleted');
    const profAfter = await getAsync('SELECT contact_id FROM personality_profiles WHERE contact_id = ?', [testContactId]);
    assert.strictEqual(profAfter, undefined, 'Profile should be cascade deleted');
  });

  // Test 3: Safe JSON Parser with Corrupted Inputs
  await test('PersonalityService Safe JSON Parsing with Corrupted Data', async () => {
    // Malformed JSON should not crash and should return fallback
    const res1 = personalityService.safeJsonParse('{bad json', { defaultKey: true });
    assert.deepStrictEqual(res1, { defaultKey: true });

    const res2 = personalityService.safeJsonParse('["unclosed array', ['fallback']);
    assert.deepStrictEqual(res2, ['fallback']);

    const res3 = personalityService.safeJsonParse(null, 'defaultVal');
    assert.strictEqual(res3, 'defaultVal');

    const res4 = personalityService.safeJsonParse('{"valid":"json"}', {});
    assert.strictEqual(res4.valid, 'json');

    // Test buildPersonalPrompt with completely corrupt profile fields
    const corruptProfile = {
      abbreviation_map: '{corrupt json',
      excitement_markers: '[unclosed',
      favorite_emojis: null,
      inside_jokes: 'INVALID',
      few_shot_examples: 'NOT_ARRAY'
    };
    const prompt = personalityService.buildPersonalPrompt({
      userName: 'Alex',
      contactName: 'Test',
      profile: corruptProfile,
      preferredLanguage: 'tanglish'
    });
    assert(prompt.includes('CRITICAL MANDATORY LANGUAGE: TANGLISH'), 'Prompt should build successfully despite corrupt JSON');
  });

  // Test 4: RAG Tokenization with 2-Letter Keywords
  await test('RAG Tokenization Retains 2-Letter Acronyms (AI, DB, QA, UI)', async () => {
    const tokens = ragService.tokenize('Does your AI support DB backups and UI tools?');
    assert(tokens.includes('ai'), 'Tokenize must retain "ai"');
    assert(tokens.includes('db'), 'Tokenize must retain "db"');
    assert(tokens.includes('ui'), 'Tokenize must retain "ui"');

    // Similarity score should be positive for 2-letter queries
    const sim = ragService.calculateSimilarity(['ai'], 'This is an advanced AI assistant');
    assert(sim > 0, 'Similarity score for "ai" query must be > 0');
  });

  // Test 5: Decision Engine Profile Fetch Ordering & Auto-Create with InitialMode
  await test('Decision Engine Auto-creates Contact with InitialMode and Personality Profile', async () => {
    const newContactId = `tg_test_${Date.now()}`;
    const result = await decisionEngine.processIncomingMessage({
      contactId: newContactId,
      text: 'Hello bot, tell me your refund policy',
      platform: 'telegram',
      senderName: 'Telegram User',
      initialMode: 'professional'
    });

    // Check contact mode
    const contact = await getAsync('SELECT * FROM contacts WHERE id = ?', [newContactId]);
    assert(contact, 'New contact must be created');
    assert.strictEqual(contact.mode, 'professional', 'Contact must inherit initialMode "professional"');

    // Check personality profile was automatically created
    const profile = await getAsync('SELECT * FROM personality_profiles WHERE contact_id = ?', [newContactId]);
    assert(profile, 'personality_profiles row must be auto-created');

    // Clean up test contact
    await runAsync('DELETE FROM contacts WHERE id = ?', [newContactId]);
  });

  console.log(`\n📊 Audit Test Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuditTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
