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
  // Navigation & Header AI Toolbar
  navItems: document.querySelectorAll('.nav-item'),
  viewPanels: document.querySelectorAll('.view-panel'),
  currentProviderName: document.getElementById('currentProviderName'),
  headerProviderSelect: document.getElementById('headerProviderSelect'),
  headerModelSelect: document.getElementById('headerModelSelect'),
  headerReloadModelsBtn: document.getElementById('headerReloadModelsBtn'),
  headerStatusDot: document.getElementById('headerStatusDot'),
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
  newContactRelationship: document.getElementById('newContactRelationship'),

  // Language & Speed Controls
  headerLanguageSelect: document.getElementById('headerLanguageSelect'),
  headerSpeedModeBtn: document.getElementById('headerSpeedModeBtn'),
  speedModeLabel: document.getElementById('speedModeLabel'),
  personaLanguageSelect: document.getElementById('personaLanguageSelect'),
  rangeCodeSwitchRatio: document.getElementById('rangeCodeSwitchRatio'),
  valCodeSwitchRatio: document.getElementById('valCodeSwitchRatio'),
  personaSpeedSelect: document.getElementById('personaSpeedSelect'),
  badgeActiveLang: document.getElementById('badgeActiveLang'),
  btnSaveLanguageSettings: document.getElementById('btnSaveLanguageSettings'),

  // Voice Studio & ASR/TTS Controls
  btnVoiceRecord: document.getElementById('btnVoiceRecord'),
  voiceListeningBar: document.getElementById('voiceListeningBar'),
  voiceStatusLabel: document.getElementById('voiceStatusLabel'),
  badgeActiveVoice: document.getElementById('badgeActiveVoice'),
  voiceEmotionSelect: document.getElementById('voiceEmotionSelect'),
  valVoicePitch: document.getElementById('valVoicePitch'),
  rangeVoicePitch: document.getElementById('rangeVoicePitch'),
  valVoiceRate: document.getElementById('valVoiceRate'),
  rangeVoiceRate: document.getElementById('rangeVoiceRate'),
  voiceAsrLangSelect: document.getElementById('voiceAsrLangSelect'),
  voiceSynthesizerSelect: document.getElementById('voiceSynthesizerSelect'),
  testVoiceSampleText: document.getElementById('testVoiceSampleText'),
  btnTestVoice: document.getElementById('btnTestVoice'),
  btnSaveVoiceSettings: document.getElementById('btnSaveVoiceSettings'),

  // Signal Messenger Integration
  signalStatusBadge: document.getElementById('signalStatusBadge'),
  signalQrBox: document.getElementById('signalQrBox'),
  signalPhoneInput: document.getElementById('signalPhoneInput'),
  signalEndpointInput: document.getElementById('signalEndpointInput'),
  btnGenerateSignalQR: document.getElementById('btnGenerateSignalQR'),
  btnConnectSignal: document.getElementById('btnConnectSignal'),
  btnDisconnectSignal: document.getElementById('btnDisconnectSignal')
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
  setupLanguageAndSpeedControls();
  setupVoiceStudioAndSpeech();
  setupSignalIntegration();
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

    case 'provider_fallback_warning':
      showHeaderToast(`⚠️ ${data.provider} failed: ${data.error || 'Connection error'}. Fell back to simulation.`, true);
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
      
      // Update UI provider badge & header select
      updateActiveProviderUI(state.activeProvider);

      // Populate header model dropdown
      await updateHeaderModelsDropdown(state.activeProvider);

      if (data.settings.user_name) {
        elements.sidebarUserName.textContent = data.settings.user_name;
      }

      // Populate Provider Settings Form
      populateProviderForms(data.settings);

      // Populate Language & Code-Switching Preferences
      populateLanguageSettings(data.settings);

      // Populate Auto-Response Speed Mode UI
      updateSpeedModeUI(data.settings.response_speed_mode || 'quick');

      // Populate Voice & Audio Rhythm Studio
      populateVoiceStudioSettings(data.settings);
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
  const displayName = names[providerKey] || providerKey.toUpperCase();
  if (elements.currentProviderName) {
    elements.currentProviderName.textContent = displayName;
  }
  
  if (elements.headerProviderSelect && elements.headerProviderSelect.value !== providerKey) {
    elements.headerProviderSelect.value = providerKey;
  }

  // Highlight active provider card
  document.querySelectorAll('.provider-card').forEach(card => {
    card.classList.toggle('active-provider', card.getAttribute('data-provider') === providerKey);
  });

  if (elements.inspectorProvider) {
    elements.inspectorProvider.textContent = displayName.toUpperCase();
  }
}

