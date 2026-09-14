const assert = require('assert');
const decisionEngine = require('../src/services/decisionEngine');
const llmService = require('../src/services/llmService');
const { getAsync, runAsync, allAsync } = require('../src/db/database');

async function runPromptAndProfileTests() {
  console.log('🧪 Starting User Profile & Custom System Prompt Tests...');

  // Test 1: User Profile in SQLite Settings
  const settings = await llmService.getSettings();
  assert.strictEqual(settings.user_name, 'Elavarasan P', 'Default user_name should be Elavarasan P');
  assert.strictEqual(settings.user_avatar_initials, 'EP', 'Default user_avatar_initials should be EP');
  assert.strictEqual(settings.user_persona_title, 'Dual-Mode AI Operator', 'Default role should be Dual-Mode AI Operator');
  console.log('  ✅ PASS: Default User Profile is Elavarasan P / EP / Dual-Mode AI Operator');

  // Test 2: DecisionEngine.formatCustomPrompt interpolates variables properly
  const template = 'Hello {userName}! You are texting {contactName} in {language} with mix {codeSwitchingRatio}%.';
  const formatted = decisionEngine.formatCustomPrompt(template, {
    userName: 'Elavarasan P',
    contactName: 'Maya',
    language: 'tanglish',
    codeSwitchingRatio: '98'
  });
  assert.strictEqual(
    formatted,
    'Hello Elavarasan P! You are texting Maya in tanglish with mix 98%.'
  );
  console.log('  ✅ PASS: DecisionEngine variable interpolation');

  // Test 3: System Prompt Override when custom_system_prompt_enabled is true
  await runAsync(`UPDATE settings SET value = 'true' WHERE key = 'custom_system_prompt_enabled'`);
  await runAsync(`UPDATE settings SET value = 'CUSTOM PERSONAL PROMPT: User is {userName}, Friend is {contactName}' WHERE key = 'custom_system_prompt_personal'`);
  await runAsync(`UPDATE settings SET value = 'Always be ultra concise.' WHERE key = 'custom_system_prompt_extra'`);

  // Simulate incoming message processing
  let traceCaptured = null;
  const originalBroadcast = decisionEngine.broadcast.bind(decisionEngine);
  decisionEngine.broadcast = (event, payload) => {
    if (event === 'reasoning_trace') {
      traceCaptured = payload;
    }
  };

  try {
    await decisionEngine.processIncomingMessage({
      contactId: 'contact_wife',
      text: 'Hey what are you doing?',
      platform: 'simulator',
      senderName: 'Maya (Wife)',
      initialMode: 'personal'
    });

    assert.ok(traceCaptured, 'Reasoning trace should have been broadcast');
    assert.strictEqual(traceCaptured.isCustomPrompt, true, 'isCustomPrompt should be true in trace');
    assert.ok(traceCaptured.systemPromptSnippet.includes('CUSTOM PERSONAL PROMPT'), 'System prompt snippet should contain custom text');
    console.log('  ✅ PASS: Custom System Prompt applied and broadcast in reasoning trace');

    // Test 4: When custom_system_prompt_enabled is false, fallback to default generator
    await runAsync(`UPDATE settings SET value = 'false' WHERE key = 'custom_system_prompt_enabled'`);
    traceCaptured = null;

    await decisionEngine.processIncomingMessage({
      contactId: 'contact_wife',
      text: 'Are you free for dinner?',
      platform: 'simulator',
      senderName: 'Maya (Wife)',
      initialMode: 'personal'
    });

    assert.ok(traceCaptured, 'Reasoning trace should have been broadcast');
    assert.strictEqual(traceCaptured.isCustomPrompt, false, 'isCustomPrompt should be false when disabled');
    assert.ok(traceCaptured.systemPromptSnippet.includes('Elavarasan P'), 'Default prompt should feature Elavarasan P');
    console.log('  ✅ PASS: Automatic fallback to dynamic generator when custom override disabled');
  } finally {
    decisionEngine.broadcast = originalBroadcast;
    // Clean up test custom prompt
    await runAsync(`UPDATE settings SET value = 'false' WHERE key = 'custom_system_prompt_enabled'`);
    await runAsync(`UPDATE settings SET value = '' WHERE key = 'custom_system_prompt_personal'`);
    await runAsync(`UPDATE settings SET value = '' WHERE key = 'custom_system_prompt_extra'`);
  }

  console.log('\n========================================');
  console.log('🎉 All Profile & Prompt Tests Passed Successfully!');
  console.log('========================================');
}

runPromptAndProfileTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
