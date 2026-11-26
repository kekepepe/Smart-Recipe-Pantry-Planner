import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { REMEMBER_COOKIE_NAME, SESSION_COOKIE_NAME } from '../../server/services/auth.js';
import { fixture, listen } from '../helpers.js';

function createMemoryDesktopStore() {
  let stored = null;
  let corrupted = false;
  return {
    get raw() { return stored; },
    corrupt() { corrupted = true; },
    save(token) { corrupted = false; stored = `enc:${token}`; },
    load() {
      if (corrupted) throw new Error('DECRYPT_FAILED');
      return stored ? stored.slice(4) : null;
    },
    clear() { corrupted = false; stored = null; },
  };
}

test('Issue #55 API: unauthenticated requests to all business endpoints return 401; health and auth status stay open', async t => {
  const f = fixture();
  const store = new Store(f.db);
  store.onboard({ mode: 'sample', expectedRevision: 0 });
  const api = await listen(createApp(f.db), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  assert.equal((await api.request('/health')).status, 200);
  const status = await api.request('/auth/status');
  assert.equal(status.status, 200);
  assert.equal(status.data.initialized, false);
  assert.equal(status.data.authenticated, false);
  assert.equal(status.data.hasExistingData, true);
  assert.equal(status.data.pantry, undefined);

  const protectedCalls = [
    ['/snapshot', 'GET'],
    ['/recipes', 'GET'],
    ['/recommendations/staples', 'GET'],
    ['/inspiration', 'GET'],
    ['/nutrition', 'GET'],
    ['/nutrition/tomato-eggs', 'GET'],
    ['/onboarding', 'POST', { mode: 'empty', expectedRevision: 0 }],
    ['/pantry/egg', 'PUT', { quantity: 2, unit: 'piece', expectedRevision: 1 }],
    ['/pantry/egg', 'DELETE', { expectedRevision: 1 }],
    ['/shopping-selection', 'PUT', { recipeId: 'tomato-eggs', expectedRevision: 1 }],
    ['/shopping-selection/tomato-eggs', 'DELETE', { expectedRevision: 1 }],
    ['/shopping-selection', 'DELETE', { expectedRevision: 1 }],
    ['/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: 1 }],
    ['/purchased-marks/egg', 'DELETE', { unit: 'piece', expectedRevision: 1 }],
    ['/auth/password', 'PUT', { currentPassword: 'password123', newPassword: 'newpassword123' }],
  ];
  for (const [path, method, body] of protectedCalls) {
    const res = await api.rawRequest(path, method, body);
    assert.equal(res.status, 401, `${method} ${path} should require auth`);
    assert.equal(res.data.error.code, 'AUTH_REQUIRED');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
});

test('Issue #55 API: one-time setup stores salted scrypt hash, enforces HttpOnly SameSite=Strict cookies, and rejects concurrent/duplicate setup', async t => {
  const f = fixture();
  const api = await listen(createApp(f.db), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  const results = await Promise.all([
    api.rawRequest('/auth/setup', 'POST', { username: 'chef1', password: 'strong-password-1', rememberMe: false }),
    api.rawRequest('/auth/setup', 'POST', { username: 'chef2', password: 'strong-password-2', rememberMe: false }),
  ]);
  const statuses = results.map(r => r.status).sort();
  assert.deepEqual(statuses, [201, 409]);

  const winner = results.find(r => r.status === 201);
  const loser = results.find(r => r.status === 409);
  assert.equal(loser.data.error.code, 'ACCOUNT_ALREADY_EXISTS');
  const sessionSetCookie = winner.setCookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  assert(sessionSetCookie, 'expected session Set-Cookie');
  assert(sessionSetCookie.includes('HttpOnly'));
  assert(sessionSetCookie.includes('SameSite=Strict'));
  assert(!sessionSetCookie.includes('Max-Age='), 'short-lived session cookie must not be persistent');

  // Verify database holds only one account with salted scrypt hash and never plaintext password.
  const accounts = f.db.prepare('SELECT * FROM local_accounts').all();
  assert.equal(accounts.length, 1);
  assert.notEqual(accounts[0].password_hash, 'strong-password-1');
  assert.notEqual(accounts[0].password_hash, 'strong-password-2');
  assert.equal(JSON.parse(accounts[0].password_params).algo, 'scrypt');
  assert(accounts[0].password_salt.length >= 32);

  // Setup failure rolls back atomically so retry succeeds cleanly.
  const f2 = fixture();
  const brokenApi = await listen(createApp(f2.db, {
    fault(stage) { if (stage === 'afterAccountInsert') throw new Error('INJECTED_SETUP_FAULT'); },
  }), { authenticate: false });
  t.after(async () => { await brokenApi.close(); f2.close(); });
  const failed = await brokenApi.request('/auth/setup', 'POST', { username: 'retrychef', password: 'password123', rememberMe: true });
  assert.equal(failed.status, 500);
  assert.equal(f2.db.prepare('SELECT count(*) n FROM local_accounts').get().n, 0);
  assert.equal(f2.db.prepare('SELECT count(*) n FROM auth_remember_tokens').get().n, 0);
});

test('Issue #55 API: wrong credentials return unified 401, rate-limit after 5 failures, and recover after lockout window', async t => {
  const f = fixture();
  let now = new Date('2026-11-26T10:00:00.000Z');
  const api = await listen(createApp(f.db, {
    now: () => now,
    maxFailedAttempts: 5,
    lockoutMs: 60_000,
  }), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  assert.equal((await api.request('/auth/setup', 'POST', { username: 'alice', password: 'correct-password', rememberMe: false })).status, 201);
  assert.equal((await api.request('/auth/logout', 'POST', {})).status, 200);

  const wrongUser = await api.request('/auth/login', 'POST', { username: 'nobody', password: 'correct-password', rememberMe: false });
  const wrongPass = await api.request('/auth/login', 'POST', { username: 'alice', password: 'wrong-password', rememberMe: false });
  assert.equal(wrongUser.status, 401);
  assert.equal(wrongPass.status, 401);
  assert.equal(wrongUser.data.error.code, 'INVALID_CREDENTIALS');
  assert.equal(wrongPass.data.error.code, 'INVALID_CREDENTIALS');
  assert.equal(wrongUser.data.error.message, wrongPass.data.error.message);

  // Failures 3 and 4 remain 401; failure 5 locks out with 429 + Retry-After.
  assert.equal((await api.request('/auth/login', 'POST', { username: 'alice', password: 'wrong-3', rememberMe: false })).status, 401);
  assert.equal((await api.request('/auth/login', 'POST', { username: 'alice', password: 'wrong-4', rememberMe: false })).status, 401);
  const locked = await api.request('/auth/login', 'POST', { username: 'alice', password: 'wrong-5', rememberMe: false });
  assert.equal(locked.status, 429);
  assert.equal(locked.data.error.code, 'AUTH_RATE_LIMITED');
  assert.equal(locked.headers.get('retry-after'), '60');

  // Even the right password is blocked while lockout is active.
  const blockedCorrect = await api.request('/auth/login', 'POST', { username: 'alice', password: 'correct-password', rememberMe: false });
  assert.equal(blockedCorrect.status, 429);

  // Advance clock past 60s lockout -> login succeeds and resets failures.
  now = new Date('2026-11-26T10:01:01.000Z');
  const recovered = await api.request('/auth/login', 'POST', { username: 'alice', password: 'correct-password', rememberMe: false });
  assert.equal(recovered.status, 200);
  assert.equal(recovered.data.authenticated, true);
  assert.equal(f.db.prepare('SELECT count(*) n FROM auth_rate_limits').get().n, 0);
});

test('Issue #55 API: short-lived session expires on TTL/restart; 30-day remember-me rotates on restore and preserves original expires_at', async t => {
  const f = fixture();
  let now = new Date('2026-11-26T10:00:00.000Z');
  const opts = () => ({ now: () => now, sessionTtlMs: 60_000, rememberTtlMs: 30 * 24 * 60 * 60 * 1000 });

  let api = await listen(createApp(f.db, opts()), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  // Setup with rememberMe: true
  const setup = await api.request('/auth/setup', 'POST', { username: 'homecook', password: 'password123', rememberMe: true });
  assert.equal(setup.status, 201);
  const rememberCookie1 = api.cookies.get(REMEMBER_COOKIE_NAME);
  assert(rememberCookie1, 'remember cookie must be set');
  const firstTokenRow = f.db.prepare('SELECT * FROM auth_remember_tokens').get();
  assert.equal(firstTokenRow.client_type, 'browser');
  assert.notEqual(firstTokenRow.token_hash, rememberCookie1);
  const originalExpiresAt = firstTokenRow.expires_at;

  // Simulate server restart 5 days later with ONLY the remember cookie (browser restarted so session cookie gone).
  await api.close();
  now = new Date('2026-12-01T10:00:00.000Z');
  api = await listen(createApp(f.db, opts()), { authenticate: false });

  // Direct snapshot without session still returns 401.
  assert.equal((await api.rawRequest('/snapshot', 'GET', undefined, { Cookie: `${REMEMBER_COOKIE_NAME}=${rememberCookie1}` })).status, 401);

  // Calling /auth/status with remember cookie restores session AND rotates remember token preserving original expires_at.
  api.cookies.set(REMEMBER_COOKIE_NAME, rememberCookie1);
  const restored = await api.request('/auth/status');
  assert.equal(restored.status, 200);
  assert.equal(restored.data.authenticated, true);
  assert.equal(restored.data.restoredFromRemember, true);
  assert.equal((await api.request('/snapshot')).status, 200);

  const rememberCookie2 = api.cookies.get(REMEMBER_COOKIE_NAME);
  assert(rememberCookie2 && rememberCookie2 !== rememberCookie1, 'remember token must rotate on auto-restore');
  const activeRows = f.db.prepare('SELECT * FROM auth_remember_tokens WHERE revoked_at IS NULL').all();
  assert.equal(activeRows.length, 1);
  assert.equal(activeRows[0].expires_at, originalExpiresAt, 'rotation must preserve original 30-day expiry');

  // Replaying the rotated-out rememberCookie1 fails and clears cookie.
  const replay = await api.rawRequest('/auth/status', 'GET', undefined, { Cookie: `${REMEMBER_COOKIE_NAME}=${rememberCookie1}` });
  assert.equal(replay.data.authenticated, false);

  // Past 30 days from original login, rememberCookie2 expires and is rejected.
  await api.close();
  now = new Date('2026-12-27T10:00:01.000Z');
  api = await listen(createApp(f.db, opts()), { authenticate: false });
  api.cookies.set(REMEMBER_COOKIE_NAME, rememberCookie2);
  const expired = await api.request('/auth/status');
  assert.equal(expired.data.authenticated, false);
  assert.equal(api.cookies.has(REMEMBER_COOKIE_NAME), false);
});

test('Issue #55 API: logout revokes remember-me; password change requires old password and invalidates all prior sessions and remember tokens', async t => {
  const f = fixture();
  const api = await listen(createApp(f.db), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  assert.equal((await api.request('/auth/setup', 'POST', { username: 'peng', password: 'old-password-1', rememberMe: true })).status, 201);
  const oldSessionCookie = `${SESSION_COOKIE_NAME}=${api.cookies.get(SESSION_COOKIE_NAME)}`;
  const oldRememberCookie = `${REMEMBER_COOKIE_NAME}=${api.cookies.get(REMEMBER_COOKIE_NAME)}`;

  // Wrong current password rejected without revoking active session.
  const badChange = await api.request('/auth/password', 'PUT', { currentPassword: 'wrong-password', newPassword: 'new-password-2' });
  assert.equal(badChange.status, 401);
  assert.equal(badChange.data.error.code, 'INVALID_CURRENT_PASSWORD');
  assert.equal((await api.rawRequest('/snapshot', 'GET', undefined, { Cookie: oldSessionCookie })).status, 200);

  // Valid password change updates hash, revokes ALL prior sessions and remember tokens, and issues fresh session.
  const goodChange = await api.request('/auth/password', 'PUT', { currentPassword: 'old-password-1', newPassword: 'new-password-2' });
  assert.equal(goodChange.status, 200);
  assert.equal(goodChange.data.ok, true);
  assert.equal(api.cookies.has(REMEMBER_COOKIE_NAME), false);

  // Prior session cookie and prior remember cookie are now rejected!
  assert.equal((await api.rawRequest('/snapshot', 'GET', undefined, { Cookie: oldSessionCookie })).status, 401);
  const oldRememberRestore = await api.rawRequest('/auth/status', 'GET', undefined, { Cookie: oldRememberCookie });
  assert.equal(oldRememberRestore.data.authenticated, false);

  // Current caller's fresh session still works.
  assert.equal((await api.request('/snapshot')).status, 200);

  // Logout revokes current session and any remember token.
  assert.equal((await api.request('/auth/logout', 'POST', {})).status, 200);
  assert.equal((await api.request('/snapshot')).status, 401);

  // Old password cannot sign in; new password succeeds.
  assert.equal((await api.request('/auth/login', 'POST', { username: 'peng', password: 'old-password-1', rememberMe: false })).status, 401);
  assert.equal((await api.request('/auth/login', 'POST', { username: 'peng', password: 'new-password-2', rememberMe: false })).status, 200);
});

test('Issue #55 API: desktopMode uses desktopRememberStore, rotates encrypted token across restarts, and clears corrupted store', async t => {
  const f = fixture();
  const desktopStore = createMemoryDesktopStore();

  let api = await listen(createApp(f.db, { desktopMode: true, desktopRememberStore: desktopStore }), { authenticate: false });
  t.after(async () => { await api.close(); f.close(); });

  const setup = await api.request('/auth/setup', 'POST', { username: 'desktopuser', password: 'password123', rememberMe: true });
  assert.equal(setup.status, 201);
  assert.equal(api.cookies.has(REMEMBER_COOKIE_NAME), false, 'desktop mode must not rely on browser remember cookie');
  assert(desktopStore.raw && desktopStore.raw.startsWith('enc:'), 'desktop store holds encrypted remember token');
  const firstStored = desktopStore.raw;

  // Simulate Electron app restart -> new Express instance with same desktopStore and empty cookies.
  await api.close();
  api = await listen(createApp(f.db, { desktopMode: true, desktopRememberStore: desktopStore }), { authenticate: false });
  const restored = await api.request('/auth/status');
  assert.equal(restored.data.authenticated, true);
  assert.equal(restored.data.restoredFromRemember, true);
  assert.notEqual(desktopStore.raw, firstStored, 'desktop remember token must rotate on restore');
  assert.equal((await api.request('/snapshot')).status, 200);

  // Simulate corrupted credential file on next restart -> clears file and returns unauthenticated.
  await api.close();
  desktopStore.corrupt();
  api = await listen(createApp(f.db, { desktopMode: true, desktopRememberStore: desktopStore }), { authenticate: false });
  const afterCorrupt = await api.request('/auth/status');
  assert.equal(afterCorrupt.data.authenticated, false);
  assert.equal(desktopStore.raw, null, 'corrupted desktop credential must be cleared');

  // Sign in with rememberMe: true, then logout -> clears desktop store so next restart stays logged out.
  assert.equal((await api.request('/auth/login', 'POST', { username: 'desktopuser', password: 'password123', rememberMe: true })).status, 200);
  assert(desktopStore.raw);
  assert.equal((await api.request('/auth/logout', 'POST', {})).status, 200);
  assert.equal(desktopStore.raw, null);
  await api.close();
  api = await listen(createApp(f.db, { desktopMode: true, desktopRememberStore: desktopStore }), { authenticate: false });
  assert.equal((await api.request('/auth/status')).data.authenticated, false);
});
