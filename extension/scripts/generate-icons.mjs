import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extRoot = path.resolve(__dirname, '..');

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
const crc32 = (b) => {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
};

function chunk(type, data) {
  const c = Buffer.alloc(12 + data.length);
  c.writeUInt32BE(data.length, 0);
  c.write(type, 4, 4, 'ascii');
  data.copy(c, 8);
  c.writeInt32BE(crc32(c.subarray(4, 8 + data.length)), 8 + data.length);
  return c;
}

function png(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Convert PNG buffer to standard .ico container
function createICO(pngBuffer) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image
  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(16, 0); // Width 16
  icoEntry.writeUInt8(16, 1); // Height 16
  icoEntry.writeUInt8(0, 2); // Color count 0
  icoEntry.writeUInt8(0, 3); // Reserved
  icoEntry.writeUInt16LE(1, 4); // Color planes
  icoEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoEntry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  icoEntry.writeUInt32LE(22, 12); // Offset (6 header + 16 entry = 22)
  return Buffer.concat([icoHeader, icoEntry, pngBuffer]);
}

// centripetal Catmull-Rom -> dense smooth polyline
function spline(pts, per = 40) {
  const P = [pts[0], ...pts, pts[pts.length - 1]],
    out = [];
  const d = (a, b) => Math.pow(Math.hypot(a[0] - b[0], a[1] - b[1]), 0.5);
  for (let i = 0; i < P.length - 3; i++) {
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    const t0 = 0,
      t1 = t0 + d(p0, p1) || 1e-4,
      t2 = t1 + d(p1, p2) || 1e-4,
      t3 = t2 + d(p2, p3) || 1e-4;
    for (let s = 0; s < per; s++) {
      const t = t1 + ((t2 - t1) * s) / per,
        pt = [0, 1].map((k) => {
          const A1 = ((t1 - t) / (t1 - t0)) * p0[k] + ((t - t0) / (t1 - t0)) * p1[k];
          const A2 = ((t2 - t) / (t2 - t1)) * p1[k] + ((t - t1) / (t2 - t1)) * p2[k];
          const A3 = ((t3 - t) / (t3 - t2)) * p2[k] + ((t - t2) / (t3 - t2)) * p3[k];
          const B1 = ((t2 - t) / (t2 - t0)) * A1 + ((t - t0) / (t2 - t0)) * A2;
          const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3;
          return ((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2;
        });
      out.push(pt);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const pen = spline(
  [
    [0.25, 0.74],
    [0.31, 0.6],
    [0.38, 0.41],
    [0.45, 0.25],
    [0.51, 0.16],
    [0.57, 0.14],
    [0.6, 0.19],
    [0.57, 0.32],
    [0.51, 0.5],
    [0.46, 0.66],
    [0.42, 0.79],
    [0.405, 0.84],
    [0.425, 0.855],
    [0.46, 0.8],
    [0.5, 0.66],
    [0.55, 0.54],
    [0.62, 0.46],
    [0.69, 0.45],
    [0.74, 0.5],
    [0.755, 0.6],
    [0.75, 0.71],
    [0.745, 0.79],
    [0.78, 0.82],
    [0.85, 0.76],
  ],
  60
);

const segs = [];
for (let i = 0; i < pen.length - 1; i++) segs.push([...pen[i], ...pen[i + 1]]);

function dist(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax,
    dy = by - ay,
    l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const clamp = (v) => Math.min(1, Math.max(0, v));

function pixel(nx, ny, size) {
  const R = 0.25,
    qx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - R)),
    qy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - R));
  const dq = Math.hypot(qx, qy);
  const sq = clamp((R - dq) * size + 0.5);
  if (sq <= 0) return [0, 0, 0, 0];
  const t = (nx + ny) / 2;
  let r = 76 * (1 - t) + 38 * t,
    g = 69 * (1 - t) + 35 * t,
    b = 65 * (1 - t) + 34 * t;
  if (ny < 0.5) {
    const s = (1 - ny / 0.5) * 0.12;
    r = r * (1 - s) + 255 * s;
    g = g * (1 - s) + 255 * s;
    b = b * (1 - s) + 255 * s;
  }
  // stroke radius: at least ~1px wide on tiny sizes
  const sr = Math.max(0.048, 0.9 / size);
  let m = Infinity;
  for (const s of segs) {
    const d = dist(nx, ny, s);
    if (d < m) m = d;
  }
  const sA = clamp((sr - m) * size + 0.5);
  const spR = Math.max(0.045, 1.0 / size);
  const spA = clamp((spR - Math.hypot(nx - 0.77, ny - 0.22)) * size + 0.5);
  if (spA > 0) {
    r = r * (1 - spA) + 242 * spA;
    g = g * (1 - spA) + 196 * spA;
    b = b * (1 - spA) + 106 * spA;
  }
  if (sA > 0) {
    r = r * (1 - sA) + 255 * sA;
    g = g * (1 - sA) + 251 * sA;
    b = b * (1 - sA) + 242 * sA;
  }
  return [r, g, b, 255 * sq];
}

function render(size, ss = 3) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let R = 0,
        G = 0,
        B = 0,
        A = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const [r, g, b, a] = pixel((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size, size);
          R += r * a;
          G += g * a;
          B += b * a;
          A += a;
        }
      const o = (y * size + x) * 4;
      if (A > 0) {
        buf[o] = Math.round(R / A);
        buf[o + 1] = Math.round(G / A);
        buf[o + 2] = Math.round(B / A);
      }
      buf[o + 3] = Math.round(A / (ss * ss));
    }
  return png(size, size, buf);
}

