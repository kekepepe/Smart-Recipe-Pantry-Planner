import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

function readAsset(relPath) {
  return readFileSync(new URL(relPath, root));
}

test('desktop icon assets exist with valid binary formats and multi-resolution metadata', () => {
  const faviconSvg = readAsset('public/favicon.svg').toString('utf8');
  const iconSvg = readAsset('desktop/icons/icon.svg').toString('utf8');
  const macSvg = readAsset('desktop/icons/icon-macos.svg').toString('utf8');
  const provenance = readAsset('desktop/icons/PROVENANCE.md').toString('utf8');

  // Ensure both vector masters reuse the exact #245a42 emblem path from public/favicon.svg
  const leafPathMatch = faviconSvg.match(/d="([^"]+)"/);
  assert.ok(leafPathMatch, 'public/favicon.svg should contain the primary leaf path');
  assert.ok(iconSvg.includes(leafPathMatch[1]), 'desktop/icons/icon.svg should reuse public/favicon.svg leaf geometry');
  assert.ok(macSvg.includes(leafPathMatch[1]), 'desktop/icons/icon-macos.svg should reuse public/favicon.svg leaf geometry');
  assert.match(provenance, /MIT License/i);

  // PNG master (1024x1024) and window icon (256x256)
  for (const [path, expectedDim] of [
    ['desktop/icons/icon.png', 1024],
    ['desktop/icons/icon-256.png', 256],
  ]) {
    const png = readAsset(path);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${path} should be a PNG`);
    assert.equal(png.readUInt32BE(16), expectedDim, `${path} width should be ${expectedDim}`);
    assert.equal(png.readUInt32BE(20), expectedDim, `${path} height should be ${expectedDim}`);
  }

  // macOS .icns container
  const icns = readAsset('desktop/icons/icon.icns');
  assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
  assert.equal(icns.readUInt32BE(4), icns.length);

  // Windows .ico container with 7 resolutions (16, 24, 32, 48, 64, 128, 256)
  const ico = readAsset('desktop/icons/icon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  assert.equal(count, 7);
  const sizes = [];
  for (let i = 0; i < count; i += 1) {
    const widthByte = ico[6 + i * 16];
    sizes.push(widthByte === 0 ? 256 : widthByte);
  }
  assert.deepEqual(sizes, [16, 24, 32, 48, 64, 128, 256]);
});

test('electron-builder and Electron main window wire custom desktop icons', () => {
  const builderConfig = readAsset('desktop/electron-builder.yml').toString('utf8');
  assert.match(builderConfig, /^\s*-\s*desktop\/icons\/icon-256\.png\s*$/m);
  assert.match(builderConfig, /^\s*icon:\s*desktop\/icons\/icon\.icns\s*$/m);
  assert.match(builderConfig, /^\s*icon:\s*desktop\/icons\/icon\.ico\s*$/m);
  assert.match(builderConfig, /^\s*installerIcon:\s*desktop\/icons\/icon\.ico\s*$/m);
  assert.match(builderConfig, /^\s*uninstallerIcon:\s*desktop\/icons\/icon\.ico\s*$/m);
  assert.match(builderConfig, /^\s*installerHeaderIcon:\s*desktop\/icons\/icon\.ico\s*$/m);

  const mainJs = readAsset('desktop/main.js').toString('utf8');
  assert.match(mainJs, /icons\/icon-256\.png/);
  assert.match(mainJs, /new BrowserWindow\(\{[\s\S]*?icon:\s*windowIconPath/);
});
