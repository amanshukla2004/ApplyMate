import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // Construct uncompressed IDAT data with filter byte 0 per scanline
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table & calculator
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

// #TODO: [Brand & Identity]
// Design official custom SVG and PNG icons for HapplyMate:
// 16x16, 32x32, 48x48, 128x128 with modern joyful copilot branding.

// Generate the HapplyMate icon
// Gradient: #8B74F0 (Lilac) to #6366F1 (Indigo)
// Glyph: Modern Geometric Monogram with upward launch trajectory and smile curve
function renderApplyMatePixel(x, y, w, h) {
  const nx = (x + 0.5) / w;
  const ny = (y + 0.5) / h;

  // Squircle / Rounded rectangle distance
  const radius = 0.22;
  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - radius));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - radius));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > radius) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Smooth anti-aliased edge
  const edgeAlpha = Math.min(1, Math.max(0, (radius - dist) * w));

  // Background Gradient from Lilac (#8B74F0) to Indigo (#6366F1)
  const t = (nx + ny) / 2;
  const rBg = Math.round(139 * (1 - t) + 99 * t);
  const gBg = Math.round(116 * (1 - t) + 102 * t);
  const bBg = Math.round(240 * (1 - t) + 241 * t);

  // ApplyMate "A" Monogram + Arrow Geometry
  // Centered in normalized coordinates (0.5, 0.5)
  const px = nx - 0.5;
  const py = ny - 0.5;

  let isGlyph = false;

  // Outer "A" triangle shape
  const apexY = -0.30;
  const baseY = 0.28;
  const slope = 0.65; // width expansion factor

  if (py >= apexY && py <= baseY) {
    const halfWidth = (py - apexY) * slope;
    if (Math.abs(px) <= halfWidth) {
      isGlyph = true;

      // Cutout 1: Inner triangular window of the "A"
      const innerApexY = -0.10;
      const innerBaseY = 0.12;
      if (py >= innerApexY && py <= innerBaseY) {
        const innerHalfWidth = (py - innerApexY) * (slope * 0.7);
        if (Math.abs(px) <= innerHalfWidth) {
          isGlyph = false;
        }
      }

      // Cutout 2: Bottom center arch of the "A"
      const archTopY = 0.16;
      if (py >= archTopY) {
        const archHalfWidth = (py - archTopY) * 0.9;
        if (Math.abs(px) <= archHalfWidth) {
          isGlyph = false;
        }
      }
    }
  }

  // Right dynamic launch wing / lightning streak
  // A forward-leaning lightning notch in the "A" crossbar
  if (py >= -0.02 && py <= 0.14 && px >= -0.12 && px <= 0.16) {
    isGlyph = true;
  }

  if (isGlyph) {
    // Pure White Glyph with high contrast
    return [255, 255, 255, Math.round(255 * edgeAlpha)];
  }

  return [rBg, gBg, bBg, Math.round(255 * edgeAlpha)];
}

const iconsDir = path.resolve('extension/public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const buf = createPNG(size, size, renderApplyMatePixel);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated ${outPath} (${buf.length} bytes)`);
});

// Also generate high-resolution SVG logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="applymate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B74F0"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#8B74F0" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#applymate-grad)" filter="url(#shadow)"/>
  <!-- Modern Geometric "A" with upward launch trajectory -->
  <path d="M64 24 L34 94 H48 L55 76 H73 L80 94 H94 Z M64 45 L70 64 H58 Z" fill="#ffffff"/>
  <!-- Dynamic Launch Accent -->
  <path d="M52 64 L78 64 L64 36 Z" fill="#8B74F0" opacity="0.3"/>
  <path d="M66 58 L76 74 L58 74 Z" fill="#ffffff"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'logo.svg'), svgContent);
console.log('Generated extension/public/icons/logo.svg');
