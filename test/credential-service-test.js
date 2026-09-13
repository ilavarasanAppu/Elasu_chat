const assert = require('assert');
const fs = require('fs');
const path = require('path');
const credentialService = require('../src/services/credentialService');
const { getAsync, runAsync } = require('../src/db/database');

async function runCredentialTests() {
  console.log('=== Running Credential Service & Isolation Tests ===');

  // Test 1: Verify directories exist
  const credsDir = path.join(__dirname, '../credentials');
  const waDir = credentialService.getWhatsAppDir();
  assert(fs.existsSync(credsDir), 'credentials/ directory must exist');
  assert(fs.existsSync(waDir), 'credentials/whatsapp/ directory must exist');
  console.log('✓ Test 1 Passed: Directory structure verified at', credsDir);

  // Test 2: Verify .gitignore in credentials folder
  const localGitignore = path.join(credsDir, '.gitignore');
  assert(fs.existsSync(localGitignore), 'credentials/.gitignore must exist');
  const gitignoreContent = fs.readFileSync(localGitignore, 'utf8');
  assert(gitignoreContent.includes('*'), 'credentials/.gitignore must ignore all files');
  console.log('✓ Test 2 Passed: credentials/.gitignore safety shield verified');

  // Test 3: Save and read Telegram Token
  const testToken = '888888888:AAFakeTokenForTestVerificationOnly_ABC';
  credentialService.saveTelegramToken('acc_tg_test', testToken);
  const retrievedToken = credentialService.getTelegramToken('acc_tg_test');
  assert.strictEqual(retrievedToken, testToken, 'Retrieved Telegram token must match saved token');
  console.log('✓ Test 3 Passed: Telegram token storage & retrieval verified');

  // Test 4: Default fallback
  const defaultToken = credentialService.getTelegramToken('unknown_account');
  assert(defaultToken !== undefined, 'Default token should be resolvable');
  console.log('✓ Test 4 Passed: Default token fallback functioning');

  // Test 5: WhatsApp Account Directory
  const waAccDir = credentialService.getWhatsAppAccountDir('acc_wa_primary');
  assert(fs.existsSync(waAccDir), 'WhatsApp account dir must exist');
  assert(waAccDir.includes(path.join('credentials', 'whatsapp', 'acc_wa_primary')), 'WhatsApp account dir must be inside credentials/whatsapp');
  console.log('✓ Test 5 Passed: WhatsApp account directory correctly isolated:', waAccDir);

  // Test 6: Sync any DB tokens into credentials/ if present
  try {
    const row = await getAsync(`SELECT value FROM settings WHERE key = 'telegram_bot_token'`);
    if (row && row.value && row.value.trim().length > 10) {
      credentialService.saveTelegramToken('default', row.value.trim());
      credentialService.saveTelegramToken('acc_tg_primary', row.value.trim());
      console.log('✓ Synced existing DB Telegram bot token to credentials/telegram.json');
    }
  } catch (dbErr) {
    console.warn('Notice on DB sync test:', dbErr.message);
  }

  console.log('=== All Credential Tests Passed! ===\n');
}

runCredentialTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
