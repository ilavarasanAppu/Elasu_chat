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
  headerCustomModelBtn: document.getElementById('headerCustomModelBtn'),
  headerTestAiBtn: document.getElementById('headerTestAiBtn'),
  customModelModal: document.getElementById('customModelModal'),
  btnCloseCustomModelModal: document.getElementById('btnCloseCustomModelModal'),
  btnCancelCustomModelModal: document.getElementById('btnCancelCustomModelModal'),
  btnApplyCustomModel: document.getElementById('btnApplyCustomModel'),
  customModelInput: document.getElementById('customModelInput'),
  modalActiveProviderName: document.getElementById('modalActiveProviderName'),
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
  btnSendNormal: document.getElementById('btnSendNormal'),
  contactSearchInput: document.getElementById('contactSearchInput'),
  btnAddContactModal: document.getElementById('btnAddContactModal'),

  // Chat Header Controls & Customization
  btnToggleAutoReply: document.getElementById('btnToggleAutoReply'),
  iconAutoReply: document.getElementById('iconAutoReply'),
  autoReplyStatusLabel: document.getElementById('autoReplyStatusLabel'),
  btnToggleMute: document.getElementById('btnToggleMute'),
  iconMuteStatus: document.getElementById('iconMuteStatus'),
  btnOpenChatSettings: document.getElementById('btnOpenChatSettings'),
  modalChatSettings: document.getElementById('modalChatSettings'),
  btnCloseChatSettingsModal: document.getElementById('btnCloseChatSettingsModal'),
  btnCancelChatSettings: document.getElementById('btnCancelChatSettings'),
  btnSaveChatSettings: document.getElementById('btnSaveChatSettings'),
  modalSettingsContactLabel: document.getElementById('modalSettingsContactLabel'),
  tabBtnAppearance: document.getElementById('tabBtnAppearance'),
  tabBtnControls: document.getElementById('tabBtnControls'),
  tabAppearance: document.getElementById('tab-appearance'),
  tabControls: document.getElementById('tab-controls'),
  selectChatFontSize: document.getElementById('selectChatFontSize'),
  selectChatBubbleStyle: document.getElementById('selectChatBubbleStyle'),
  previewChatContainer: document.getElementById('previewChatContainer'),
  checkManualChatOnly: document.getElementById('checkManualChatOnly'),
  checkChatNotifications: document.getElementById('checkChatNotifications'),
  btnConfirmClearChat: document.getElementById('btnConfirmClearChat'),
  btnConfirmDeleteContact: document.getElementById('btnConfirmDeleteContact'),

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
  btnDisconnectSignal: document.getElementById('btnDisconnectSignal'),

  // Multi-Account Facility
  accountsListContainer: document.getElementById('accountsListContainer'),
  btnOpenAddAccountModal: document.getElementById('btnOpenAddAccountModal'),
  addAccountModal: document.getElementById('addAccountModal'),
  btnCloseAddAccountModal: document.getElementById('btnCloseAddAccountModal'),
  btnCancelAddAccountModal: document.getElementById('btnCancelAddAccountModal'),
  btnSaveNewAccount: document.getElementById('btnSaveNewAccount'),
  modalAccountPlatform: document.getElementById('modalAccountPlatform'),
  modalAccountName: document.getElementById('modalAccountName'),
  modalAccountIdentifier: document.getElementById('modalAccountIdentifier'),
  modalAccountIdentifierLabel: document.getElementById('modalAccountIdentifierLabel'),
  modalAccountCred: document.getElementById('modalAccountCred'),
  modalAccountCredLabel: document.getElementById('modalAccountCredLabel'),
  modalAccountMode: document.getElementById('modalAccountMode'),
  modalAccountAutoReply: document.getElementById('modalAccountAutoReply'),

  // WhatsApp Enhanced
  tabWaPairingBtn: document.getElementById('tabWaPairingBtn'),
  tabWaQrBtn: document.getElementById('tabWaQrBtn'),
  waPairingView: document.getElementById('waPairingView'),
  waQrView: document.getElementById('waQrView'),
  waPhoneInput: document.getElementById('waPhoneInput'),
  btnGetWaPairingCode: document.getElementById('btnGetWaPairingCode'),
  waPairingCodeBox: document.getElementById('waPairingCodeBox'),
  waPairingCodeDisplay: document.getElementById('waPairingCodeDisplay'),

  // Telegram Enhanced
  tgBotModeSelect: document.getElementById('tgBotModeSelect'),
  btnStopTgBot: document.getElementById('btnStopTgBot'),

  // Signal Enhanced
  signalDaemonBanner: document.getElementById('signalDaemonBanner'),
  btnCheckSignalDaemon: document.getElementById('btnCheckSignalDaemon'),
  btnCopySignalCmd: document.getElementById('btnCopySignalCmd'),
  signalDockerCmdText: document.getElementById('signalDockerCmdText')
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
  await loadAccounts();
  await loadIntegrationsStatus();
  setupChatHandlers();
  setupChatSettingsHandlers();
  setupProviderHandlers();
  setupPersonaHandlers();
  setupKnowledgeHandlers();
  setupIntegrationHandlers();
  setupMultiAccountHandlers();
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
      // Always refresh sidebar contacts so new Telegram/WhatsApp contacts appear immediately!
      loadContacts();

      if (data.contactId === state.activeContactId) {
        appendMessageBubble(data);
      } else {
        const contact = state.contacts.find(c => c.id === data.contactId);
        const isMuted = contact && contact.notifications_enabled === 0;
        if (!isMuted) {
          const preview = (data.text || '').length > 35 ? data.text.substring(0, 35) + '...' : data.text;
          showHeaderToast(`📩 New message from ${data.contactName || 'Contact'}: "${preview}" (Click to view)`, false, () => {
            selectContact(data.contactId);
            switchView('view-chat');
          });
        }
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
      // Refresh contacts to update message snippet and time
      loadContacts();
      break;

    case 'provider_fallback_warning':
      showHeaderToast(`⚠️ ${data.provider} failed: ${data.error || 'Connection error'}. Fell back to simulation.`, true);
      break;

    case 'escalation_triggered':
      showTypingIndicator(false);
      showEscalationAlert(data);
      loadEscalations();
      break;

    case 'whatsapp_status_changed':
      loadIntegrationsStatus();
      loadAccounts();
      if (data.status === 'connected') {
        showHeaderToast('✓ WhatsApp Connected Successfully!', false);
      }
      break;

    case 'whatsapp_qr_ready':
      if (elements.waQrBox && data.qrDataUrl) {
        if (elements.waStatusBadge) elements.waStatusBadge.textContent = 'Pairing (Scan QR)';
        elements.waQrBox.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
            <div style="background:#ffffff;padding:14px;border-radius:12px;display:inline-block;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
              <img src="${data.qrDataUrl}" alt="WhatsApp Web QR Code" width="220" height="220" style="display:block;border-radius:8px;" />
            </div>
            <div style="color:var(--accent-green);font-size:12px;text-align:center;font-weight:500;">
              Open <strong>WhatsApp → Settings → Linked Devices → Link a Device</strong> and scan this QR code
            </div>
          </div>
        `;
      }
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

      // Populate Integrations Form fields (Telegram token, WhatsApp phone, etc.)
      populateIntegrationsForms(data.settings);
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

function populateIntegrationsForms(settings) {
  if (elements.tgBotToken && settings.telegram_bot_token) {
    elements.tgBotToken.value = settings.telegram_bot_token;
  }
  if (elements.waPhoneInput && settings.whatsapp_phone_number) {
    elements.waPhoneInput.value = settings.whatsapp_phone_number;
  }
}

async function loadIntegrationsStatus() {
  // 1. Telegram Live Status
  try {
    const tgRes = await fetch('/api/integrations/telegram/status');
    const tgData = await tgRes.json();
    if (tgData.connected && tgData.bot) {
      if (elements.tgStatusBadge) {
        elements.tgStatusBadge.textContent = 'Connected (Live)';
        elements.tgStatusBadge.className = 'status-badge connected';
      }
      if (elements.tgStatusBox) {
        elements.tgStatusBox.innerHTML = `
          <div style="color:var(--accent-emerald);">
            <strong>✓ Bot Live: @${escapeHTML(tgData.bot.username || 'Bot')}</strong>
            <p class="text-xs text-muted" style="margin-top:4px;">ID: ${tgData.bot.id} • Real-time sequential long polling active. Ready for chats.</p>
          </div>
        `;
      }
      if (elements.btnStopTgBot) elements.btnStopTgBot.classList.remove('hidden');
    } else {
      if (elements.tgStatusBadge) {
        elements.tgStatusBadge.textContent = 'Disconnected';
        elements.tgStatusBadge.className = 'status-badge';
      }
      if (elements.btnStopTgBot) elements.btnStopTgBot.classList.add('hidden');
    }
  } catch (e) {
    console.warn('[Integrations] Telegram status error:', e.message);
  }

  // 2. WhatsApp Live Status
  try {
    const waRes = await fetch('/api/integrations/whatsapp/status');
    const waData = await waRes.json();
    if (waData.status === 'connected') {
      if (elements.waStatusBadge) {
        elements.waStatusBadge.textContent = 'Connected (Active)';
        elements.waStatusBadge.className = 'status-badge connected';
      }
      if (elements.btnDisconnectWA) elements.btnDisconnectWA.classList.remove('hidden');
      if (elements.waQrBox) {
        const phone = waData.sessionInfo?.phone ? `+${waData.sessionInfo.phone}` : 'Linked Device';
        elements.waQrBox.innerHTML = `
          <div style="color:var(--accent-emerald);text-align:center;padding:16px;">
            <strong>✓ WhatsApp Multi-Device Active (${escapeHTML(phone)})</strong>
            <p class="text-xs text-muted" style="margin-top:4px;">Connected & listening for chats.</p>
          </div>
        `;
      }
      if (elements.waPairingCodeBox) elements.waPairingCodeBox.style.display = 'none';
    } else if (waData.status === 'pairing') {
      if (elements.waStatusBadge) {
        elements.waStatusBadge.textContent = waData.pairingCode ? 'Pairing Code Active' : 'Pairing (Scan QR)';
        elements.waStatusBadge.className = 'status-badge pending';
      }
      if (waData.pairingCode && elements.waPairingCodeBox && elements.waPairingCodeDisplay) {
        elements.waPairingCodeBox.style.display = 'block';
        elements.waPairingCodeDisplay.textContent = waData.pairingCode;
      }
      if (waData.qrDataUrl && elements.waQrBox) {
        elements.waQrBox.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
            <div style="background:#ffffff;padding:14px;border-radius:12px;display:inline-block;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
              <img src="${waData.qrDataUrl}" alt="WhatsApp Web QR Code" width="220" height="220" style="display:block;border-radius:8px;" />
            </div>
            <div style="color:var(--accent-green);font-size:12px;text-align:center;font-weight:500;">
              Open <strong>WhatsApp → Settings → Linked Devices → Link a Device</strong> and scan this QR code
            </div>
          </div>
        `;
      }
    } else {
      if (elements.waStatusBadge) {
        elements.waStatusBadge.textContent = 'Disconnected';
        elements.waStatusBadge.className = 'status-badge';
      }
      if (elements.btnDisconnectWA) elements.btnDisconnectWA.classList.add('hidden');
    }
  } catch (e) {
    console.warn('[Integrations] WhatsApp status error:', e.message);
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
function showHeaderToast(message, isWarning = false, onClickHandler = null) {
  let toast = document.getElementById('headerAiToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'headerAiToast';
    toast.className = 'header-ai-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `header-ai-toast ${isWarning ? 'warning' : ''} show`;
  if (onClickHandler) {
    toast.style.cursor = 'pointer';
    toast.onclick = () => {
      onClickHandler();
      toast.classList.remove('show');
    };
  } else {
    toast.style.cursor = 'default';
    toast.onclick = null;
  }
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/**
 * Fetch and populate header model dropdown for the given provider
 */
async function updateHeaderModelsDropdown(providerKey, forceSelectModel = null) {
  if (!elements.headerModelSelect) return;

  const currentModel = forceSelectModel || state.settings[`${providerKey}_model`] || '';

  // Check if provider card dropdown already has options (e.g. from Load Models or preloads)
  const cardSelect = document.getElementById(`cfg_${providerKey}_model`);

  // Build config from current form values to ensure API key is supplied even if not yet saved in DB
  const config = {};
  const endpointEl = document.getElementById(`cfg_${providerKey}_endpoint`);
  const apiKeyEl = document.getElementById(`cfg_${providerKey}_api_key`);
  if (endpointEl && endpointEl.value) config[`${providerKey}_endpoint`] = endpointEl.value.trim();
  if (apiKeyEl && apiKeyEl.value) config[`${providerKey}_api_key`] = apiKeyEl.value.trim();

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
      body: JSON.stringify({ provider: providerKey, config })
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
      if (cardSelect) {
        cardSelect.innerHTML = elements.headerModelSelect.innerHTML;
      }
    } else if (cardSelect && cardSelect.options.length > 1) {
      // Use existing card select options as fallback
      elements.headerModelSelect.innerHTML = cardSelect.innerHTML;
    }

    // Always add "+ Define Custom / Latest Model..." option
    const customOpt = document.createElement('option');
    customOpt.value = '__CUSTOM__';
    customOpt.textContent = '➕ Define Custom / Latest Model...';
    elements.headerModelSelect.appendChild(customOpt);

    // Determine selection:
    if (currentModel && currentModel !== '__CUSTOM__') {
      const exists = Array.from(elements.headerModelSelect.options).some(o => o.value === currentModel);
      if (!exists) {
        // Prepend custom active model
        const opt = document.createElement('option');
        opt.value = currentModel;
        opt.textContent = `${currentModel} (Active)`;
        elements.headerModelSelect.insertBefore(opt, elements.headerModelSelect.firstChild);
        if (cardSelect) {
          const cardOpt = opt.cloneNode(true);
          cardSelect.insertBefore(cardOpt, cardSelect.firstChild);
        }
      }
      elements.headerModelSelect.value = currentModel;
      if (cardSelect) cardSelect.value = currentModel;
    } else if (elements.headerModelSelect.options.length > 1) {
      // Pick first real model
      const first = elements.headerModelSelect.options[0].value;
      if (first !== '__CUSTOM__') {
        elements.headerModelSelect.value = first;
        state.settings[`${providerKey}_model`] = first;
        if (cardSelect) cardSelect.value = first;
        await saveSettings({ [`${providerKey}_model`]: first });
      }
    }
  } catch (err) {
    console.warn('[Header] Error fetching models for', providerKey, err);
    elements.headerModelSelect.innerHTML = `
      <option value="${currentModel || 'default'}">${currentModel || 'Default Model'}</option>
      <option value="__CUSTOM__">➕ Define Custom / Latest Model...</option>
    `;
    elements.headerModelSelect.value = currentModel || 'default';
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
  // Helper to open Custom Model Modal
  function openCustomModelModal() {
    if (!elements.customModelModal) return;
    const names = {
      gemini: 'Google Gemini',
      openai: 'OpenAI Compatible',
      ollama: 'Ollama (Local)',
      lmstudio: 'LM Studio (Local)',
      openrouter: 'OpenRouter',
      nvidia: 'NVIDIA NIM API',
      mock: 'Smart Fallback Engine'
    };
    if (elements.modalActiveProviderName) {
      elements.modalActiveProviderName.textContent = names[state.activeProvider] || state.activeProvider.toUpperCase();
    }
    if (elements.customModelInput) {
      elements.customModelInput.value = state.settings[`${state.activeProvider}_model`] || '';
      elements.customModelModal.classList.remove('hidden');
      setTimeout(() => elements.customModelInput.focus(), 50);
    }
  }

  function closeCustomModelModal() {
    if (elements.customModelModal) elements.customModelModal.classList.add('hidden');
  }

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

      if (selectedModel === '__CUSTOM__') {
        // Revert select display to current active model while opening modal
        elements.headerModelSelect.value = state.settings[`${state.activeProvider}_model`] || '';
        openCustomModelModal();
        return;
      }

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

  // Header Quick Define Custom Model Button
  if (elements.headerCustomModelBtn) {
    elements.headerCustomModelBtn.addEventListener('click', openCustomModelModal);
  }

  // Header Quick Live Test Button
  if (elements.headerTestAiBtn) {
    elements.headerTestAiBtn.addEventListener('click', async () => {
      elements.headerTestAiBtn.classList.add('testing');
      showHeaderToast(`Testing live reply from ${state.activeProvider.toUpperCase()}...`);

      try {
        const apiKeyEl = document.getElementById(`cfg_${state.activeProvider}_api_key`);
        const epEl = document.getElementById(`cfg_${state.activeProvider}_endpoint`);
        const config = {
          [`${state.activeProvider}_model`]: state.settings[`${state.activeProvider}_model`]
        };
        if (apiKeyEl && apiKeyEl.value) config[`${state.activeProvider}_api_key`] = apiKeyEl.value.trim();
        if (epEl && epEl.value) config[`${state.activeProvider}_endpoint`] = epEl.value.trim();

        const res = await fetch('/api/provider/test-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: state.activeProvider, config })
        });
        const data = await res.json();

        if (data.success && !data.isFallback) {
          showHeaderToast(`✓ ${data.provider} (${data.model}) LIVE: "${data.reply}" (${data.latency}ms)`);
          if (elements.inspectorLatency) elements.inspectorLatency.textContent = `${data.latency}ms`;
        } else {
          showHeaderToast(`✗ AI Test Failed: ${data.message || data.error}`, true);
        }
      } catch (err) {
        showHeaderToast(`✗ Live test error: ${err.message}`, true);
      } finally {
        elements.headerTestAiBtn.classList.remove('testing');
      }
    });
  }

  // Custom Model Modal Controls
  if (elements.btnCloseCustomModelModal) {
    elements.btnCloseCustomModelModal.addEventListener('click', closeCustomModelModal);
  }
  if (elements.btnCancelCustomModelModal) {
    elements.btnCancelCustomModelModal.addEventListener('click', closeCustomModelModal);
  }
  if (elements.btnApplyCustomModel) {
    elements.btnApplyCustomModel.addEventListener('click', applyCustomModelInput);
  }
  if (elements.customModelInput) {
    elements.customModelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustomModelInput();
      } else if (e.key === 'Escape') {
        closeCustomModelModal();
      }
    });
  }

  async function applyCustomModelInput() {
    const customVal = (elements.customModelInput?.value || '').trim();
    if (!customVal) {
      alert('Please enter a valid model identifier (e.g. gemini-2.5-flash).');
      return;
    }
    closeCustomModelModal();

    const modelKey = `${state.activeProvider}_model`;
    state.settings[modelKey] = customVal;
    await saveSettings({ [modelKey]: customVal });

    // Update header dropdown
    if (elements.headerModelSelect) {
      setModelDropdownValue('headerModelSelect', customVal);
    }
    // Update card dropdown and custom input
    const cardSelect = document.getElementById(`cfg_${state.activeProvider}_model`);
    if (cardSelect) setModelDropdownValue(`cfg_${state.activeProvider}_model`, customVal);
    const customInput = document.getElementById(`cfg_${state.activeProvider}_model_custom`);
    if (customInput) customInput.value = customVal;

    if (elements.inspectorModel) elements.inspectorModel.textContent = customVal;
    showHeaderToast(`Activated Model: ${customVal}`);
  }

  // Auto-sync when user changes any card model dropdown
  document.querySelectorAll('.model-dropdown').forEach(sel => {
    sel.addEventListener('change', async () => {
      const provider = sel.id.replace('cfg_', '').replace('_model', '');
      const val = sel.value;
      if (!val) return;
      state.settings[`${provider}_model`] = val;
      const customInput = document.getElementById(`cfg_${provider}_model_custom`);
      if (customInput) customInput.value = '';

      await saveSettings({ [`${provider}_model`]: val });
      if (provider === state.activeProvider) {
        if (elements.headerModelSelect) setModelDropdownValue('headerModelSelect', val);
        if (elements.inspectorModel) elements.inspectorModel.textContent = val;
        showHeaderToast(`Model: ${val}`);
      }
    });
  });

  // Auto-save when user finishes typing a custom model in the card
  document.querySelectorAll('.model-custom-input').forEach(input => {
    input.addEventListener('change', async () => {
      const val = input.value.trim();
      if (!val) return;
      const provider = input.id.replace('cfg_', '').replace('_model_custom', '');
      state.settings[`${provider}_model`] = val;
      const select = document.getElementById(`cfg_${provider}_model`);
      if (select) setModelDropdownValue(`cfg_${provider}_model`, val);

      await saveSettings({ [`${provider}_model`]: val });
      if (provider === state.activeProvider) {
        if (elements.headerModelSelect) setModelDropdownValue('headerModelSelect', val);
        if (elements.inspectorModel) elements.inspectorModel.textContent = val;
        showHeaderToast(`Model: ${val}`);
      }
    });
  });

  // Auto-persist API keys and Endpoints on blur
  ['gemini', 'openai', 'ollama', 'lmstudio', 'openrouter', 'nvidia'].forEach(p => {
    const keyEl = document.getElementById(`cfg_${p}_api_key`);
    const epEl = document.getElementById(`cfg_${p}_endpoint`);
    if (keyEl) {
      keyEl.addEventListener('blur', async () => {
        const val = keyEl.value.trim();
        if (val && val !== state.settings[`${p}_api_key`]) {
          state.settings[`${p}_api_key`] = val;
          await saveSettings({ [`${p}_api_key`]: val });
          showHeaderToast(`${p.toUpperCase()} API Key Saved`);
        }
      });
    }
    if (epEl) {
      epEl.addEventListener('blur', async () => {
        const val = epEl.value.trim();
        if (val && val !== state.settings[`${p}_endpoint`]) {
          state.settings[`${p}_endpoint`] = val;
          await saveSettings({ [`${p}_endpoint`]: val });
        }
      });
    }
  });

  // Test Ping buttons on provider cards
  document.querySelectorAll('.btn-test-provider').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-target');
      const statusBox = document.getElementById(`status_${target}`);
      if (statusBox) statusBox.textContent = 'Testing connection & live reply...';

      // Gather current input config
      const config = {};
      const endpointEl = document.getElementById(`cfg_${target}_endpoint`);
      const apiKeyEl = document.getElementById(`cfg_${target}_api_key`);
      if (endpointEl) config[`${target}_endpoint`] = endpointEl.value.trim();
      if (apiKeyEl) config[`${target}_api_key`] = apiKeyEl.value.trim();
      config[`${target}_model`] = getEffectiveModelValue(target);

      // Auto-persist key and endpoint if entered
      const toSave = {};
      if (apiKeyEl && apiKeyEl.value.trim()) toSave[`${target}_api_key`] = apiKeyEl.value.trim();
      if (endpointEl && endpointEl.value.trim()) toSave[`${target}_endpoint`] = endpointEl.value.trim();
      if (config[`${target}_model`]) toSave[`${target}_model`] = config[`${target}_model`];
      if (Object.keys(toSave).length > 0) {
        await saveSettings(toSave);
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
        if (data.success) {
          showHeaderToast(data.message);
        }
      } catch (err) {
        if (statusBox) {
          statusBox.textContent = `Test Error: ${err.message}`;
          statusBox.className = 'provider-status-msg error';
        }
      }
    });
  });

  // Select as Active Provider ("Set as Active Provider" button)
  document.querySelectorAll('.btn-select-provider').forEach(btn => {
    btn.addEventListener('click', async () => {
      const selected = btn.getAttribute('data-select');

      // Build full updates for this provider to persist credentials together
      const updates = { active_provider: selected };
      const epEl = document.getElementById(`cfg_${selected}_endpoint`);
      const keyEl = document.getElementById(`cfg_${selected}_api_key`);
      const effectiveModel = getEffectiveModelValue(selected);
      if (epEl && epEl.value.trim()) updates[`${selected}_endpoint`] = epEl.value.trim();
      if (keyEl && keyEl.value.trim()) updates[`${selected}_api_key`] = keyEl.value.trim();
      if (effectiveModel) updates[`${selected}_model`] = effectiveModel;

      await saveSettings(updates);
      state.activeProvider = selected;
      state.settings.active_provider = selected;
      if (effectiveModel) state.settings[`${selected}_model`] = effectiveModel;
      if (keyEl && keyEl.value.trim()) state.settings[`${selected}_api_key`] = keyEl.value.trim();

      updateActiveProviderUI(selected);
      await updateHeaderModelsDropdown(selected, effectiveModel);
      showHeaderToast(`Active Provider: ${selected.toUpperCase()} (${effectiveModel || 'Default'})`);
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

    if (elements.tgBotToken && elements.tgBotToken.value.trim()) {
      updates.telegram_bot_token = elements.tgBotToken.value.trim();
    }
    if (elements.waPhoneInput && elements.waPhoneInput.value.trim()) {
      updates.whatsapp_phone_number = elements.waPhoneInput.value.trim();
    }

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
  if (endpointEl && endpointEl.value.trim()) config[`${providerKey}_endpoint`] = endpointEl.value.trim();
  if (apiKeyEl && apiKeyEl.value.trim()) config[`${providerKey}_api_key`] = apiKeyEl.value.trim();

  // Automatically persist credentials to database so subsequent calls (like header update) have them
  const toPersist = {};
  if (config[`${providerKey}_api_key`]) {
    toPersist[`${providerKey}_api_key`] = config[`${providerKey}_api_key`];
    state.settings[`${providerKey}_api_key`] = config[`${providerKey}_api_key`];
  }
  if (config[`${providerKey}_endpoint`]) {
    toPersist[`${providerKey}_endpoint`] = config[`${providerKey}_endpoint`];
    state.settings[`${providerKey}_endpoint`] = config[`${providerKey}_endpoint`];
  }
  if (Object.keys(toPersist).length > 0) {
    await saveSettings(toPersist);
  }

  // Save current selection
  const previousValue = select.value;

  // UI: Set loading state
  btn.classList.add('loading');
  btn.classList.remove('success', 'error');
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

      // Try to restore previous selection or pick the top model
      const restorable = Array.from(select.options).some(o => o.value === previousValue);
      if (restorable) {
        select.value = previousValue;
      }

      // Clear custom input since we now have real models
      if (customInput) customInput.value = '';

      // Save the selected model
      const chosenModel = select.value;
      state.settings[`${providerKey}_model`] = chosenModel;
      await saveSettings({ [`${providerKey}_model`]: chosenModel });

      // Sync with header model dropdown if this provider is currently active
      if (providerKey === state.activeProvider && elements.headerModelSelect) {
        await updateHeaderModelsDropdown(providerKey, chosenModel);
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

      // Select first contact by default if current selection is invalid or missing
      if (state.contacts.length > 0) {
        const stillExists = state.contacts.some(c => c.id === state.activeContactId);
        if (!state.activeContactId || !stillExists) {
          selectContact(state.contacts[0].id);
        }
      } else {
        state.activeContactId = null;
        if (elements.chatMessagesContainer) {
          elements.chatMessagesContainer.innerHTML = '<div class="empty-state"><p>No contacts available. Add a contact to start testing.</p></div>';
        }
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

  // Update Contact Header Actions (Auto-reply & Mute)
  updateChatHeaderActionsUI(contact);

  // Apply Contact Styling (Font, Theme, Wallpaper, Size, Bubble Style)
  applyContactChatStyles(contact);

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

  // Send Buttons & Keyboard shortcuts
  if (elements.btnSendNormal) {
    elements.btnSendNormal.addEventListener('click', normalSend);
  }
  if (elements.btnSendSimulated) {
    elements.btnSendSimulated.addEventListener('click', simulateSend);
  }
  elements.simulatedInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey) {
        e.preventDefault();
        simulateSend();
      } else {
        e.preventDefault();
        normalSend();
      }
    }
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

// Normal Send: Outgoing response as Owner / AI directly (USES TELEGRAM/WHATSAPP API)
async function normalSend() {
  const text = elements.simulatedInputText.value.trim();
  if (!text || !state.activeContactId) return;

  elements.simulatedInputText.value = '';
  const contact = state.contacts.find(c => c.id === state.activeContactId);

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: state.activeContactId,
        text,
        senderName: 'Owner',
        mode: state.activeMode || (contact ? contact.mode : 'personal')
      })
    });
    const data = await res.json();
    if (!data.success) {
      alert(`Send Error: ${data.message || data.error}`);
    } else {
      // Feedback on real external platform API dispatching
      if (data.telegramDispatch?.attempted) {
        if (data.telegramDispatch.success) {
          showHeaderToast(`✓ Message sent directly to Telegram (@${contact ? contact.name : 'contact'}) via Bot API!`, false);
        } else {
          showHeaderToast(`⚠️ Saved in Studio, but Telegram API delivery failed: ${data.telegramDispatch.error}`, true);
        }
      } else if (data.whatsappDispatch?.attempted) {
        if (data.whatsappDispatch.success) {
          showHeaderToast(`✓ Message sent directly to WhatsApp (${contact ? contact.name : 'contact'})!`, false);
        } else {
          showHeaderToast(`⚠️ Saved in Studio, but WhatsApp delivery failed: ${data.whatsappDispatch.error}`, true);
        }
      }
    }
  } catch (err) {
    console.error('Normal send error', err);
  }
}

