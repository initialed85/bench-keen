// Authoritative game simulation. Runs on the server at 60Hz; the client also
// imports this to predict its own player locally.

import { LEVELS } from './levels.js';

export { LEVELS };

export const TILE = 20;
export const TICK_HZ = 60;
export const VIEW_W = 320;
export const VIEW_H = 200;

const SOLID = new Set(['#', 'X']);
const PLATFORM = new Set(['=', 'C']);
const HAZARD = new Set(['^']);

export const PLAYER = { w: 14, h: 28 };

export const ENEMY_DEF = {
  d: { name: 'DACTERT', sprite: 'dacter', w: 14, h: 12, ox: 1, oy: 3, score: 100, speed: 0.8, fly: true },
  g: { name: 'GOPTER', sprite: 'gopter', w: 14, h: 11, ox: 1, oy: 4, score: 150, speed: 1.2, fly: true },
  h: { name: 'SHTRIKE', sprite: 'shtrike', w: 14, h: 10, ox: 1, oy: 5, score: 200, speed: 2.0, fly: true },
  b: { name: 'BAT', sprite: 'bat', w: 14, h: 11, ox: 1, oy: 4, score: 150, speed: 1.5, fly: true },
  l: { name: 'SLUG', sprite: 'slug', w: 14, h: 10, ox: 1, oy: 5, score: 100, speed: 0.5, fly: false },
  t: { name: 'TENTACAT', sprite: 'tentacat', w: 14, h: 13, ox: 1, oy: 2, score: 250, speed: 0.9, fly: false },
};

export const ITEM_DEF = {
  memory: { score: 100 },
  gem: { score: 500 },
  life: { score: 0, life: 1 },
  command: { score: 1000, command: 1 },
};

export const WALK = 1.6;
export const JUMP_V = -5.0;
export const GRAV = 0.24;
export const MAX_FALL = 6;
export const MAX_SHOTS = 3;
export const COMMANDS_TO_WIN = 3;

export function tileAt(level, tx, ty) {
  if (ty < 0 || ty >= level.h) return '.';
  if (tx < 0 || tx >= level.w) return '#';
  return level.tiles[ty * level.w + tx];
}

export function parseLevel(def) {
  const rows = def.rows;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const tiles = new Array(w * h).fill('.');
  const items = [];
  const spawns = [];
  let spawn = { x: 3 * TILE, y: 7 * TILE };
  let id = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] || '.';
      const set = (t) => { tiles[y * w + x] = t; };
      if (c === 'P') { spawn = { x: x * TILE, y: y * TILE }; set('.'); continue; }
      if (c === '*' || c === 'G' || c === 'L' || c === 'K') {
        const type = c === '*' ? 'memory' : c === 'G' ? 'gem' : c === 'L' ? 'life' : 'command';
        items.push({ id: id++, type, x: x * TILE, y: y * TILE, taken: false });
        set('.');
        continue;
      }
      if (ENEMY_DEF[c]) { spawns.push({ type: c, x: x * TILE, y: y * TILE }); set('.'); continue; }
      set(c);
    }
  }
  return { name: def.name, w, h, tiles, items, spawns, spawn };
}

export function makePlayer(id, slot, name, level) {
  const p = {
    id, slot, name,
    x: level.spawn.x + 3,
    y: level.spawn.y + TILE - PLAYER.h,
    vx: 0, vy: 0,
    w: PLAYER.w, h: PLAYER.h,
    dir: 1,
    state: 'play',
    onGround: false,
    walkFrame: 0,
    shootTimer: 0,
    fireCooldown: 0,
    deadTimer: 0,
    invuln: 60,
    jumpLatch: false,
    dropLatch: false,
    hitWall: 0,
    dropping: 0,
    anim: 'stand',
  };
  return p;
}

export function createGame(levelIndex = 0) {
  const level = parseLevel(LEVELS[levelIndex]);
  const g = {
    levelIndex,
    level,
    tick: 0,
    status: 'play',
    statusTimer: 0,
    team: { score: 0, lives: 3, commands: 0 },
    players: [],
    enemies: [],
    shots: [],
    effects: [],
    events: [],
    cameraX: 0,
    cameraY: 0,
    nextId: 1,
  };
  spawnEnemies(g);
  g.join = (name) => {
    const p = makePlayer(g.nextId++, g.players.length, name, g.level);
    g.players.push(p);
    return p;
  };
  g.leave = (id) => {
    const i = g.players.findIndex((p) => p.id === id);
    if (i >= 0) g.players.splice(i, 1);
  };
  return g;
}

