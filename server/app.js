import express from 'express';
import { discoverRecipes } from '../src/discover-recipes.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { Store, ServiceError, publicError } from './services/store.js';
import { AuthService, parseCookies, SESSION_COOKIE_NAME, REMEMBER_COOKIE_NAME } from './services/auth.js';
import { root } from './config.js';

const loadNutritionMappings = () => {
  const path = join(root, 'data', 'nutrition-mappings.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
};

function applySetCookies(res, cookies) {
  if (cookies?.length) res.setHeader('Set-Cookie', cookies);
}

export function createApp(db, {
  serveStatic = false,
  fault,
  now,
  nutritionMappings = loadNutritionMappings(),
  desktopMode = false,
  desktopRememberStore = null,
  sessionTtlMs,
  rememberTtlMs,
  maxFailedAttempts,
  lockoutMs,
} = {}) {
  const app = express();
  const store = new Store(db, { fault, now, nutritionMappings });
  const auth = new AuthService(db, {
    fault,
    now,
    desktopMode,
    desktopRememberStore,
    sessionTtlMs,
    rememberTtlMs,
    maxFailedAttempts,
    lockoutMs,
  });

  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    req.requestId = randomUUID();
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    // Loopback does not grant arbitrary websites permission to write local data.
    const origin = req.get('origin');
    const expected = `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== expected) || req.get('sec-fetch-site') === 'cross-site') {
      return next(new ServiceError(403, 'ORIGIN_DENIED', 'Use the app from its own local address.'));
    }
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) {
      return next(new ServiceError(415, 'JSON_REQUIRED', 'Use application/json.'));
    }
    next();
  });
  app.use(express.json({ limit: '16kb', strict: true }));

  const shape = keys => (req, res, next) => {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(k => !keys.includes(k))) {
      return next(new ServiceError(400, 'INVALID_REQUEST', 'Unexpected request fields.'));
    }
    next();
  };

  const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // Public health check, Lite mode probe, and local auth bootstrap routes
  app.get('/api/health', (req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); });
  app.get('/api/lite-status', (req, res) => res.json({ updater: { enabled: false } }));

  const handleSessionQuery = (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const { status, setCookies } = auth.getStatusAndMaybeRestore({
      sessionCookie: cookies[SESSION_COOKIE_NAME],
      rememberCookie: cookies[REMEMBER_COOKIE_NAME],
    });
    applySetCookies(res, setCookies);
    res.json(status);
  };
  app.get('/api/auth/status', handleSessionQuery);
  app.get('/api/auth/session', handleSessionQuery);

  app.post('/api/auth/setup', shape(['username', 'password', 'rememberMe']), asyncRoute(async (req, res) => {
    const { status, setCookies } = await auth.setup(req.body);
    applySetCookies(res, setCookies);
    res.status(201).json(status);
  }));

  app.post('/api/auth/login', shape(['username', 'password', 'rememberMe']), asyncRoute(async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const { status, setCookies } = await auth.login(req.body, {
      previousRememberCookie: cookies[REMEMBER_COOKIE_NAME],
    });
    applySetCookies(res, setCookies);
    res.json(status);
  }));

  app.post('/api/auth/logout', shape([]), (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const { ok, setCookies } = auth.logout({
      sessionCookie: cookies[SESSION_COOKIE_NAME],
      rememberCookie: cookies[REMEMBER_COOKIE_NAME],
    });
    applySetCookies(res, setCookies);
    res.json({ ok });
  });

  // Unified authentication guard for all protected API endpoints
  app.use('/api', (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const session = auth.validateSession(cookies[SESSION_COOKIE_NAME]);
    if (!session) {
      return next(new ServiceError(401, 'AUTH_REQUIRED', 'Sign in to access your local pantry and recipes.'));
    }
    req.authSession = session;
    next();
  });

  const handlePasswordChange = asyncRoute(async (req, res) => {
    const { ok, username, expiresAt, setCookies } = await auth.changePassword(req.body);
    applySetCookies(res, setCookies);
    res.json({ ok, username, expiresAt });
  });
  app.put('/api/auth/password', shape(['currentPassword', 'newPassword']), handlePasswordChange);
  app.post('/api/auth/password', shape(['currentPassword', 'newPassword']), handlePasswordChange);

  // Protected business APIs
  app.get('/api/recipes', (req, res) => {
    try {
      const snapshot = store.getSnapshot();
      res.json({ ...discoverRecipes(snapshot, new URL(req.originalUrl, 'http://local').searchParams), catalogVersion: snapshot.catalogVersion, pantryRevision: snapshot.revision });
    } catch (error) {
      if (error.code === 'INVALID_FILTER') throw new ServiceError(400, error.code, error.message, error.field);
      throw error;
    }
  });
  app.get('/api/recommendations/staples', (req, res) => {
    try { res.json(store.recommendations(new URL(req.originalUrl, 'http://local').searchParams)); }
    catch (error) { if (error.code === 'INVALID_FILTER') throw new ServiceError(400, error.code, error.message, error.field); throw error; }
  });
  app.get('/api/nutrition', (req, res) => res.json(store.nutritionIndex()));
  app.get('/api/nutrition/:recipeId', (req, res) => res.json(store.nutritionDetail(req.params.recipeId)));
  app.get('/api/inspiration', (req, res) => {
    try { res.json(store.inspiration(new URL(req.originalUrl, 'http://local').searchParams)); }
    catch (error) { if (error.code === 'INVALID_FILTER') throw new ServiceError(400, error.code, error.message, error.field); throw error; }
  });
  app.get('/api/snapshot', (req, res) => res.json(store.getSnapshot()));
  app.post('/api/onboarding', shape(['mode', 'expectedRevision']), (req, res) => res.json(store.onboard(req.body)));
  app.put('/api/pantry/:id', shape(['quantity', 'unit', 'expectedRevision']), (req, res) => res.json(store.saveItem(req.params.id, req.body)));
  app.delete('/api/pantry/:id', shape(['expectedRevision']), (req, res) => res.json(store.deleteItem(req.params.id, req.body)));
  app.put('/api/shopping-selection', shape(['recipeId', 'expectedRevision']), (req, res) => res.json(store.selectRecipe(req.body)));
  app.delete('/api/shopping-selection/:id', shape(['expectedRevision']), (req, res) => res.json(store.removeRecipe(req.params.id, req.body)));
  app.delete('/api/shopping-selection', shape(['expectedRevision']), (req, res) => res.json(store.clearSelection(req.body)));
  app.put('/api/purchased-marks/:id', shape(['unit', 'expectedQuantity', 'expectedRevision']), (req, res) => res.json(store.markPurchased(req.params.id, req.body)));
  app.delete('/api/purchased-marks/:id', shape(['unit', 'expectedRevision']), (req, res) => res.json(store.unmarkPurchased(req.params.id, req.body)));

  app.use('/api', (req, res, next) => next(new ServiceError(404, 'NOT_FOUND', 'API route not found.')));

  if (serveStatic) {
    app.use(express.static(join(root, 'dist')));
    app.get('/', (req, res) => res.sendFile(join(root, 'dist/index.html')));
  }

  app.use((error, req, res, next) => {
    const safe = publicError(error);
    if (safe.status >= 500) {
      console.error(JSON.stringify({ requestId: req.requestId, code: error.code || 'INTERNAL_ERROR' }));
    }
    if (safe.status === 429 && error.retryAfterSeconds) {
      res.set('Retry-After', String(error.retryAfterSeconds));
    }
    res.status(safe.status).json({
      error: {
        code: safe.code,
        message: safe.message,
        ...(safe.field ? { field: safe.field } : {}),
        ...(safe.status === 429 && error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
        requestId: req.requestId || randomUUID(),
      },
    });
  });

  // Expose auth service handle on the Express instance for targeted server lifecycle tests.
  app.authService = auth;
  return app;
}
