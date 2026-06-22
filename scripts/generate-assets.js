const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Base SVG logo for MarinMC - stylized 'M' with blue-purple gradient on dark background
function createLogoSvg(width, height, opts = {}) {
  const { roundedCorners = true, rx = Math.round(width * 0.195) } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${roundedCorners ? 100 : 0}" fill="#131622"/>
  <path d="M 140,360 L 140,170 L 220,270 L 256,230 L 292,270 L 372,170 L 372,360" stroke="url(#g)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="256" cy="150" r="22" fill="#3B82F6"/>
</svg>`;
}

// Splash background SVG - dark bg with centered logo area and subtle vignette
function createSplashSvg(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f1219"/>
      <stop offset="100%" stop-color="#131622"/>
    </linearGradient>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="40%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <!-- Centered M logo scaled down -->
  <g transform="translate(${width / 2 - 60}, ${height / 2 - 70}) scale(0.234375)">
    <rect width="512" height="512" rx="80" fill="none"/>
    <path d="M 140,360 L 140,170 L 220,270 L 256,230 L 292,270 L 372,170 L 372,360" stroke="url(#g)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="256" cy="150" r="22" fill="#3B82F6"/>
  </g>
  <!-- Text placeholder below logo -->
  <text x="${width / 2}" y="${height / 2 + 55}" font-family="Arial, sans-serif" font-size="18" fill="#6B7280" text-anchor="middle" font-weight="600">MarinMC Launcher</text>
  <!-- Subtle bottom line -->
  <rect x="${width / 2 - 60}" y="${height - 30}" width="120" height="2" rx="1" fill="#3B82F6" opacity="0.3"/>
</svg>`;
}

// Installer sidebar SVG - tall narrow dark panel with logo and text
function createSidebarSvg(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="sbg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#131622"/>
      <stop offset="100%" stop-color="#0c0f18"/>
    </linearGradient>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sbg)"/>
  <!-- Logo at top -->
  <g transform="translate(${width / 2 - 40}, 40) scale(0.15625)">
    <path d="M 140,360 L 140,170 L 220,270 L 256,230 L 292,270 L 372,170 L 372,360" stroke="url(#g)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="256" cy="150" r="22" fill="#3B82F6"/>
  </g>
  <!-- App name -->
  <text x="${width / 2}" y="145" font-family="Arial, sans-serif" font-size="14" fill="#e2e8f0" text-anchor="middle" font-weight="700">MarinMC</text>
  <text x="${width / 2}" y="163" font-family="Arial, sans-serif" font-size="10" fill="#6B7280" text-anchor="middle">Launcher</text>
  <!-- Decorative gradient line -->
  <rect x="30" y="180" width="${width - 60}" height="2" rx="1" fill="url(#g)" opacity="0.4"/>
  <!-- Version text at bottom -->
  <text x="${width / 2}" y="${height - 20}" font-family="Arial, sans-serif" font-size="9" fill="#4B5563" text-anchor="middle">v1.0.0</text>
