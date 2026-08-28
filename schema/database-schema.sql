-- GhostReply Database Schema DDL
-- Compatible with SQLite, PostgreSQL, and MySQL

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(255),
  avatar VARCHAR(50) DEFAULT '👤',
  platform VARCHAR(50) DEFAULT 'simulator',
  mode VARCHAR(50) DEFAULT 'personal', -- 'personal' or 'professional'
  auto_reply INTEGER DEFAULT 1,
  delay_mode VARCHAR(50) DEFAULT 'natural', -- 'immediate', 'natural', 'delayed'
  delay_seconds INTEGER DEFAULT 3,
  escalation_contact VARCHAR(255),
  relationship_type VARCHAR(50) DEFAULT 'friend', -- 'spouse', 'friend', 'parent', 'sibling', 'colleague', 'client'
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personality_profiles (
  contact_id VARCHAR(255) PRIMARY KEY,
  formality_level FLOAT DEFAULT 0.2,
  avg_message_length INTEGER DEFAULT 8,
  primary_language VARCHAR(50) DEFAULT 'en',
  code_switching VARCHAR(50) DEFAULT 'none',
  typo_patterns TEXT DEFAULT '[]',
  abbreviation_map TEXT DEFAULT '{}',
  excitement_markers TEXT DEFAULT '["omg", "fr", "yooo", "!!"]',
  favorite_emojis TEXT DEFAULT '["😂", "💀", "🔥", "😭"]',
  emoji_frequency FLOAT DEFAULT 0.8,
  humor_type VARCHAR(100) DEFAULT 'sarcastic-banter',
  intimacy_level FLOAT DEFAULT 0.8,
  inside_jokes TEXT DEFAULT '[]',
  shared_topics TEXT DEFAULT '[]',
  few_shot_examples TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_docs (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  content TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id VARCHAR(255) PRIMARY KEY,
  doc_id VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  contact_id VARCHAR(255) NOT NULL,
  direction VARCHAR(50) NOT NULL, -- 'incoming' or 'outgoing'
  sender_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  mode VARCHAR(50) NOT NULL, -- 'personal' or 'professional'
  metadata TEXT DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'delivered',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS escalations (
  id VARCHAR(255) PRIMARY KEY,
  contact_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255),
  incoming_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'high', -- 'low', 'medium', 'high', 'emergency'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  human_reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
