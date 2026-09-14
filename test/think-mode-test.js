const assert = require('assert');
const { runAsync } = require('../src/db/database');
const llmService = require('../src/services/llmService');

async function testThinkMode() {
  console.log('--- Starting Think Mode Integration Tests ---');

  // 1. Verify DB setting persistence
  console.log('1. Testing DB setting persistence for model_think_mode...');
  await runAsync(`UPDATE settings SET value = 'false' WHERE key = 'model_think_mode'`);
  let settings = await llmService.getSettings();
  assert.strictEqual(settings.model_think_mode, 'false', 'Expected model_think_mode to be false');

  await runAsync(`UPDATE settings SET value = 'true' WHERE key = 'model_think_mode'`);
  settings = await llmService.getSettings();
  assert.strictEqual(settings.model_think_mode, 'true', 'Expected model_think_mode to be true');

  // Reset back to false
  await runAsync(`UPDATE settings SET value = 'false' WHERE key = 'model_think_mode'`);
  settings = await llmService.getSettings();
  assert.strictEqual(settings.model_think_mode, 'false', 'Expected model_think_mode to be reset to false');
  console.log('✓ DB persistence for model_think_mode passed!');

  // 2. Test invokeProvider with mock provider
  console.log('2. Testing LLM service invokeProvider with Think Mode setting...');
  const replyRes = await llmService.invokeProvider('mock', {
    system: 'You are an AI assistant',
    user: 'Hello testing think mode',
    mode: 'personal',
    settings
  });
  assert(replyRes && replyRes.text, 'Expected non-empty reply');
  console.log('✓ Mock inference succeeded with text:', replyRes.text.substring(0, 40));

  // 3. Test live test mechanism telemetry
  console.log('3. Testing testLiveGeneration telemetry...');
  const testRes = await llmService.testLiveGeneration('mock');
  assert(testRes && testRes.success, 'Expected testLiveGeneration to succeed');
  assert(testRes.debug, 'Expected debug telemetry in testLiveGeneration');
  console.log('✓ Live test telemetry verified');

  console.log('--- All Think Mode Integration Tests Passed! ---');
}

testThinkMode().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
