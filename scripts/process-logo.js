const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_IMAGE = 'C:\\Users\\musba\\.gemini\\antigravity\\brain\\7c82a7ce-1a30-4eba-aa7f-97f2aaa4d287\\media__1781140516350.png';

async function processLogo() {
  console.log('Processing logo from:', SRC_IMAGE);
  
  // 1. Load metadata to get dimensions
  const metadata = await sharp(SRC_IMAGE).metadata();
  const { width, height } = metadata;
  console.log(`Original dimensions: ${width}x${height}`);

  // 2. Extract binary mask of the logo (logo is black/dark, bg is light)
  // Convert to greyscale, negate (black becomes white, light grey becomes dark grey), 
  // then threshold to get pure white shape on pure black background.
  const maskBuffer = await sharp(SRC_IMAGE)
    .greyscale()
    .negate()
    .threshold(128)
    .raw()
    .toBuffer();

  // Helper to create a solid color image with our mask as alpha channel
  async function createColoredLogo(r, g, b) {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r, g, b }
      }
    })
    .raw()
    .toBuffer()
    .then(colorData => {
      // Create 4-channel image by combining color data and alpha mask
      return sharp(colorData, {
        raw: { width, height, channels: 3 }
      })
      .joinChannel(maskBuffer, {
        raw: { width, height, channels: 1 }
      })
      .png()
      .toBuffer();
    });
  }

  // Generate white logo on transparent background
  const whiteLogoBuffer = await createColoredLogo(255, 255, 255);
  // Generate purple logo (#8B5CF6 -> r: 139, g: 92, b: 246)
  const purpleLogoBuffer = await createColoredLogo(139, 92, 246);

  console.log('✓ White and Purple transparent logo buffers generated');

  // 3. Save to assets directory
  const assetsDir = path.join(__dirname, '..', 'assets');
  
  // Save logo.png (white version)
  const logoPngPath = path.join(assetsDir, 'logo.png');
  fs.writeFileSync(logoPngPath, whiteLogoBuffer);
  console.log('✓ Saved assets/logo.png (white)');

  // Save logo-purple.png
  const logoPurplePngPath = path.join(assetsDir, 'logo-purple.png');
  fs.writeFileSync(logoPurplePngPath, purpleLogoBuffer);
  console.log('✓ Saved assets/logo-purple.png (purple)');

  // Save logo.svg (rounded square with embedded new logo)
  const base64Logo = whiteLogoBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA" />
      <stop offset="50%" stop-color="#2D7DD2" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0a10" />
      <stop offset="100%" stop-color="#060305" />
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#bgGrad)" stroke="url(#logoGrad)" stroke-width="1.5" opacity="0.95"/>
  <!-- Embedded custom logo -->
  <image href="data:image/png;base64,${base64Logo}" x="22" y="22" width="56" height="56" />
</svg>`;
  fs.writeFileSync(path.join(assetsDir, 'logo.svg'), svgContent);
  console.log('✓ Saved assets/logo.svg with embedded new logo');

  // 4. Update launcher icon.png (normally 512x512 with transparent background and centered logo)
  const iconPngBuffer = await sharp(whiteLogoBuffer)
    .resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 66, bottom: 66, left: 66, right: 66,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconPngBuffer);
  console.log('✓ Updated assets/icon.png');

  // 5. Update tray-icon.png (small)
  const trayIconBuffer = await sharp(whiteLogoBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), trayIconBuffer);
  console.log('✓ Updated assets/tray-icon.png');

  // 6. Update icon.ico (using our direct PNG-in-ICO writer)
  const iconIcoBuffer = pngToIco(iconPngBuffer);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), iconIcoBuffer);
  console.log('✓ Updated assets/icon.ico');

  // 7. Also build the installer sidebar and header using the new logo!
  console.log('Updating installer sidebar and header images...');
  await generateInstallerImages(whiteLogoBuffer, assetsDir);

  console.log('✓ All logo assets updated successfully!');
}

// Simple PNG-to-ICO writer for a 256x256 size (scaled from the 512x512 png)
function pngToIco(pngBuffer) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
  icoHeader.writeUInt16LE(1, 4); // Number of images (1)

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0); // Width (0 means 256)
  dirEntry.writeUInt8(0, 1); // Height (0 means 256)
  dirEntry.writeUInt8(0, 2); // Colors (0 = no palette)
  dirEntry.writeUInt8(0, 3); // Reserved (0)
  dirEntry.writeUInt16LE(1, 4); // Color planes (1)
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel (32)
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Image data size
  dirEntry.writeUInt32LE(22, 12); // Image data offset (6 header + 16 dir entry = 22)

  return Buffer.concat([icoHeader, dirEntry, pngBuffer]);
}

async function generateInstallerImages(logoBuffer, assetsDir) {
  const buildDir = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  // Sidebar: 164x314. Dark deep purple background, new white logo in center with glowing aura
  const sidebarWidth = 164;
  const sidebarHeight = 314;

  const sidebarBase = await sharp({
    create: {
      width: sidebarWidth,
      height: sidebarHeight,
      channels: 3,
      background: { r: 12, g: 9, b: 24 } // #0C0918
    }
  })
  .raw()
  .toBuffer();

  const resizedLogoForSidebar = await sharp(logoBuffer)
    .resize(80, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite the logo in the center of sidebar
  const sidebarPng = await sharp(sidebarBase, { raw: { width: sidebarWidth, height: sidebarHeight, channels: 3 } })
    .composite([{
      input: resizedLogoForSidebar,
      top: 117, // Center vertically (314 - 80) / 2 = 117
      left: 42  // Center horizontally (164 - 80) / 2 = 42
    }])
    .png()
    .toBuffer();

  // Save as BMP (24-bit, bottom-up, no alpha) for NSIS
  await sharp(sidebarPng)
    .flatten({ background: { r: 12, g: 9, b: 24 } })
    .toFile(path.join(buildDir, 'installerSidebar.bmp'));

  await sharp(sidebarPng)
    .toFile(path.join(buildDir, 'installerSidebar.png'));

  console.log('✓ Sidebar BMP & PNG generated with new logo');

  // Header: 150x57. Very wide and short. Dark gradient. Small logo on the right side.
  const headerWidth = 150;
  const headerHeight = 57;

  const headerBase = await sharp({
    create: {
      width: headerWidth,
      height: headerHeight,
      channels: 3,
      background: { r: 15, g: 11, b: 30 } // #0F0B1E
    }
  })
  .raw()
  .toBuffer();

  const resizedLogoForHeader = await sharp(logoBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const headerPng = await sharp(headerBase, { raw: { width: headerWidth, height: headerHeight, channels: 3 } })
    .composite([{
      input: resizedLogoForHeader,
      top: 12,   // Center vertically (57 - 32) / 2 = 12.5 -> 12
      left: 108  // Align to right side
    }])
    .png()
    .toBuffer();

  // Save as BMP
  await sharp(headerPng)
    .flatten({ background: { r: 15, g: 11, b: 30 } })
    .toFile(path.join(buildDir, 'installerHeader.bmp'));

  await sharp(headerPng)
    .toFile(path.join(buildDir, 'installerHeader.png'));

  console.log('✓ Header BMP & PNG generated with new logo');
}

processLogo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
