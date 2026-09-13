const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== Running Chat Rename Feature Automated Verification ===\n');

// 1. Verify index.html elements
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const expectedElements = [
  'id="btnRenameChatHeader"',
  'id="chatContactName"',
  'id="menuItemRenameChat"',
  'id="settingsChatNameInput"',
  'id="modalRenameChat"',
  'id="btnCloseRenameModal"',
  'id="btnCancelRenameModal"',
  'id="btnSaveRenameModal"',
  'id="renameChatInput"',
  'id="renameModalAvatar"',
  'id="renameModalPlatformBadge"',
  'id="renameModalHandle"'
];

let htmlPassed = true;
expectedElements.forEach(elem => {
  if (html.includes(elem)) {
    console.log(`✓ HTML element present: ${elem}`);
  } else {
    console.error(`✗ Missing HTML element: ${elem}`);
    htmlPassed = false;
  }
});

// 2. Verify styles.css classes
const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
const expectedClasses = [
  '.contact-name-row',
  '.btn-chat-rename-trigger',
  '.modal-rename-dialog',
  '.rename-contact-preview',
  '.rename-avatar-box',
  '.input-rename-field',
  '.btn-rename-contact',
  '.btn-thread-rename'
];

let cssPassed = true;
expectedClasses.forEach(cls => {
  if (css.includes(cls)) {
    console.log(`✓ CSS class present: ${cls}`);
  } else {
    console.error(`✗ Missing CSS class: ${cls}`);
    cssPassed = false;
  }
});

// 3. Verify app.js logic
const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const expectedJsSnippets = [
  'btnRenameChatHeader: document.getElementById(\'btnRenameChatHeader\')',
  'menuItemRenameChat: document.getElementById(\'menuItemRenameChat\')',
  'modalRenameChat: document.getElementById(\'modalRenameChat\')',
  'renameChatInput: document.getElementById(\'renameChatInput\')',
  'function openRenameModal',
  'function closeRenameModal',
  'function handleSaveRename',
  'function saveContactName',
  'btnRenameChatHeader.addEventListener',
  'menuItemRenameChat.addEventListener',
  'btn-rename-contact',
  'btn-thread-rename'
];

let jsPassed = true;
expectedJsSnippets.forEach(snippet => {
  if (js.includes(snippet)) {
    console.log(`✓ JS snippet verified: ${snippet}`);
  } else {
    console.error(`✗ Missing JS snippet: ${snippet}`);
    jsPassed = false;
  }
});

// 4. Test live API PUT and GET
async function testApi() {
  const testContactId = 'contact_wife';
  const originalName = 'Maya (Wife)';
  const testRename = 'Maya (Automated Test Name)';

  function putName(name) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ name });
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/contacts/${testContactId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  function getContacts() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/contacts', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });
  }

  try {
    const putRes = await putName(testRename);
    if (putRes.success && putRes.contact.name === testRename) {
      console.log(`✓ API PUT /api/contacts/${testContactId} renamed to "${testRename}"`);
    } else {
      throw new Error(`PUT response unexpected: ${JSON.stringify(putRes)}`);
    }

    const getRes = await getContacts();
    const contact = getRes.contacts.find(c => c.id === testContactId);
    if (contact && contact.name === testRename) {
      console.log(`✓ API GET /api/contacts confirmed name update in database: "${contact.name}"`);
    } else {
      throw new Error(`GET did not reflect updated name: ${JSON.stringify(contact)}`);
    }

    // Restore original name
    const restoreRes = await putName(originalName);
    if (restoreRes.success && restoreRes.contact.name === originalName) {
      console.log(`✓ Cleaned up and restored name back to "${originalName}"`);
    }
  } catch (err) {
    console.error(`✗ API test error: ${err.message}`);
    process.exit(1);
  }
}

testApi().then(() => {
  if (htmlPassed && cssPassed && jsPassed) {
    console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
    process.exit(0);
  } else {
    console.error('\n=== VERIFICATION FAILED ===');
    process.exit(1);
  }
});
