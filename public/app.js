/**
 * GhostReply — Dynamic Frontend Application Controller
 */

// Application State
const state = {
  contacts: [],
  activeContactId: null,
  activeMode: 'personal',
  settings: {},
  activeProvider: 'mock',
  messages: [],
  knowledgeDocs: [],
  escalations: [],
  ws: null
};

// DOM Elements
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  viewPanels: document.querySelectorAll('.view-panel'),
  currentProviderName: document.getElementById('currentProviderName'),
  globalAutoReplyToggle: document.getElementById('globalAutoReplyToggle'),
  escalationBadge: document.getElementById('escalationBadge'),
  openWizardBtn: document.getElementById('openWizardBtn'),
  btnQuickTest: document.getElementById('btnQuickTest'),
  navEscalationsBtn: document.getElementById('navEscalationsBtn'),
  sidebarUserName: document.getElementById('sidebarUserName'),

  // Studio Chat
  studioContactsList: document.getElementById('studioContactsList'),
  chatAvatar: document.getElementById('chatAvatar'),
  chatContactName: document.getElementById('chatContactName'),
  chatContactHandle: document.getElementById('chatContactHandle'),
  btnSetPersonal: document.getElementById('btnSetPersonal'),
  btnSetProfessional: document.getElementById('btnSetProfessional'),
  chatMessagesContainer: document.getElementById('chatMessagesContainer'),
  typingIndicator: document.getElementById('typingIndicator'),
  typingText: document.getElementById('typingText'),
  simulatedInputText: document.getElementById('simulatedInputText'),
  btnSendSimulated: document.getElementById('btnSendSimulated'),
  contactSearchInput: document.getElementById('contactSearchInput'),
  btnAddContactModal: document.getElementById('btnAddContactModal'),

  // Brain Inspector
  brainModeBadge: document.getElementById('brainModeBadge'),
  inspectorProvider: document.getElementById('inspectorProvider'),
  inspectorModel: document.getElementById('inspectorModel'),
  inspectorLatency: document.getElementById('inspectorLatency'),
  inspectorDelay: document.getElementById('inspectorDelay'),
  inspectorPersonaCard: document.getElementById('inspectorPersonaCard'),
  inspectorRAGCard: document.getElementById('inspectorRAGCard'),
  inspectorFormality: document.getElementById('inspectorFormality'),
  meterFormality: document.getElementById('meterFormality'),
  inspectorEmojiFreq: document.getElementById('inspectorEmojiFreq'),
  meterEmojiFreq: document.getElementById('meterEmojiFreq'),
  inspectorHumor: document.getElementById('inspectorHumor'),
  inspectorTopEmojis: document.getElementById('inspectorTopEmojis'),
  inspectorRAGChunks: document.getElementById('inspectorRAGChunks'),
  togglePromptDrawer: document.getElementById('togglePromptDrawer'),
  promptCodePreview: document.getElementById('promptCodePreview'),
  inspectorPromptText: document.getElementById('inspectorPromptText'),
  chevronPrompt: document.getElementById('chevronPrompt'),

  // Providers View
  btnSaveProviderSettings: document.getElementById('btnSaveProviderSettings'),

  // Persona Profiler
  chatDropZone: document.getElementById('chatDropZone'),
  chatFileInput: document.getElementById('chatFileInput'),
  personaContactSelect: document.getElementById('personaContactSelect'),
  personaUserName: document.getElementById('personaUserName'),
  btnAnalyzeChat: document.getElementById('btnAnalyzeChat'),
  profileContactNameBadge: document.getElementById('profileContactNameBadge'),
  profFormalityScore: document.getElementById('profFormalityScore'),
  profAvgLength: document.getElementById('profAvgLength'),
  profAbbrevList: document.getElementById('profAbbrevList'),
  profHumor: document.getElementById('profHumor'),
  profEmojiFreq: document.getElementById('profEmojiFreq'),
  profFavoriteEmojis: document.getElementById('profFavoriteEmojis'),
  profRelationType: document.getElementById('profRelationType'),
  profInsideJokes: document.getElementById('profInsideJokes'),
  profFewShotList: document.getElementById('profFewShotList'),

  // Knowledge Base
  knowledgeDocList: document.getElementById('knowledgeDocList'),
  btnOpenAddDocModal: document.getElementById('btnOpenAddDocModal'),
  ragSandboxQuery: document.getElementById('ragSandboxQuery'),
  btnRunRagTest: document.getElementById('btnRunRagTest'),
  ragSandboxResults: document.getElementById('ragSandboxResults'),

  // Contacts View
  contactsTableBody: document.getElementById('contactsTableBody'),
  btnAddNewContact: document.getElementById('btnAddNewContact'),

  // Escalations View
  escalationsList: document.getElementById('escalationsList'),
  btnRefreshEscalations: document.getElementById('btnRefreshEscalations'),

  // Integrations View
  btnGenerateWaQR: document.getElementById('btnGenerateWaQR'),
  btnConnectMockWA: document.getElementById('btnConnectMockWA'),
  btnDisconnectWA: document.getElementById('btnDisconnectWA'),
  waStatusBadge: document.getElementById('waStatusBadge'),
  waQrBox: document.getElementById('waQrBox'),
  tgBotToken: document.getElementById('tgBotToken'),
  btnVerifyTgToken: document.getElementById('btnVerifyTgToken'),
  tgStatusBadge: document.getElementById('tgStatusBadge'),
  tgStatusBox: document.getElementById('tgStatusBox'),

  // Modals
  wizardModal: document.getElementById('wizardModal'),
  btnCloseWizard: document.getElementById('btnCloseWizard'),
  btnWizardPrev: document.getElementById('btnWizardPrev'),
  btnWizardNext: document.getElementById('btnWizardNext'),
  addDocModal: document.getElementById('addDocModal'),
  btnCloseDocModal: document.getElementById('btnCloseDocModal'),
  btnCancelDocModal: document.getElementById('btnCancelDocModal'),
  btnSaveNewDoc: document.getElementById('btnSaveNewDoc'),
  newDocTitle: document.getElementById('newDocTitle'),
  newDocCategory: document.getElementById('newDocCategory'),
  newDocContent: document.getElementById('newDocContent'),
  contactModal: document.getElementById('contactModal'),
  btnCloseContactModal: document.getElementById('btnCloseContactModal'),
  btnCancelContactModal: document.getElementById('btnCancelContactModal'),
  btnSaveNewContact: document.getElementById('btnSaveNewContact'),
  newContactName: document.getElementById('newContactName'),
  newContactHandle: document.getElementById('newContactHandle'),
  newContactAvatar: document.getElementById('newContactAvatar'),
  newContactMode: document.getElementById('newContactMode'),
  newContactRelationship: document.getElementById('newContactRelationship')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupWebSocket();
  await loadSettings();
  await loadContacts();
  await loadKnowledgeDocs();
  await loadEscalations();
  setupChatHandlers();
  setupProviderHandlers();
  setupPersonaHandlers();
  setupKnowledgeHandlers();
  setupIntegrationHandlers();
  setupModals();
});

