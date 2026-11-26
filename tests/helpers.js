import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db/connection.js';
import { migrate } from '../server/db/migrate.js';
import { seed } from '../server/db/seed.js';

export const TEST_AUTH_CREDENTIALS = Object.freeze({
  username: '2026',
  password: 'test-password-123',
});

export function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'pantry-v1-'));
  const path = join(dir, 'test.sqlite');
  const db = openDatabase(path, { create: true });
  migrate(db);
  seed(db);
  return { dir, path, db, close: () => { if (db.open) db.close(); rmSync(dir, { recursive: true, force: true }); } };
}

export function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

function applyCookiesToJar(jar, headers) {
  for (const raw of extractSetCookies(headers)) {
    const [pair, ...attrs] = raw.split(';').map(s => s.trim());
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const maxAgeAttr = attrs.find(a => /^max-age=/i.test(a));
    if (!value || (maxAgeAttr && Number(maxAgeAttr.split('=')[1]) <= 0)) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function serializeJar(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

export async function listen(app, {
  authenticate = true,
  username = TEST_AUTH_CREDENTIALS.username,
  password = TEST_AUTH_CREDENTIALS.password,
  rememberMe = false,
} = {}) {
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.once('error', reject);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const cookies = new Map();

  async function request(path, method = 'GET', body, headers = {}, { useJar = true } = {}) {
    const mergedHeaders = { ...headers };
    if (useJar && !mergedHeaders.Cookie && !mergedHeaders.cookie) {
      const cookieHeader = serializeJar(cookies);
      if (cookieHeader) mergedHeaders.Cookie = cookieHeader;
    }
    if (body !== undefined && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json';
    }
    const res = await fetch(url + '/api' + path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(Object.keys(mergedHeaders).length ? { headers: mergedHeaders } : {}),
    });
    if (useJar) applyCookiesToJar(cookies, res.headers);
    return { status: res.status, data: await res.json(), headers: res.headers, setCookies: extractSetCookies(res.headers) };
  }

  const client = {
    url,
    cookies,
    cookieHeader: () => serializeJar(cookies),
    clearCookies: () => cookies.clear(),
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); }),
    request,
    rawRequest: (path, method = 'GET', body, headers = {}) => request(path, method, body, headers, { useJar: false }),
  };

  if (authenticate) {
    const setupRes = await request('/auth/setup', 'POST', { username, password, rememberMe });
    if (setupRes.status === 409) {
      const loginRes = await request('/auth/login', 'POST', { username, password, rememberMe });
      if (loginRes.status !== 200) {
        await client.close();
        throw new Error(`Test auth bootstrap failed: ${loginRes.status} ${JSON.stringify(loginRes.data)}`);
      }
    } else if (setupRes.status !== 201) {
      await client.close();
      throw new Error(`Test auth setup failed: ${setupRes.status} ${JSON.stringify(setupRes.data)}`);
    }
  }

  return client;
}

/**
 * Authenticates a Playwright browser page against a running local service via
 * the real /api/auth/setup or /api/auth/login endpoints so HttpOnly cookies are
 * stored in the browser context before navigating.
 */
export async function signInPage(page, service, {
  username = TEST_AUTH_CREDENTIALS.username,
  password = TEST_AUTH_CREDENTIALS.password,
  rememberMe = false,
} = {}) {
  const setupRes = await page.request.post(`${service.url}/api/auth/setup`, {
    data: { username, password, rememberMe },
  });
  if (setupRes.status() === 409) {
    const loginRes = await page.request.post(`${service.url}/api/auth/login`, {
      data: { username, password, rememberMe },
    });
    if (!loginRes.ok()) {
      throw new Error(`signInPage login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }
  } else if (!setupRes.ok()) {
    throw new Error(`signInPage setup failed: ${setupRes.status()} ${await setupRes.text()}`);
  }
}