function populateProviderForms(settings) {
  if (settings.ollama_endpoint) document.getElementById('cfg_ollama_endpoint').value = settings.ollama_endpoint;
  setModelDropdownValue('cfg_ollama_model', settings.ollama_model);

  if (settings.lmstudio_endpoint) document.getElementById('cfg_lmstudio_endpoint').value = settings.lmstudio_endpoint;
  setModelDropdownValue('cfg_lmstudio_model', settings.lmstudio_model);

  if (settings.openai_endpoint) document.getElementById('cfg_openai_endpoint').value = settings.openai_endpoint;
  if (settings.openai_api_key) document.getElementById('cfg_openai_api_key').value = settings.openai_api_key;
  setModelDropdownValue('cfg_openai_model', settings.openai_model);

  if (settings.gemini_api_key) document.getElementById('cfg_gemini_api_key').value = settings.gemini_api_key;
  setModelDropdownValue('cfg_gemini_model', settings.gemini_model);

  if (settings.openrouter_api_key) document.getElementById('cfg_openrouter_api_key').value = settings.openrouter_api_key;
  setModelDropdownValue('cfg_openrouter_model', settings.openrouter_model);

  if (settings.nvidia_api_key) document.getElementById('cfg_nvidia_api_key').value = settings.nvidia_api_key;
  if (settings.nvidia_endpoint) document.getElementById('cfg_nvidia_endpoint').value = settings.nvidia_endpoint;
  setModelDropdownValue('cfg_nvidia_model', settings.nvidia_model);
}

// Helper: Set a model dropdown value, adding a new option if the saved value doesn't exist yet
function setModelDropdownValue(selectId, value) {
  if (!value) return;
  const select = document.getElementById(selectId);
  if (!select) return;
  // Check if option exists
  const exists = Array.from(select.options).some(opt => opt.value === value);
  if (!exists) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  select.value = value;
}

// Helper: Get the effective model value (custom input overrides dropdown)
function getEffectiveModelValue(provider) {
  const customInput = document.getElementById(`cfg_${provider}_model_custom`);
  const select = document.getElementById(`cfg_${provider}_model`);
  if (customInput && customInput.value.trim()) {
    return customInput.value.trim();
  }
  return select ? select.value : '';
}

// Floating Toast for Header AI Provider & Model updates
function showHeaderToast(message, isWarning = false) {
  let toast = document.getElementById('headerAiToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'headerAiToast';
    toast.className = 'header-ai-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `header-ai-toast ${isWarning ? 'warning' : ''} show`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/**
 * Fetch and populate header model dropdown for the given provider
 */
async function updateHeaderModelsDropdown(providerKey, forceSelectModel = null) {
  if (!elements.headerModelSelect) return;

  const currentModel = forceSelectModel || state.settings[`${providerKey}_model`] || '';

  // Set loading state
  elements.headerModelSelect.innerHTML = '<option value="">Loading models...</option>';
  elements.headerModelSelect.disabled = true;
  if (elements.headerReloadModelsBtn) {
    elements.headerReloadModelsBtn.classList.add('spinning');
  }

  try {
    const res = await fetch('/api/provider/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerKey })
    });
    const data = await res.json();

    elements.headerModelSelect.innerHTML = '';

    if (data.success && data.models && data.models.length > 0) {
      data.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        let label = m.name || m.id;
        if (m.size) label += ` (${m.size})`;
        opt.textContent = label;
        elements.headerModelSelect.appendChild(opt);
      });

      // Also sync with the provider settings card dropdown if on screen
      const cardSelect = document.getElementById(`cfg_${providerKey}_model`);
      if (cardSelect) {
        cardSelect.innerHTML = elements.headerModelSelect.innerHTML;
      }

      // Check if current active model exists in options
      const exists = Array.from(elements.headerModelSelect.options).some(o => o.value === currentModel);
      if (exists) {
        elements.headerModelSelect.value = currentModel;
        if (cardSelect) cardSelect.value = currentModel;
      } else {
        // Automatically select first available model and persist it
        const first = elements.headerModelSelect.options[0].value;
        elements.headerModelSelect.value = first;
        state.settings[`${providerKey}_model`] = first;
        if (cardSelect) cardSelect.value = first;
        await saveSettings({ [`${providerKey}_model`]: first });
      }
    } else {
      // Fallback placeholder option
      const opt = document.createElement('option');
      opt.value = currentModel || 'default';
      opt.textContent = currentModel || 'Default Model';
      elements.headerModelSelect.appendChild(opt);
      elements.headerModelSelect.value = opt.value;
    }
  } catch (err) {
    console.warn('[Header] Error fetching models for', providerKey, err);
    elements.headerModelSelect.innerHTML = `<option value="${currentModel || 'default'}">${currentModel || 'Default Model'}</option>`;
  } finally {
    elements.headerModelSelect.disabled = false;
    if (elements.headerReloadModelsBtn) {
      elements.headerReloadModelsBtn.classList.remove('spinning');
    }
    // Update Brain Inspector
    if (elements.inspectorModel) {
      elements.inspectorModel.textContent = elements.headerModelSelect.value || currentModel || 'default';
    }
  }
}