// ==========================================================================
// Navigation & Views
// ==========================================================================
function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
    });
  });

  elements.btnQuickTest.addEventListener('click', () => switchView('view-chat'));
  elements.navEscalationsBtn.addEventListener('click', () => switchView('view-escalations'));
}

function switchView(viewId) {
  elements.navItems.forEach(nav => {
    nav.classList.toggle('active', nav.getAttribute('data-view') === viewId);
  });
  elements.viewPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === viewId);
  });
}

// ==========================================================================
// WebSocket Realtime Stream
// ==========================================================================
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('[WebSocket] Connected to GhostReply stream');
  };

  state.ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleWebSocketEvent(payload);
    } catch (e) {
      console.error('Error parsing WS message', e);
    }
  };

  state.ws.onclose = () => {
    console.warn('[WebSocket] Stream closed. Reconnecting in 3s...');
    setTimeout(setupWebSocket, 3000);
  };
}

function handleWebSocketEvent(payload) {
  const { event, data } = payload;
  console.log(`[WS Event: ${event}]`, data);

  switch (event) {
    case 'message_received':
      if (data.contactId === state.activeContactId) {
        appendMessageBubble(data);
      }
      break;

    case 'typing_started':
      if (data.contactId === state.activeContactId) {
        showTypingIndicator(true, `GhostReply is typing (${data.mode} mode)...`);
      }
      break;

    case 'reasoning_trace':
      if (data.contactId === state.activeContactId) {
        updateBrainInspectorTrace(data);
      }
      break;

    case 'message_sent':
      if (data.contactId === state.activeContactId) {
        showTypingIndicator(false);
        appendMessageBubble(data);
        updateBrainStats(data);
      }
      break;

    case 'escalation_triggered':
      showTypingIndicator(false);
      showEscalationAlert(data);
      loadEscalations();
      break;
  }
}

// ==========================================================================
// Settings & Provider Management
// ==========================================================================
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      state.activeProvider = data.settings.active_provider || 'mock';
      
      // Update UI provider badge
      updateActiveProviderUI(state.activeProvider);

      if (data.settings.user_name) {
        elements.sidebarUserName.textContent = data.settings.user_name;
      }

      // Populate Provider Settings Form
      populateProviderForms(data.settings);
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

function updateActiveProviderUI(providerKey) {
  const names = {
    ollama: 'Ollama (Local)',
    lmstudio: 'LM Studio (Local)',
    openai: 'OpenAI Compatible',
    gemini: 'Google Gemini',
    openrouter: 'OpenRouter',
    nvidia: 'NVIDIA NIM API',
    mock: 'Smart Fallback Engine'
  };
  elements.currentProviderName.textContent = names[providerKey] || providerKey.toUpperCase();
  
  // Highlight active provider card
  document.querySelectorAll('.provider-card').forEach(card => {
    card.classList.toggle('active-provider', card.getAttribute('data-provider') === providerKey);
  });
}

function populateProviderForms(settings) {
  if (settings.ollama_endpoint) document.getElementById('cfg_ollama_endpoint').value = settings.ollama_endpoint;
  if (settings.ollama_model) document.getElementById('cfg_ollama_model').value = settings.ollama_model;

  if (settings.lmstudio_endpoint) document.getElementById('cfg_lmstudio_endpoint').value = settings.lmstudio_endpoint;
  if (settings.lmstudio_model) document.getElementById('cfg_lmstudio_model').value = settings.lmstudio_model;

  if (settings.openai_endpoint) document.getElementById('cfg_openai_endpoint').value = settings.openai_endpoint;
  if (settings.openai_api_key) document.getElementById('cfg_openai_api_key').value = settings.openai_api_key;
  if (settings.openai_model) document.getElementById('cfg_openai_model').value = settings.openai_model;

  if (settings.gemini_api_key) document.getElementById('cfg_gemini_api_key').value = settings.gemini_api_key;
  if (settings.gemini_model) document.getElementById('cfg_gemini_model').value = settings.gemini_model;

  if (settings.openrouter_api_key) document.getElementById('cfg_openrouter_api_key').value = settings.openrouter_api_key;
  if (settings.openrouter_model) document.getElementById('cfg_openrouter_model').value = settings.openrouter_model;

  if (settings.nvidia_api_key) document.getElementById('cfg_nvidia_api_key').value = settings.nvidia_api_key;
  if (settings.nvidia_endpoint) document.getElementById('cfg_nvidia_endpoint').value = settings.nvidia_endpoint;
  if (settings.nvidia_model) document.getElementById('cfg_nvidia_model').value = settings.nvidia_model;
}