// Simulate Send: Incoming message from opponent/contact to trigger AI reply pipeline
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
// Chat Header Actions & Customization Settings (Font, Color, Wallpaper, Clear, Delete)
// ==========================================================================
function updateChatHeaderActionsUI(contact) {
  if (!contact) return;

  // Auto-Reply status (AI Active vs Manual Only)
  const isManualOnly = contact.auto_reply === 0;
  if (elements.btnToggleAutoReply) {
    elements.btnToggleAutoReply.className = `btn-chat-action ${isManualOnly ? 'active-manual' : 'active-ai'}`;
    if (elements.autoReplyStatusLabel) {
      elements.autoReplyStatusLabel.textContent = isManualOnly ? 'Manual Only' : 'AI Active';
    }
    if (elements.iconAutoReply) {
      elements.iconAutoReply.setAttribute('data-lucide', isManualOnly ? 'user-check' : 'bot');
    }
    elements.btnToggleAutoReply.title = isManualOnly 
      ? 'Only Manual Chat Enabled: AI will not auto-respond (Click to enable AI Auto-Reply)'
      : 'AI Auto-Reply Active (Click to switch to Only Manual Chat)';
  }

  // Mute status
  const isMuted = contact.notifications_enabled === 0;
  if (elements.btnToggleMute) {
    elements.btnToggleMute.className = `btn-chat-action ${isMuted ? 'muted' : ''}`;
    if (elements.iconMuteStatus) {
      elements.iconMuteStatus.setAttribute('data-lucide', isMuted ? 'bell-off' : 'bell');
    }
    elements.btnToggleMute.title = isMuted 
      ? 'Notifications Muted (Click to Unmute)' 
      : 'Notifications Active (Click to Mute)';
  }

  if (window.lucide) lucide.createIcons();
}

