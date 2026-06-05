const sharp = require('sharp');

const file = 'd:/Projects/Launcher/new-design/download (3).png';

async function inspect() {
  const image = sharp(file);
  const { width, height } = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const getPixel = (x, y) => {
    const idx = (y * width + x) * channels;
    return {
      r: data[idx],
      g: data[idx+1],
      b: data[idx+2],
      hex: '#' + [data[idx], data[idx+1], data[idx+2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    };
  };

  const y = 300;
  console.log(`Horizontal profile at y = ${y}:`);
  const step = Math.floor(width / 20);
  for (let x = 0; x < width; x += step) {
    console.log(`x = ${x} (${Math.round(x/width*100)}%): ${getPixel(x, y).hex}`);
  }
}

inspect().catch(console.error);
