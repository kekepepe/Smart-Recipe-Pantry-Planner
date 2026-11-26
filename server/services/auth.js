import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './store.js';

export const SESSION_COOKIE_NAME = 'pantry_session';
export const REMEMBER_COOKIE_NAME = 'pantry_remember';

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (short-lived, in-memory per server process)
export const DEFAULT_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_MS = 60 * 1000; // 60 seconds

const SCRYPT_PARAMS = Object.freeze({ algo: 'scrypt', N: 16384, r: 8, p: 1, keylen: 64 });
const DUMMY_SALT = '00000000000000000000000000000000';
const DUMMY_HASH_HEX = '0'.repeat(128);

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function deriveKey(password, salt, params = SCRYPT_PARAMS) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export function hashOpaqueToken(rawToken) {
  return createHash('sha256').update(String(rawToken)).digest('hex');
}

export function generateOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function validateUsername(raw) {
  if (typeof raw !== 'string') throw new ServiceError(422, 'VALIDATION_ERROR', 'Enter a username between 2 and 32 characters.', 'username');
  const username = raw.trim();
  if (username.length < 2 || username.length > 32 || CONTROL_CHARS.test(username)) {
    throw new ServiceError(422, 'VALIDATION_ERROR', 'Enter a username between 2 and 32 characters.', 'username');
  }
  return username;
}

export function validatePassword(raw, field = 'password') {
  if (typeof raw !== 'string' || raw.length < 8 || raw.length > 128) {
    throw new ServiceError(422, 'VALIDATION_ERROR', 'Use a password between 8 and 128 characters.', field);
  }
  return raw;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await deriveKey(password, salt, SCRYPT_PARAMS);
  return {
    salt,
    hash: derived.toString('hex'),
    params: JSON.stringify(SCRYPT_PARAMS),
  };
}