function setupProviderHandlers() {
  // Test Ping buttons
  document.querySelectorAll('.btn-test-provider').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-target');
      const statusBox = document.getElementById(`status_${target}`);
      if (statusBox) statusBox.textContent = 'Testing connection...';

      // Gather current input config
      const config = {};
      if (target === 'ollama') {
        config.ollama_endpoint = document.getElementById('cfg_ollama_endpoint').value;
      } else if (target === 'lmstudio') {
        config.lmstudio_endpoint = document.getElementById('cfg_lmstudio_endpoint').value;
      } else if (target === 'openai') {
        config.openai_endpoint = document.getElementById('cfg_openai_endpoint').value;
        config.openai_api_key = document.getElementById('cfg_openai_api_key').value;
      } else if (target === 'gemini') {
        config.gemini_api_key = document.getElementById('cfg_gemini_api_key').value;
      } else if (target === 'openrouter') {
        config.openrouter_api_key = document.getElementById('cfg_openrouter_api_key').value;
      } else if (target === 'nvidia') {
        config.nvidia_api_key = document.getElementById('cfg_nvidia_api_key').value;
        config.nvidia_endpoint = document.getElementById('cfg_nvidia_endpoint').value;
      }

      try {
        const res = await fetch('/api/provider/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: target, config })
        });
        const data = await res.json();
        if (statusBox) {
          statusBox.textContent = data.message;
          statusBox.className = `provider-status-msg ${data.success ? 'success' : 'error'}`;
        }
      } catch (err) {
        if (statusBox) {
          statusBox.textContent = `Test Error: ${err.message}`;
          statusBox.className = 'provider-status-msg error';
        }
      }
    });
  });

  // Select as Active Provider
  document.querySelectorAll('.btn-select-provider').forEach(btn => {
    btn.addEventListener('click', async () => {
      const selected = btn.getAttribute('data-select');
      await saveSettings({ active_provider: selected });
      state.activeProvider = selected;
      updateActiveProviderUI(selected);
    });
  });

  // Save All Settings
  elements.btnSaveProviderSettings.addEventListener('click', async () => {
    const updates = {
      ollama_endpoint: document.getElementById('cfg_ollama_endpoint').value,
      ollama_model: document.getElementById('cfg_ollama_model').value,
      lmstudio_endpoint: document.getElementById('cfg_lmstudio_endpoint').value,
      lmstudio_model: document.getElementById('cfg_lmstudio_model').value,
      openai_endpoint: document.getElementById('cfg_openai_endpoint').value,
      openai_api_key: document.getElementById('cfg_openai_api_key').value,
      openai_model: document.getElementById('cfg_openai_model').value,
      gemini_api_key: document.getElementById('cfg_gemini_api_key').value,
      gemini_model: document.getElementById('cfg_gemini_model').value,
      openrouter_api_key: document.getElementById('cfg_openrouter_api_key').value,
      openrouter_model: document.getElementById('cfg_openrouter_model').value,
      nvidia_api_key: document.getElementById('cfg_nvidia_api_key').value,
      nvidia_endpoint: document.getElementById('cfg_nvidia_endpoint').value,
      nvidia_model: document.getElementById('cfg_nvidia_model').value
    };

    await saveSettings(updates);
    alert('Settings saved successfully!');
  });

  // Global Auto-Reply Switch
  elements.globalAutoReplyToggle.addEventListener('change', async (e) => {
    await saveSettings({ global_auto_reply: String(e.target.checked) });
  });
}

async function saveSettings(updates) {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
    }
  } catch (err) {
    console.error('Error saving settings', err);
  }
}

// ==========================================================================
// Contacts & Studio Management
// ==========================================================================
async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    const data = await res.json();
    if (data.success) {
      state.contacts = data.contacts;
      renderStudioContactsList();
      renderContactsTable();
      populatePersonaContactSelect();

      // Select first contact by default
      if (state.contacts.length > 0 && !state.activeContactId) {
        selectContact(state.contacts[0].id);
      }
    }
  } catch (err) {
    console.error('Error loading contacts', err);
  }
}

function renderStudioContactsList() {
  elements.studioContactsList.innerHTML = '';
  state.contacts.forEach(c => {
    const item = document.createElement('div');
    item.className = `contact-item ${c.id === state.activeContactId ? 'active' : ''}`;
    item.setAttribute('data-id', c.id);

    item.innerHTML = `
      <div class="contact-item-left">
        <div class="contact-avatar">${c.avatar || '👤'}</div>
        <div class="contact-item-info">
          <span class="contact-item-name">${c.name}</span>
          <span class="contact-item-tag">${c.relationship_type || 'contact'}</span>
        </div>
      </div>
      <span class="mode-badge-small ${c.mode}">${c.mode}</span>
    `;

    item.addEventListener('click', () => selectContact(c.id));
    elements.studioContactsList.appendChild(item);
  });
}

