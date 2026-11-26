import { spawn } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyUpdate, checkForUpdate, clearActiveBundle, readRuntimeInfo, resolveActiveBundle } from './updater.js';

const host = '127.0.0.1';
const platform = process.platform;
const appName = 'Pantry & Plate Lite';
const scriptPath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(scriptPath), '..');

function openBrowser(url) {
  const args = platform === 'darwin' ? ['open', url] : ['rundll32.exe', 'url.dll,FileProtocolHandler', url];
  const [command, ...parameters] = args;
  const browser = spawn(command, parameters, { stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.error(`Open ${url} in your browser.`));
  browser.on('exit', code => {
    if (code) console.error(`Open ${url} in your browser.`);
  });
  browser.unref();
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }).end(JSON.stringify(payload));
}

function isTrustedLoopbackRequest(req, expectedOrigin) {
  const origin = req.headers.origin;
  if (origin && origin !== expectedOrigin) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  return true;
}

async function loadBundleApp(rootDir, dbPath) {
  const { initializeDatabase } = await import(pathToFileURL(join(rootDir, 'server/db/initialize.js')).href);
  const { createApp } = await import(pathToFileURL(join(rootDir, 'server/app.js')).href);
  const db = await initializeDatabase(dbPath);
  try {
    const handler = createApp(db, { serveStatic: true });
    return { db, handler };
  } catch (error) {
    db.close();
    throw error;
  }
}

