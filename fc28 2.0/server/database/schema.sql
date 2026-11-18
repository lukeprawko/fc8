-- CYBERFC 28 — Authoritative Cloudflare D1 Database Schema
-- Production schema for accounts, clubs, inventory, and leaderboards

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_guest INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
  user_id TEXT PRIMARY KEY,
  coins INTEGER DEFAULT 200,
  owned_cards_json TEXT NOT NULL, -- JSON array of card IDs: ["fwd_broja", ...]
  lineup_gk TEXT NOT NULL,
  lineup_def TEXT NOT NULL,
  lineup_mid TEXT NOT NULL,
  lineup_fwd TEXT NOT NULL,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  score_blue INTEGER NOT NULL,
  score_red INTEGER NOT NULL,
  coins_earned INTEGER NOT NULL,
  played_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leaderboards (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  rating INTEGER DEFAULT 1000,
  wins INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_clubs_coins ON clubs(coins);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rating ON leaderboards(rating DESC);
