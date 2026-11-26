import { app, BrowserWindow, dialog, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { initializeDatabase } from '../server/db/initialize.js';

const host = '127.0.0.1';
const accessToken = randomUUID();
let database;
let server;
let origin;
let window;

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