async function importBackup(sourcePath, dbPath, updatesDir) {
  const active = resolveActiveBundle(packageRoot, { updatesDir });
  const { openDatabase } = await import(pathToFileURL(join(active.rootDir, 'server/db/connection.js')).href);
  const { assertSchema } = await import(pathToFileURL(join(active.rootDir, 'server/db/migrate.js')).href);
  const { Store } = await import(pathToFileURL(join(active.rootDir, 'server/services/store.js')).href);
  if (['', '-wal', '-shm'].some(suffix => existsSync(dbPath + suffix))) {
    throw new Error('Lite already has a database. Keep it and use a new PANTRY_LITE_DATA_DIR to import.');
  }

  mkdirSync(dirname(dbPath), { recursive: true });
  const temp = mkdtempSync(join(dirname(dbPath), 'import-'));
  try {
    const copy = join(temp, 'pantry.sqlite');
    const source = openDatabase(resolve(sourcePath), { readonly: true });
    try {
      assertSchema(source);
      if (source.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('SQLite backup failed integrity check.');
      new Store(source).getSnapshot();
      await source.backup(copy);
    } finally {
      source.close();
    }
    // Publish the verified copy without overwriting any database created in the meantime.
    linkSync(copy, dbPath);
    console.log(`Imported a copy into ${dbPath}.`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

async function runService(dbPath, updatesDir, port, showBrowser) {
  const origin = `http://${host}:${port}`;
  const runtime = readRuntimeInfo(packageRoot);
  const controlToken = process.env.PANTRY_LITE_CONTROL_TOKEN || '';
  let active = resolveActiveBundle(packageRoot, { updatesDir });
  let handler;
  let db;
  let updating = false;
  let shuttingDown = false;

  const server = createServer((req, res) => {
    if (req.headers.host !== `${host}:${port}`) return res.writeHead(403).end();
    const urlPath = new URL(req.url || '/', origin).pathname;

    if (req.method === 'GET' && urlPath === '/api/lite-status' && handler) {
      return sendJson(res, 200, {
        product: appName,
        pid: process.pid,
        version: active.version,
        builtInVersion: runtime.version,
        isUpdated: active.isUpdated,
        updater: { enabled: true },
      });
    }

    if (req.method === 'POST' && urlPath === '/api/lite-shutdown') {
      if (!controlToken || req.headers['x-lite-control-token'] !== controlToken) {
        return sendJson(res, 403, { error: 'Forbidden.' });
      }
      shuttingDown = true;
      res.once('finish', () => {
        close();
        process.exit(0);
      });
      return sendJson(res, 200, { status: 'stopping' });
    }

    if (urlPath === '/api/lite-update/check' || urlPath === '/api/lite-update/apply') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
      if (!isTrustedLoopbackRequest(req, origin)) return sendJson(res, 403, { error: 'Use the app from its own local address.' });
      const rawSessionCookie = (req.headers.cookie || '')
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith('pantry_session='))
        ?.slice('pantry_session='.length);
      let sessionToken = '';
      if (rawSessionCookie) {
        try { sessionToken = decodeURIComponent(rawSessionCookie); } catch { sessionToken = rawSessionCookie; }
      }
      if (!handler?.authService?.validateSession(sessionToken)) {
        return sendJson(res, 401, { error: 'Sign in before checking or applying updates.' });
      }
      if (updating) return sendJson(res, 409, { error: 'An update operation is already in progress.' });

      updating = true;
      const manifestUrl = process.env.PANTRY_LITE_UPDATE_URL || undefined;
      if (urlPath === '/api/lite-update/check') {
        checkForUpdate(packageRoot, { manifestUrl, updatesDir })
          .then(result => {
            const { manifest: _omitted, ...publicResult } = result;
            sendJson(res, 200, publicResult);
          })
          .catch(error => sendJson(res, 502, { error: error.message || 'Update check failed.' }))
          .finally(() => { updating = false; });
        return;
      }

      applyUpdate(packageRoot, { manifestUrl, updatesDir })
        .then(result => {
          if (result.status !== 'applied') {
            updating = false;
            return sendJson(res, 200, result);
          }
          res.once('finish', () => {
            shuttingDown = true;
            closeAndRestart();
          });
          sendJson(res, 200, {
            status: 'restarting',
            version: result.version,
            previousVersion: result.previousVersion,
          });
        })
        .catch(error => {
          updating = false;
          sendJson(res, 502, { error: error.message || 'Update apply failed.' });
        });
      return;
    }

    if (!handler || shuttingDown) return res.writeHead(503).end();
    handler(req, res);
  });

  const close = () => {
    server.close();
    server.closeAllConnections();
    db?.close();
    db = null;
  };

  const closeAndRestart = () => {
    server.close(() => {
      db?.close();
      db = null;
      const child = spawn(process.execPath, [scriptPath, '--no-browser'], {
        cwd: packageRoot,
        env: process.env,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      process.exit(0);
    });
    server.closeAllConnections();
  };

  try {
    await new Promise((accept, reject) => {
      server.once('error', reject);
      server.listen(port, host, accept);
    });
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    const existing = await fetch(`${origin}/api/lite-status`, {
      signal: AbortSignal.timeout(1500),
    }).then(response => response.ok ? response.json() : null).catch(() => null);
    if (existing?.product !== appName) {
      throw new Error(`Port ${port} is in use. Stop the other program or set PANTRY_LITE_PORT to a free port.`);
    }
    console.log(`${appName} is already running at ${origin}.`);
    if (showBrowser) openBrowser(origin);
    return;
  }

  try {
    try {
      ({ db, handler } = await loadBundleApp(active.rootDir, dbPath));
    } catch (bootError) {
      if (!active.isUpdated) throw bootError;
      console.error(`${appName}: updated bundle ${active.version} failed to start (${bootError.message}); rolling back to built-in ${runtime.version}.`);
      clearActiveBundle(packageRoot, { updatesDir });
      active = resolveActiveBundle(packageRoot, { updatesDir });
      ({ db, handler } = await loadBundleApp(active.rootDir, dbPath));
    }
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
    console.log(`${appName} v${active.version} is running at ${origin}. Press Ctrl+C here to stop.`);
    if (showBrowser) openBrowser(origin);
  } catch (error) {
    close();
    throw error;
  }
}

try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 22 || minor < 14) throw new Error('Install Node.js 22.14 or newer in the Node.js 22 series.');
  const supported = (platform === 'darwin' && process.arch === 'arm64') ||
    (platform === 'win32' && process.arch === 'x64');
  if (!supported) throw new Error('Use native arm64 Node.js on macOS or x64 Node.js on Windows, with the matching Lite ZIP.');
  const base = platform === 'darwin'
    ? join(homedir(), 'Library', 'Application Support')
    : (process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'));
  const dataDir = resolve(process.env.PANTRY_LITE_DATA_DIR || join(base, appName));
  const dbPath = join(dataDir, 'pantry.sqlite');
  const updatesDir = join(dataDir, 'updates');
  const [option, source, ...rest] = process.argv.slice(2);
  if (option === '--import' && source && rest.length === 0) {
    await importBackup(source, dbPath, updatesDir);
  } else if (!option || (option === '--no-browser' && !source)) {
    const port = Number(process.env.PANTRY_LITE_PORT || 32101);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PANTRY_LITE_PORT must be an integer from 1024 to 65535.');
    await runService(dbPath, updatesDir, port, !option);
  } else {
    throw new Error('Usage: node lite/start.js [--no-browser | --import BACKUP.sqlite]');
  }
} catch (error) {
  console.error(`${appName}: ${error.message}`);
  process.exitCode = 1;
}