function setupProviderHandlers() {
  // Header Provider Select Dropdown
  if (elements.headerProviderSelect) {
    elements.headerProviderSelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      state.activeProvider = selected;
      state.settings.active_provider = selected;
      updateActiveProviderUI(selected);
      await saveSettings({ active_provider: selected });
      showHeaderToast(`AI Provider: ${selected.toUpperCase()}`);
      await updateHeaderModelsDropdown(selected);
    });
  }

  // Header Model Select Dropdown
  if (elements.headerModelSelect) {
    elements.headerModelSelect.addEventListener('change', async (e) => {
      const selectedModel = e.target.value;
      if (!selectedModel) return;
      const modelKey = `${state.activeProvider}_model`;
      state.settings[modelKey] = selectedModel;

      // Update provider card select & custom input
      const cardSelect = document.getElementById(`cfg_${state.activeProvider}_model`);
      if (cardSelect) setModelDropdownValue(`cfg_${state.activeProvider}_model`, selectedModel);
      const customInput = document.getElementById(`cfg_${state.activeProvider}_model_custom`);
      if (customInput) customInput.value = '';

      await saveSettings({ [modelKey]: selectedModel });
      if (elements.inspectorModel) elements.inspectorModel.textContent = selectedModel;
      showHeaderToast(`Model: ${selectedModel}`);
    });
  }

  // Header Reload Models Button
  if (elements.headerReloadModelsBtn) {
    elements.headerReloadModelsBtn.addEventListener('click', async () => {
      showHeaderToast(`Refreshing ${state.activeProvider.toUpperCase()} models...`);
      await updateHeaderModelsDropdown(state.activeProvider);
      showHeaderToast(`Models updated for ${state.activeProvider.toUpperCase()}`);
    });
  }

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
      state.settings.active_provider = selected;
      updateActiveProviderUI(selected);
      await updateHeaderModelsDropdown(selected);
      showHeaderToast(`Active Provider: ${selected.toUpperCase()}`);
    });
  });

  // Save All Settings
  elements.btnSaveProviderSettings.addEventListener('click', async () => {
    const updates = {
      active_provider: state.activeProvider,
      ollama_endpoint: document.getElementById('cfg_ollama_endpoint').value,
      ollama_model: getEffectiveModelValue('ollama'),
      lmstudio_endpoint: document.getElementById('cfg_lmstudio_endpoint').value,
      lmstudio_model: getEffectiveModelValue('lmstudio'),
      openai_endpoint: document.getElementById('cfg_openai_endpoint').value,
      openai_api_key: document.getElementById('cfg_openai_api_key').value,
      openai_model: getEffectiveModelValue('openai'),
      gemini_api_key: document.getElementById('cfg_gemini_api_key').value,
      gemini_model: getEffectiveModelValue('gemini'),
      openrouter_api_key: document.getElementById('cfg_openrouter_api_key').value,
      openrouter_model: getEffectiveModelValue('openrouter'),
      nvidia_api_key: document.getElementById('cfg_nvidia_api_key').value,
      nvidia_endpoint: document.getElementById('cfg_nvidia_endpoint').value,
      nvidia_model: getEffectiveModelValue('nvidia')
    };

    await saveSettings(updates);
    await updateHeaderModelsDropdown(state.activeProvider);
    showHeaderToast('Settings saved successfully!');
    alert('Settings saved successfully!');
  });

  // Global Auto-Reply Switch
  elements.globalAutoReplyToggle.addEventListener('change', async (e) => {
    await saveSettings({ global_auto_reply: String(e.target.checked) });
  });

  // Load Models Buttons — Fetch models from provider API and populate dropdown
  document.querySelectorAll('.btn-load-models').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.getAttribute('data-provider');
      loadModelsForProvider(provider, btn);
    });
  });

  // Custom model input: clear dropdown selection when user types a custom model
  document.querySelectorAll('.model-custom-input').forEach(input => {
    input.addEventListener('input', () => {
      if (input.value.trim()) {
        const provider = input.id.replace('cfg_', '').replace('_model_custom', '');
        const select = document.getElementById(`cfg_${provider}_model`);
        if (select) select.value = '';
      }
    });
  });
}

/**
 * Fetch models from a provider's API and populate the dropdown
 */
