import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { initializeDatabase } from '../server/db/initialize.js';

const host = '127.0.0.1';
const accessToken = randomUUID();
const windowIconPath = fileURLToPath(new URL('./icons/icon-256.png', import.meta.url));
const preloadPath = fileURLToPath(new URL('./preload.cjs', import.meta.url));
const supportedLanguages = new Set(['en', 'zh-CN']);
let database;
let server;
let origin;
let window;

function registerLanguagePreference() {
  const path = join(app.getPath('userData'), 'interface-language');
  let language = 'en';
  try {
    const saved = readFileSync(path, 'utf8');
    if (supportedLanguages.has(saved)) language = saved;
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read interface language:', error);
  }

  const fromAppWindow = event => window && event.sender === window.webContents
    && event.senderFrame?.parent === null
    && event.senderFrame.url.startsWith(`${origin}/`);

  ipcMain.on('pantry:language:read', event => {
    event.returnValue = fromAppWindow(event) ? language : null;
  });
  ipcMain.on('pantry:language:save', (event, next) => {
    event.returnValue = false;
    if (!fromAppWindow(event) || !supportedLanguages.has(next)) return;
    try {
      if (language !== next) {
        const temporaryPath = `${path}.tmp`;
        writeFileSync(temporaryPath, next, 'utf8');
        renameSync(temporaryPath, path);
        language = next;
      }
      event.returnValue = true;
    } catch (error) {
      console.error('Could not save interface language:', error);
    }
  });
}

async function start() {
  const dbPath = join(app.getPath('userData'), 'pantry.sqlite');
  database = await initializeDatabase(dbPath);

  const expressApp = createApp(database, { serveStatic: true });
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
    icon: windowIconPath,
    webPreferences: { preload: preloadPath, nodeIntegration: false, contextIsolation: true, sandbox: true },
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
    registerLanguagePreference();
    await showWindow();
  }).catch(error => {
    console.error(error);
    dialog.showErrorBox('Pantry & Plate could not start', error.message);
    app.quit();
  });
}
