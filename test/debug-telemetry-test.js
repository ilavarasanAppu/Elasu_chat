const assert = require('assert');
const { initDatabase, getAsync } = require('../src/db/database');
const llmService = require('../src/services/llmService');
const decisionEngine = require('../src/services/decisionEngine');

async function testDebug() {
  console.log('🧪 Testing Debug Mode Telemetry...');
  await initDatabase();

  // Test 1: generateResponse populates lastDebugInfo
  const res = await llmService.generateResponse({
    system: 'You are a helpful assistant.',
    user: 'Ping debug test',
    mode: 'personal'
  });

  assert(res.debug, 'generateResponse must return debug object');
  assert(res.debug.attempts && res.debug.attempts.length > 0, 'Debug must include attempts array');
  console.log('  ✅ generateResponse returns debug structure with', res.debug.attempts.length, 'stages');

  const latest = llmService.getLastDebugInfo();
  assert(latest, 'llmService.getLastDebugInfo() must not be null');
  assert.strictEqual(latest.timestamp, res.debug.timestamp, 'latest debug timestamp must match');
  console.log('  ✅ llmService.getLastDebugInfo() tracks recent telemetry');

  // Test 2: decisionEngine stores debug in message metadata
  const simResult = await decisionEngine.processIncomingMessage({
    contactId: 'contact_wife',
    text: 'Hello test debug!',
    senderName: 'Maya'
  });

  assert(simResult.debug, 'Decision engine result must include debug');
  const msgRow = await getAsync(`SELECT metadata FROM messages WHERE id = ?`, [simResult.messageId]);
  assert(msgRow, 'Message row must exist');
  const parsedMeta = JSON.parse(msgRow.metadata);
  assert(parsedMeta.debug, 'Saved message metadata must include debug object');
  assert(parsedMeta.debug.attempts, 'Saved debug must include attempts');
  console.log('  ✅ Decision engine persisted debug telemetry into database messages.metadata');

  console.log('\n🎉 Debug Telemetry Unit Test Passed Successfully!');
}

testDebug().catch(err => {
  console.error('❌ Debug Telemetry Test Failed:', err);
  process.exit(1);
});