async function loadModelsForProvider(providerKey, btn) {
  const select = document.getElementById(`cfg_${providerKey}_model`);
  const statusBox = document.getElementById(`status_${providerKey}`);
  const customInput = document.getElementById(`cfg_${providerKey}_model_custom`);
  if (!select) return;

  // Build config from current form values
  const config = {};
  const endpointEl = document.getElementById(`cfg_${providerKey}_endpoint`);
  const apiKeyEl = document.getElementById(`cfg_${providerKey}_api_key`);
  if (endpointEl) config[`${providerKey}_endpoint`] = endpointEl.value;
  if (apiKeyEl) config[`${providerKey}_api_key`] = apiKeyEl.value;

  // Save current selection
  const previousValue = select.value;

  // UI: Set loading state
  btn.classList.add('loading');
  btn.classList.remove('success', 'error');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2"></i> Loading...';
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
  select.disabled = true;
  if (statusBox) {
    statusBox.textContent = 'Fetching models from API...';
    statusBox.className = 'provider-status-msg';
  }

  try {
    const res = await fetch('/api/provider/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerKey, config })
    });
    const data = await res.json();

    if (data.success && data.models && data.models.length > 0) {
      // Clear existing options
      select.innerHTML = '';

      // Populate with fetched models
      data.models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        let label = model.name || model.id;
        if (model.size) label += ` (${model.size})`;
        if (model.owned_by) label += ` — ${model.owned_by}`;
        opt.textContent = label;
        select.appendChild(opt);
      });

      // Try to restore previous selection
      const restorable = Array.from(select.options).some(o => o.value === previousValue);
      if (restorable) {
        select.value = previousValue;
      }

      // Clear custom input since we now have real models
      if (customInput) customInput.value = '';

      // Sync with header model dropdown if this provider is currently active
      if (providerKey === state.activeProvider && elements.headerModelSelect) {
        elements.headerModelSelect.innerHTML = select.innerHTML;
        elements.headerModelSelect.value = select.value;
      }

      // UI: Success state
      btn.classList.remove('loading');
      btn.classList.add('success');
      btn.innerHTML = `<i data-lucide="check-circle"></i> ${data.models.length} Models`;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
      if (statusBox) {
        statusBox.textContent = data.message || `Loaded ${data.models.length} models successfully`;
        statusBox.className = 'provider-status-msg success';
      }

      // Reset button after 4 seconds
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = '<i data-lucide="download-cloud"></i> Load Models';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
      }, 4000);
    } else {
      // No models found or error
      btn.classList.remove('loading');
      btn.classList.add('error');
      btn.innerHTML = '<i data-lucide="alert-circle"></i> Failed';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
      if (statusBox) {
        statusBox.textContent = data.message || 'No models found. Check your endpoint and API key.';
        statusBox.className = 'provider-status-msg error';
      }

      setTimeout(() => {
        btn.classList.remove('error');
        btn.innerHTML = '<i data-lucide="download-cloud"></i> Load Models';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
      }, 4000);
    }
  } catch (err) {
    btn.classList.remove('loading');
    btn.classList.add('error');
    btn.innerHTML = '<i data-lucide="alert-circle"></i> Error';
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    if (statusBox) {
      statusBox.textContent = `Network error: ${err.message}`;
      statusBox.className = 'provider-status-msg error';
    }

    setTimeout(() => {
      btn.classList.remove('error');
      btn.innerHTML = '<i data-lucide="download-cloud"></i> Load Models';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    }, 4000);
  } finally {
    select.disabled = false;
  }
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

  let meta = {};
  if (msg.metadata) {
    try {
      meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
    } catch {}
  }
  const provider = msg.provider || meta.provider;
  const model = msg.model || meta.model;
  const isFallback = msg.isFallback || meta.isFallback;
  const error = msg.error || meta.error;

  let modelTagHtml = '';
  if (msg.direction === 'outgoing' && provider) {
    if (isFallback) {
      modelTagHtml = `<span class="message-fallback-badge" title="Fallback Reason: ${escapeHTML(error || 'AI Provider Unavailable')}">⚠️ Fallback: ${escapeHTML(model || 'mock')}</span>`;
    } else {
      modelTagHtml = `<span class="message-model-tag" title="Generated by ${escapeHTML(provider)}">${escapeHTML(provider)}${model ? ' · ' + escapeHTML(model) : ''}</span>`;
    }
  }

  bubble.innerHTML = `
    <div class="message-content">${escapeHTML(msg.text)}</div>
    <div class="message-meta">
      <span class="message-time">${timeStr}</span>
      <span class="message-mode-tag">${msg.mode || 'bot'}</span>
      ${modelTagHtml}
      <button class="btn-msg-tts" type="button" title="Speak text (TTS Voice Rhythm)">🔊</button>
      ${msg.direction === 'outgoing' ? '<i data-lucide="check-check" style="width:12px;height:12px;"></i>' : ''}
    </div>
  `;

  const ttsBtn = bubble.querySelector('.btn-msg-tts');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakMessageWithEmotion(msg.text);
    });
  }

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
        const waImg = data.qrDataUrl
          ? `<img src="${data.qrDataUrl}" alt="WhatsApp Web QR Code" width="200" height="200" style="display:block;border-radius:6px;" />`
          : `<div style="padding:16px;color:#000;">${data.qrCode}</div>`;

        elements.waQrBox.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
            <div style="background:#fff;padding:12px;border-radius:10px;display:inline-block;box-shadow:0 6px 18px rgba(0,0,0,0.3);">
              ${waImg}
            </div>
            <span class="text-xs text-muted">Session Code: ${(data.qrCode || '').substring(0, 24)}...</span>
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
// Language & Code-Switching Preferences (98% Tanglish / Multi-Language)
// ==========================================================================
function populateLanguageSettings(settings) {
  const lang = settings.preferred_language || 'tanglish';
  const ratio = settings.code_switching_ratio || '98';

  if (elements.headerLanguageSelect) elements.headerLanguageSelect.value = lang;
  if (elements.personaLanguageSelect) elements.personaLanguageSelect.value = lang;
  if (elements.rangeCodeSwitchRatio) elements.rangeCodeSwitchRatio.value = ratio;
  if (elements.valCodeSwitchRatio) elements.valCodeSwitchRatio.textContent = `${ratio}%`;

  if (elements.badgeActiveLang) {
    const langNames = {
      tanglish: '98% Tanglish Active',
      english: 'English (Global) Active',
      hinglish: 'Hinglish (Hindi+Eng) Active',
      tenglish: 'Tenglish (Telugu+Eng) Active',
      manglish: 'Manglish (Malayalam+Eng) Active',
      kanglish: 'Kanglish (Kannada+Eng) Active',
      tamil: 'Tamil (தமிழ்) Active'
    };
    elements.badgeActiveLang.textContent = langNames[lang] || `${lang.toUpperCase()} Active`;
  }
}

