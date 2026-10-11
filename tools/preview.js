// Renders every sprite/tile into a scaled PNG so the art can be eyeballed.
import fs from 'fs';
import zlib from 'zlib';
import { PAL, SPRITES, TILES, normalize } from '../src/art.js';

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 78, 70, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const SCALE = 4;
const names = Object.keys(SPRITES);
const cols = 6;
const rows = Math.ceil(names.length / cols);
const cellW = 20 * SCALE, cellH = 30 * SCALE;
const W = cols * cellW, H = rows * cellH;
const buf = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 40; buf[i * 4 + 1] = 40; buf[i * 4 + 2] = 60; buf[i * 4 + 3] = 255; }

function blit(grid, ox, oy) {
  const g = normalize(grid);
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[y].length; x++) {
      const c = PAL[g[y][x]];
      if (!c) continue;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const px = ox + x * SCALE + dx, py = oy + y * SCALE + dy;
          if (px >= W || py >= H) continue;
          const i = (py * W + px) * 4;
          buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
        }
      }
    }
  }
}

names.forEach((n, i) => {
  blit(SPRITES[n], (i % cols) * cellW, Math.floor(i / cols) * cellH);
});
console.log(names.map((n, i) => `${i}: ${n}`).join('\n'));

const tileNames = Object.keys(TILES);
const tW = tileNames.length * 20 * SCALE, tH = 20 * SCALE;
const tbuf = Buffer.alloc(tW * tH * 4);
for (let i = 0; i < tW * tH; i++) { tbuf[i * 4] = 40; tbuf[i * 4 + 1] = 40; tbuf[i * 4 + 2] = 60; tbuf[i * 4 + 3] = 255; }
tileNames.forEach((n, i) => {
  const g = normalize(TILES[n]);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) {
    const c = PAL[g[y][x]];
    if (!c) continue;
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const px = i * 20 * SCALE + x * SCALE + dx, py = y * SCALE + dy;
      const j = (py * tW + px) * 4;
      tbuf[j] = c[0]; tbuf[j + 1] = c[1]; tbuf[j + 2] = c[2]; tbuf[j + 3] = 255;
    }
  }
});
fs.writeFileSync('preview.png', png(W, H, buf));
fs.writeFileSync('preview-tiles.png', png(tW, tH, tbuf));
console.log('tiles order:', tileNames.join(' '));