async function selectContact(contactId) {
  state.activeContactId = contactId;
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) return;

  state.activeMode = contact.mode || 'personal';

  // Update Studio Header
  elements.chatAvatar.textContent = contact.avatar || '👤';
  elements.chatContactName.textContent = contact.name;
  elements.chatContactHandle.textContent = `${contact.handle || 'simulator'} • ${contact.platform || 'WhatsApp'}`;

  // Update Mode Switcher Buttons
  updateModeButtonsUI(state.activeMode);

  // Update Active Class in List
  renderStudioContactsList();

  // Load Contact Messages
  await loadMessagesForContact(contactId);

  // Load Contact Personality / RAG Details in Brain Inspector
  await loadBrainInspectorForContact(contact);
}

function updateModeButtonsUI(mode) {
  elements.btnSetPersonal.className = `btn-mode-toggle ${mode === 'personal' ? 'active-personal' : ''}`;
  elements.btnSetProfessional.className = `btn-mode-toggle ${mode === 'professional' ? 'active-professional' : ''}`;
  elements.brainModeBadge.textContent = mode === 'personal' ? 'Personal Mode (Persona)' : 'Professional Mode (RAG)';
  elements.brainModeBadge.className = `badge ${mode === 'personal' ? 'badge-rose' : 'badge-blue'}`;

  elements.inspectorPersonaCard.classList.toggle('hidden', mode !== 'personal');
  elements.inspectorRAGCard.classList.toggle('hidden', mode !== 'professional');
}

async function loadMessagesForContact(contactId) {
  elements.chatMessagesContainer.innerHTML = '';
  try {
    const res = await fetch(`/api/contacts/${contactId}/messages`);
    const data = await res.json();
    if (data.success) {
      state.messages = data.messages;
      state.messages.forEach(msg => appendMessageBubble(msg));
      scrollChatToBottom();
    }
  } catch (err) {
    console.error('Error loading messages', err);
  }
}

function appendMessageBubble(msg) {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${msg.direction}`;
  
  const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

  bubble.innerHTML = `
    <div class="message-content">${escapeHTML(msg.text)}</div>
    <div class="message-meta">
      <span class="message-time">${timeStr}</span>
      <span class="message-mode-tag">${msg.mode || 'bot'}</span>
      ${msg.direction === 'outgoing' ? '<i data-lucide="check-check" style="width:12px;height:12px;"></i>' : ''}
    </div>
  `;

  elements.chatMessagesContainer.appendChild(bubble);
  if (window.lucide) lucide.createIcons();
  scrollChatToBottom();
}

function scrollChatToBottom() {
  elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
}

function showTypingIndicator(show, text = 'GhostReply is typing naturally...') {
  elements.typingIndicator.classList.toggle('hidden', !show);
  elements.typingText.textContent = text;
  scrollChatToBottom();
}

// Brain Inspector Updating
async function loadBrainInspectorForContact(contact) {
  elements.inspectorProvider.textContent = state.activeProvider.toUpperCase();
  elements.inspectorModel.textContent = state.settings[`${state.activeProvider}_model`] || 'default';

  if (contact.mode === 'personal') {
    try {
      const res = await fetch(`/api/contacts/${contact.id}/personality`);
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        const formality = Number(p.formality_level || 0.2);
        elements.inspectorFormality.textContent = `${formality.toFixed(2)} (${formality < 0.3 ? 'Very Casual' : formality > 0.6 ? 'Formal' : 'Friendly'})`;
        elements.meterFormality.style.width = `${Math.round(formality * 100)}%`;

        const emojiFreq = Number(p.emoji_frequency || 0.7);
        elements.inspectorEmojiFreq.textContent = `${Math.round(emojiFreq * 100)}%`;
        elements.meterEmojiFreq.style.width = `${Math.round(emojiFreq * 100)}%`;

        elements.inspectorHumor.textContent = p.humor_type || 'Playful Banter';
        const emojis = typeof p.favorite_emojis === 'string' ? JSON.parse(p.favorite_emojis || '[]') : p.favorite_emojis;
        elements.inspectorTopEmojis.textContent = (emojis || []).join(' ') || '😂 💀 🔥';
      }
    } catch (e) {
      console.warn('Error loading personality profile', e);
    }
  }
}

function updateBrainInspectorTrace(trace) {
  if (trace.systemPromptSnippet) {
    elements.inspectorPromptText.textContent = trace.systemPromptSnippet;
  }
  if (trace.mode === 'professional' && trace.retrievedDocs) {
    elements.inspectorRAGChunks.innerHTML = '';
    if (trace.retrievedDocs.length === 0) {
      elements.inspectorRAGChunks.innerHTML = '<div class="empty-hint">No matching chunks found above threshold.</div>';
    } else {
      trace.retrievedDocs.forEach(d => {
        const item = document.createElement('div');
        item.className = 'chunk-result-card';
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;">
            <strong>${escapeHTML(d.title)}</strong>
            <span class="chunk-score">${(d.score * 100).toFixed(1)}% match</span>
          </div>
          <div class="text-xs text-muted" style="margin-top:2px;">Category: ${d.category}</div>
        `;
        elements.inspectorRAGChunks.appendChild(item);
      });
    }
  }
}

