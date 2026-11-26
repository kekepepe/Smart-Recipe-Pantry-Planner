import { app, BrowserWindow, dialog, safeStorage, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/db/connection.js';
import { migrate, migration } from '../server/db/migrate.js';
import { catalogVersion, seed } from '../server/db/seed.js';
import { Store } from '../server/services/store.js';
import { createDesktopRememberStore } from './remember-store.js';

const host = '127.0.0.1';
const accessToken = randomUUID();
let database;
let server;
let origin;
let window;

async function start() {
  const userDataDir = app.getPath('userData');
  const dbPath = join(userDataDir, 'pantry.sqlite');
  database = openDatabase(dbPath, { create: true });

  const hasMigrationHistory = database.prepare(
    "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'schema_migrations'",
  ).get();
  if (hasMigrationHistory) {
    const schemaVersion = database.prepare('SELECT max(version) AS version FROM schema_migrations').get().version;
    const installedCatalog = schemaVersion === migration.version
      ? database.prepare('SELECT version FROM catalog_metadata WHERE id=1').get()?.version
      : undefined;
    if (schemaVersion < migration.version || installedCatalog !== catalogVersion) {
      const stamp = new Date().toISOString().replaceAll(':', '-');
      await database.backup(join(userDataDir, `pantry-before-upgrade-${stamp}.sqlite`));
    }
  }

  database.transaction(() => {
    migrate(database);
    seed(database, { upgrade: true });
    new Store(database).getSnapshot();
  }).immediate();

  const desktopRememberStore = createDesktopRememberStore(userDataDir, safeStorage);
  const expressApp = createApp(database, {
    serveStatic: true,
    desktopMode: true,
    desktopRememberStore,
  });

  let authority;
  server = createServer((request, response) => {
    if (request.headers.host !== authority || request.headers['x-pantry-desktop'] !== accessToken) {
      response.writeHead(403).end();
      return;
    }
    expressApp(request, response);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
  authority = `${host}:${server.address().port}`;
  origin = `http://${authority}`;

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (new URL(details.url).origin !== origin) {
      callback({ cancel: true });
      return;
    }
    callback({ requestHeaders: { ...details.requestHeaders, 'X-Pantry-Desktop': accessToken } });
  });
}

function showWindow() {
  window = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url).catch(console.error);
    return { action: 'deny' };
  });
  window.on('closed', () => { window = null; });
  return window.loadURL(origin);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.on('before-quit', () => {
    server?.close();
    server?.closeAllConnections();
    database?.close();
  });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    await start();
    await showWindow();
  }).catch(error => {
    console.error(error);
    dialog.showErrorBox('Pantry & Plate could not start', error.message);
    app.quit();
  });
}