function applyContactChatStyles(contact) {
  if (!elements.chatMessagesContainer || !contact) return;

  const font = (contact.chat_font || 'Inter').toLowerCase().replace(/\s+/g, '');
  const theme = (contact.chat_theme || 'emerald').toLowerCase();
  const bg = (contact.chat_background || 'doodle').toLowerCase();
  const size = (contact.chat_font_size || 'medium').toLowerCase();
  const bubble = (contact.chat_bubble_style || 'rounded').toLowerCase();

  // Remove previous dynamic customization classes
  const classesToRemove = [];
  elements.chatMessagesContainer.classList.forEach(cls => {
    if (cls.startsWith('chat-font-') || cls.startsWith('chat-theme-') || cls.startsWith('chat-bg-') || cls.startsWith('chat-size-') || cls.startsWith('chat-bubble-')) {
      classesToRemove.push(cls);
    }
  });
  classesToRemove.forEach(cls => elements.chatMessagesContainer.classList.remove(cls));

  // Add active contact customization classes
  elements.chatMessagesContainer.classList.add(
    `chat-font-${font}`,
    `chat-theme-${theme}`,
    `chat-bg-${bg}`,
    `chat-size-${size}`,
    `chat-bubble-${bubble}`
  );
}

function openChatSettingsModal(contact) {
  if (!contact) return;

  if (elements.modalSettingsContactLabel) {
    elements.modalSettingsContactLabel.textContent = `Configuring for ${contact.name} (${contact.handle || contact.platform || 'Simulator'})`;
  }

  // Reset to Appearance tab
  if (elements.tabBtnAppearance && elements.tabBtnControls) {
    elements.tabBtnAppearance.classList.add('active');
    elements.tabBtnControls.classList.remove('active');
    elements.tabAppearance.style.display = 'block';
    elements.tabControls.style.display = 'none';
  }

  // Active Font
  const currentFont = contact.chat_font || 'Inter';
  document.querySelectorAll('#fontSelectorGrid .opt-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-font').toLowerCase() === currentFont.toLowerCase());
  });

  // Active Theme
  const currentTheme = contact.chat_theme || 'emerald';
  document.querySelectorAll('#themeSelectorGrid .theme-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-theme').toLowerCase() === currentTheme.toLowerCase());
  });

  // Active Background
  const currentBg = contact.chat_background || 'doodle';
  document.querySelectorAll('#bgSelectorGrid .bg-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-bg').toLowerCase() === currentBg.toLowerCase());
  });

  // Font Size Dropdown
  if (elements.selectChatFontSize) {
    elements.selectChatFontSize.value = contact.chat_font_size || 'medium';
  }

  // Bubble Style Dropdown
  if (elements.selectChatBubbleStyle) {
    elements.selectChatBubbleStyle.value = contact.chat_bubble_style || 'rounded';
  }

  // Controls switches
  if (elements.checkManualChatOnly) {
    elements.checkManualChatOnly.checked = contact.auto_reply === 0;
  }
  if (elements.checkChatNotifications) {
    elements.checkChatNotifications.checked = contact.notifications_enabled !== 0;
  }

  updateLivePreview();
  elements.modalChatSettings.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function updateLivePreview() {
  if (!elements.previewChatContainer) return;

  const activeFontCard = document.querySelector('#fontSelectorGrid .opt-card.active');
  const activeThemeCard = document.querySelector('#themeSelectorGrid .theme-card.active');
  const activeBgCard = document.querySelector('#bgSelectorGrid .bg-card.active');

  const font = activeFontCard ? activeFontCard.getAttribute('data-font').toLowerCase().replace(/\s+/g, '') : 'inter';
  const theme = activeThemeCard ? activeThemeCard.getAttribute('data-theme').toLowerCase() : 'emerald';
  const bg = activeBgCard ? activeBgCard.getAttribute('data-bg').toLowerCase() : 'doodle';
  const size = elements.selectChatFontSize ? elements.selectChatFontSize.value.toLowerCase() : 'medium';
  const bubble = elements.selectChatBubbleStyle ? elements.selectChatBubbleStyle.value.toLowerCase() : 'rounded';

  // Clear preview classes
  elements.previewChatContainer.className = 'preview-chat-container';
  elements.previewChatContainer.classList.add(
    `chat-font-${font}`,
    `chat-theme-${theme}`,
    `chat-bg-${bg}`,
    `chat-size-${size}`,
    `chat-bubble-${bubble}`
  );
}