function updateBrainStats(data) {
  if (data.provider) elements.inspectorProvider.textContent = data.provider;
  if (data.model) elements.inspectorModel.textContent = data.model;
  if (data.processingTimeMs) elements.inspectorLatency.textContent = `${data.processingTimeMs} ms`;
  if (data.delaySimulatedMs) elements.inspectorDelay.textContent = `${(data.delaySimulatedMs / 1000).toFixed(1)}s delay`;
}

// Chat Handlers (Simulating Incoming Messages)
function setupChatHandlers() {
  // Mode Switch Buttons
  elements.btnSetPersonal.addEventListener('click', async () => {
    if (!state.activeContactId) return;
    await updateContactMode(state.activeContactId, 'personal');
  });

  elements.btnSetProfessional.addEventListener('click', async () => {
    if (!state.activeContactId) return;
    await updateContactMode(state.activeContactId, 'professional');
  });

  // Quick Preset Prompts
  document.querySelectorAll('.chip-preset').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text');
      elements.simulatedInputText.value = text;
      simulateSend();
    });
  });

  // Send Button & Enter Key
  elements.btnSendSimulated.addEventListener('click', simulateSend);
  elements.simulatedInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') simulateSend();
  });

  // Contact Filter Search
  elements.contactSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.contact-item').forEach(item => {
      const name = item.querySelector('.contact-item-name')?.textContent.toLowerCase() || '';
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  });

  // Prompt Drawer Toggle
  elements.togglePromptDrawer.addEventListener('click', () => {
    elements.promptCodePreview.classList.toggle('hidden');
  });
}

async function updateContactMode(contactId, mode) {
  try {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const data = await res.json();
    if (data.success) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (contact) contact.mode = mode;
      state.activeMode = mode;
      updateModeButtonsUI(mode);
      renderStudioContactsList();
      renderContactsTable();
    }
  } catch (err) {
    console.error('Error updating mode', err);
  }
}

async function simulateSend() {
  const text = elements.simulatedInputText.value.trim();
  if (!text || !state.activeContactId) return;

  elements.simulatedInputText.value = '';
  const contact = state.contacts.find(c => c.id === state.activeContactId);

  // Send to backend pipeline
  try {
    const res = await fetch('/api/chat/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: state.activeContactId,
        text,
        senderName: contact ? contact.name : 'User'
      })
    });
    const data = await res.json();
    if (!data.success) {
      alert(`Simulation Error: ${data.message}`);
    }
  } catch (err) {
    console.error('Simulation error', err);
  }
}

// ==========================================================================
// Persona Deep Learning Profiler
// ==========================================================================
function setupPersonaHandlers() {
  // Drop Zone Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.chatDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.chatDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.chatDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.chatDropZone.classList.remove('dragover');
    });
  });

  elements.chatDropZone.addEventListener('click', () => {
    elements.chatFileInput.click();
  });

  elements.chatDropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
      elements.chatFileInput.files = e.dataTransfer.files;
      elements.chatDropZone.querySelector('p').textContent = `Selected: ${e.dataTransfer.files[0].name}`;
    }
  });

  elements.chatFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      elements.chatDropZone.querySelector('p').textContent = `Selected: ${e.target.files[0].name}`;
    }
  });

  // Extract & Vectorize Persona
  elements.btnAnalyzeChat.addEventListener('click', async () => {
    const file = elements.chatFileInput.files[0];
    if (!file) {
      alert('Please select or drop a WhatsApp _chat.txt or Telegram .json file first.');
      return;
    }

    const contactId = elements.personaContactSelect.value;
    const primaryUser = elements.personaUserName.value;

    const formData = new FormData();
    formData.append('chatFile', file);
    formData.append('contactId', contactId);
    formData.append('primaryUser', primaryUser);

    elements.btnAnalyzeChat.disabled = true;
    elements.btnAnalyzeChat.innerHTML = '<i data-lucide="refresh-cw"></i> Vectorizing Persona...';

    try {
      const res = await fetch('/api/personality/upload-chat', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        alert(data.message);
        renderPersonaAnalysisResults(data.analysis);
        await loadContacts();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      elements.btnAnalyzeChat.disabled = false;
      elements.btnAnalyzeChat.innerHTML = '<i data-lucide="sparkles"></i> Extract & Vectorize Persona';
      if (window.lucide) lucide.createIcons();
    }
  });
}

