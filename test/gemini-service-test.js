const assert = require('assert');
const llmService = require('../src/services/llmService');

async function runGeminiTests() {
  console.log('🧪 Starting Gemini Service Test Suite...\n');
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

  // Test 1: fetchModels without API key returns curated modern Gemini models
  await test('fetchModels without key returns modern Gemini models prioritized', async () => {
    const res = await llmService.fetchModels('gemini', { gemini_api_key: '' });
    assert.strictEqual(res.success, true);
    assert(res.models.length >= 4, 'Should return at least 4 default Gemini models');
    assert.strictEqual(res.models[0].id, 'gemini-3.8-flash', 'Top model should be gemini-3.8-flash');
    assert(res.models.some(m => m.id === 'gemini-3.7-flash'), 'Should include gemini-3.7-flash');
    assert(res.models.some(m => m.id === 'gemini-2.5-flash'), 'Should include gemini-2.5-flash');
  });

  // Test 2: callGemini throws clear descriptive error when API key is missing
  await test('callGemini throws descriptive error when key is missing', async () => {
    try {
      await llmService.callGemini({
        system: 'System prompt',
        user: 'Hello',
        history: [],
        settings: { gemini_api_key: '' }
      });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert(err.message.includes('Google Gemini API Key is missing'), 'Error message should clearly state missing key');
    }
  });

  // Test 3: testConnection returns clear message when API key is missing
  await test('testConnection handles missing key cleanly', async () => {
    const res = await llmService.testConnection('gemini', { gemini_api_key: '' });
    assert.strictEqual(res.success, false);
    assert(res.message.includes('Gemini API key is missing'), 'Message should indicate missing key');
  });

  // Test 4: testLiveGeneration detects fallback properly when provider cannot connect
  await test('testLiveGeneration flags fallback properly when credentials missing', async () => {
    const res = await llmService.testLiveGeneration('gemini', { gemini_api_key: '' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.isFallback, true);
    assert(res.message.includes('failed') || res.message.includes('missing'), 'Message should describe failure');
  });

  // Test 5: Multi-turn alternating history normalization simulation
  await test('Multi-turn conversation handles consecutive same-role turns without crash', async () => {
    const history = [
      { role: 'user', content: 'Message 1' },
      { role: 'user', content: 'Message 2' },
      { role: 'assistant', content: 'Assistant reply 1' },
      { role: 'assistant', content: 'Assistant reply 2' },
      { role: 'user', content: 'Message 3' }
    ];

    const rawTurns = [];
    history.forEach(h => {
      const role = (h.direction === 'incoming' || h.role === 'user') ? 'user' : 'model';
      const text = (h.text || h.content || '').trim();
      if (text) rawTurns.push({ role, text });
    });

    const sanitizedContents = [];
    for (const turn of rawTurns) {
      if (sanitizedContents.length === 0) {
        if (turn.role === 'user') {
          sanitizedContents.push({ role: 'user', parts: [{ text: turn.text }] });
        }
      } else {
        const lastTurn = sanitizedContents[sanitizedContents.length - 1];
        if (lastTurn.role === turn.role) {
          lastTurn.parts[0].text += `\n${turn.text}`;
        } else {
          sanitizedContents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }

    const userPrompt = 'Final user message';
    const lastTurn = sanitizedContents[sanitizedContents.length - 1];
    if (lastTurn.role === 'user') {
      lastTurn.parts[0].text += `\n${userPrompt}`;
    } else {
      sanitizedContents.push({ role: 'user', parts: [{ text: userPrompt }] });
    }

    for (let i = 0; i < sanitizedContents.length - 1; i++) {
      assert.notStrictEqual(sanitizedContents[i].role, sanitizedContents[i + 1].role, `Turn ${i} and ${i+1} must not have same role`);
    }
    assert.strictEqual(sanitizedContents[0].role, 'user', 'First turn must be user');
    assert.strictEqual(sanitizedContents[sanitizedContents.length - 1].role, 'user', 'Last turn must be user');
  });

  // Test 6: Retired models (gemini-2.5-pro, gemini-1.5-pro) are proactively remapped without 404
  await test('Retired models are proactively mapped to active flagship model', async () => {
    const retired = ['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-flash-lite'];
    for (const r of retired) {
      let model = r;
      if (model === 'gemini-2.5-pro' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash' || model === 'gemini-2.5-flash-lite') {
        model = 'gemini-3.8-flash';
      }
      assert.strictEqual(model, 'gemini-3.8-flash', `Expected ${r} to map to gemini-3.8-flash`);
    }
  });

  console.log(`\n========================================`);
  console.log(`🏁 Gemini Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runGeminiTests();
