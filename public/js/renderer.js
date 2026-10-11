// Canvas renderer: pre-rendered pixel tiles/sprites, no smoothing.

import { PALETTE, COLORS, TILES, SPRITES } from '/shared/art.js';

const cache = new Map();

function rowsToCanvas(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = rows[y][x];
      if (k === '.' || k === ' ') continue;
      const col = COLORS[k];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

function tileCanvas(ch) {
  const key = 't' + ch;
  if (!cache.has(key)) cache.set(key, rowsToCanvas(TILES[ch]));
  return cache.get(key);
}

function spriteCanvas(name, flip) {
  const key = 's' + name + (flip ? 'F' : '');
  if (!cache.has(key)) {
    const cv = rowsToCanvas(SPRITES[name]);
    if (flip) {
      const out = document.createElement('canvas');
      out.width = cv.width;
      out.height = cv.height;
      const c = out.getContext('2d');
      c.translate(cv.width, 0);
      c.scale(-1, 1);
      c.drawImage(cv, 0, 0);
      cache.set(key, out);
    } else {
      cache.set(key, cv);
    }
  }
  return cache.get(key);
}

export function drawSprite(ctx, name, x, y, flip = false) {
  if (!SPRITES[name]) return;
  ctx.drawImage(spriteCanvas(name, flip), Math.round(x), Math.round(y));
}

export function drawLevel(ctx, level, camX, camY) {
  ctx.fillStyle = level.sky || '#3679f4';
  ctx.fillRect(0, 0, 320, 200);

  const tx0 = Math.floor(camX / 20), ty0 = Math.floor(camY / 20);
  for (let ty = ty0; ty <= ty0 + 10; ty++) {
    for (let tx = tx0; tx <= tx0 + 16; tx++) {
      if (tx < 0 || tx >= level.w || ty < 0 || ty >= level.h) continue;
      const c = level.tiles[ty * level.w + tx];
      if (c === '.' || c === ' ') continue;
      if (!TILES[c]) continue;
      ctx.drawImage(tileCanvas(c), tx * 20 - camX, ty * 20 - camY);
    }
  }
}

export function drawItems(ctx, items, camX, camY) {
  for (const it of items) {
    if (it[4]) continue;
    drawSprite(ctx, 'item_' + it[1], it[2] - camX + 2, it[3] - camY + 2);
  }
}

export function drawPlayer(ctx, p, camX, camY) {
  const name = 'ego_' + p.anim;
  drawSprite(ctx, name, p.x - camX - 2, p.y - camY - 2, p.dir < 0);
}

export function drawEnemy(ctx, e, def, camX, camY) {
  if (e.dead) {
    drawSprite(ctx, 'poof1', e.x - camX - 2, e.y - camY - 4);
    return;
  }
  drawSprite(ctx, def.sprite + (e.frame + 1), e.x - camX - def.ox, e.y - camY - def.oy, e.vx < 0);
}

export function drawShot(ctx, s, camX, camY) {
  drawSprite(ctx, 'shot', s.x - camX, s.y - camY, s.dir < 0);
}

export function drawEffect(ctx, f, camX, camY) {
  const frame = f.timer > 12 ? 'poof1' : 'poof2';
  drawSprite(ctx, frame, f.x - camX - 2, f.y - camY - 4);
}

export { PALETTE };