function populatePersonaContactSelect() {
  elements.personaContactSelect.innerHTML = '';
  state.contacts.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.relationship_type})`;
    elements.personaContactSelect.appendChild(opt);
  });
}

function renderPersonaAnalysisResults(analysis) {
  elements.profFormalityScore.textContent = `${analysis.formality_level} / 1.0 (${analysis.formality_level < 0.3 ? 'Casual Slang' : 'Formal'})`;
  elements.profAvgLength.textContent = `~${analysis.avg_message_length} words per reply`;

  const abbrevs = typeof analysis.abbreviation_map === 'string' ? JSON.parse(analysis.abbreviation_map || '{}') : analysis.abbreviation_map;
  elements.profAbbrevList.innerHTML = '';
  for (const [full, short] of Object.entries(abbrevs)) {
    const pill = document.createElement('span');
    pill.textContent = `${full} → ${short}`;
    elements.profAbbrevList.appendChild(pill);
  }

  elements.profHumor.textContent = analysis.humor_type;
  elements.profEmojiFreq.textContent = `${Math.round(analysis.emoji_frequency * 100)}% of messages`;

  const emojis = typeof analysis.favorite_emojis === 'string' ? JSON.parse(analysis.favorite_emojis || '[]') : analysis.favorite_emojis;
  elements.profFavoriteEmojis.textContent = (emojis || []).join(' ');

  elements.profRelationType.textContent = analysis.relationship_type;

  const jokes = typeof analysis.inside_jokes === 'string' ? JSON.parse(analysis.inside_jokes || '[]') : analysis.inside_jokes;
  elements.profInsideJokes.innerHTML = '';
  (jokes || []).forEach(j => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = j;
    elements.profInsideJokes.appendChild(tag);
  });

  const fewShots = typeof analysis.few_shot_examples === 'string' ? JSON.parse(analysis.few_shot_examples || '[]') : analysis.few_shot_examples;
  elements.profFewShotList.innerHTML = '';
  (fewShots || []).forEach(f => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:6px;background:rgba(255,255,255,0.03);border-radius:4px;margin-bottom:4px;font-size:11px;';
    div.innerHTML = `<strong>In:</strong> ${escapeHTML(f.incoming)}<br><strong style="color:var(--accent-cyan);">Out:</strong> ${escapeHTML(f.outgoing)}`;
    elements.profFewShotList.appendChild(div);
  });
}

// ==========================================================================
// Knowledge Base (RAG)
// ==========================================================================
async function loadKnowledgeDocs() {
  try {
    const res = await fetch('/api/knowledge');
    const data = await res.json();
    if (data.success) {
      state.knowledgeDocs = data.documents;
      renderKnowledgeDocsList();
    }
  } catch (err) {
    console.error('Error loading knowledge docs', err);
  }
}

function renderKnowledgeDocsList() {
  elements.knowledgeDocList.innerHTML = '';
  state.knowledgeDocs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card-item';
    card.innerHTML = `
      <div class="doc-card-header">
        <span class="doc-card-title">${escapeHTML(doc.title)}</span>
        <button class="btn btn-sm btn-ghost btn-delete-doc" data-id="${doc.id}" style="color:var(--accent-danger);"><i data-lucide="trash-2"></i></button>
      </div>
      <div class="text-xs text-muted">Category: <strong>${doc.category}</strong> • ${doc.chunk_count || 1} chunks</div>
      <div class="doc-card-preview">${escapeHTML(doc.content.substring(0, 150))}...</div>
    `;

    card.querySelector('.btn-delete-doc').addEventListener('click', async () => {
      if (confirm(`Delete document "${doc.title}" from knowledge base?`)) {
        await fetch(`/api/knowledge/${doc.id}`, { method: 'DELETE' });
        await loadKnowledgeDocs();
      }
    });

    elements.knowledgeDocList.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function setupKnowledgeHandlers() {
  elements.btnOpenAddDocModal.addEventListener('click', () => {
    elements.addDocModal.classList.remove('hidden');
  });

  elements.btnCloseDocModal.addEventListener('click', () => elements.addDocModal.classList.add('hidden'));
  elements.btnCancelDocModal.addEventListener('click', () => elements.addDocModal.classList.add('hidden'));

  elements.btnSaveNewDoc.addEventListener('click', async () => {
    const title = elements.newDocTitle.value.trim();
    const category = elements.newDocCategory.value.trim();
    const content = elements.newDocContent.value.trim();

    if (!title || !content) {
      alert('Please provide document title and content.');
      return;
    }

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content })
      });
      const data = await res.json();
      if (data.success) {
        elements.addDocModal.classList.add('hidden');
        elements.newDocTitle.value = '';
        elements.newDocContent.value = '';
        await loadKnowledgeDocs();
      }
    } catch (err) {
      alert(`Error adding doc: ${err.message}`);
    }
  });

  // Sandbox Query Runner
  elements.btnRunRagTest.addEventListener('click', runRagSandboxTest);
  elements.ragSandboxQuery.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runRagSandboxTest();
  });
}

async function runRagSandboxTest() {
  const query = elements.ragSandboxQuery.value.trim();
  if (!query) return;

  elements.ragSandboxResults.innerHTML = '<div class="text-sm text-muted">Searching semantic vectors...</div>';

  try {
    const res = await fetch('/api/rag/test-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 3 })
    });
    const data = await res.json();
    if (data.success) {
      elements.ragSandboxResults.innerHTML = '';

      if (data.escalation && data.escalation.triggered) {
        const alertBox = document.createElement('div');
        alertBox.style.cssText = 'padding:10px;background:rgba(239,68,68,0.15);border:1px solid var(--accent-danger);border-radius:4px;color:#fca5a5;font-size:12px;margin-bottom:10px;';
        alertBox.innerHTML = `<strong>🚨 Escalation Trigger Activated:</strong> ${data.escalation.reason}`;
        elements.ragSandboxResults.appendChild(alertBox);
      }

      if (data.results.length === 0) {
        elements.ragSandboxResults.innerHTML += '<div class="empty-hint">No relevant documents found for this query. GhostReply will trigger fallback escalation phrase.</div>';
      } else {
        data.results.forEach((r, idx) => {
          const item = document.createElement('div');
          item.className = 'chunk-result-card';
          item.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>[Match ${idx + 1}] ${escapeHTML(r.doc_title)} (${r.category})</strong>
              <span class="chunk-score">${(r.score * 100).toFixed(1)}% Confidence</span>
            </div>
            <p class="text-xs text-muted" style="margin-top:4px;">${escapeHTML(r.content)}</p>
          `;
          elements.ragSandboxResults.appendChild(item);
        });
      }
    }
  } catch (err) {
    elements.ragSandboxResults.innerHTML = `<div class="text-danger">Search error: ${err.message}</div>`;
  }
}

