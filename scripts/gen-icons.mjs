// Generates the PWA icons in public/ with no image dependencies:
// three ascending emerald bars on the zinc-950 background.
// Run with `npm run icons`. Output is committed, so this only needs re-running if the design changes.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [0x09, 0x09, 0x0b];
const FG = [0x10, 0xb9, 0x81]; // emerald-500

// Bars in a 0..1 unit square; `scale` shrinks them toward the centre (maskable safe zone).
function bars(scale) {
  const w = 0.16 * scale;
  const gap = 0.07 * scale;
  const bottom = 0.5 + 0.3 * scale;
  const heights = [0.28, 0.44, 0.6].map((h) => h * scale);
  const left = 0.5 - (3 * w + 2 * gap) / 2;
  return heights.map((h, i) => ({ x0: left + i * (w + gap), x1: left + i * (w + gap) + w, y0: bottom - h, y1: bottom, r: w * 0.25 }));
}

function inRoundRect(x, y, b) {
  if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) return false;
  const cx = Math.min(Math.max(x, b.x0 + b.r), b.x1 - b.r);
  const cy = Math.min(Math.max(y, b.y0 + b.r), b.y1 - b.r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= b.r ** 2;
}

// Rounded background corners for regular icons; maskable icons must be full-bleed.
function inBackground(x, y, radius) {
  if (!radius) return true;
  return inRoundRect(x, y, { x0: 0, x1: 1, y0: 0, y1: 1, r: radius });
}

function render(size, { scale, radius }) {
  const shapes = bars(scale);
  const SS = 4; // supersampling for anti-aliased edges
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let px = 0; px < size; px++) {
      let fg = 0, bg = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (!inBackground(x, y, radius)) continue;
          if (shapes.some((b) => inRoundRect(x, y, b))) fg++;
          else bg++;
        }
      const n = SS * SS;
      const a = (fg + bg) / n;
      const o = 1 + px * 4;
      for (let c = 0; c < 3; c++) row[o + c] = a ? Math.round((FG[c] * fg + BG[c] * bg) / (fg + bg)) : 0;
      row[o + 3] = Math.round(a * 255);
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

function png(size, raw) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg() {
  const rects = bars(1)
    .map((b) => `<rect x="${(b.x0 * 64).toFixed(2)}" y="${(b.y0 * 64).toFixed(2)}" width="${((b.x1 - b.x0) * 64).toFixed(2)}" height="${((b.y1 - b.y0) * 64).toFixed(2)}" rx="${(b.r * 64).toFixed(2)}" fill="#10b981"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#09090b"/>${rects}</svg>\n`;
}

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('pwa-192x192.png', out), render(192, { scale: 1, radius: 0.22 }));
writeFileSync(new URL('pwa-512x512.png', out), render(512, { scale: 1, radius: 0.22 }));
writeFileSync(new URL('maskable-512x512.png', out), render(512, { scale: 0.75, radius: 0 }));
writeFileSync(new URL('apple-touch-icon.png', out), render(180, { scale: 0.9, radius: 0 }));
writeFileSync(new URL('favicon.svg', out), svg());
console.log('Icons written to public/');