function updateSpeedModeUI(mode) {
  const isQuick = mode === 'quick';
  if (elements.headerSpeedModeBtn) {
    elements.headerSpeedModeBtn.classList.toggle('active', isQuick);
    elements.headerSpeedModeBtn.classList.toggle('speed-deep', !isQuick);
    if (elements.speedModeLabel) {
      elements.speedModeLabel.textContent = isQuick ? '⚡ Quick' : '🧠 Deep';
    }
    elements.headerSpeedModeBtn.title = isQuick
      ? 'Response Speed: Quick Answer (<2s, instant reply)'
      : 'Response Speed: Deep Thinking (Extended reasoning allowed)';
  }
  if (elements.personaSpeedSelect) {
    elements.personaSpeedSelect.value = mode;
  }
}

function setupLanguageAndSpeedControls() {
  // Header Language Select
  if (elements.headerLanguageSelect) {
    elements.headerLanguageSelect.addEventListener('change', async (e) => {
      const selectedLang = e.target.value;
      if (elements.personaLanguageSelect) elements.personaLanguageSelect.value = selectedLang;
      state.settings.preferred_language = selectedLang;
      await saveSettings({ preferred_language: selectedLang });
      populateLanguageSettings(state.settings);
      showHeaderToast(`Language: ${e.target.selectedOptions[0]?.text || selectedLang}`);
    });
  }

  // Header Speed Mode Toggle
  if (elements.headerSpeedModeBtn) {
    elements.headerSpeedModeBtn.addEventListener('click', async () => {
      const current = state.settings.response_speed_mode || 'quick';
      const next = current === 'quick' ? 'deep' : 'quick';
      state.settings.response_speed_mode = next;
      updateSpeedModeUI(next);
      await saveSettings({ response_speed_mode: next });
      showHeaderToast(next === 'quick' ? '⚡ Quick Answer Mode Active (<2s)' : '🧠 Deep Thinking Mode Active');
    });
  }

  // Persona View Code-Switching Ratio slider
  if (elements.rangeCodeSwitchRatio) {
    elements.rangeCodeSwitchRatio.addEventListener('input', (e) => {
      if (elements.valCodeSwitchRatio) {
        elements.valCodeSwitchRatio.textContent = `${e.target.value}%`;
      }
    });
  }

  // Persona View Save Language Settings Button
  if (elements.btnSaveLanguageSettings) {
    elements.btnSaveLanguageSettings.addEventListener('click', async () => {
      const preferred_language = elements.personaLanguageSelect ? elements.personaLanguageSelect.value : 'tanglish';
      const code_switching_ratio = elements.rangeCodeSwitchRatio ? elements.rangeCodeSwitchRatio.value : '98';
      const response_speed_mode = elements.personaSpeedSelect ? elements.personaSpeedSelect.value : 'quick';

      state.settings.preferred_language = preferred_language;
      state.settings.code_switching_ratio = code_switching_ratio;
      state.settings.response_speed_mode = response_speed_mode;

      await saveSettings({
        preferred_language,
        code_switching_ratio,
        response_speed_mode
      });

      populateLanguageSettings(state.settings);
      updateSpeedModeUI(response_speed_mode);
      showHeaderToast('Language & Speed preferences saved!');
    });
  }
}

