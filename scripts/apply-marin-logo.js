// Regenerate every launcher/mod icon & logo asset from the single source of
// truth: assets/MarinLogo.png. Run with: node scripts/apply-marin-logo.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const SRC = path.join(ASSETS, 'MarinLogo.png');
const MOD_GUI = path.join(ROOT, 'marinmc-client-mod', 'src', 'main', 'resources', 'assets', 'marinmc-client', 'textures', 'gui');
const SCRATCH = process.env.MARIN_SCRATCH || ASSETS;

const DARK_BG = { r: 12, g: 15, b: 24, alpha: 1 }; // #0c0f18 for formats without alpha

async function png(size, dest) {
  await sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(dest);
  console.log('  ✓', path.relative(ROOT, dest), `(${size}x${size})`);
}

// Wrap a 256x256 PNG buffer in a single-image Windows ICO container.
function createIco(pngBuffer) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuffer.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBuffer]);
}

// 24-bit BMP from raw RGBA (bottom-up, BGR).
function createBmp(rawData, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelDataSize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const s = (srcRow * width + x) * 4;
      const d = 54 + y * rowSize + x * 3;
      buffer[d] = rawData[s + 2];
      buffer[d + 1] = rawData[s + 1];
      buffer[d + 2] = rawData[s];
    }
  }
  return buffer;
}

async function run() {
  if (!fs.existsSync(SRC)) throw new Error('Missing source: ' + SRC);
  console.log('Applying MarinLogo.png everywhere...\n');

  // Renderer logos (used by MarinLogo.tsx + README)
  await png(256, path.join(ASSETS, 'logo.png'));
  await png(256, path.join(ASSETS, 'logo-purple.png'));

  // App icons
  await png(512, path.join(ASSETS, 'icon.png'));
  await png(32, path.join(ASSETS, 'tray-icon.png'));
  await png(64, path.join(ASSETS, 'favicon.png'));

  // Windows .ico (256)
  const icoPng = await sharp(SRC).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS, 'icon.ico'), createIco(icoPng));
  console.log('  ✓ assets/icon.ico (256x256)');

  // macOS .icns (electron-builder converts the 512 PNG at build time)
  const icnsPng = await sharp(SRC).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS, 'icon.icns'), icnsPng);
  console.log('  ✓ assets/icon.icns (512 PNG)');

  // NSIS installer sidebar (164x314, no alpha -> dark bg, logo centered top)
  const logoForSidebar = await sharp(SRC).resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const sidebar = await sharp({ create: { width: 164, height: 314, channels: 4, background: DARK_BG } })
    .composite([{ input: logoForSidebar, top: 30, left: 22 }])
    .raw().toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(ASSETS, 'installer-sidebar.bmp'), createBmp(sidebar.data, 164, 314));
  console.log('  ✓ assets/installer-sidebar.bmp (164x314)');

  // Client mod menu/title logo texture
  if (fs.existsSync(MOD_GUI)) {
    await png(128, path.join(MOD_GUI, 'logo.png'));
  }

  // Small base64 for the splash screen (inlined into splash.html)
  const splashBuf = await sharp(SRC).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const dataUri = 'data:image/png;base64,' + splashBuf.toString('base64');
  fs.writeFileSync(path.join(SCRATCH, 'splash-logo.b64.txt'), dataUri);
  console.log('  ✓ splash-logo.b64.txt (', (dataUri.length / 1024).toFixed(1), 'KB )');

  console.log('\n✅ Done. MarinLogo.png is now the single source for all icons/logos.');
}

run().catch((e) => { console.error(e); process.exit(1); });
