---
name: credential-management
description: >-
  Enforce local-only credential storage in credentials/ folder, strict Git ignore rules
  for tokens, WhatsApp sessions, Telegram bots, API keys, and databases across all projects.
  Use whenever setting up integrations, saving tokens, handling auth sessions, or auditing Git security.
---

# Credential Management Skill

This skill defines the standardized workflow for isolating sensitive credentials on the local system and guaranteeing that no secret ever leaks to GitHub or remote version control.

## 1. Directory Structure Setup
Every project with authentication or messaging integrations must have an isolated local directory:

```text
credentials/
├── .gitignore         # Safety ignore shield (* and !.gitignore)
├── README.md          # Notice explaining local-only status
├── telegram.json      # Telegram bot tokens by account
├── keys.json          # External API keys (LLMs, webhooks)
└── whatsapp/          # WhatsApp Baileys multi-device session files
    └── <accountId>/
        ├── creds.json
        └── current_qr.png
```

## 2. Git Configuration Workflow
1. Check `.gitignore` at repository root. Ensure it includes:
   ```gitignore
   credentials/
   credentials/*
   whatsapp_sessions/
   whatsapp_sessions/*
   *.db
   *.db-wal
   *.db-shm
   .env*
   *.key
   *.pem
   *.crt
   tokens/
   secrets/
   ```
2. Check for tracked sensitive files:
   ```bash
   git ls-files | Select-String -Pattern "credentials|whatsapp_sessions|\.db|\.env"
   ```
3. If any files are tracked, untrack them without deleting local data:
   ```bash
   git rm --cached -r <file1> <file2>
   ```

## 3. Implementation Pattern (Node.js)
Use a centralized `credentialService.js` that points to `path.join(projectRoot, 'credentials')`:
- `getWhatsAppDir()`: returns `credentials/whatsapp`
- `getTelegramToken(accountId)`: reads from `credentials/telegram.json`
- `saveTelegramToken(accountId, token)`: writes formatted JSON to `credentials/telegram.json`
- `saveApiKey(service, key)` / `getApiKey(service)`: manages `credentials/keys.json`

## 4. Verification Checklist
- [ ] `credentials/` exists locally and contains active tokens/sessions.
- [ ] `git status` shows `credentials/` is completely ignored.
- [ ] No `.db`, `.env`, or credential files are staged in Git.
- [ ] Services read credentials from `credentials/` with DB/environment fallbacks.
