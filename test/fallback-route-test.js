const assert = require('assert');
const llmService = require('../src/services/llmService');

console.log('=== Running 2-AI-Model Fallback Route & 20s Min Timeout Tests ===\n');

async function runTests() {
  // Test 1: Verify timeout is at least 20s (20000ms) in callOllama
  console.log('1. Testing minimum 20s (20000ms) timeout logic...');
  const fs = require('fs');
  const path = require('path');
  const code = fs.readFileSync(path.join(__dirname, '../src/services/llmService.js'), 'utf8');

  assert(code.includes('Math.max(20000, isQuickMode ? 20000 : 60000)'), 'Ollama request timeout must be minimum 20000ms (20s)');
  console.log('✓ Verified: Ollama inference timeout is configured for minimum 20,000ms (20s).');

  // Test 2: Verify getSecondaryAICandidate returns a valid secondary model
  console.log('\n2. Testing getSecondaryAICandidate selection...');
  const mockSettingsOllama = {
    active_provider: 'ollama',
    ollama_endpoint: 'http://127.0.0.1:11434',
    ollama_model: 'lfm2.5:ela',
    gemini_api_key: 'test-gemini-key',
    gemini_model: 'gemini-2.5-flash'
  };

  const secondaryForOllama = llmService.getSecondaryAICandidate('ollama', mockSettingsOllama);
  assert(secondaryForOllama !== null, 'Should discover secondary candidate');
  assert.strictEqual(secondaryForOllama.provider, 'gemini', 'Should pick gemini as secondary when gemini key is present');
  console.log(`✓ Verified: When primary is Ollama, discovered secondary candidate is: ${secondaryForOllama.provider} (${secondaryForOllama.model})`);

  const mockSettingsGemini = {
    active_provider: 'gemini',
    gemini_api_key: 'test-gemini-key',
    gemini_model: 'gemini-3.8-flash'
  };
  const secondaryForGemini = llmService.getSecondaryAICandidate('gemini', mockSettingsGemini);
  assert(secondaryForGemini !== null, 'Should discover alternate model for gemini');
  assert.strictEqual(secondaryForGemini.provider, 'gemini');
  assert.strictEqual(secondaryForGemini.model, 'gemini-2.5-flash');
  console.log(`✓ Verified: When primary is Gemini (gemini-3.8-flash), secondary candidate is alternate model: ${secondaryForGemini.model}`);

  // Test 3: Test 2-AI-Model Fallback Pipeline
  console.log('\n3. Testing 2-AI-Model Fallback Pipeline...');
  
  // Scenario A: AI Model 1 succeeds
  const originalInvoke = llmService.invokeProvider;
  
  llmService.invokeProvider = async (provider, opts) => {
    if (provider === 'mock_ai_1') {
      return { text: 'Reply from Model 1', provider: 'Model 1 AI', model: 'ai-v1' };
    }
    throw new Error('Should not reach model 2');
  };

  llmService.getSettings = async () => ({
    active_provider: 'mock_ai_1',
    mock_ai_1_model: 'v1',
    backup_provider: 'mock_ai_2',
    backup_model: 'v2'
  });

  const res1 = await llmService.generateResponse({ system: 'sys', user: 'hi' });
  assert.strictEqual(res1.text, 'Reply from Model 1');
  assert.strictEqual(res1.aiAttempt, 1);
  assert.strictEqual(res1.isFallback, undefined);
  console.log('✓ Scenario A: Model 1 succeeded on first attempt.');

  // Scenario B: AI Model 1 fails, AI Model 2 succeeds
  llmService.invokeProvider = async (provider, opts) => {
    if (provider === 'mock_ai_1') {
      throw new Error('Connection timeout 20s to Model 1');
    }
    if (provider === 'mock_ai_2') {
      return { text: 'Reply from Model 2 (Backup)', provider: 'Model 2 AI', model: 'ai-v2' };
    }
    throw new Error('Unknown model');
  };

  const res2 = await llmService.generateResponse({ system: 'sys', user: 'hi' });
  assert.strictEqual(res2.text, 'Reply from Model 2 (Backup)');
  assert.strictEqual(res2.aiAttempt, 2);
  assert.strictEqual(res2.isBackupModel, true);
  console.log('✓ Scenario B: Model 1 failed, Model 2 reached and succeeded as secondary fallback.');

  // Scenario C: BOTH AI Model 1 and Model 2 fail -> Fallback to Machine Learning / Smart Mock Reply
  llmService.invokeProvider = async (provider, opts) => {
    if (provider === 'mock_ai_1') {
      throw new Error('Model 1 GPU VRAM OOM');
    }
    if (provider === 'mock_ai_2') {
      throw new Error('Model 2 Cloud Quota Exceeded 429');
    }
    throw new Error('Unknown model');
  };

  const res3 = await llmService.generateResponse({
    system: 'sys',
    user: 'hi enna pandre chellam? 🥰',
    mode: 'personal',
    extraContext: { relationshipType: 'spouse' },
    settings: { preferred_language: 'tanglish' }
  });

  assert.strictEqual(res3.aiAttempt, 3, 'Must be attempt 3 (Fallback ML reply)');
  assert.strictEqual(res3.isFallback, true, 'isFallback must be true');
  assert.strictEqual(res3.model, 'fallback-machine-learning');
  assert(res3.error.includes('Both 2 AI Models Failed'), 'Error must note that both 2 AI models failed');
  assert(res3.text.length > 0, 'Must produce a rich machine learning heuristic reply');
  console.log(`✓ Scenario C: Both Model 1 and Model 2 reached and failed. Routed to Fallback Machine Learning Reply: "${res3.text}"`);

  // Restore original methods
  llmService.invokeProvider = originalInvoke;
  delete llmService.getSettings;

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