function spawnEnemies(g) {
  g.enemies = g.level.spawns.map((s) => {
    const d = ENEMY_DEF[s.type];
    const dir = (s.x / TILE) % 2 === 0 ? 1 : -1;
    return {
      id: g.nextId++,
      type: s.type,
      x: s.x + d.ox,
      y: s.y + d.oy,
      w: d.w,
      h: d.h,
      vx: dir * d.speed,
      vy: 0,
      home: s.y + d.oy,
      homeX: s.x + d.ox,
      t: (s.x * 7 + s.y * 13) % 100,
      mode: 'fly',
      dead: false,
      deadTimer: 0,
      frame: 0,
      hitWall: 0,
      onGround: false,
      dropping: 0,
    };
  });
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function collideX(e, level) {
  e.hitWall = 0;
  const y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (SOLID.has(tileAt(level, tx, ty))) { e.x = tx * TILE - e.w; e.hitWall = 1; break; }
    }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (SOLID.has(tileAt(level, tx, ty))) { e.x = (tx + 1) * TILE; e.hitWall = -1; break; }
    }
  }
}

function collideY(e, level, prevBottom) {
  e.onGround = false;
  const x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
  if (e.vy >= 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(level, tx, ty);
      if (SOLID.has(t)) { e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; break; }
      if (PLATFORM.has(t) && !e.dropping && prevBottom <= ty * TILE + 2) {
        e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
  } else {
    const ty = Math.floor(e.y / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (SOLID.has(tileAt(level, tx, ty))) { e.y = (ty + 1) * TILE; e.vy = 0; break; }
    }
  }
}

function solidBelow(e, level) {
  const ty = Math.floor((e.y + e.h + 1) / TILE);
  const x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
  for (let tx = x0; tx <= x1; tx++) {
    const t = tileAt(level, tx, ty);
    if (SOLID.has(t) || PLATFORM.has(t)) return true;
  }
  return false;
}

function touchesHazard(e, level) {
  const x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
  const y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + e.h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (HAZARD.has(tileAt(level, tx, ty))) return true;
    }
  }
  return false;
}

export function playerAnim(p) {
  if (p.state === 'dead') return 'dead';
  if (p.shootTimer > 0) return 'shoot';
  if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
  if (p.vx !== 0) { p.walkFrame = (p.walkFrame + 1) % 4; return 'walk' + (p.walkFrame + 1); }
  return 'stand';
}

export function stepPlayer(g, p, inp) {
  const L = g.level;
  if (p.state === 'dead') {
    p.vy = Math.min(p.vy + GRAV, MAX_FALL);
    p.y += p.vy;
    p.deadTimer++;
    if (p.y > L.h * TILE + 40) { p.y = L.spawn.y; p.vy = 0; }
    return;
  }
  if (p.invuln > 0) p.invuln--;
  if (p.dropping > 0) p.dropping--;

  if (inp.left) { p.vx = -WALK; p.dir = -1; }
  else if (inp.right) { p.vx = WALK; p.dir = 1; }
  else p.vx = 0;

  if (inp.down && p.onGround && !p.dropLatch) {
    p.dropping = 10;
    p.y += 3;
    p.onGround = false;
    p.dropLatch = true;
  }
  if (!inp.down) p.dropLatch = false;

  if (inp.jump && p.onGround && !p.jumpLatch) {
    p.vy = JUMP_V;
    p.onGround = false;
    p.jumpLatch = true;
  }
  if (!inp.jump) p.jumpLatch = false;
  if (!inp.jump && p.vy < -1.6) p.vy = -1.6;

  p.vy = Math.min(p.vy + GRAV, MAX_FALL);
  p.x += p.vx;
  collideX(p, L);
  const prevBottom = p.y + p.h;
  p.y += p.vy;
  collideY(p, L, prevBottom);

  if (p.fireCooldown > 0) p.fireCooldown--;
  if (inp.fire && p.fireCooldown <= 0) {
    const mine = g.shots.filter((s) => s.owner === p.id).length;
    if (mine < MAX_SHOTS) {
      g.shots.push({
        id: g.nextId++,
        owner: p.id,
        x: p.x + (p.dir > 0 ? p.w : -12),
        y: p.y + 10,
        w: 12,
        h: 10,
        vx: p.dir * 4.5,
        dir: p.dir,
        dead: false,
      });
      p.shootTimer = 14;
      p.fireCooldown = 12;
      g.events.push({ type: 'shoot', id: p.id });
    } else {
      p.fireCooldown = 4;
    }
  }

  if (p.y > L.h * TILE) killPlayer(g, p);
  else if (touchesHazard(p, L)) killPlayer(g, p);

  p.anim = playerAnim(p);
}

function killPlayer(g, p) {
  if (p.state === 'dead') return;
  p.state = 'dead';
  p.deadTimer = 0;
  p.vy = -3;
  p.vx = 0;
  g.events.push({ type: 'death', id: p.id });
}

