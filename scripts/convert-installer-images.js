/**
 * Convert installer images to NSIS-compatible 24-bit BMPs
 * Sidebar: 164x314, Header: 150x57
 */
const sharp = require('sharp');
const path = require('path');

const SIDEBAR_SRC = 'C:\\Users\\musba\\.gemini\\antigravity\\brain\\7c82a7ce-1a30-4eba-aa7f-97f2aaa4d287\\installer_sidebar_new_1781130159127.png';
const HEADER_SRC = 'C:\\Users\\musba\\.gemini\\antigravity\\brain\\7c82a7ce-1a30-4eba-aa7f-97f2aaa4d287\\installer_header_new_1781130167438.png';

async function convert() {
  // Sidebar: 164x314 24-bit BMP (bottom-up, no alpha)
  await sharp(SIDEBAR_SRC)
    .resize(164, 314, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 12, g: 9, b: 24 } })
    .toFile(path.join(__dirname, '..', 'build', 'installerSidebar.bmp'));
  
  console.log('✓ Sidebar: 164x314 BMP');

  // Also save PNG version
  await sharp(SIDEBAR_SRC)
    .resize(164, 314, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(__dirname, '..', 'build', 'installerSidebar.png'));

  // Header: 150x57 24-bit BMP
  await sharp(HEADER_SRC)
    .resize(150, 57, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 15, g: 11, b: 30 } })
    .toFile(path.join(__dirname, '..', 'build', 'installerHeader.bmp'));
  
  console.log('✓ Header: 150x57 BMP');

  // Also save PNG version
  await sharp(HEADER_SRC)
    .resize(150, 57, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(__dirname, '..', 'build', 'installerHeader.png'));

  console.log('✓ All images converted successfully!');
}

convert().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
