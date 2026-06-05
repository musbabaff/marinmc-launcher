const sharp = require('sharp');

const file = 'd:/Projects/Launcher/new-design/download (10).png';

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

  const bgHex = '#060305';

  const components = [];
  const visited = Array.from({ length: height }, () => Array(width).fill(false));

  for (let y = 50; y < height - 50; y += 4) {
    for (let x = 50; x < width - 50; x += 4) {
      if (visited[y][x]) continue;
      
      const px = getPixel(x, y);
      if (px.hex !== bgHex && px.hex !== '#070406' && px.hex !== '#050305') {
        let minX = x, maxX = x, minY = y, maxY = y;
        
        let tx = x;
        while (tx < width - 50) {
          const checkPx = getPixel(tx, y);
          if (checkPx.hex === bgHex || checkPx.hex === '#070406' || checkPx.hex === '#050305') break;
          maxX = tx;
          tx += 4;
        }
        
        let ty = y;
        while (ty < height - 50) {
          const midX = Math.floor((minX + maxX) / 2);
          const checkPx = getPixel(midX, ty);
          if (checkPx.hex === bgHex || checkPx.hex === '#070406' || checkPx.hex === '#050305') break;
          maxY = ty;
          ty += 4;
        }
        
        for (let cy = minY; cy <= maxY; cy += 4) {
          for (let cx = minX; cx <= maxX; cx += 4) {
            if (cy < height && cx < width) visited[cy][cx] = true;
          }
        }
        
        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 100 && h > 25) {
          const midX = Math.floor((minX + maxX) / 2);
          const midY = Math.floor((minY + maxY) / 2);
          const centerColor = getPixel(midX, midY).hex;
          components.push({ minX, maxX, minY, maxY, w, h, color: centerColor });
        }
      }
    }
  }

  console.log(`Found ${components.length} UI components across the full screen:`);
  components.forEach((c, idx) => {
    console.log(`[Component ${idx+1}] Left: ${c.minX}, Right: ${c.maxX}, Top: ${c.minY}, Bottom: ${c.maxY} | Size: ${c.w}x${c.h}px | Center Color: ${c.color}`);
  });
}

inspect().catch(console.error);
