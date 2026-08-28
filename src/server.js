const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
require('dotenv').config();

const { initDatabase } = require('./db/database');
const apiRoutes = require('./routes/api');
const decisionEngine = require('./services/decisionEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// WebSocket connection handling
wss.on('connection', (ws) => {
  decisionEngine.registerWebSocket(ws);
  ws.send(JSON.stringify({ event: 'connected', message: 'GhostReply Realtime Stream Ready', timestamp: new Date().toISOString() }));
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize database and start listening
initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     GHOSTREPLY AUTO-RESPONDER                  ║
║                  Dual-Mode Context-Aware Assistant             ║
╚════════════════════════════════════════════════════════════════╝
• HTTP Server:      http://localhost:${PORT}
• WebSocket Stream: ws://localhost:${PORT}
• Supported LLMs:   Ollama | LM Studio | OpenAI | Gemini | OpenRouter | NVIDIA NIM
• Mode 1:           Professional (RAG & Knowledge Base)
• Mode 2:           Personal (Persona & Linguistic Mirroring)
      `);
    });
  })
  .catch(err => {
    console.error('Fatal Database Initialization Error:', err);
    process.exit(1);
  });

module.exports = { app, server };