export async function verifyPassword(password, salt, expectedHex, paramsJson) {
  let params = SCRYPT_PARAMS;
  try {
    const parsed = JSON.parse(paramsJson);
    if (parsed?.algo === 'scrypt' && Number.isInteger(parsed.N) && Number.isInteger(parsed.r) && Number.isInteger(parsed.p) && Number.isInteger(parsed.keylen)) {
      params = parsed;
    }
  } catch {
    return false;
  }
  const actual = await deriveKey(password, salt, params);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function parseCookies(headerValue) {
  const cookies = {};
  if (!headerValue || typeof headerValue !== 'string') return cookies;
  for (const part of headerValue.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (!key) continue;
    try { cookies[key] = decodeURIComponent(val); } catch { cookies[key] = val; }
  }
  return cookies;
}

export function serializeCookie(name, value, { maxAgeSeconds } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (typeof maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  return parts.join('; ');
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export class AuthService {
  constructor(db, {
    workspace = 'local',
    now = () => new Date(),
    sessionTtlMs = DEFAULT_SESSION_TTL_MS,
    rememberTtlMs = DEFAULT_REMEMBER_TTL_MS,
    maxFailedAttempts = DEFAULT_MAX_FAILED_ATTEMPTS,
    lockoutMs = DEFAULT_LOCKOUT_MS,
    desktopMode = false,
    desktopRememberStore = null,
    fault = () => {},
  } = {}) {
    this.db = db;
    this.workspace = workspace;
    this.now = now;
    this.sessionTtlMs = sessionTtlMs;
    this.rememberTtlMs = rememberTtlMs;
    this.maxFailedAttempts = maxFailedAttempts;
    this.lockoutMs = lockoutMs;
    this.desktopMode = Boolean(desktopMode);
    this.desktopRememberStore = desktopRememberStore;
    this.fault = fault;
    // Short-lived sessions live strictly in process memory so any app or server
    // restart immediately requires password sign-in unless a valid remember-me
    // credential restores a fresh session.
    this.sessions = new Map();
  }

  nowMs() {
    const value = this.now();
    return value instanceof Date ? value.getTime() : Number(value);
  }

  nowIso() {
    return new Date(this.nowMs()).toISOString();
  }

  getAccount() {
    return this.db.prepare(
      'SELECT workspace_id AS workspaceId, username, password_salt AS passwordSalt, password_hash AS passwordHash, password_params AS passwordParams, created_at AS createdAt, updated_at AS updatedAt FROM local_accounts WHERE workspace_id=?',
    ).get(this.workspace) || null;
  }

  hasExistingWorkspaceData() {
    const ws = this.db.prepare('SELECT initialized, revision FROM workspaces WHERE id=?').get(this.workspace);
    const pantryCount = this.db.prepare('SELECT count(*) AS n FROM pantry_items WHERE workspace_id=?').get(this.workspace).n;
    const selectionCount = this.db.prepare('SELECT count(*) AS n FROM shopping_selections WHERE workspace_id=?').get(this.workspace).n;
    const markCount = this.db.prepare('SELECT count(*) AS n FROM purchased_marks WHERE workspace_id=?').get(this.workspace).n;
    return Boolean(ws?.initialized || pantryCount > 0 || selectionCount > 0 || markCount > 0);
  }

  issueSession(username) {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const nowMs = this.nowMs();
    const expiresAtMs = nowMs + this.sessionTtlMs;
    const session = {
      id: randomUUID(),
      workspaceId: this.workspace,
      username,
      tokenHash,
      createdAtMs: nowMs,
      expiresAtMs,
    };
    this.sessions.set(tokenHash, session);
    return { rawToken, session };
  }

  validateSession(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = hashOpaqueToken(rawToken);
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    if (this.nowMs() >= session.expiresAtMs) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const account = this.getAccount();
    if (!account) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return { ...session, username: account.username };
  }

  revokeSession(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return;
    this.sessions.delete(hashOpaqueToken(rawToken));
  }

  revokeAllSessions() {
    this.sessions.clear();
  }

  issueRememberToken(clientType, fixedExpiresAtIso = null) {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const nowIso = this.nowIso();
    const expiresAtIso = fixedExpiresAtIso || new Date(this.nowMs() + this.rememberTtlMs).toISOString();
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO auth_remember_tokens(id,workspace_id,token_hash,client_type,created_at,expires_at,rotated_at,revoked_at) VALUES (?,?,?,?,?,?,NULL,NULL)',
    ).run(id, this.workspace, tokenHash, clientType, nowIso, expiresAtIso);
    return { id, rawToken, expiresAtIso };
  }

  revokeRememberTokenByRaw(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return;
    const tokenHash = hashOpaqueToken(rawToken);
    this.db.prepare(
      'UPDATE auth_remember_tokens SET revoked_at=COALESCE(revoked_at, ?) WHERE workspace_id=? AND token_hash=?',
    ).run(this.nowIso(), this.workspace, tokenHash);
  }

  revokeAllRememberTokens() {
    this.db.prepare(
      'UPDATE auth_remember_tokens SET revoked_at=COALESCE(revoked_at, ?) WHERE workspace_id=? AND revoked_at IS NULL',
    ).run(this.nowIso(), this.workspace);
  }

  loadDesktopRememberToken() {
    if (!this.desktopMode || !this.desktopRememberStore) return { rawToken: null, corrupted: false };
    try {
      const token = this.desktopRememberStore.load();
      if (token === null || token === undefined) return { rawToken: null, corrupted: false };
      if (typeof token !== 'string' || !token) return { rawToken: null, corrupted: true };
      return { rawToken: token, corrupted: false };
    } catch {
      return { rawToken: null, corrupted: true };
    }
  }

  clearDesktopRememberToken() {
    if (!this.desktopMode || !this.desktopRememberStore) return;
    try { this.desktopRememberStore.clear(); } catch { /* ignore cleanup failure */ }
  }

  saveDesktopRememberToken(rawToken) {
    if (!this.desktopMode || !this.desktopRememberStore) return false;
    try {
      this.desktopRememberStore.save(rawToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempts to restore a short-lived session from a valid remember-me credential,
   * rotating the remember token while preserving its original expires_at timestamp.
   */
  tryRestoreFromRemember(browserRememberCookie) {
    const account = this.getAccount();
    const clientType = this.desktopMode ? 'desktop' : 'browser';
    let rawRemember = null;
    let shouldClearRemember = false;

    if (this.desktopMode) {
      const loaded = this.loadDesktopRememberToken();
      if (loaded.corrupted) {
        this.clearDesktopRememberToken();
        return { restored: false, clearBrowserRemember: Boolean(browserRememberCookie) };
      }
      rawRemember = loaded.rawToken;
    } else {
      rawRemember = browserRememberCookie || null;
    }

    if (!rawRemember || !account) {
      if (rawRemember && !account) {
        this.clearDesktopRememberToken();
        shouldClearRemember = Boolean(browserRememberCookie);
      }
      return { restored: false, clearBrowserRemember: shouldClearRemember };
    }

    const tokenHash = hashOpaqueToken(rawRemember);
    const nowMs = this.nowMs();
    const nowIso = new Date(nowMs).toISOString();

    const rotated = this.db.transaction(() => {
      const row = this.db.prepare(
        'SELECT id, client_type AS clientType, expires_at AS expiresAt, revoked_at AS revokedAt FROM auth_remember_tokens WHERE workspace_id=? AND token_hash=?',
      ).get(this.workspace, tokenHash);
      if (!row || row.revokedAt || row.clientType !== clientType) return null;
      const expiresAtMs = Date.parse(row.expiresAt);
      if (!Number.isFinite(expiresAtMs) || nowMs >= expiresAtMs) {
        this.db.prepare('UPDATE auth_remember_tokens SET revoked_at=? WHERE id=?').run(nowIso, row.id);
        return null;
      }
      // Rotate token atomically while preserving the original expires_at deadline.
      const nextRaw = generateOpaqueToken();
      const nextHash = hashOpaqueToken(nextRaw);
      this.db.prepare('UPDATE auth_remember_tokens SET revoked_at=?, rotated_at=? WHERE id=?').run(nowIso, nowIso, row.id);
      this.db.prepare(
        'INSERT INTO auth_remember_tokens(id,workspace_id,token_hash,client_type,created_at,expires_at,rotated_at,revoked_at) VALUES (?,?,?,?,?,?,NULL,NULL)',
      ).run(randomUUID(), this.workspace, nextHash, clientType, nowIso, row.expiresAt);
      return { nextRaw, expiresAtIso: row.expiresAt, remainingSeconds: Math.max(1, Math.floor((expiresAtMs - nowMs) / 1000)) };
    }).immediate();

    if (!rotated) {
      this.clearDesktopRememberToken();
      return { restored: false, clearBrowserRemember: Boolean(browserRememberCookie) };
    }

    const { rawToken: sessionToken, session } = this.issueSession(account.username);
    if (this.desktopMode) {
      if (!this.saveDesktopRememberToken(rotated.nextRaw)) {
        // OS credential store failed to persist rotated token; revoke it so client re-authenticates next time.
        this.revokeRememberTokenByRaw(rotated.nextRaw);
        this.clearDesktopRememberToken();
      }
    }
    return {
      restored: true,
      session,
      sessionToken,
      browserRememberToken: this.desktopMode ? null : rotated.nextRaw,
      browserRememberMaxAge: this.desktopMode ? null : rotated.remainingSeconds,
      rememberExpiresAt: rotated.expiresAtIso,
      clearBrowserRemember: this.desktopMode && Boolean(browserRememberCookie),
    };
  }

  getStatusAndMaybeRestore({ sessionCookie, rememberCookie }) {
    const account = this.getAccount();
    const hasExistingData = this.hasExistingWorkspaceData();
    if (!account) {
      const clearBrowserSession = Boolean(sessionCookie);
      const clearBrowserRemember = Boolean(rememberCookie);
      if (this.desktopMode) this.clearDesktopRememberToken();
      return {
        status: {
          initialized: false,
          authenticated: false,
          username: null,
          hasExistingData,
          restoredFromRemember: false,
          clientMode: this.desktopMode ? 'desktop' : 'browser',
        },
        setCookies: [
          ...(clearBrowserSession ? [clearCookie(SESSION_COOKIE_NAME)] : []),
          ...(clearBrowserRemember ? [clearCookie(REMEMBER_COOKIE_NAME)] : []),
        ],
      };
    }

    const existing = this.validateSession(sessionCookie);
    if (existing) {
      return {
        status: {
          initialized: true,
          authenticated: true,
          username: existing.username,
          hasExistingData,
          expiresAt: new Date(existing.expiresAtMs).toISOString(),
          restoredFromRemember: false,
          clientMode: this.desktopMode ? 'desktop' : 'browser',
        },
        setCookies: [],
      };
    }

    const restored = this.tryRestoreFromRemember(rememberCookie);
    if (restored.restored) {
      const setCookies = [serializeCookie(SESSION_COOKIE_NAME, restored.sessionToken)];
      if (restored.browserRememberToken) {
        setCookies.push(serializeCookie(REMEMBER_COOKIE_NAME, restored.browserRememberToken, { maxAgeSeconds: restored.browserRememberMaxAge }));
      } else if (restored.clearBrowserRemember) {
        setCookies.push(clearCookie(REMEMBER_COOKIE_NAME));
      }
      return {
        status: {
          initialized: true,
          authenticated: true,
          username: restored.session.username,
          hasExistingData,
          expiresAt: new Date(restored.session.expiresAtMs).toISOString(),
          restoredFromRemember: true,
          clientMode: this.desktopMode ? 'desktop' : 'browser',
        },
        setCookies,
      };
    }

    const setCookies = [];
    if (sessionCookie) setCookies.push(clearCookie(SESSION_COOKIE_NAME));
    if (restored.clearBrowserRemember) setCookies.push(clearCookie(REMEMBER_COOKIE_NAME));
    return {
      status: {
        initialized: true,
        authenticated: false,
        username: null,
        hasExistingData,
        restoredFromRemember: false,
        clientMode: this.desktopMode ? 'desktop' : 'browser',
      },
      setCookies,
    };
  }

  async setup({ username: rawUsername, password: rawPassword, rememberMe = false }) {
    if (typeof rememberMe !== 'boolean') {
      throw new ServiceError(400, 'INVALID_REQUEST', 'rememberMe must be a boolean.', 'rememberMe');
    }
    const username = validateUsername(rawUsername);
    const password = validatePassword(rawPassword, 'password');

    // Compute scrypt asynchronously before entering the SQLite write transaction.
    const derived = await hashPassword(password);
    const nowIso = this.nowIso();
    const clientType = this.desktopMode ? 'desktop' : 'browser';

    let rememberResult = null;
    try {
      this.db.transaction(() => {
        if (this.getAccount()) {
          throw new ServiceError(409, 'ACCOUNT_ALREADY_EXISTS', 'A local account already exists for this database. Sign in instead.');
        }
        this.db.prepare(
          'INSERT INTO local_accounts(workspace_id,username,password_salt,password_hash,password_params,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        ).run(this.workspace, username, derived.salt, derived.hash, derived.params, nowIso, nowIso);
        this.fault('afterAccountInsert');
        if (rememberMe) {
          rememberResult = this.issueRememberToken(clientType);
        }
      }).immediate();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (String(error.code).startsWith('SQLITE_CONSTRAINT')) {
        throw new ServiceError(409, 'ACCOUNT_ALREADY_EXISTS', 'A local account already exists for this database. Sign in instead.');
      }
      throw error;
    }

    const { rawToken: sessionToken, session } = this.issueSession(username);
    const setCookies = [serializeCookie(SESSION_COOKIE_NAME, sessionToken)];
    if (rememberMe && rememberResult) {
      if (this.desktopMode) {
        if (!this.saveDesktopRememberToken(rememberResult.rawToken)) {
          this.revokeRememberTokenByRaw(rememberResult.rawToken);
          this.clearDesktopRememberToken();
        }
      } else {
        setCookies.push(serializeCookie(REMEMBER_COOKIE_NAME, rememberResult.rawToken, { maxAgeSeconds: Math.floor(this.rememberTtlMs / 1000) }));
      }
    } else {
      this.clearDesktopRememberToken();
      setCookies.push(clearCookie(REMEMBER_COOKIE_NAME));
    }

    return {
      status: {
        initialized: true,
        authenticated: true,
        username,
        hasExistingData: this.hasExistingWorkspaceData(),
        expiresAt: new Date(session.expiresAtMs).toISOString(),
        restoredFromRemember: false,
        clientMode: clientType,
      },
      setCookies,
    };
  }

  getRateLimitRow() {
    return this.db.prepare('SELECT failed_attempts AS failedAttempts, first_failed_at AS firstFailedAt, locked_until AS lockedUntil FROM auth_rate_limits WHERE key=?').get(this.workspace) || null;
  }

  checkRateLimit() {
    const row = this.getRateLimitRow();
    if (!row?.lockedUntil) return;
    const lockedUntilMs = Date.parse(row.lockedUntil);
    const nowMs = this.nowMs();
    if (Number.isFinite(lockedUntilMs) && nowMs < lockedUntilMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 1000));
      const err = new ServiceError(429, 'AUTH_RATE_LIMITED', `Too many failed sign-in attempts. Try again in ${retryAfterSeconds} seconds.`);
      err.retryAfterSeconds = retryAfterSeconds;
      throw err;
    }
  }

  recordLoginFailure() {
    const nowMs = this.nowMs();
    const nowIso = new Date(nowMs).toISOString();
    this.db.transaction(() => {
      const row = this.getRateLimitRow();
      const expiredLock = row?.lockedUntil && nowMs >= Date.parse(row.lockedUntil);
      const nextCount = expiredLock ? 1 : (row?.failedAttempts ?? 0) + 1;
      const firstFailedAt = expiredLock || !row?.firstFailedAt ? nowIso : row.firstFailedAt;
      const lockedUntil = nextCount >= this.maxFailedAttempts
        ? new Date(nowMs + this.lockoutMs).toISOString()
        : null;
      this.db.prepare(
        'INSERT INTO auth_rate_limits(key,failed_attempts,first_failed_at,locked_until) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET failed_attempts=excluded.failed_attempts,first_failed_at=excluded.first_failed_at,locked_until=excluded.locked_until',
      ).run(this.workspace, nextCount, firstFailedAt, lockedUntil);
    }).immediate();
  }

  clearLoginFailuresIfPresent() {
    const row = this.getRateLimitRow();
    if (!row || (row.failedAttempts === 0 && !row.lockedUntil)) return;
    this.db.prepare('DELETE FROM auth_rate_limits WHERE key=?').run(this.workspace);
  }

  async login({ username: rawUsername, password: rawPassword, rememberMe = false }, { previousRememberCookie } = {}) {
    if (typeof rememberMe !== 'boolean') {
      throw new ServiceError(400, 'INVALID_REQUEST', 'rememberMe must be a boolean.', 'rememberMe');
    }
    const account = this.getAccount();
    if (!account) {
      throw new ServiceError(409, 'ACCOUNT_NOT_INITIALIZED', 'Set up a local account before signing in.');
    }

    this.checkRateLimit();

    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';
    if (!username || !password) {
      throw new ServiceError(422, 'VALIDATION_ERROR', 'Enter both username and password.');
    }

    const usernameMatches = username === account.username;
    let passwordMatches = false;
    if (usernameMatches) {
      passwordMatches = await verifyPassword(password, account.passwordSalt, account.passwordHash, account.passwordParams);
    } else {
      // Constant-work verification so unknown usernames do not return noticeably faster.
      await verifyPassword(password, DUMMY_SALT, DUMMY_HASH_HEX, JSON.stringify(SCRYPT_PARAMS));
    }

    if (!usernameMatches || !passwordMatches) {
      this.recordLoginFailure();
      const updated = this.getRateLimitRow();
      if (updated?.lockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((Date.parse(updated.lockedUntil) - this.nowMs()) / 1000));
        const err = new ServiceError(429, 'AUTH_RATE_LIMITED', `Too many failed sign-in attempts. Try again in ${retryAfterSeconds} seconds.`);
        err.retryAfterSeconds = retryAfterSeconds;
        throw err;
      }
      throw new ServiceError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    // Clear prior rate-limit failures only when present (keeps read-only DB short-lived login possible).
    this.clearLoginFailuresIfPresent();

    const clientType = this.desktopMode ? 'desktop' : 'browser';
    const { rawToken: sessionToken, session } = this.issueSession(account.username);
    const setCookies = [serializeCookie(SESSION_COOKIE_NAME, sessionToken)];

    if (rememberMe) {
      // Revoke any previous remember credential held by this client before issuing a fresh 30-day one.
      if (this.desktopMode) {
        const prev = this.loadDesktopRememberToken();
        if (prev.rawToken) this.revokeRememberTokenByRaw(prev.rawToken);
      } else if (previousRememberCookie) {
        this.revokeRememberTokenByRaw(previousRememberCookie);
      }
      const rememberResult = this.issueRememberToken(clientType);
      if (this.desktopMode) {
        if (!this.saveDesktopRememberToken(rememberResult.rawToken)) {
          this.revokeRememberTokenByRaw(rememberResult.rawToken);
          this.clearDesktopRememberToken();
        }
      } else {
        setCookies.push(serializeCookie(REMEMBER_COOKIE_NAME, rememberResult.rawToken, { maxAgeSeconds: Math.floor(this.rememberTtlMs / 1000) }));
      }
    } else {
      if (this.desktopMode) {
        const prev = this.loadDesktopRememberToken();
        if (prev.rawToken) this.revokeRememberTokenByRaw(prev.rawToken);
        this.clearDesktopRememberToken();
      } else if (previousRememberCookie) {
        this.revokeRememberTokenByRaw(previousRememberCookie);
      }
      setCookies.push(clearCookie(REMEMBER_COOKIE_NAME));
    }

    return {
      status: {
        initialized: true,
        authenticated: true,
        username: account.username,
        hasExistingData: this.hasExistingWorkspaceData(),
        expiresAt: new Date(session.expiresAtMs).toISOString(),
        restoredFromRemember: false,
        clientMode: clientType,
      },
      setCookies,
    };
  }

  logout({ sessionCookie, rememberCookie }) {
    this.revokeSession(sessionCookie);
    if (this.desktopMode) {
      const prev = this.loadDesktopRememberToken();
      if (prev.rawToken) this.revokeRememberTokenByRaw(prev.rawToken);
      this.clearDesktopRememberToken();
    }
    if (rememberCookie) {
      this.revokeRememberTokenByRaw(rememberCookie);
    }
    return {
      ok: true,
      setCookies: [clearCookie(SESSION_COOKIE_NAME), clearCookie(REMEMBER_COOKIE_NAME)],
    };
  }

  async changePassword({ currentPassword, newPassword }) {
    const account = this.getAccount();
    if (!account) {
      throw new ServiceError(409, 'ACCOUNT_NOT_INITIALIZED', 'Set up a local account first.');
    }
    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw new ServiceError(422, 'VALIDATION_ERROR', 'Enter your current password.', 'currentPassword');
    }
    const validatedNew = validatePassword(newPassword, 'newPassword');
    const validCurrent = await verifyPassword(currentPassword, account.passwordSalt, account.passwordHash, account.passwordParams);
    if (!validCurrent) {
      throw new ServiceError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.', 'currentPassword');
    }

    const derived = await hashPassword(validatedNew);
    const nowIso = this.nowIso();

    this.db.transaction(() => {
      this.db.prepare(
        'UPDATE local_accounts SET password_salt=?, password_hash=?, password_params=?, updated_at=? WHERE workspace_id=?',
      ).run(derived.salt, derived.hash, derived.params, nowIso, this.workspace);
      this.revokeAllRememberTokens();
    }).immediate();

    // Invalidate every prior short-lived session and desktop remember credential.
    this.revokeAllSessions();
    this.clearDesktopRememberToken();

    // Issue a brand-new short-lived session only for this caller so the active screen stays responsive.
    const { rawToken: freshSessionToken, session } = this.issueSession(account.username);
    return {
      ok: true,
      username: account.username,
      expiresAt: new Date(session.expiresAtMs).toISOString(),
      setCookies: [
        serializeCookie(SESSION_COOKIE_NAME, freshSessionToken),
        clearCookie(REMEMBER_COOKIE_NAME),
      ],
    };
  }
}
