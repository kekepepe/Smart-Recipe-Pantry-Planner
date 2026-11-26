import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(rootDir, 'desktop', 'icons');
const macSvg = readFileSync(join(iconsDir, 'icon-macos.svg'), 'utf8');
const winSvg = readFileSync(join(iconsDir, 'icon.svg'), 'utf8');

/**
 * Render an SVG string at an exact square pixel size using Chromium so gradients,
 * filters, and subpixel anti-aliasing match browser rendering.
 */
async function renderSvg(page, svgMarkup, size) {
  await page.setViewportSize({ width: size, height: size });
  const encoded = Buffer.from(svgMarkup, 'utf8').toString('base64');
  const result = await page.evaluate(async ({ base64, dim }) => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, dim, dim);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, dim, dim);
    const rgba = Array.from(ctx.getImageData(0, 0, dim, dim).data);
    const pngDataUrl = canvas.toDataURL('image/png');
    return { rgba, pngBase64: pngDataUrl.split(',')[1] };
  }, { base64: encoded, dim: size });

  return {
    size,
    rgba: Uint8Array.from(result.rgba),
    png: Buffer.from(result.pngBase64, 'base64'),
  };
}

/**
 * Encode RGBA pixels into a 32-bit BGRA Windows ICO DIB (BITMAPINFOHEADER + bottom-up
 * pixel rows + 1-bit AND mask). Using BMP DIB for <=128px ensures full compatibility
 * with NSIS 3, rcedit, and all Windows icon loaders.
 */
function encodeBmpDib(rgba, size) {
  const headerSize = 40;
  const xorSize = size * size * 4;
  const andRowStride = Math.ceil(size / 32) * 4;
  const andSize = andRowStride * size;
  const buf = Buffer.alloc(headerSize + xorSize + andSize);

  // BITMAPINFOHEADER
  buf.writeUInt32LE(headerSize, 0); // biSize
  buf.writeInt32LE(size, 4);        // biWidth
  buf.writeInt32LE(size * 2, 8);    // biHeight (XOR + AND)
  buf.writeUInt16LE(1, 12);         // biPlanes
  buf.writeUInt16LE(32, 14);        // biBitCount
  buf.writeUInt32LE(0, 16);         // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, 20); // biSizeImage

  // XOR bitmap: bottom-up BGRA
  let offset = headerSize;
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      buf[offset] = rgba[idx + 2];     // B
      buf[offset + 1] = rgba[idx + 1]; // G
      buf[offset + 2] = rgba[idx];     // R
      buf[offset + 3] = rgba[idx + 3]; // A
      offset += 4;
    }
  }

  // AND mask: bottom-up 1bpp (1 = transparent pixel where alpha == 0)
  for (let y = size - 1; y >= 0; y -= 1) {
    const rowStart = headerSize + xorSize + (size - 1 - y) * andRowStride;
    for (let x = 0; x < size; x += 1) {
      const alpha = rgba[(y * size + x) * 4 + 3];
      if (alpha === 0) {
        buf[rowStart + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return buf;
}

/**
 * Assemble a multi-resolution Windows .ico buffer.
 */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(count, 4); // image count

  const dirSize = count * 16;
  const directory = Buffer.alloc(dirSize);
  let dataOffset = 6 + dirSize;

  const payloads = [];
  for (let i = 0; i < count; i += 1) {
    const { size, data } = entries[i];
    const entryOffset = i * 16;
    directory[entryOffset] = size >= 256 ? 0 : size;
    directory[entryOffset + 1] = size >= 256 ? 0 : size;
    directory[entryOffset + 2] = 0;    // color palette
    directory[entryOffset + 3] = 0;    // reserved
    directory.writeUInt16LE(1, entryOffset + 4);  // color planes
    directory.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    directory.writeUInt32LE(data.length, entryOffset + 8);
    directory.writeUInt32LE(dataOffset, entryOffset + 12);
    dataOffset += data.length;
    payloads.push(data);
  }

  return Buffer.concat([header, directory, ...payloads]);
}

const browser = await chromium.launch();
const tempDir = mkdtempSync(join(tmpdir(), 'pantry-iconset-'));
try {
  const page = await browser.newPage();

  // 1. Master PNGs from full-bleed badge SVG (icon.svg)
  const master1024 = await renderSvg(page, winSvg, 1024);
  const window256 = await renderSvg(page, winSvg, 256);
  writeFileSync(join(iconsDir, 'icon.png'), master1024.png);
  writeFileSync(join(iconsDir, 'icon-256.png'), window256.png);

  // 2. Multi-resolution Windows .ico (16, 24, 32, 48, 64, 128 BMP DIB + 256 PNG)
  const icoEntries = [];
  for (const size of [16, 24, 32, 48, 64, 128]) {
    const rendered = await renderSvg(page, winSvg, size);
    icoEntries.push({ size, data: encodeBmpDib(rendered.rgba, size) });
  }
  icoEntries.push({ size: 256, data: window256.png });
  writeFileSync(join(iconsDir, 'icon.ico'), buildIco(icoEntries));

  // 3. macOS .icns via native iconutil using HIG-padded macOS SVG
  const iconsetDir = join(tempDir, 'PantryAndPlate.iconset');
  execFileSync('mkdir', ['-p', iconsetDir]);
  const macSlots = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ];
  const macCache = new Map();
  for (const [filename, size] of macSlots) {
    if (!macCache.has(size)) {
      macCache.set(size, (await renderSvg(page, macSvg, size)).png);
    }
    writeFileSync(join(iconsetDir, filename), macCache.get(size));
  }
  // Save a preview of the 1024 macOS icon for visual inspection (not needed in bundle, kept clean in temp or checked)
  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', join(iconsDir, 'icon.icns')]);

  console.log('Generated desktop icons: icon.png, icon-256.png, icon.ico, icon.icns');
} finally {
  await browser.close();
  rmSync(tempDir, { recursive: true, force: true });
}