// ==========================================================================
// Contacts Table & Directory
// ==========================================================================
function renderContactsTable() {
  elements.contactsTableBody.innerHTML = '';
  state.contacts.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span>${c.avatar || '👤'}</span>
          <div>
            <strong>${escapeHTML(c.name)}</strong><br>
            <span class="text-xs text-muted">${escapeHTML(c.handle || '-')}</span>
          </div>
        </div>
      </td>
      <td><span class="text-sm">${c.platform}</span></td>
      <td>
        <select class="contact-mode-select" data-id="${c.id}">
          <option value="personal" ${c.mode === 'personal' ? 'selected' : ''}>Personal (Persona)</option>
          <option value="professional" ${c.mode === 'professional' ? 'selected' : ''}>Professional (RAG)</option>
        </select>
      </td>
      <td><span class="text-sm">${c.relationship_type || 'friend'}</span></td>
      <td>
        <label class="switch">
          <input type="checkbox" class="contact-autoreply-toggle" data-id="${c.id}" ${c.auto_reply ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </td>
      <td><span class="text-sm">${c.delay_mode} (${c.delay_seconds}s)</span></td>
      <td>
        <button class="btn btn-sm btn-ghost btn-delete-contact" data-id="${c.id}" style="color:var(--accent-danger);">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;

    tr.querySelector('.contact-mode-select').addEventListener('change', async (e) => {
      await updateContactMode(c.id, e.target.value);
    });

    tr.querySelector('.contact-autoreply-toggle').addEventListener('change', async (e) => {
      await fetch(`/api/contacts/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_reply: e.target.checked ? 1 : 0 })
      });
    });

    tr.querySelector('.btn-delete-contact').addEventListener('click', async () => {
      if (confirm(`Delete contact "${c.name}"?`)) {
        await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' });
        await loadContacts();
      }
    });

    elements.contactsTableBody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// Escalations & Safety Center
// ==========================================================================
async function loadEscalations() {
  try {
    const res = await fetch('/api/escalations');
    const data = await res.json();
    if (data.success) {
      state.escalations = data.escalations;
      const pending = state.escalations.filter(e => e.status === 'pending');
      
      if (pending.length > 0) {
        elements.escalationBadge.textContent = pending.length;
        elements.escalationBadge.classList.remove('hidden');
      } else {
        elements.escalationBadge.classList.add('hidden');
      }

      renderEscalationsList();
    }
  } catch (err) {
    console.error('Error loading escalations', err);
  }
}

function renderEscalationsList() {
  elements.escalationsList.innerHTML = '';
  if (state.escalations.length === 0) {
    elements.escalationsList.innerHTML = '<div class="text-muted">No safety alerts or human review requests in queue.</div>';
    return;
  }

  state.escalations.forEach(esc => {
    const card = document.createElement('div');
    card.className = 'escalation-card-item';
    card.innerHTML = `
      <div class="escalation-header">
        <span class="escalation-sender">⚠️ Flagged Contact: ${escapeHTML(esc.contact_name)} (${esc.contact_handle})</span>
        <span class="badge badge-rose">${esc.severity.toUpperCase()}</span>
      </div>
      <div class="escalation-reason"><strong>Trigger Reason:</strong> ${escapeHTML(esc.reason)}</div>
      <div style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:4px;font-size:13px;">
        <em>"${escapeHTML(esc.incoming_text)}"</em>
      </div>
      ${esc.status === 'pending' ? `
        <div class="escalation-actions-row">
          <input type="text" placeholder="Type human operator reply..." class="input-human-reply">
          <button class="btn btn-sm btn-primary btn-reply-resolve" data-id="${esc.id}">Send Reply & Resolve</button>
          <button class="btn btn-sm btn-outline btn-dismiss-esc" data-id="${esc.id}">Dismiss</button>
        </div>
      ` : `
        <div class="text-xs text-muted">Status: <strong>${esc.status}</strong> • Reply: "${esc.human_reply || 'None'}"</div>
      `}
    `;

    if (esc.status === 'pending') {
      const input = card.querySelector('.input-human-reply');
      card.querySelector('.btn-reply-resolve').addEventListener('click', async () => {
        const humanReply = input.value.trim();
        await resolveEscalation(esc.id, 'resolved', humanReply);
      });
      card.querySelector('.btn-dismiss-esc').addEventListener('click', async () => {
        await resolveEscalation(esc.id, 'dismissed');
      });
    }

    elements.escalationsList.appendChild(card);
  });
}

async function resolveEscalation(id, status, humanReply = '') {
  try {
    await fetch(`/api/escalations/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, humanReply })
    });
    await loadEscalations();
  } catch (e) {
    console.error('Error resolving escalation', e);
  }
}

function showEscalationAlert(data) {
  alert(`🚨 SAFETY ALERT: Emergency escalation triggered for ${data.contactName}!\nReason: ${data.reason}\nMessage: "${data.text}"`);
}

