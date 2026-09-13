# Rule: Local Credential Isolation and Git Zero-Secrets Policy

## Core Directives for Every Project
This rule applies to all projects, repositories, and workspaces on this system.

### 1. Dedicated Local 'credentials/' Directory
- All sensitive authentication details, tokens, session keys, and database files MUST strictly reside in a dedicated local directory named `credentials/` located at the project root.
- Never store plaintext secrets, bot tokens, or auth sessions in the general source tree or public assets.
- Standard sub-paths:
  - `credentials/telegram.json`: Telegram bot tokens and account configurations.
  - `credentials/whatsapp/`: WhatsApp Baileys or Puppeteer multi-device session credentials, auth keys, and QR codes.
  - `credentials/keys.json`: External API keys (e.g. Gemini, OpenAI, Claude, Signal endpoints).
  - `credentials/.gitignore`: Defense-in-depth ignore shield (`*` and `!.gitignore`).

### 2. Mandatory .gitignore Configuration
Every project repository MUST maintain a strict `.gitignore` file containing at minimum:
```gitignore
# Local Credentials & Secrets (Strictly Local Only)
credentials/
credentials/*
whatsapp_sessions/
whatsapp_sessions/*
tokens/
secrets/

# Databases & SQLite State
*.db
*.db-wal
*.db-shm
*.sqlite
*.sqlite3

# Environment & Private Keys
.env
.env.*
*.env
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
```

### 3. Git Index Cleansing (Zero Secrets in VCS)
- Whenever a project is inspected or created, verify whether credentials or databases were previously indexed:
  `git ls-files | Select-String -Pattern "credentials|whatsapp_sessions|\.db$|\.db-wal$|\.db-shm$|\.env"`
- If any sensitive files are tracked, immediately remove them from the Git index without deleting local files:
  `git rm --cached -r <sensitive-files>`

### 4. Application Logic Integration
- Any code that reads or saves credentials (e.g., WhatsApp sessions, Telegram tokens, LLM API keys) must use a centralized credential service or helper that targets `credentials/`.
- Fall back gracefully to `credentials/` files before checking environment variables or local SQLite databases.
- Always create the `credentials/` directory automatically if it does not yet exist.
