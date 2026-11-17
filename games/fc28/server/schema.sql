-- ========================================================
-- CYBERFC 28 - SCHEMAT BAZY DANYCH CLOUDFLARE D1
-- Wersja: 1.0.0 (Production Hardened)
-- ========================================================

-- Tabela użytkowników z solonym hashem hasła i statystykami
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 200 CHECK(coins >= 0),
  packs_opened INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tabela aktywnych sesji logowania (HttpOnly cookies)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Tabela posiadanych kart piłkarzy (ekwipunek gracza)
CREATE TABLE IF NOT EXISTS user_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK(count > 0),
  is_tradeable INTEGER NOT NULL DEFAULT 1,
  obtained_at INTEGER NOT NULL,
  UNIQUE(user_id, card_id)
);

-- Tabela aktualnego wyjściowego składu (4v4)
CREATE TABLE IF NOT EXISTS user_lineup (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gk_card_id TEXT NOT NULL,
  def_card_id TEXT NOT NULL,
  mid_card_id TEXT NOT NULL,
  fwd_card_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Dziennik audytu bezpieczeństwa (bez haseł i danych poufnych)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  ip_hash TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_card ON user_cards(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type, created_at);
