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
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

SQL

# Migrations: add columns that may be missing from older databases
# SQLite doesn't support IF NOT EXISTS on ADD COLUMN, so ignore errors
sqlite3 "$DB_PATH" "ALTER TABLE server ADD COLUMN user_id TEXT REFERENCES user(id) ON DELETE CASCADE;" 2>/dev/null || true
sqlite3 "$DB_PATH" "ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';" 2>/dev/null || true

# Backfill: ensure exactly one admin exists (oldest user becomes admin) and
# claim any orphaned server rows for that admin so legacy installs upgrade
# cleanly without leaking cross-tenant access.
sqlite3 "$DB_PATH" <<'BACKFILL'
UPDATE user
SET role = 'admin'
WHERE id = (SELECT id FROM user ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM user WHERE role = 'admin');

UPDATE server
SET user_id = (SELECT id FROM user WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM user WHERE role = 'admin');
BACKFILL

echo "Database initialized successfully."
