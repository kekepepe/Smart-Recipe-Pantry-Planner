import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { computeDepsHash, DEFAULT_REPOSITORY, LITE_RUNTIME_VERSION } from './updater.js';

const target = `${process.platform}-${process.arch}`;
const platforms = { 'darwin-arm64': 'mac-arm64', 'win32-x64': 'win-x64' };
if (!platforms[target]) throw new Error(`Run packaging on one of the supported native platforms, not ${target}.`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const { version } = pkg;
const baseName = `Pantry-and-Plate-${version}-Lite-${platforms[target]}`;
const staging = mkdtempSync(join(tmpdir(), 'pantry-lite-'));

function populateAppPayload(appDir) {
  mkdirSync(appDir, { recursive: true });
  for (const file of ['package.json', 'package-lock.json']) cpSync(file, join(appDir, file));
  execFileSync(process.execPath, [process.env.npm_execpath, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: appDir, stdio: 'inherit',
  });
  const prebuilds = join(appDir, 'node_modules/better-sqlite3/prebuilds');
  for (const file of readdirSync(prebuilds)) {
    if (file.endsWith('.node') && file !== `${target}.node`) rmSync(join(prebuilds, file));
  }

  const sources = [
    'dist',
    'server',
    'src',
    'web/data/fixtures.js',
    'data/catalog.js',
    'data/world-recipes.json',
    'data/nutrition-mappings.json',
    'lite/start.js',
    'lite/updater.js',
  ];
  for (const file of sources) {
    const destination = join(appDir, file);
    mkdirSync(resolve(destination, '..'), { recursive: true });
    cpSync(file, destination, { recursive: true });
  }
  writeFileSync(join(appDir, 'lite-runtime.json'), `${JSON.stringify({
    version,
    depsHash: computeDepsHash(pkg),
    runtimeVersion: LITE_RUNTIME_VERSION,
    repository: DEFAULT_REPOSITORY,
  }, null, 2)}\n`);
  cpSync('lite/README.md', join(appDir, 'README.md'));
  cpSync('LICENSE', join(appDir, 'LICENSE'));
}

function findWindowsTool(candidates, fallbackName) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return fallbackName;
}

try {
  mkdirSync('lite-dist', { recursive: true });

  if (process.platform === 'darwin') {
    const dmgRoot = join(staging, 'dmg');
    const appBundle = join(dmgRoot, 'Pantry & Plate Lite.app');
    const contents = join(appBundle, 'Contents');
    const macosDir = join(contents, 'MacOS');
    const resourcesDir = join(contents, 'Resources');
    const appDir = join(resourcesDir, 'app');

    mkdirSync(macosDir, { recursive: true });
    mkdirSync(resourcesDir, { recursive: true });
    populateAppPayload(appDir);

    cpSync('desktop/icons/icon.icns', join(resourcesDir, 'icon.icns'));
    writeFileSync(join(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Pantry &amp; Plate Lite</string>
  <key>CFBundleExecutable</key>
  <string>PantryPlateLite</string>
  <key>CFBundleIconFile</key>
  <string>icon.icns</string>
  <key>CFBundleIdentifier</key>
  <string>com.pantryandplate.lite</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Pantry &amp; Plate Lite</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${version}</string>
  <key>CFBundleVersion</key>
  <string>${version}</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`);

    const launcherBin = join(macosDir, 'PantryPlateLite');
    execFileSync('swiftc', [
      '-O',
      '-framework', 'Cocoa',
      resolve('lite/macos/launcher.swift'),
      '-o', launcherBin,
    ], { stdio: 'inherit' });
    chmodSync(launcherBin, 0o755);

    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appBundle], { stdio: 'inherit' });

    symlinkSync('/Applications', join(dmgRoot, 'Applications'));
    cpSync('lite/README.md', join(dmgRoot, 'README.md'));

    const output = resolve('lite-dist', `${baseName}.dmg`);
    rmSync(output, { force: true });
    execFileSync('hdiutil', [
      'create',
      '-volname', `Pantry & Plate ${version} Lite`,
      '-srcfolder', dmgRoot,
      '-ov',
      '-format', 'UDZO',
      output,
    ], { stdio: 'inherit' });
    console.log(output);
  } else {
    const installRoot = join(staging, 'win-root');
    const appDir = join(installRoot, 'app');
    populateAppPayload(appDir);
    cpSync('lite/README.md', join(installRoot, 'README.md'));
    cpSync('LICENSE', join(installRoot, 'LICENSE'));

    const windir = process.env.WINDIR || 'C:\\Windows';
    const csc = findWindowsTool([
      join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
      join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
    ], 'csc.exe');
    const launcherExe = join(installRoot, 'PantryPlateLite.exe');
    execFileSync(csc, [
      '/nologo',
      '/target:winexe',
      '/optimize+',
      `/win32icon:${resolve('desktop/icons/icon.ico')}`,
      '/r:System.Windows.Forms.dll',
      '/r:System.Drawing.dll',
      `/out:${launcherExe}`,
      resolve('lite/windows/Launcher.cs'),
    ], { stdio: 'inherit' });

    const makensis = findWindowsTool([
      'C:\\Program Files (x86)\\NSIS\\makensis.exe',
      'C:\\Program Files\\NSIS\\makensis.exe',
    ], 'makensis');
    const output = resolve('lite-dist', `${baseName}.exe`);
    rmSync(output, { force: true });
    execFileSync(makensis, [
      `/DAPP_VERSION=${version}`,
      `/DSOURCE_DIR=${installRoot}`,
      `/DOUTPUT_FILE=${output}`,
      `/DICON_FILE=${resolve('desktop/icons/icon.ico')}`,
      resolve('lite/windows/installer.nsi'),
    ], { stdio: 'inherit' });
    console.log(output);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