function setupChatSettingsHandlers() {
  // 1. Quick Header Toggle: Auto-Reply vs Manual Only
  if (elements.btnToggleAutoReply) {
    elements.btnToggleAutoReply.addEventListener('click', async () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      if (!contact) return;

      const newAutoReply = contact.auto_reply === 0 ? 1 : 0;
      contact.auto_reply = newAutoReply;
      updateChatHeaderActionsUI(contact);

      try {
        await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auto_reply: newAutoReply })
        });
        showHeaderToast(newAutoReply ? '✓ AI Auto-Reply Activated for this contact' : '🔒 Only Manual Chat Enabled: AI will not auto-respond', false);
      } catch (e) {
        console.error('Error toggling auto_reply', e);
      }
    });
  }

  // 2. Quick Header Toggle: Notification Mute/Unmute
  if (elements.btnToggleMute) {
    elements.btnToggleMute.addEventListener('click', async () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      if (!contact) return;

      const newNotif = (contact.notifications_enabled === 0) ? 1 : 0;
      contact.notifications_enabled = newNotif;
      updateChatHeaderActionsUI(contact);

      try {
        await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications_enabled: newNotif })
        });
        showHeaderToast(newNotif ? '🔔 Notifications unmuted for this contact' : '🔕 Contact muted (no popup or sound alerts)', false);
      } catch (e) {
        console.error('Error toggling notification mute', e);
      }
    });
  }

  // 3. Open Chat Settings Modal
  if (elements.btnOpenChatSettings) {
    elements.btnOpenChatSettings.addEventListener('click', () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      if (!contact) return;

      openChatSettingsModal(contact);
    });
  }

  // Modal Close & Cancel
  if (elements.btnCloseChatSettingsModal) {
    elements.btnCloseChatSettingsModal.addEventListener('click', () => {
      elements.modalChatSettings.classList.add('hidden');
    });
  }
  if (elements.btnCancelChatSettings) {
    elements.btnCancelChatSettings.addEventListener('click', () => {
      elements.modalChatSettings.classList.add('hidden');
    });
  }

  // Sub-Tab Switching inside Modal
  if (elements.tabBtnAppearance && elements.tabBtnControls) {
    elements.tabBtnAppearance.addEventListener('click', () => {
      elements.tabBtnAppearance.classList.add('active');
      elements.tabBtnControls.classList.remove('active');
      elements.tabAppearance.style.display = 'block';
      elements.tabControls.style.display = 'none';
    });
    elements.tabBtnControls.addEventListener('click', () => {
      elements.tabBtnControls.classList.add('active');
      elements.tabBtnAppearance.classList.remove('active');
      elements.tabControls.style.display = 'block';
      elements.tabAppearance.style.display = 'none';
    });
  }

  // Font Selection Cards
  document.querySelectorAll('#fontSelectorGrid .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#fontSelectorGrid .opt-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      updateLivePreview();
    });
  });

  // Theme Swatch Cards
  document.querySelectorAll('#themeSelectorGrid .theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#themeSelectorGrid .theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      updateLivePreview();
    });
  });

  // Wallpaper Cards
  document.querySelectorAll('#bgSelectorGrid .bg-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#bgSelectorGrid .bg-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      updateLivePreview();
    });
  });

  // Dropdown changes for Preview
  if (elements.selectChatFontSize) {
    elements.selectChatFontSize.addEventListener('change', updateLivePreview);
  }
  if (elements.selectChatBubbleStyle) {
    elements.selectChatBubbleStyle.addEventListener('change', updateLivePreview);
  }

  // Save Settings Button
  if (elements.btnSaveChatSettings) {
    elements.btnSaveChatSettings.addEventListener('click', async () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      if (!contact) return;

      const activeFontCard = document.querySelector('#fontSelectorGrid .opt-card.active');
      const activeThemeCard = document.querySelector('#themeSelectorGrid .theme-card.active');
      const activeBgCard = document.querySelector('#bgSelectorGrid .bg-card.active');

      const chat_font = activeFontCard ? activeFontCard.getAttribute('data-font') : 'Inter';
      const chat_theme = activeThemeCard ? activeThemeCard.getAttribute('data-theme') : 'emerald';
      const chat_background = activeBgCard ? activeBgCard.getAttribute('data-bg') : 'doodle';
      const chat_font_size = elements.selectChatFontSize ? elements.selectChatFontSize.value : 'medium';
      const chat_bubble_style = elements.selectChatBubbleStyle ? elements.selectChatBubbleStyle.value : 'rounded';
      const auto_reply = elements.checkManualChatOnly.checked ? 0 : 1;
      const notifications_enabled = elements.checkChatNotifications.checked ? 1 : 0;

      // Update state
      contact.chat_font = chat_font;
      contact.chat_theme = chat_theme;
      contact.chat_background = chat_background;
      contact.chat_font_size = chat_font_size;
      contact.chat_bubble_style = chat_bubble_style;
      contact.auto_reply = auto_reply;
      contact.notifications_enabled = notifications_enabled;

      // Apply to UI
      applyContactChatStyles(contact);
      updateChatHeaderActionsUI(contact);

      try {
        await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_font,
            chat_theme,
            chat_background,
            chat_font_size,
            chat_bubble_style,
            auto_reply,
            notifications_enabled
          })
        });
        elements.modalChatSettings.classList.add('hidden');
        showHeaderToast('✓ Chat appearance and controls saved!', false);
      } catch (err) {
        console.error('Error saving chat settings', err);
      }
    });
  }

  // Clear Chat History Button
  if (elements.btnConfirmClearChat) {
    elements.btnConfirmClearChat.addEventListener('click', async () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      const name = contact ? contact.name : 'this contact';

      if (!confirm(`Are you sure you want to clear all messages for ${name}? This action cannot be undone.`)) {
        return;
      }

      try {
        const res = await fetch(`/api/contacts/${state.activeContactId}/messages`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          elements.chatMessagesContainer.innerHTML = '';
          elements.modalChatSettings.classList.add('hidden');
          showHeaderToast(`✓ Message history cleared for ${name}`, false);
        } else {
          alert(`Error: ${data.error || 'Failed to clear chat'}`);
        }
      } catch (e) {
        console.error('Error clearing chat', e);
      }
    });
  }

  // Delete Contact Button
  if (elements.btnConfirmDeleteContact) {
    elements.btnConfirmDeleteContact.addEventListener('click', async () => {
      if (!state.activeContactId) return;
      const contact = state.contacts.find(c => c.id === state.activeContactId);
      const name = contact ? contact.name : 'this contact';

      if (!confirm(`Are you sure you want to permanently delete ${name} and all associated conversation history?`)) {
        return;
      }

      try {
        const res = await fetch(`/api/contacts/${state.activeContactId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          elements.modalChatSettings.classList.add('hidden');
          showHeaderToast(`✓ Contact ${name} deleted`, false);
          state.contacts = state.contacts.filter(c => c.id !== state.activeContactId);
          if (state.contacts.length > 0) {
            selectContact(state.contacts[0].id);
          } else {
            elements.chatMessagesContainer.innerHTML = '';
            renderStudioContactsList();
          }
          loadContacts();
        } else {
          alert(`Error: ${data.error || 'Failed to delete contact'}`);
        }
      } catch (e) {
        console.error('Error deleting contact', e);
      }
    });
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
        if (state.activeContactId === c.id) {
          state.activeContactId = null;
        }
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
// Multi-Account Facility & Channels
// ==========================================================================
async function loadAccounts() {
  if (!elements.accountsListContainer) return;
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (data.success) {
      renderAccounts(data.accounts || []);
    }
  } catch (e) {
    console.warn('[Accounts] Error loading accounts:', e.message);
  }
}

function renderAccounts(accounts) {
  if (!elements.accountsListContainer) return;
  if (accounts.length === 0) {
    elements.accountsListContainer.innerHTML = '<p class="text-muted text-sm" style="grid-column:1/-1;padding:8px 0;">No accounts added yet. Click "+ Add Account / Bot" to connect a channel.</p>';
    return;
  }

  const icons = {
    whatsapp: { icon: 'message-square', cls: 'wa' },
    telegram: { icon: 'send', cls: 'tg' },
    signal: { icon: 'shield-check', cls: 'signal' }
  };

  elements.accountsListContainer.innerHTML = accounts.map(acc => {
    const meta = icons[acc.platform] || { icon: 'radio', cls: 'tg' };
    const isConn = acc.status === 'connected';
    const statusLabel = isConn ? 'Connected' : (acc.status === 'pairing' ? 'Pairing' : 'Inactive');
    const badgeClass = isConn ? 'connected' : (acc.status === 'pairing' ? 'pending' : '');

    return `
      <div class="account-card" data-id="${acc.id}">
        <div class="account-card-header">
          <div class="account-card-info">
            <div class="account-platform-icon ${meta.cls}">
              <i data-lucide="${meta.icon}"></i>
            </div>
            <div class="account-name-block">
              <h4>${escapeHTML(acc.accountName)}</h4>
              <p>${escapeHTML(acc.identifier || acc.platform)}</p>
            </div>
          </div>
          <span class="status-badge ${badgeClass}">${statusLabel}</span>
        </div>

        <div class="account-card-meta">
          <div class="account-badges">
            <span class="badge-mode ${acc.mode}">${acc.mode === 'personal' ? '👤 Personal' : '💼 Professional'}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <label class="account-toggle-label" title="Toggle Auto-Reply on this channel">
              <input type="checkbox" class="chk-account-autoreply" data-id="${acc.id}" ${acc.autoReply ? 'checked' : ''}>
              <span>Auto-Reply</span>
            </label>
            <button class="btn-icon btn-delete-account" data-id="${acc.id}" title="Remove Account" style="color:var(--accent-danger);background:transparent;border:none;cursor:pointer;padding:3px;">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Attach auto-reply toggles
  elements.accountsListContainer.querySelectorAll('.chk-account-autoreply').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      try {
        await fetch(`/api/accounts/${id}/toggle-auto-reply`, { method: 'POST' });
        showHeaderToast(`Auto-Reply updated for account`);
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  });

  // Attach delete buttons
  elements.accountsListContainer.querySelectorAll('.btn-delete-account').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Are you sure you want to remove this account channel?')) {
        try {
          await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
          showHeaderToast('Account removed');
          await loadAccounts();
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      }
    });
  });
}

