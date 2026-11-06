import express from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Store, ServiceError, publicError } from './services/store.js';
import { root } from './config.js';
export function createApp(db, { serveStatic = false, fault } = {}) {
  const app = express(); const store = new Store(db, { fault });
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    req.requestId = randomUUID(); res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff');
    // Loopback does not grant arbitrary websites permission to write local data.
    const origin = req.get('origin');
    const expected = `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== expected) || req.get('sec-fetch-site') === 'cross-site') return next(new ServiceError(403, 'ORIGIN_DENIED', 'Use the app from its own local address.'));
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) return next(new ServiceError(415, 'JSON_REQUIRED', 'Use application/json.'));
    next();
  });
  app.use(express.json({ limit: '16kb', strict: true }));
  const shape = keys => (req, res, next) => {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(k => !keys.includes(k))) return next(new ServiceError(400, 'INVALID_REQUEST', 'Unexpected request fields.'));
    next();
  };
  app.get('/api/health', (req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); });
  app.get('/api/snapshot', (req, res) => res.json(store.getSnapshot()));
  app.post('/api/onboarding', shape(['mode', 'expectedRevision']), (req, res) => res.json(store.onboard(req.body)));
  app.put('/api/pantry/:id', shape(['quantity', 'unit', 'expectedRevision']), (req, res) => res.json(store.saveItem(req.params.id, req.body)));
  app.delete('/api/pantry/:id', shape(['expectedRevision']), (req, res) => res.json(store.deleteItem(req.params.id, req.body)));
  app.put('/api/shopping-selection', shape(['recipeId', 'expectedRevision']), (req, res) => res.json(store.selectRecipe(req.body)));
  app.delete('/api/shopping-selection', shape(['expectedRevision']), (req, res) => res.json(store.clearSelection(req.body)));
  app.use('/api', (req, res, next) => next(new ServiceError(404, 'NOT_FOUND', 'API route not found.')));
  if (serveStatic) { app.use(express.static(join(root, 'dist'))); app.get('/', (req, res) => res.sendFile(join(root, 'dist/index.html'))); }
  app.use((error, req, res, next) => {
    const safe = publicError(error);
    if (safe.status >= 500) console.error(JSON.stringify({ requestId: req.requestId, code: error.code || 'INTERNAL_ERROR' }));
    res.status(safe.status).json({ error: { code: safe.code, message: safe.message, ...(safe.field ? { field: safe.field } : {}), requestId: req.requestId || randomUUID() } });
  });
  return app;
}