function respawn(g, p) {
  p.x = g.level.spawn.x + 3;
  p.y = g.level.spawn.y + TILE - PLAYER.h;
  p.vx = 0; p.vy = 0;
  p.state = 'play';
  p.onGround = false;
  p.invuln = 120;
  p.anim = 'stand';
}

export function stepShots(g) {
  const L = g.level;
  for (const s of g.shots) {
    s.x += s.vx;
    const tx = Math.floor((s.x + s.w / 2) / TILE), ty = Math.floor((s.y + s.h / 2) / TILE);
    if (SOLID.has(tileAt(L, tx, ty))) {
      s.dead = true;
      g.effects.push({ x: s.x, y: s.y, timer: 8, type: 'poof2' });
    }
    for (const e of g.enemies) {
      if (!e.dead && overlap(s, e)) {
        e.dead = true; e.deadTimer = 0;
        s.dead = true;
        g.team.score += ENEMY_DEF[e.type].score;
        g.effects.push({ x: e.x, y: e.y, timer: 24, type: 'poof' });
        g.events.push({ type: 'kill', kind: e.type });
        break;
      }
    }
    if (s.x < -20 || s.x > L.w * TILE + 20) s.dead = true;
  }
  g.shots = g.shots.filter((s) => !s.dead);
}

function stepEnemy(g, e) {
  const L = g.level;
  if (e.dead) { e.deadTimer++; return; }
  e.t++;
  e.frame = Math.floor(e.t / 8) % 2;
  const def = ENEMY_DEF[e.type];

  if (def.fly) {
    if (e.type === 'd') {
      if (e.mode === 'fly') {
        e.x += e.vx;
        e.y = e.home + Math.round(Math.sin(e.t * 0.06) * 5);
        for (const p of g.players) {
          if (p.state !== 'dead' && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 18 && p.y > e.y + 24) {
            e.mode = 'drop';
            break;
          }
        }
      } else {
        e.x += e.vx * 0.4;
        e.vy = 2.6;
        e.y += e.vy;
        if (solidBelow(e, L) || e.y + e.h >= L.h * TILE) {
          e.mode = 'fly';
          e.vy = 0;
          e.home = e.y;
        }
      }
    } else if (e.type === 'b') {
      e.x = e.homeX + Math.round(Math.cos(e.t * 0.05) * 24);
      e.y = e.home + Math.round(Math.sin(e.t * 0.05) * 16);
    } else if (e.type === 'g') {
      e.x += e.vx;
      e.y = e.home + Math.round(Math.sin(e.t * 0.07) * 10);
    } else {
      e.x += e.vx;
      e.y = e.home + Math.round(Math.sin(e.t * 0.11) * 14);
    }
    const tx = Math.floor((e.x + (e.vx > 0 ? e.w + 1 : -1)) / TILE);
    const ty = Math.floor((e.y + e.h / 2) / TILE);
    if (SOLID.has(tileAt(L, tx, ty))) e.vx = -e.vx;
    if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); e.homeX = e.x; }
    if (e.x + e.w > L.w * TILE) { e.x = L.w * TILE - e.w; e.vx = -Math.abs(e.vx); e.homeX = e.x; }
  } else {
    e.x += e.vx;
    collideX(e, L);
    if (e.hitWall) e.vx = -e.vx;
    e.vy = Math.min(e.vy + GRAV, MAX_FALL);
    const prevBottom = e.y + e.h;
    e.y += e.vy;
    collideY(e, L, prevBottom);
    if (e.onGround && !solidBelow(e, L)) e.vx = -e.vx;
    if (e.y > L.h * TILE) { e.y = L.h * TILE - e.h; e.vy = 0; }
  }
}

function checkPickups(g) {
  for (const it of g.level.items) {
    if (it.taken) continue;
    const box = { x: it.x, y: it.y, w: TILE, h: TILE };
    for (const p of g.players) {
      if (p.state === 'dead') continue;
      if (overlap(box, p)) {
        it.taken = true;
        const d = ITEM_DEF[it.type];
        g.team.score += d.score;
        if (d.life) g.team.lives++;
        if (d.command) g.team.commands++;
        g.events.push({ type: 'pickup', kind: it.type });
        break;
      }
    }
  }
}

function checkCollisions(g) {
  for (const p of g.players) {
    if (p.state === 'dead' || p.invuln > 0) continue;
    for (const e of g.enemies) {
      if (!e.dead && overlap(e, p)) { killPlayer(g, p); break; }
    }
  }
  const alive = g.players.filter((p) => p.state !== 'dead');
  if (g.players.length > 0 && alive.length === 0) {
    g.team.lives--;
    g.events.push({ type: 'lifelost' });
    if (g.team.lives <= 0) {
      g.status = 'gameover';
      g.statusTimer = 0;
    } else {
      for (const p of g.players) respawn(g, p);
    }
  }
}