function setupMultiAccountHandlers() {
  if (elements.btnOpenAddAccountModal && elements.addAccountModal) {
    elements.btnOpenAddAccountModal.addEventListener('click', () => {
      elements.addAccountModal.classList.remove('hidden');
    });

    const closeModal = () => elements.addAccountModal.classList.add('hidden');
    if (elements.btnCloseAddAccountModal) elements.btnCloseAddAccountModal.addEventListener('click', closeModal);
    if (elements.btnCancelAddAccountModal) elements.btnCancelAddAccountModal.addEventListener('click', closeModal);

    // Platform change updates input placeholders
    if (elements.modalAccountPlatform) {
      elements.modalAccountPlatform.addEventListener('change', (e) => {
        const plat = e.target.value;
        if (plat === 'telegram') {
          if (elements.modalAccountIdentifierLabel) elements.modalAccountIdentifierLabel.textContent = 'Bot Username';
          if (elements.modalAccountIdentifier) elements.modalAccountIdentifier.placeholder = 'e.g. @MySupportBot';
          if (elements.modalAccountCredLabel) elements.modalAccountCredLabel.textContent = 'Telegram BotFather Token';
          if (elements.modalAccountCred) elements.modalAccountCred.placeholder = '123456789:ABCdefGh...';
        } else if (plat === 'whatsapp') {
          if (elements.modalAccountIdentifierLabel) elements.modalAccountIdentifierLabel.textContent = 'WhatsApp Phone Number';
          if (elements.modalAccountIdentifier) elements.modalAccountIdentifier.placeholder = 'e.g. +91 98765 43210';
          if (elements.modalAccountCredLabel) elements.modalAccountCredLabel.textContent = 'Session Key / Dir (Optional)';
          if (elements.modalAccountCred) elements.modalAccountCred.placeholder = 'Default session';
        } else if (plat === 'signal') {
          if (elements.modalAccountIdentifierLabel) elements.modalAccountIdentifierLabel.textContent = 'Signal Account Number';
          if (elements.modalAccountIdentifier) elements.modalAccountIdentifier.placeholder = 'e.g. +91 98765 43210';
          if (elements.modalAccountCredLabel) elements.modalAccountCredLabel.textContent = 'Signal Daemon REST Endpoint';
          if (elements.modalAccountCred) elements.modalAccountCred.placeholder = 'http://127.0.0.1:8080';
        }
      });
    }

    // Save Account
    if (elements.btnSaveNewAccount) {
      elements.btnSaveNewAccount.addEventListener('click', async () => {
        const platform = elements.modalAccountPlatform.value;
        const accountName = elements.modalAccountName.value.trim();
        const identifier = elements.modalAccountIdentifier.value.trim();
        const cred = elements.modalAccountCred.value.trim();
        const mode = elements.modalAccountMode.value;
        const autoReply = elements.modalAccountAutoReply.checked;

        if (!accountName) {
          alert('Please enter an account or bot label.');
          return;
        }

        let credentials = {};
        if (platform === 'telegram') credentials = { token: cred };
        else if (platform === 'signal') credentials = { endpoint: cred || 'http://127.0.0.1:8080' };
        else credentials = { session_dir: cred };

        try {
          const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, accountName, identifier, credentials, mode, autoReply })
          });
          const data = await res.json();
          if (data.success) {
            closeModal();
            elements.modalAccountName.value = '';
            elements.modalAccountIdentifier.value = '';
            elements.modalAccountCred.value = '';
            await loadAccounts();
            showHeaderToast(`✓ Connected ${accountName} (${platform.toUpperCase()})`);

            // If it's a telegram bot with token, start polling immediately
            if (platform === 'telegram' && cred) {
              const tgStartRes = await fetch('/api/integrations/telegram/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: cred, accountId: data.account.id, accountName, mode, autoReply })
              });
              const tgStartData = await tgStartRes.json();
              if (!tgStartData.success) {
                showHeaderToast(`⚠️ Account saved, but Telegram bot connection failed: ${tgStartData.message || tgStartData.error}`, true);
              }
              await loadAccounts();
            }
          } else {
            alert(`Error adding account: ${data.message}`);
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      });
    }
  }
}

