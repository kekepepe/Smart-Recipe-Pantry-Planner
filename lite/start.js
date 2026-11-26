import { spawn } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const host = '127.0.0.1';
const platform = process.platform;
const appName = 'Pantry & Plate Lite';

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

async function importBackup(sourcePath, dbPath) {
  const { openDatabase } = await import('../server/db/connection.js');
  const { assertSchema } = await import('../server/db/migrate.js');
  const { Store } = await import('../server/services/store.js');
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

async function runService(dbPath, port, showBrowser) {
  const origin = `http://${host}:${port}`;
  let handler;
  let db;
  const server = createServer((req, res) => {
    if (req.headers.host !== `${host}:${port}`) return res.writeHead(403).end();
    if (req.method === 'GET' && req.url === '/api/lite-status' && handler) {
      return res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        .end(JSON.stringify({ product: appName }));
    }
    if (!handler) return res.writeHead(503).end();
    handler(req, res);
  });
  const close = () => {
    server.close();
    server.closeAllConnections();
    db?.close();
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
    const { initializeDatabase } = await import('../server/db/initialize.js');
    const { createApp } = await import('../server/app.js');
    db = await initializeDatabase(dbPath);
    handler = createApp(db, { serveStatic: true });
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
    console.log(`${appName} is running at ${origin}. Press Ctrl+C here to stop.`);
    if (showBrowser) openBrowser(origin);
  } catch (error) {
    close();
    throw error;
  }
}

try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 22 || minor < 12) throw new Error('Install Node.js 22.12 or newer in the Node.js 22 series.');
  const supported = (platform === 'darwin' && process.arch === 'arm64') ||
    (platform === 'win32' && process.arch === 'x64');
  if (!supported) throw new Error('Use native arm64 Node.js on macOS or x64 Node.js on Windows, with the matching Lite ZIP.');
  const base = platform === 'darwin'
    ? join(homedir(), 'Library', 'Application Support')
    : (process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'));
  const dbPath = join(resolve(process.env.PANTRY_LITE_DATA_DIR || join(base, appName)), 'pantry.sqlite');
  const [option, source, ...rest] = process.argv.slice(2);
  if (option === '--import' && source && rest.length === 0) {
    await importBackup(source, dbPath);
  } else if (!option || (option === '--no-browser' && !source)) {
    const port = Number(process.env.PANTRY_LITE_PORT || 32101);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PANTRY_LITE_PORT must be an integer from 1024 to 65535.');
    await runService(dbPath, port, !option);
  } else {
    throw new Error('Usage: node lite/start.js [--no-browser | --import BACKUP.sqlite]');
  }
} catch (error) {
  console.error(`${appName}: ${error.message}`);
  process.exitCode = 1;
}
