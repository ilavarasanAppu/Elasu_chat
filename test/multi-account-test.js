const assert = require('assert');
const { initDatabase, allAsync } = require('../src/db/database');
const accountService = require('../src/services/accountService');
const telegramService = require('../src/services/telegramService');
const whatsappService = require('../src/services/whatsappService');
const signalService = require('../src/services/signalService');

async function runMultiAccountTests() {
  console.log('🧪 Starting Multi-Account & Channel Integrations Test Suite...\n');
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

  // Test 1: Database Initialization & Seeding of connected_accounts
  await test('Database initializes connected_accounts table and seeds defaults', async () => {
    await initDatabase();
    const accounts = await accountService.getAllAccounts();
    assert(Array.isArray(accounts), 'Accounts should be an array');
    assert(accounts.length >= 3, `Expected at least 3 seeded accounts, found ${accounts.length}`);
    const platforms = accounts.map(a => a.platform);
    assert(platforms.includes('whatsapp'), 'Should contain whatsapp account');
    assert(platforms.includes('telegram'), 'Should contain telegram account');
    assert(platforms.includes('signal'), 'Should contain signal account');
  });

  // Test 2: AccountService CRUD & Auto-Reply Toggle
  await test('AccountService supports add, update, toggleAutoReply, and delete', async () => {
    // Add new account
    const newAcc = await accountService.addAccount({
      platform: 'telegram',
      accountName: 'Support Telegram Bot',
      identifier: '@SupportTestBot',
      credentials: { token: '123456789:ABCdefGhIJK' },
      mode: 'professional',
      autoReply: true
    });
    assert.strictEqual(newAcc.accountName, 'Support Telegram Bot');
    assert.strictEqual(newAcc.platform, 'telegram');
    assert.strictEqual(newAcc.mode, 'professional');
    assert.strictEqual(newAcc.autoReply, true);

    // Update account
    const updated = await accountService.updateAccount(newAcc.id, {
      accountName: 'Enterprise Sales Bot',
      mode: 'personal'
    });
    assert.strictEqual(updated.accountName, 'Enterprise Sales Bot');
    assert.strictEqual(updated.mode, 'personal');

    // Toggle auto-reply
    const toggled = await accountService.toggleAutoReply(newAcc.id);
    assert.strictEqual(toggled.autoReply, false);

    // Delete account
    const del = await accountService.deleteAccount(newAcc.id);
    assert.strictEqual(del.success, true);
    const fetched = await accountService.getAccountById(newAcc.id);
    assert.strictEqual(fetched, null);
  });

  // Test 3: WhatsApp 8-Digit Phone Pairing Code Generator
  await test('WhatsApp generatePairingCode produces valid 8-digit XXXX-XXXX code', async () => {
    const res = await whatsappService.generatePairingCode('+91 98765 43210', 'acc_wa_primary');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'pairing');
    assert.strictEqual(typeof res.pairingCode, 'string');
    assert(/^([A-Z0-9]{4})-([A-Z0-9]{4})$/.test(res.pairingCode), `Pairing code "${res.pairingCode}" should match format XXXX-XXXX`);
    assert(res.instructions.length >= 3, 'Instructions should explain how to link on phone');
  });

  // Test 4: WhatsApp Multi-Device QR and Connect Session
  await test('WhatsApp generateRealQR and connectSession work reliably', async () => {
    const qrRes = await whatsappService.generateRealQR('acc_wa_primary');
    assert.strictEqual(qrRes.success, true);
    assert(qrRes.qrCode.length > 20, 'QR code payload should contain Noise session string');
    assert(qrRes.qrDataUrl.startsWith('data:image/png;base64,'), 'QR data URL should be a valid PNG');

    const connRes = await whatsappService.connectSession('+91 98765 43210', 'acc_wa_primary', 'pairing_code');
    assert.strictEqual(connRes.success, true);
    assert.strictEqual(connRes.status, 'connected');
    assert.strictEqual(whatsappService.getStatus('acc_wa_primary').status, 'connected');

    const discRes = await whatsappService.disconnect('acc_wa_primary');
    assert.strictEqual(discRes.status, 'disconnected');
  });

  // Test 5: Telegram Bot Token Verification & Lifecycle
  await test('TelegramService verifyBotToken handles invalid/missing tokens safely', async () => {
    const emptyRes = await telegramService.verifyBotToken('');
    assert.strictEqual(emptyRes.success, false);

    const invalidRes = await telegramService.verifyBotToken('12345:fake_token_for_testing');
    assert.strictEqual(invalidRes.success, false);
    assert(invalidRes.message !== undefined, 'Should return error description');
  });

  // Test 6: Signal Daemon Reachability Diagnostic & Link QR
  await test('Signal checkDaemon provides offline diagnostic and setup command', async () => {
    const daemon = await signalService.checkDaemon('http://127.0.0.1:9999'); // Unreachable port
    assert.strictEqual(daemon.online, false);
    assert(daemon.dockerCommand.includes('bbernhard/signal-cli-rest-api'), 'Should provide Docker setup command');

    const qr = await signalService.generateLinkQR('http://127.0.0.1:9999', '+91 98765 43210');
    assert.strictEqual(qr.success, true);
    assert.strictEqual(qr.daemonOnline, false);
    assert(qr.qrDataUrl.startsWith('data:image/png;base64,'), 'Should still generate preview QR for test linking');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Multi-Account Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runMultiAccountTests();