// ==========================================================================
// Voice & Audio Rhythm Studio (Speech-to-Text ASR & Text-to-Speech TTS)
// ==========================================================================
let activeSpeechRecognition = null;
let isVoiceListening = false;

function populateVoiceStudioSettings(settings) {
  if (elements.voiceEmotionSelect) elements.voiceEmotionSelect.value = settings.voice_emotion || 'warm';
  if (elements.rangeVoicePitch) elements.rangeVoicePitch.value = settings.voice_pitch || '1.0';
  if (elements.valVoicePitch) elements.valVoicePitch.textContent = `${Number(settings.voice_pitch || 1.0).toFixed(2)}x`;
  if (elements.rangeVoiceRate) elements.rangeVoiceRate.value = settings.voice_rate || '1.05';
  if (elements.valVoiceRate) elements.valVoiceRate.textContent = `${Number(settings.voice_rate || 1.05).toFixed(2)}x`;
  if (elements.voiceAsrLangSelect) elements.voiceAsrLangSelect.value = settings.voice_asr_lang || 'ta-IN';
  if (elements.badgeActiveVoice) {
    const emotionLabels = {
      warm: 'Warm & Affectionate',
      playful: 'Playful & Bubbly',
      calm: 'Calm & Reassuring',
      expressive: 'Expressive & Dynamic'
    };
    elements.badgeActiveVoice.textContent = `Emotion: ${emotionLabels[settings.voice_emotion || 'warm'] || 'Warm & Affectionate'}`;
  }
}

