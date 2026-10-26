const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG encoder in pure Node.js
function createPNG(width, height, r, g, b, a = 255) {
  // A simple solid/bordered color PNG with bookmark ribbon design
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Draw rounded card with bookmark badge
      const cx = width / 2;
      const cy = height / 2;
      const rx = (width * 0.4);
      const ry = (height * 0.4);
      
      const insideSquare = Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
      
      // Bookmark ribbon in center
      const inRibbonX = Math.abs(x - cx) <= (width * 0.22);
      const inRibbonY = y >= (height * 0.2) && y <= (height * 0.8);
      const inRibbonNotch = y > (height * 0.65) && Math.abs(x - cx) < (height * 0.8 - y);

      if (insideSquare) {
        if (inRibbonX && inRibbonY && !inRibbonNotch) {
          // Bookmark color: Emerald / White
          rawData[pixelOffset] = 16;      // R
          rawData[pixelOffset + 1] = 185;  // G
          rawData[pixelOffset + 2] = 129;  // B
          rawData[pixelOffset + 3] = 255;  // A
        } else {
          // Card background: Dark Slate
          rawData[pixelOffset] = 24;      // R
          rawData[pixelOffset + 1] = 24;  // G
          rawData[pixelOffset + 2] = 27;  // B
          rawData[pixelOffset + 3] = 255;  // A
        }
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = createPNG(size, size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