</svg>`;
}

async function generateAssets() {
  console.log('Generating MarinMC Launcher assets...\n');

  // 1. icon.png (512x512)
  console.log('1. Generating icon.png (512x512)...');
  const iconSvg = Buffer.from(createLogoSvg(512, 512));
  await sharp(iconSvg).resize(512, 512).png().toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('   ✓ icon.png created');

  // 2. tray-icon.png (32x32)
  console.log('2. Generating tray-icon.png (32x32)...');
  const traySvg = Buffer.from(createLogoSvg(32, 32, { rx: 6 }));
  await sharp(traySvg).resize(32, 32).png().toFile(path.join(ASSETS_DIR, 'tray-icon.png'));
  console.log('   ✓ tray-icon.png created');

  // 4. installer-sidebar.bmp (164x314)
  console.log('4. Generating installer-sidebar.bmp (164x314)...');
  const sidebarSvg = Buffer.from(createSidebarSvg(164, 314));
  // Sharp doesn't natively output BMP, so we'll create a PNG first,
  // then use raw pixel data to construct a BMP manually
  const sidebarPng = await sharp(sidebarSvg)
    .resize(164, 314)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build a 24-bit BMP file manually
  const bmpBuffer = createBmp(sidebarPng.data, 164, 314);
  fs.writeFileSync(path.join(ASSETS_DIR, 'installer-sidebar.bmp'), bmpBuffer);
  console.log('   ✓ installer-sidebar.bmp created');

  // 5. icon.ico - convert a 256x256 PNG to a proper .ico file
  console.log('5. Generating icon.ico (256x256 ICO)...');
  const ico256Svg = Buffer.from(createLogoSvg(256, 256));
  const icoPng = await sharp(ico256Svg).resize(256, 256).png().toBuffer();
  const icoBuffer = createIco(icoPng);
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), icoBuffer);
  console.log('   ✓ icon.ico created');

  // 6. icon.icns - copy the 512x512 PNG as .icns (electron-builder will handle proper conversion)
  console.log('6. Generating icon.icns (512x512 PNG placeholder)...');
  const icnsPng = await sharp(iconSvg).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.icns'), icnsPng);
  console.log('   ✓ icon.icns created');

  // Verify all files
  console.log('\n--- Verification ---');
  const expectedFiles = [
    'icon.png', 'tray-icon.png',
    'installer-sidebar.bmp', 'icon.ico', 'icon.icns',
    'logo.svg'
  ];
  let allGood = true;
  for (const file of expectedFiles) {
    const filePath = path.join(ASSETS_DIR, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`   ✗ ${file} MISSING!`);
      allGood = false;
    }
  }
  console.log(allGood ? '\n✅ All assets generated successfully!' : '\n❌ Some assets are missing!');
}

// Helper: Create a 24-bit BMP from raw RGBA pixel buffer
function createBmp(rawData, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows padded to 4-byte boundary
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (info header) + pixel data

  const buffer = Buffer.alloc(fileSize);

  // BMP File Header (14 bytes)
  buffer.write('BM', 0);                     // Signature
  buffer.writeUInt32LE(fileSize, 2);          // File size
  buffer.writeUInt32LE(0, 6);                 // Reserved
  buffer.writeUInt32LE(54, 10);               // Pixel data offset

  // BMP Info Header (40 bytes)
  buffer.writeUInt32LE(40, 14);               // Info header size
  buffer.writeInt32LE(width, 18);             // Width
  buffer.writeInt32LE(height, 22);            // Height (positive = bottom-up)
  buffer.writeUInt16LE(1, 26);                // Color planes
  buffer.writeUInt16LE(24, 28);               // Bits per pixel
  buffer.writeUInt32LE(0, 30);                // Compression (none)
  buffer.writeUInt32LE(pixelDataSize, 34);    // Image size
  buffer.writeInt32LE(2835, 38);              // X pixels per meter
  buffer.writeInt32LE(2835, 42);              // Y pixels per meter
  buffer.writeUInt32LE(0, 46);                // Colors used
  buffer.writeUInt32LE(0, 50);                // Important colors

  // Pixel data (bottom-up, BGR format)
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y); // BMP is bottom-up
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4; // RGBA
      const dstIdx = 54 + y * rowSize + x * 3;
      // Convert RGBA to BGR
      buffer[dstIdx + 0] = rawData[srcIdx + 2]; // B
      buffer[dstIdx + 1] = rawData[srcIdx + 1]; // G
      buffer[dstIdx + 2] = rawData[srcIdx + 0]; // R
    }
  }

  return buffer;
}

// Helper: Wrap PNG buffer in a single-image Windows ICO container
function createIco(pngBuffer) {
  const header = Buffer.alloc(22);
  
  // ICO Header
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 = icon)
  header.writeUInt16LE(1, 4); // Number of images (1)
  
  // Directory Entry
  header.writeUInt8(0, 6); // Width (0 = 256)
  header.writeUInt8(0, 7); // Height (0 = 256)
  header.writeUInt8(0, 8); // Color count (0 = >=256 colors)
  header.writeUInt8(0, 9); // Reserved
  header.writeUInt16LE(1, 10); // Color planes (1)
  header.writeUInt16LE(32, 12); // Bits per pixel (32)
  header.writeUInt32LE(pngBuffer.length, 14); // Image size
  header.writeUInt32LE(22, 18); // Image offset
  
  return Buffer.concat([header, pngBuffer]);
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
