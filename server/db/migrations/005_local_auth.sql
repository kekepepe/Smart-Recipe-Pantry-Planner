-- 005: local offline single-account authentication, revocable 30-day remember-me
-- credentials, and login rate limiting (Issue #55).
-- Additive migration: existing local workspace data (pantry_items,
-- shopping_selections, shopping_lists, purchased_marks) is preserved untouched.

CREATE TABLE local_accounts(
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  username TEXT NOT NULL UNIQUE CHECK(length(trim(username)) >= 2 AND length(username) <= 64),
  password_salt TEXT NOT NULL CHECK(length(password_salt) >= 16),
  password_hash TEXT NOT NULL CHECK(length(password_hash) >= 32),
  password_params TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE auth_remember_tokens(
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES local_accounts(workspace_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  client_type TEXT NOT NULL CHECK(client_type IN ('browser', 'desktop')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  rotated_at TEXT,
  revoked_at TEXT
);
CREATE INDEX auth_remember_workspace_idx ON auth_remember_tokens(workspace_id, revoked_at, expires_at);

CREATE TABLE auth_rate_limits(
  key TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK(failed_attempts >= 0),
  first_failed_at TEXT,
  locked_until TEXT
);
