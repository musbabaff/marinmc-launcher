const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function makeIco() {
    const srcPng = path.join(__dirname, '../assets/icon.png');
    const destIco = path.join(__dirname, '../assets/icon.ico');
    
    console.log('Generating 256x256 PNG for ICO...');
    const png256Buf = await sharp(srcPng)
        .resize(256, 256)
        .png()
        .toBuffer();
        
    const size = png256Buf.length;
    console.log(`PNG size: ${size} bytes`);
    
    const header = Buffer.alloc(22);
    // Directory Header
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = ICO)
    header.writeUInt16LE(1, 4); // Number of images (1)
    
    // Directory Entry
    header.writeUInt8(0, 6);      // Width (0 = 256)
    header.writeUInt8(0, 7);      // Height (0 = 256)
    header.writeUInt8(0, 8);      // Color count (0 = no palette)
    header.writeUInt8(0, 9);      // Reserved
    header.writeUInt16LE(1, 10);  // Color planes (1)
    header.writeUInt16LE(32, 12); // Bits per pixel (32)
    header.writeUInt32LE(size, 14); // Image size in bytes
    header.writeUInt32LE(22, 18);   // Image offset (22)
    
    const icoBuf = Buffer.concat([header, png256Buf]);
    fs.writeFileSync(destIco, icoBuf);
    console.log(`Successfully generated real ICO file at: ${destIco}`);
}

makeIco().catch(err => {
    console.error('Error generating ICO:', err);
    process.exit(1);
});