// Generate vector SVG version matching the exact Catmull-Rom spline
function createVectorSVG() {
  const pathD = 'M ' + pen.map(([x, y]) => (x * 128).toFixed(1.5) + ' ' + (y * 128).toFixed(1.5)).join(' L ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="happlied-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4C4541"/>
      <stop offset="50%" stop-color="#383330"/>
      <stop offset="100%" stop-color="#24201E"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="32" fill="url(#happlied-bg)"/>
  <rect width="128" height="64" rx="32" fill="url(#sheen)"/>
  <path d="${pathD}" fill="none" stroke="#FFFDF8" stroke-width="8.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${(0.77 * 128).toFixed(1)}" cy="${(0.22 * 128).toFixed(1)}" r="5.7" fill="#F2C46A"/>
</svg>`;
}

// Destination directories: public and dist
const targets = [path.join(extRoot, 'public'), path.join(extRoot, 'dist')];

console.log('Rendering Catmull-Rom spline cursive "h" icons...');

// Pre-render icons
const renderedIcons = {};
const sizes = [16, 32, 48, 128, 512];
for (const s of sizes) {
  process.stdout.write(`Rendering ${s}x${s}... `);
  const buf = render(s, s >= 128 ? 2 : 4);
  renderedIcons[s] = buf;
  console.log(`done (${buf.length} bytes)`);
}

const ico16 = createICO(renderedIcons[16]);
const svgVector = createVectorSVG();

for (const dir of targets) {
  const iconsDir = path.join(dir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  // 1. Write PNGs
  for (const s of sizes) {
    fs.writeFileSync(path.join(iconsDir, `icon${s}.png`), renderedIcons[s]);
  }

  // 2. Favicon PNG (32x32) and ICO (16x16)
  fs.writeFileSync(path.join(dir, 'favicon.png'), renderedIcons[32]);
  fs.writeFileSync(path.join(dir, 'favicon.ico'), ico16);

  // 3. Vector SVG
  fs.writeFileSync(path.join(dir, 'favicon.svg'), svgVector);
  fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), svgVector);
  fs.writeFileSync(path.join(iconsDir, 'logo.svg'), svgVector);
}

console.log('All icons generated successfully with Catmull-Rom spline in public/ and dist/!');