function checkGate(g) {
  if (g.team.commands < COMMANDS_TO_WIN) return;
  const L = g.level;
  for (let y = 0; y < L.h; y++) {
    for (let x = 0; x < L.w; x++) {
      if (L.tiles[y * L.w + x] !== 'E') continue;
      const box = { x: x * TILE, y: y * TILE, w: TILE, h: TILE };
      for (const p of g.players) {
        if (p.state !== 'dead' && overlap(box, p)) {
          g.status = 'levelclear';
          g.statusTimer = 0;
          g.team.score += 2000;
          g.events.push({ type: 'clear' });
          return;
        }
      }
    }
  }
}

function updateCamera(g) {
  const alive = g.players.filter((p) => p.state !== 'dead');
  const xs = (alive.length ? alive : g.players).map((p) => p.x + p.w / 2);
  if (!xs.length) return;
  const min = Math.min(...xs) - 10, max = Math.max(...xs) + 10;
  let cx = (min + max) / 2 - VIEW_W / 2;
  if (min < cx) cx = min;
  if (max > cx + VIEW_W) cx = max - VIEW_W;
  cx = Math.max(0, Math.min(cx, g.level.w * TILE - VIEW_W));
  g.cameraX += (cx - g.cameraX) * 0.12;
  if (Math.abs(cx - g.cameraX) < 0.5) g.cameraX = cx;

  const ys = (alive.length ? alive : g.players).map((p) => p.y + p.h / 2);
  let cy = (Math.min(...ys) + Math.max(...ys)) / 2 - VIEW_H / 2;
  cy = Math.max(0, Math.min(cy, g.level.h * TILE - VIEW_H));
  g.cameraY += (cy - g.cameraY) * 0.12;
  if (Math.abs(cy - g.cameraY) < 0.5) g.cameraY = cy;
}

export function simulate(g, inputs) {
  g.tick++;
  const L = g.level;

  if (g.status === 'levelclear') {
    g.statusTimer++;
    if (g.statusTimer > 180) {
      g.levelIndex++;
      if (g.levelIndex >= LEVELS.length) {
        g.status = 'win';
        g.statusTimer = 0;
        g.events.push({ type: 'win' });
      } else {
        g.level = parseLevel(LEVELS[g.levelIndex]);
        spawnEnemies(g);
        g.shots = [];
        g.effects = [];
        g.team.commands = 0;
        g.status = 'play';
        g.statusTimer = 0;
        for (const p of g.players) respawn(g, p);
        g.cameraX = 0;
        g.events.push({ type: 'levelstart' });
      }
    }
    return;
  }
  if (g.status === 'gameover') {
    g.statusTimer++;
    if (g.statusTimer > 240) {
      g.team.lives = 3;
      g.team.commands = 0;
      g.level = parseLevel(LEVELS[g.levelIndex]);
      spawnEnemies(g);
      g.shots = [];
      g.effects = [];
      g.status = 'play';
      g.statusTimer = 0;
      for (const p of g.players) respawn(g, p);
      g.cameraX = 0;
    }
    return;
  }
  if (g.status === 'win') { g.statusTimer++; return; }

  for (const p of g.players) stepPlayer(g, p, inputs[p.id] || {});
  stepShots(g);
  for (const e of g.enemies) stepEnemy(g, e);
  checkPickups(g);
  checkCollisions(g);
  checkGate(g);

  for (const f of g.effects) f.timer--;
  g.effects = g.effects.filter((f) => f.timer > 0);
  g.enemies = g.enemies.filter((e) => !e.dead || e.deadTimer < 26);

  updateCamera(g);
}

export function snapshot(g) {
  const snap = {
    t: g.tick,
    li: g.levelIndex,
    st: g.status,
    stt: g.statusTimer,
    team: g.team,
    cam: [Math.round(g.cameraX), Math.round(g.cameraY)],
    p: g.players.map((p) => [p.id, Math.round(p.x), Math.round(p.y), p.dir, p.anim, p.state, p.invuln]),
    e: g.enemies.map((e) => [e.id, e.type, Math.round(e.x), Math.round(e.y), e.frame, e.dead ? 1 : 0]),
    s: g.shots.map((s) => [s.id, Math.round(s.x), Math.round(s.y), s.dir, s.owner]),
    i: g.level.items.map((it) => [it.id, it.type, it.x, it.y, it.taken ? 1 : 0]),
    f: g.effects.map((f) => [f.x, f.y, f.timer, f.type]),
    ev: g.events,
  };
  // events are per-tick: drain so the next snapshot carries only what just happened
  g.events = [];
  return snap;
}
