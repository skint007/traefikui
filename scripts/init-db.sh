#!/bin/sh
set -e

# Skip database initialization in agent mode
if [ "$TRAEFIKUI_MODE" = "agent" ]; then
  echo "Agent mode: skipping database initialization."
  exit 0
fi

DB_PATH="${DATABASE_URL:-file:./data/auth.db}"
DB_PATH="${DB_PATH#file:}"

# Ensure directory exists
mkdir -p "$(dirname "$DB_PATH")"

sqlite3 "$DB_PATH" <<'SQL'
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  two_factor_enabled INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);

CREATE TABLE IF NOT EXISTS two_factor (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS twoFactor_userId_idx ON two_factor(user_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registration_enabled', 'true');

CREATE TABLE IF NOT EXISTS server (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

SQL

# Migrations: bring older databases up to date. SQLite doesn't support
# IF NOT EXISTS on ADD/DROP COLUMN, so ignore errors when the change has
# already been applied.
sqlite3 "$DB_PATH" "ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';" 2>/dev/null || true

# Servers are now shared globally; drop the per-user ownership column on
# upgrade. Requires SQLite >= 3.35 (March 2021), which Alpine ships.
sqlite3 "$DB_PATH" "ALTER TABLE server DROP COLUMN user_id;" 2>/dev/null || true

# Ensure exactly one admin exists (oldest user becomes admin) so the upgraded
# install has someone with permission to manage the shared server list.
sqlite3 "$DB_PATH" <<'BACKFILL'
UPDATE user
SET role = 'admin'
WHERE id = (SELECT id FROM user ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM user WHERE role = 'admin');
BACKFILL

echo "Database initialized successfully."
