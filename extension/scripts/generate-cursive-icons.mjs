import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

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

// Distance from point (px, py) to line segment (ax, ay) -> (bx, by)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// High-fidelity sampled cursive 'h' paths
// Path 1: Stem loop (entry sweep -> ascending loop -> vertical stem down)
const stemPath = [
  [0.26, 0.70],
  [0.30, 0.60],
  [0.35, 0.48],
  [0.41, 0.34],
  [0.47, 0.22],
  [0.51, 0.16],
  [0.55, 0.14],
  [0.58, 0.16],
  [0.58, 0.22],
  [0.55, 0.32],
  [0.50, 0.46],
  [0.45, 0.62],
  [0.41, 0.76],
  [0.39, 0.82]
];

// Path 2: Arch & exit flick (branches from mid-stem -> climbs into shoulder arch -> right leg -> playful exit flick)
const archPath = [
  [0.44, 0.64],
  [0.49, 0.52],
  [0.56, 0.43],
  [0.64, 0.40],
  [0.71, 0.43],
  [0.75, 0.52],
  [0.75, 0.65],
  [0.73, 0.78],
  [0.77, 0.80],
  [0.84, 0.75]
];

// Cheerful accent sparkle at top-right
const sparkX = 0.77;
const sparkY = 0.22;
const sparkRadius = 0.045;

function renderHappliedCursivePixel(x, y, w, h) {
  const nx = (x + 0.5) / w;
  const ny = (y + 0.5) / h;

  // Squircle distance (rounded rectangle with radius 0.26)
  const radius = 0.25;
  const qx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - radius));
  const qy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - radius));
  const distSquircle = Math.hypot(qx, qy);

  if (distSquircle > radius) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  const squircleAlpha = Math.min(1, Math.max(0, (radius - distSquircle) * w));

  // Warm Charcoal Brand Gradient: #4C4541 (top-left) to #262322 (bottom-right)
  const t = (nx + ny) / 2;
  let rBg = Math.round(76 * (1 - t) + 38 * t);
  let gBg = Math.round(69 * (1 - t) + 35 * t);
  let bBg = Math.round(65 * (1 - t) + 34 * t);

  // Subtle glass highlight sheen on the upper half
  if (ny < 0.5) {
    const sheen = (1 - ny / 0.5) * 0.16;
    rBg = Math.round(rBg * (1 - sheen) + 255 * sheen);
    gBg = Math.round(gBg * (1 - sheen) + 255 * sheen);
    bBg = Math.round(bBg * (1 - sheen) + 255 * sheen);
  }

  // Calculate distance to cursive 'h' strokes
  let minStrokeDist = Infinity;
  for (let i = 0; i < stemPath.length - 1; i++) {
    const d = distToSegment(nx, ny, stemPath[i][0], stemPath[i][1], stemPath[i+1][0], stemPath[i+1][1]);
    if (d < minStrokeDist) minStrokeDist = d;
  }
  for (let i = 0; i < archPath.length - 1; i++) {
    const d = distToSegment(nx, ny, archPath[i][0], archPath[i][1], archPath[i+1][0], archPath[i+1][1]);
    if (d < minStrokeDist) minStrokeDist = d;
  }

  // Adaptive stroke width: 0.046 normalized width
  const strokeRadius = 0.048;
  const strokeAlpha = Math.min(1, Math.max(0, (strokeRadius - minStrokeDist) * w + 0.4));

  // Accent spark dot
  const distSpark = Math.hypot(nx - sparkX, ny - sparkY);
  const sparkAlpha = Math.min(1, Math.max(0, (sparkRadius - distSpark) * w + 0.4));

  // Base background
  let finalR = rBg;
  let finalG = gBg;
  let finalB = bBg;

  // Gold spark: #F2C46A
  if (sparkAlpha > 0) {
    const sR = 242;
    const sG = 196;
    const sB = 106;
    finalR = Math.round(finalR * (1 - sparkAlpha) + sR * sparkAlpha);
    finalG = Math.round(finalG * (1 - sparkAlpha) + sG * sparkAlpha);
    finalB = Math.round(finalB * (1 - sparkAlpha) + sB * sparkAlpha);
  }

  // Cursive 'h' stroke: Crisp Warm Cream (#FFFDF8 / #FCF0DA)
  if (strokeAlpha > 0) {
    const hR = 255;
    const hG = 251;
    const hB = 242;
    finalR = Math.round(finalR * (1 - strokeAlpha) + hR * strokeAlpha);
    finalG = Math.round(finalG * (1 - strokeAlpha) + hG * strokeAlpha);
    finalB = Math.round(finalB * (1 - strokeAlpha) + hB * strokeAlpha);
  }

  return [finalR, finalG, finalB, Math.round(255 * squircleAlpha)];
}

// Convert 16x16 PNG to simple ICO format
function createICO(pngBuffer) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(16, 0); // Width 16
  icoEntry.writeUInt8(16, 1); // Height 16
  icoEntry.writeUInt8(0, 2);  // Color count 0
  icoEntry.writeUInt8(0, 3);  // Reserved
  icoEntry.writeUInt16LE(1, 4); // Color planes
  icoEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoEntry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  icoEntry.writeUInt32LE(22, 12); // Offset (6 header + 16 entry = 22)

  return Buffer.concat([icoHeader, icoEntry, pngBuffer]);
}

// Generate the vector SVG version (for crisp scalable SVG favicons)
const svgVectorContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="happlied-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4C4541"/>
      <stop offset="50%" stop-color="#383330"/>
      <stop offset="100%" stop-color="#24201E"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Charcoal Squircle Container -->
  <rect width="128" height="128" rx="34" fill="url(#happlied-bg)" filter="url(#shadow)"/>
  <rect width="128" height="64" rx="34" fill="url(#sheen)"/>

  <!-- Cursive 'h' Ascender Loop and Vertical Stem -->
  <path d="M 33 89 C 40 76, 50 48, 58 28 C 63 17, 70 16, 74 21 C 77 27, 73 40, 65 58 L 52 98 C 50 102, 53 103, 56 96 L 62 76 C 68 58, 80 50, 90 52 C 100 54, 103 66, 99 80 L 95 94 C 94 99, 100 102, 106 96"
        fill="none"
        stroke="#FCF0DA"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"/>

  <!-- Cheerful Warm Gold Spark Accent -->
  <circle cx="98" cy="28" r="6" fill="#F2C46A"/>
</svg>`;

// Destination directories
const targets = [
  path.resolve('extension/public'),
  path.resolve('extension/dist')
];

for (const dir of targets) {
  const iconsDir = path.join(dir, 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // 1. Write vector SVG favicon and logo
  fs.writeFileSync(path.join(dir, 'favicon.svg'), svgVectorContent);
  fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), svgVectorContent);
  fs.writeFileSync(path.join(iconsDir, 'logo.svg'), svgVectorContent);

  // 2. Write PNGs
  let png16 = null;
  let png32 = null;
  [16, 32, 48, 128].forEach((size) => {
    const buf = createPNG(size, size, renderHappliedCursivePixel);
    const outPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`Generated ${outPath} (${buf.length} bytes)`);
    if (size === 16) png16 = buf;
    if (size === 32) png32 = buf;
  });

  // 3. Write favicon.png and favicon.ico
  if (png32) {
    fs.writeFileSync(path.join(dir, 'favicon.png'), png32);
  }
  if (png16) {
    const icoBuf = createICO(png16);
    fs.writeFileSync(path.join(dir, 'favicon.ico'), icoBuf);
  }
}

console.log('All cursive h icons, favicons, SVGs, and ICO generated successfully!');