// ==========================================================================
// Integrations (WhatsApp Web & Telegram)
// ==========================================================================
function setupIntegrationHandlers() {
  elements.btnGenerateWaQR.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/integrations/whatsapp/qr', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        elements.waStatusBadge.textContent = 'Pairing (Scan QR)';
        elements.waQrBox.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
            <div style="background:#fff;padding:12px;border-radius:8px;display:inline-block;">
              <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <span class="text-xs text-muted">Session Code: ${data.qrCode.substring(0, 24)}...</span>
          </div>
        `;
      }
    } catch (e) {
      alert(`WA Error: ${e.message}`);
    }
  });

  elements.btnConnectMockWA.addEventListener('click', async () => {
    const res = await fetch('/api/integrations/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1 (555) 0199-Active' })
    });
    const data = await res.json();
    if (data.success) {
      elements.waStatusBadge.textContent = 'Connected (Active)';
      elements.waStatusBadge.className = 'status-badge connected';
      elements.waQrBox.innerHTML = '<div style="color:var(--accent-emerald);"><strong>✓ WhatsApp Web Session Active</strong><p class="text-xs text-muted">Ready to receive & reply to incoming chats.</p></div>';
      elements.btnDisconnectWA.classList.remove('hidden');
    }
  });

  elements.btnDisconnectWA.addEventListener('click', async () => {
    await fetch('/api/integrations/whatsapp/disconnect', { method: 'POST' });
    elements.waStatusBadge.textContent = 'Disconnected';
    elements.waStatusBadge.className = 'status-badge';
    elements.waQrBox.innerHTML = '<div class="qr-placeholder"><i data-lucide="qr-code"></i><p>Click below to generate WhatsApp QR Code</p></div>';
    elements.btnDisconnectWA.classList.add('hidden');
    if (window.lucide) lucide.createIcons();
  });

  // Telegram Token Verification
  elements.btnVerifyTgToken.addEventListener('click', async () => {
    const token = elements.tgBotToken.value.trim();
    if (!token) {
      alert('Please enter your Telegram Bot token.');
      return;
    }

    elements.tgStatusBox.innerHTML = '<span class="text-muted">Verifying token with Telegram API...</span>';

    try {
      const res = await fetch('/api/integrations/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        elements.tgStatusBadge.textContent = 'Connected';
        elements.tgStatusBadge.className = 'status-badge connected';
        elements.tgStatusBox.innerHTML = `
          <div style="color:var(--accent-emerald);">
            <strong>✓ Bot Connected: @${data.bot.username}</strong>
            <p class="text-xs text-muted">ID: ${data.bot.id} • Polling active</p>
          </div>
        `;
      } else {
        elements.tgStatusBox.innerHTML = `<span style="color:var(--accent-danger);">Verification failed: ${data.message}</span>`;
      }
    } catch (e) {
      elements.tgStatusBox.innerHTML = `<span style="color:var(--accent-danger);">Connection error: ${e.message}</span>`;
    }
  });
}

// ==========================================================================
// Modals & 5-Step Wizard
// ==========================================================================
function setupModals() {
  // Wizard Modal
  elements.openWizardBtn.addEventListener('click', () => {
    elements.wizardModal.classList.remove('hidden');
    setWizardStep(1);
  });

  elements.btnCloseWizard.addEventListener('click', () => {
    elements.wizardModal.classList.add('hidden');
  });

  let currentWizardStep = 1;

  document.querySelectorAll('.mode-choice-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-choice-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  elements.btnWizardNext.addEventListener('click', () => {
    if (currentWizardStep < 5) {
      currentWizardStep++;
      setWizardStep(currentWizardStep);
    } else {
      elements.wizardModal.classList.add('hidden');
    }
  });

  elements.btnWizardPrev.addEventListener('click', () => {
    if (currentWizardStep > 1) {
      currentWizardStep--;
      setWizardStep(currentWizardStep);
    }
  });

  function setWizardStep(step) {
    currentWizardStep = step;
    document.querySelectorAll('.step-item').forEach(item => {
      const s = parseInt(item.getAttribute('data-step'));
      item.classList.toggle('active', s <= step);
    });

    document.querySelectorAll('.wizard-step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', idx + 1 === step);
    });

    elements.btnWizardPrev.disabled = step === 1;
    elements.btnWizardNext.innerHTML = step === 5 ? 'Launch GhostReply 🚀' : 'Next <i data-lucide="arrow-right"></i>';
    if (window.lucide) lucide.createIcons();
  }

  // Add Contact Modal
  elements.btnAddContactModal.addEventListener('click', () => elements.contactModal.classList.remove('hidden'));
  elements.btnAddNewContact.addEventListener('click', () => elements.contactModal.classList.remove('hidden'));
  elements.btnCloseContactModal.addEventListener('click', () => elements.contactModal.classList.add('hidden'));
  elements.btnCancelContactModal.addEventListener('click', () => elements.contactModal.classList.add('hidden'));

  elements.btnSaveNewContact.addEventListener('click', async () => {
    const name = elements.newContactName.value.trim();
    const handle = elements.newContactHandle.value.trim();
    const avatar = elements.newContactAvatar.value.trim() || '👤';
    const mode = elements.newContactMode.value;
    const relationship_type = elements.newContactRelationship.value;

    if (!name) {
      alert('Please provide a contact name.');
      return;
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, handle, avatar, mode, relationship_type })
      });
      const data = await res.json();
      if (data.success) {
        elements.contactModal.classList.add('hidden');
        elements.newContactName.value = '';
        elements.newContactHandle.value = '';
        await loadContacts();
        selectContact(data.contact.id);
      }
    } catch (e) {
      alert(`Error creating contact: ${e.message}`);
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