// ==========================================================================
// Integrations (WhatsApp Web, Telegram Bot, Signal)
// ==========================================================================
function setupIntegrationHandlers() {
  // WhatsApp Sub-Tabs: Pairing Code vs QR Code
  if (elements.tabWaPairingBtn && elements.tabWaQrBtn) {
    elements.tabWaPairingBtn.addEventListener('click', () => {
      elements.tabWaPairingBtn.classList.add('active');
      elements.tabWaQrBtn.classList.remove('active');
      if (elements.waPairingView) elements.waPairingView.style.display = 'block';
      if (elements.waQrView) elements.waQrView.style.display = 'none';
    });

    elements.tabWaQrBtn.addEventListener('click', () => {
      elements.tabWaQrBtn.classList.add('active');
      elements.tabWaPairingBtn.classList.remove('active');
      if (elements.waPairingView) elements.waPairingView.style.display = 'none';
      if (elements.waQrView) elements.waQrView.style.display = 'block';
    });
  }

  // WhatsApp 8-Digit Phone Pairing Code Request
  if (elements.waPhoneInput) {
    elements.waPhoneInput.addEventListener('change', async () => {
      const phone = elements.waPhoneInput.value.trim();
      if (phone) await saveSettings({ whatsapp_phone_number: phone });
    });
  }

  if (elements.btnGetWaPairingCode) {
    elements.btnGetWaPairingCode.addEventListener('click', async () => {
      const phone = elements.waPhoneInput ? elements.waPhoneInput.value.trim() : '';
      if (!phone) {
        alert('Please enter your WhatsApp phone number.');
        return;
      }
      await saveSettings({ whatsapp_phone_number: phone });
      elements.btnGetWaPairingCode.disabled = true;
      elements.btnGetWaPairingCode.innerHTML = 'Requesting...';

      try {
        const res = await fetch('/api/integrations/whatsapp/pairing-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (data.success) {
          if (elements.waPairingCodeBox) elements.waPairingCodeBox.style.display = 'block';
          if (elements.waPairingCodeDisplay) elements.waPairingCodeDisplay.textContent = data.pairingCode;
          if (elements.waStatusBadge) {
            elements.waStatusBadge.textContent = 'Pairing Code Active';
            elements.waStatusBadge.className = 'status-badge pending';
          }
          showHeaderToast(`WhatsApp Code Generated: ${data.pairingCode}`);
          await loadAccounts();
        } else {
          alert(`WA Error: ${data.message}`);
        }
      } catch (e) {
        alert(`WA Error: ${e.message}`);
      } finally {
        elements.btnGetWaPairingCode.disabled = false;
        elements.btnGetWaPairingCode.innerHTML = '<i data-lucide="key"></i> Get Code';
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // WhatsApp QR Generation
  if (elements.btnGenerateWaQR) {
    elements.btnGenerateWaQR.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/integrations/whatsapp/qr', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (elements.waStatusBadge) elements.waStatusBadge.textContent = 'Pairing (Scan QR)';
          const waImg = data.qrDataUrl
            ? `<img src="${data.qrDataUrl}" alt="WhatsApp Web QR Code" width="220" height="220" style="display:block;border-radius:8px;" />`
            : `<div style="padding:16px;color:#000;">${data.qrCode}</div>`;

          const sessionInfo = data.qrCodeDisplay || data.qrCode || '';
          const expiresInfo = data.expiresIn ? `<span class="text-xs text-warning">Expires in: ${data.expiresIn}</span>` : '';

          if (elements.waQrBox) {
            elements.waQrBox.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
                <div style="background:#ffffff;padding:14px;border-radius:12px;display:inline-block;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                  ${waImg}
                </div>
                <div style="font-size:11px;color:var(--text-muted);word-break:break-all;text-align:center;padding:4px 10px;max-width:320px;font-family:monospace;background:rgba(0,0,0,0.25);border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
                  <code>${escapeHTML(sessionInfo.substring(0, 45))}...</code>
                </div>
                ${expiresInfo}
                <div style="color:var(--accent-green);font-size:12px;text-align:center;font-weight:500;">
                  Open <strong>WhatsApp -> Settings -> Linked Devices -> Link a Device</strong> and scan this QR code
                </div>
              </div>
            `;
          }
        }
      } catch (e) {
        alert(`WA Error: ${e.message}`);
      }
    });
  }

  // WhatsApp Simulate Connect
  if (elements.btnConnectMockWA) {
    elements.btnConnectMockWA.addEventListener('click', async () => {
      const phone = elements.waPhoneInput ? elements.waPhoneInput.value.trim() : '+1 (555) 234-5678';
      const res = await fetch('/api/integrations/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        if (elements.waStatusBadge) {
          elements.waStatusBadge.textContent = 'Connected (Active)';
          elements.waStatusBadge.className = 'status-badge connected';
        }
        if (elements.waQrBox) {
          elements.waQrBox.innerHTML = '<div style="color:var(--accent-emerald);text-align:center;padding:16px;"><strong>✓ WhatsApp Web Session Active</strong><p class="text-xs text-muted">Ready to receive & auto-reply to incoming WhatsApp chats.</p></div>';
        }
        if (elements.btnDisconnectWA) elements.btnDisconnectWA.classList.remove('hidden');
        await loadAccounts();
      }
    });
  }

  // WhatsApp Disconnect
  if (elements.btnDisconnectWA) {
    elements.btnDisconnectWA.addEventListener('click', async () => {
      await fetch('/api/integrations/whatsapp/disconnect', { method: 'POST' });
      if (elements.waStatusBadge) {
        elements.waStatusBadge.textContent = 'Disconnected';
        elements.waStatusBadge.className = 'status-badge';
      }
      if (elements.waQrBox) {
        elements.waQrBox.innerHTML = '<div class="qr-placeholder"><i data-lucide="qr-code"></i><p>Click below to generate WhatsApp QR Code</p></div>';
      }
      if (elements.waPairingCodeBox) elements.waPairingCodeBox.style.display = 'none';
      elements.btnDisconnectWA.classList.add('hidden');
      if (window.lucide) lucide.createIcons();
      await loadAccounts();
    });
  }

  // Telegram Start Polling & Verify
  if (elements.tgBotToken) {
    elements.tgBotToken.addEventListener('change', async () => {
      const token = elements.tgBotToken.value.trim();
      if (token) await saveSettings({ telegram_bot_token: token });
    });
  }

  if (elements.btnVerifyTgToken) {
    elements.btnVerifyTgToken.addEventListener('click', async () => {
      const token = elements.tgBotToken.value.trim();
      const mode = elements.tgBotModeSelect ? elements.tgBotModeSelect.value : 'personal';

      if (!token) {
        alert('Please enter your Telegram Bot token.');
        return;
      }
      await saveSettings({ telegram_bot_token: token });

      elements.tgStatusBox.innerHTML = '<span class="text-muted">Connecting with Telegram Bot API and launching real-time polling...</span>';
      elements.btnVerifyTgToken.disabled = true;

      try {
        const res = await fetch('/api/integrations/telegram/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, mode })
        });
        const data = await res.json();
        if (data.success) {
          if (elements.tgStatusBadge) {
            elements.tgStatusBadge.textContent = 'Connected (Live)';
            elements.tgStatusBadge.className = 'status-badge connected';
          }
          elements.tgStatusBox.innerHTML = `
            <div style="color:var(--accent-emerald);">
              <strong>✓ Bot Live: @${data.bot.username}</strong>
              <p class="text-xs text-muted" style="margin-top:4px;">ID: ${data.bot.id} • Real-time sequential long polling active. Open Telegram and send any message to <strong>@${data.bot.username}</strong> to test live auto-replies!</p>
            </div>
          `;
          if (elements.btnStopTgBot) elements.btnStopTgBot.classList.remove('hidden');
          showHeaderToast(`✓ Connected Telegram Bot @${data.bot.username}`);
          await loadAccounts();
        } else {
          elements.tgStatusBox.innerHTML = `<span style="color:var(--accent-danger);">Connection failed: ${data.message || data.error}</span>`;
        }
      } catch (e) {
        elements.tgStatusBox.innerHTML = `<span style="color:var(--accent-danger);">Connection error: ${e.message}</span>`;
      } finally {
        elements.btnVerifyTgToken.disabled = false;
      }
    });
  }

  // Telegram Stop Polling
  if (elements.btnStopTgBot) {
    elements.btnStopTgBot.addEventListener('click', async () => {
      try {
        await fetch('/api/integrations/telegram/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (elements.tgStatusBadge) {
          elements.tgStatusBadge.textContent = 'Disconnected';
          elements.tgStatusBadge.className = 'status-badge';
        }
        elements.tgStatusBox.innerHTML = '<span class="text-muted">Telegram bot polling stopped.</span>';
        elements.btnStopTgBot.classList.add('hidden');
        await loadAccounts();
      } catch (e) {
        alert(`Error stopping Telegram bot: ${e.message}`);
      }
    });
  }
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

  // Test Daemon Reachability
  if (elements.btnCheckSignalDaemon) {
    elements.btnCheckSignalDaemon.addEventListener('click', async () => {
      const endpoint = elements.signalEndpointInput ? elements.signalEndpointInput.value.trim() : 'http://127.0.0.1:8080';
      elements.btnCheckSignalDaemon.disabled = true;
      elements.btnCheckSignalDaemon.textContent = 'Testing...';
      try {
        const res = await fetch(`/api/integrations/signal/daemon-check?endpoint=${encodeURIComponent(endpoint)}`);
        const data = await res.json();
        if (data.online) {
          if (elements.signalDaemonBanner) {
            elements.signalDaemonBanner.className = 'daemon-status-banner online';
            elements.signalDaemonBanner.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong><i data-lucide="check-circle"></i> Signal Daemon: Online (${escapeHTML(data.version || 'REST API')})</strong>
                <button class="btn btn-xs btn-outline" id="btnCheckSignalDaemon" style="padding:2px 8px;">Re-check</button>
              </div>
              <span class="text-xs">Endpoint: <code>${escapeHTML(data.endpoint)}</code> is responsive and ready for device linking!</span>
            `;
          }
          showHeaderToast('✓ Signal Daemon is Online!');
        } else {
          if (elements.signalDaemonBanner) {
            elements.signalDaemonBanner.className = 'daemon-status-banner offline';
            elements.signalDaemonBanner.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong><i data-lucide="alert-circle"></i> Signal Daemon: Offline</strong>
                <button class="btn btn-xs btn-outline" id="btnCheckSignalDaemon" style="padding:2px 8px;">Retry</button>
              </div>
              <span class="text-xs">Daemon not reachable at <code>${escapeHTML(endpoint)}</code>. Run with Docker:</span>
              <div class="cli-command-box">
                <span id="signalDockerCmdText">docker run -d -p 8080:8080 -v $HOME/.local/share/signal-cli:/home/.local/share/signal-cli bbernhard/signal-cli-rest-api</span>
                <button class="btn-copy-cmd" id="btnCopySignalCmd">Copy</button>
              </div>
            `;
          }
          showHeaderToast('Signal Daemon is not reachable', true);
        }
        if (window.lucide) lucide.createIcons();
      } catch (e) {
        console.warn('Error checking signal daemon:', e);
      } finally {
        elements.btnCheckSignalDaemon.disabled = false;
        elements.btnCheckSignalDaemon.textContent = 'Test';
      }
    });
  }

  // Copy Docker Command Button
  if (elements.btnCopySignalCmd) {
    elements.btnCopySignalCmd.addEventListener('click', () => {
      const text = elements.signalDockerCmdText ? elements.signalDockerCmdText.textContent : 'docker run -d -p 8080:8080 -v $HOME/.local/share/signal-cli:/home/.local/share/signal-cli bbernhard/signal-cli-rest-api';
      navigator.clipboard.writeText(text).then(() => {
        elements.btnCopySignalCmd.textContent = 'Copied!';
        setTimeout(() => elements.btnCopySignalCmd.textContent = 'Copy', 2000);
      });
    });
  }

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
          await loadAccounts();
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
          await loadAccounts();
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
        await loadAccounts();
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