function setupVoiceStudioAndSpeech() {
  function loadVoices() {
    if (!window.speechSynthesis || !elements.voiceSynthesizerSelect) return;
    const voices = window.speechSynthesis.getVoices();
    elements.voiceSynthesizerSelect.innerHTML = '<option value="">Auto Detect Voice (System)</option>';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})${v.default ? ' [Default]' : ''}`;
      elements.voiceSynthesizerSelect.appendChild(opt);
    });
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  // Pitch & Rate live sliders
  if (elements.rangeVoicePitch) {
    elements.rangeVoicePitch.addEventListener('input', (e) => {
      if (elements.valVoicePitch) elements.valVoicePitch.textContent = `${Number(e.target.value).toFixed(2)}x`;
    });
  }

  if (elements.rangeVoiceRate) {
    elements.rangeVoiceRate.addEventListener('input', (e) => {
      if (elements.valVoiceRate) elements.valVoiceRate.textContent = `${Number(e.target.value).toFixed(2)}x`;
    });
  }

  // Emotion selector adjusts pitch/tempo rhythm
  if (elements.voiceEmotionSelect) {
    elements.voiceEmotionSelect.addEventListener('change', (e) => {
      const emotion = e.target.value;
      const presets = {
        warm: { pitch: 1.05, rate: 0.98, label: 'Warm & Affectionate' },
        playful: { pitch: 1.15, rate: 1.12, label: 'Playful & Bubbly' },
        calm: { pitch: 0.92, rate: 0.90, label: 'Calm & Reassuring' },
        expressive: { pitch: 1.10, rate: 1.05, label: 'Expressive & Dynamic' }
      };
      const preset = presets[emotion];
      if (preset) {
        if (elements.rangeVoicePitch) {
          elements.rangeVoicePitch.value = preset.pitch;
          if (elements.valVoicePitch) elements.valVoicePitch.textContent = `${preset.pitch.toFixed(2)}x`;
        }
        if (elements.rangeVoiceRate) {
          elements.rangeVoiceRate.value = preset.rate;
          if (elements.valVoiceRate) elements.valVoiceRate.textContent = `${preset.rate.toFixed(2)}x`;
        }
        if (elements.badgeActiveVoice) {
          elements.badgeActiveVoice.textContent = `Emotion: ${preset.label}`;
        }
      }
    });
  }

  // Test Voice Button
  if (elements.btnTestVoice) {
    elements.btnTestVoice.addEventListener('click', () => {
      const sample = elements.testVoiceSampleText ? elements.testVoiceSampleText.value : 'Sema da chellam! Sapdiya? On the way vandhute irukken ❤️';
      speakMessageWithEmotion(sample);
    });
  }

  // Save Voice Settings
  if (elements.btnSaveVoiceSettings) {
    elements.btnSaveVoiceSettings.addEventListener('click', async () => {
      const voice_emotion = elements.voiceEmotionSelect ? elements.voiceEmotionSelect.value : 'warm';
      const voice_pitch = elements.rangeVoicePitch ? elements.rangeVoicePitch.value : '1.0';
      const voice_rate = elements.rangeVoiceRate ? elements.rangeVoiceRate.value : '1.05';
      const voice_asr_lang = elements.voiceAsrLangSelect ? elements.voiceAsrLangSelect.value : 'ta-IN';

      state.settings.voice_emotion = voice_emotion;
      state.settings.voice_pitch = voice_pitch;
      state.settings.voice_rate = voice_rate;
      state.settings.voice_asr_lang = voice_asr_lang;

      await saveSettings({ voice_emotion, voice_pitch, voice_rate, voice_asr_lang });
      populateVoiceStudioSettings(state.settings);
      showHeaderToast('Voice Studio settings saved!');
    });
  }

  // Voice-to-Text (ASR) Mic Button
  if (elements.btnVoiceRecord) {
    elements.btnVoiceRecord.addEventListener('click', toggleVoiceRecording);
  }
}

function toggleVoiceRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice-to-Text (ASR) is supported on Google Chrome, Microsoft Edge, and Chromium-based browsers. Please test in Chrome/Edge.');
    return;
  }

  if (isVoiceListening && activeSpeechRecognition) {
    activeSpeechRecognition.stop();
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    const asrLang = elements.voiceAsrLangSelect ? elements.voiceAsrLangSelect.value : (state.settings.voice_asr_lang || 'ta-IN');
    recognition.lang = asrLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isVoiceListening = true;
      if (elements.btnVoiceRecord) elements.btnVoiceRecord.classList.add('recording');
      if (elements.voiceListeningBar) elements.voiceListeningBar.classList.remove('hidden');
      if (elements.voiceStatusLabel) {
        elements.voiceStatusLabel.textContent = `Listening in ${asrLang === 'ta-IN' ? 'Tanglish / Tamil' : asrLang}... Speak now!`;
      }
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (elements.simulatedInputText) {
        elements.simulatedInputText.value = final || interim;
      }
      if (elements.voiceStatusLabel) {
        elements.voiceStatusLabel.textContent = `Heard: "${final || interim}"`;
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech Recognition error:', event.error);
      if (elements.voiceStatusLabel) {
        elements.voiceStatusLabel.textContent = `Voice recognition error: ${event.error}`;
      }
    };

    recognition.onend = () => {
      isVoiceListening = false;
      if (elements.btnVoiceRecord) elements.btnVoiceRecord.classList.remove('recording');
      if (elements.voiceListeningBar) elements.voiceListeningBar.classList.add('hidden');
      activeSpeechRecognition = null;
    };

    activeSpeechRecognition = recognition;
    recognition.start();
  } catch (err) {
    console.error('Error starting speech recognition', err);
    alert(`Could not start microphone: ${err.message}`);
  }
}

function speakMessageWithEmotion(rawText) {
  if (!window.speechSynthesis) {
    console.warn('SpeechSynthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean emojis and markdown formatting to produce natural spoken rhythm
  let cleanText = rawText
    .replace(/[#*_`~]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Apply emotion and rhythm modifiers
  const emotion = elements.voiceEmotionSelect ? elements.voiceEmotionSelect.value : (state.settings.voice_emotion || 'warm');
  let basePitch = parseFloat(elements.rangeVoicePitch ? elements.rangeVoicePitch.value : (state.settings.voice_pitch || 1.0));
  let baseRate = parseFloat(elements.rangeVoiceRate ? elements.rangeVoiceRate.value : (state.settings.voice_rate || 1.05));

  if (emotion === 'warm') {
    basePitch = Math.min(1.5, basePitch * 1.04);
    baseRate = Math.max(0.6, baseRate * 0.96);
  } else if (emotion === 'playful') {
    basePitch = Math.min(1.5, basePitch * 1.12);
    baseRate = Math.min(1.8, baseRate * 1.08);
  } else if (emotion === 'calm') {
    basePitch = Math.max(0.6, basePitch * 0.93);
    baseRate = Math.max(0.6, baseRate * 0.88);
  }

  utterance.pitch = basePitch;
  utterance.rate = baseRate;

  // Voice selection
  const selectedVoiceUri = elements.voiceSynthesizerSelect ? elements.voiceSynthesizerSelect.value : '';
  const voices = window.speechSynthesis.getVoices();
  if (selectedVoiceUri) {
    const match = voices.find(v => v.voiceURI === selectedVoiceUri);
    if (match) utterance.voice = match;
  } else {
    // Look for Indian / Tamil voice
    const localVoice = voices.find(v => v.lang === 'ta-IN' || v.lang === 'en-IN');
    if (localVoice) utterance.voice = localVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// Signal Messenger Integration
// ==========================================================================
function setupSignalIntegration() {
  fetchSignalStatus();

  // Generate QR linking
  if (elements.btnGenerateSignalQR) {
    elements.btnGenerateSignalQR.addEventListener('click', async () => {
      const phone = elements.signalPhoneInput ? elements.signalPhoneInput.value.trim() : '';
      const endpoint = elements.signalEndpointInput ? elements.signalEndpointInput.value.trim() : '';
      if (!phone) {
        alert('Please enter your Signal phone number.');
        return;
      }

      try {
        const res = await fetch('/api/integrations/signal/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, endpoint })
        });
        const data = await res.json();
        if (data.success) {
          if (elements.signalStatusBadge) elements.signalStatusBadge.textContent = 'Pairing (Scan QR)';
          if (elements.signalQrBox) {
            const qrImg = data.qrDataUrl
              ? `<img src="${data.qrDataUrl}" alt="Signal Linking QR Code" width="220" height="220" style="display:block;border-radius:8px;" />`
              : `<div style="padding:16px;color:#000;">${data.linkingUri || data.qrCode}</div>`;

            const linkCode = data.linkingUri || data.qrCode || '';

            elements.signalQrBox.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
                <div style="background:#ffffff;padding:12px;border-radius:12px;display:inline-block;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                  ${qrImg}
                </div>
                <div style="font-size:11px;color:var(--text-muted);word-break:break-all;text-align:center;padding:4px 10px;max-width:320px;font-family:monospace;background:rgba(0,0,0,0.25);border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
                  <code>${escapeHTML(linkCode)}</code>
                </div>
                <div style="color:var(--accent-cyan);font-size:12px;text-align:center;font-weight:500;">
                  Open <strong>Signal App → Settings → Linked Devices → Link New Device</strong> and scan this QR code
                </div>
              </div>
            `;
          }
        } else {
          alert(`Signal Link Error: ${data.message}`);
        }
      } catch (err) {
        alert(`Signal Error: ${err.message}`);
      }
    });
  }

  // Quick Connect
  if (elements.btnConnectSignal) {
    elements.btnConnectSignal.addEventListener('click', async () => {
      const phone = elements.signalPhoneInput ? elements.signalPhoneInput.value.trim() : '';
      const endpoint = elements.signalEndpointInput ? elements.signalEndpointInput.value.trim() : '';

      try {
        const res = await fetch('/api/integrations/signal/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, endpoint })
        });
        const data = await res.json();
        if (data.success) {
          if (elements.signalStatusBadge) {
            elements.signalStatusBadge.textContent = 'Connected (Active)';
            elements.signalStatusBadge.className = 'status-badge connected';
          }
          if (elements.signalQrBox) {
            elements.signalQrBox.innerHTML = `
              <div style="color:var(--accent-emerald);text-align:center;padding:12px;">
                <strong>✓ Signal Messenger Linked & Active</strong>
                <p class="text-xs text-muted" style="margin-top:6px;">Daemon: ${escapeHTML(endpoint || 'http://127.0.0.1:8080')}<br>Account: ${escapeHTML(phone)}</p>
              </div>
            `;
          }
          if (elements.btnDisconnectSignal) elements.btnDisconnectSignal.classList.remove('hidden');
        }
      } catch (err) {
        alert(`Signal Connection Error: ${err.message}`);
      }
    });
  }

  // Disconnect
  if (elements.btnDisconnectSignal) {
    elements.btnDisconnectSignal.addEventListener('click', async () => {
      try {
        await fetch('/api/integrations/signal/disconnect', { method: 'POST' });
        if (elements.signalStatusBadge) {
          elements.signalStatusBadge.textContent = 'Disconnected';
          elements.signalStatusBadge.className = 'status-badge';
        }
        if (elements.signalQrBox) {
          elements.signalQrBox.innerHTML = `
            <div class="qr-placeholder" id="signalQrPlaceholder">
              <i data-lucide="shield-check"></i>
              <p>Click below to generate Signal Linking Device QR</p>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
        elements.btnDisconnectSignal.classList.add('hidden');
      } catch (err) {
        alert(`Disconnect error: ${err.message}`);
      }
    });
  }
}

async function fetchSignalStatus() {
  try {
    const res = await fetch('/api/integrations/signal/status');
    const data = await res.json();
    if (data.success && data.status) {
      if (elements.signalEndpointInput && data.status.endpoint) {
        elements.signalEndpointInput.value = data.status.endpoint;
      }
      if (elements.signalPhoneInput && data.status.account) {
        elements.signalPhoneInput.value = data.status.account;
      }
      if (data.status.connected) {
        if (elements.signalStatusBadge) {
          elements.signalStatusBadge.textContent = 'Connected (Active)';
          elements.signalStatusBadge.className = 'status-badge connected';
        }
        if (elements.btnDisconnectSignal) elements.btnDisconnectSignal.classList.remove('hidden');
      }
    }
  } catch (e) {
    console.warn('Could not fetch Signal status', e);
  }
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
