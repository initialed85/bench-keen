// Client: renders server snapshots with interpolation, predicts the local player.

import {
  drawLevel, drawItems, drawPlayer, drawEnemy, drawShot, drawEffect, PALETTE,
} from './renderer.js';
import { drawText, textWidth } from './font.js';
import { TILES, SPRITES } from '/shared/art.js';
import * as R from './renderer.js';
import { initAudio, sfx } from './audio.js';
import {
  LEVELS, parseLevel, stepPlayer, stepShots, playerAnim, makePlayer, tileAt,
  TILE, VIEW_W, VIEW_H, ENEMY_DEF,
} from '/shared/engine.js';
import { replayStream } from '/shared/demo.js';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump',
  KeyX: 'fire', KeyZ: 'fire', KeyF: 'fire', Enter: 'fire',
};

const keys = {};
// taps that arrive between input samples are latched so they are never lost
const taps = { fire: false, jump: false };

window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  initAudio();
  if (!keys[k]) {
    if (k === 'fire') taps.fire = true;
    if (k === 'jump') { taps.jump = true; sfx('jump'); }
  }
  keys[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  keys[k] = false;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// F9 saves the current recording; F8 lists recordings
window.addEventListener('keydown', async (e) => {
  if (e.code === 'F9') {
    e.preventDefault();
    const r = await fetch('/api/demo/save', { method: 'POST' });
    const j = await r.json();
    state.demoName = j.name || j.error;
    state.demoNameTime = performance.now();
  }
});

function consumeInput() {
  const inp = {
    left: !!keys.left, right: !!keys.right,
    jump: !!keys.jump || taps.jump, fire: !!keys.fire || taps.fire, down: !!keys.down,
  };
  taps.fire = false;
  taps.jump = false;
  return inp;
}

const state = {
  connected: false,
  selfId: 0,
  levelIndex: 0,
  level: parseLevel(LEVELS[0]),
  prev: null,
  latest: null,
  latestTime: 0,
  prevTime: 0,
  status: 'play',
  team: { score: 0, lives: 3, commands: 0 },
  cam: [0, 0],
  names: {},
};

// Local prediction world: used only to step the local player and its shots.
const localGame = { level: state.level, shots: [], enemies: [], effects: [], events: [], nextId: 100000 };
let localPlayer = null;
window.__dbg = { state, localGame, keys, get localPlayer() { return localPlayer; }, ctx, drawLevel, TILES, R };
window.__probe = (x, y) => { const d = ctx.getImageData(0, 0, 320, 200).data; const i = (y * 320 + x) * 4; return [d[i], d[i+1], d[i+2]]; };

// ?demo=<file> plays back a recorded demo instead of joining live.
const demoFile = new URLSearchParams(location.search).get('demo');
let replay = null;

async function startReplay(file) {
  const res = await fetch('/demos/' + encodeURIComponent(file));
  if (!res.ok) { console.error('demo not found:', file); return; }
  const demo = await res.json();
  state.levelIndex = demo.levelIndex;
  state.level = parseLevel(LEVELS[demo.levelIndex]);
  state.names = { ...demo.names };
  replay = replayStream(demo);
  state.selfId = demo.initial.players[0] ? demo.initial.players[0].id : 0;
  state.replayLength = demo.inputs.length;
}

const socket = demoFile ? null : new WebSocket(`ws://${location.host}/ws`);

if (socket) {
socket.onopen = () => { state.connected = true; };
socket.onclose = () => { state.connected = false; };

socket.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'init') {
    state.selfId = msg.you;
    state.levelIndex = msg.levelIndex;
    state.level = parseLevel(LEVELS[msg.levelIndex]);
    localGame.level = state.level;
    localGame.shots = [];
    localPlayer = makePlayer(msg.you, msg.slot, msg.name, state.level);
    for (const p of msg.players) state.names[p.id] = p.name;
    state.names[msg.you] = msg.name;
  } else if (msg.type === 'state') {
    applySnapshot(msg);
  } else if (msg.type === 'join') {
    state.names[msg.id] = msg.name;
  } else if (msg.type === 'leave') {
    delete state.names[msg.id];
  }
};

}

function applySnapshot(s) {
  if (state.latest) {
    state.prev = state.latest;
    state.prevTime = state.latestTime;
  }
  state.latest = s;
  state.latestTime = performance.now();

  if (s.li !== state.levelIndex) {
    state.levelIndex = s.li;
    state.level = parseLevel(LEVELS[s.li]);
    localGame.level = state.level;
    localGame.shots = [];
  }
  state.status = s.st;
  state.team = s.team;

  for (const e of s.ev) {
    if (e.type === 'shoot' && e.id === state.selfId) sfx('shoot');
    else if (e.type === 'pickup') sfx(e.kind);
    else if (e.type === 'kill') sfx('kill');
    else if (e.type === 'death' && e.id === state.selfId) sfx('death');
    else if (e.type === 'lifelost') sfx('lifelost');
    else if (e.type === 'clear') sfx('clear');
    else if (e.type === 'win') sfx('win');
  }

  const me = s.p.find((p) => p[0] === state.selfId);
  if (me && localPlayer) {
    const [, x, y, , , st, inv] = me;
    const dx = Math.abs(x - localPlayer.x), dy = Math.abs(y - localPlayer.y);
    if (dx > 24 || dy > 24 || localPlayer.state !== st) {
      localPlayer.x = x;
      localPlayer.y = y;
      localPlayer.vy = 0;
      localPlayer.state = st;
    }
    localPlayer.invuln = inv;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function index(list) { return new Map(list.map((e) => [e[0], e])); }

function interpolate(alpha) {
  if (!state.latest) return null;
  const a = state.prev || state.latest;
  const b = state.latest;

  const pm = index(a.p);
  const players = b.p.map((p) => {
    const old = pm.get(p[0]);
    return {
      id: p[0],
      x: old ? lerp(old[1], p[1], alpha) : p[1],
      y: old ? lerp(old[2], p[2], alpha) : p[2],
      dir: p[3], anim: p[4], state: p[5],
    };
  });

  const em = index(a.e);
  const enemies = b.e.map((e) => {
    const old = em.get(e[0]);
    return {
      id: e[0], type: e[1],
      x: old ? lerp(old[2], e[2], alpha) : e[2],
      y: old ? lerp(old[3], e[3], alpha) : e[3],
      frame: e[4], dead: e[5],
    };
  });

  const sm = index(a.s);
  const shots = b.s.map((s) => {
    const old = sm.get(s[0]);
    return {
      id: s[0],
      x: old ? lerp(old[1], s[1], alpha) : s[1],
      y: old ? lerp(old[2], s[2], alpha) : s[2],
      dir: s[3], owner: s[4],
    };
  });

  state.cam = [
    Math.round(lerp(a.cam[0], b.cam[0], alpha)),
    Math.round(lerp(a.cam[1], b.cam[1], alpha)),
  ];

  return { players, enemies, shots, items: b.i, effects: b.f };
}

const RENDER_DELAY = 90;
const STEP_MS = 1000 / 60;
let lastSend = 0;
let lastFrame = 0;
let acc = 0;

function frame(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  acc = Math.min(acc + dt, STEP_MS * 5);

  if (replay) {
    // drive the recorded simulation at the original 60Hz
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      const f = replay.next();
      if (!f) break;
      state.replayTick = f.t;
      applySnapshot(f);
    }
  } else {
    if (state.selfId && now - lastSend > 16) {
      lastSend = now;
      socket.send(JSON.stringify({ type: 'input', inp: consumeInput() }));
    }
    // fixed-timestep prediction so local motion matches the server clock
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      if (localPlayer) {
        stepPlayer(localGame, localPlayer, consumeInput());
        stepShots(localGame);
        localPlayer.anim = playerAnim(localPlayer);
      }
    }
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 320, 200);

  const span = Math.max(1, state.latestTime - state.prevTime);
  const alpha = Math.min(1, Math.max(0, (now - state.latestTime - RENDER_DELAY) / span));
  const world = interpolate(alpha);
  if (world) {
    const camX = state.cam[0], camY = state.cam[1];
    drawLevel(ctx, state.level, camX, camY);

    drawItems(ctx, world.items, camX, camY);

    for (const e of world.enemies) {
      const def = ENEMY_DEF[e.type];
      if (!def) continue;
      drawEnemy(ctx, { x: e.x, y: e.y, vx: e.vx, frame: e.frame, dead: e.dead }, def, camX, camY);
    }

    for (const s of world.shots) {
      if (!replay && s.owner === state.selfId) continue;
      drawShot(ctx, s, camX, camY);
    }
    if (!replay) for (const s of localGame.shots) drawShot(ctx, s, camX, camY);

    for (const p of world.players) {
      if (!replay && p.id === state.selfId) continue;
      drawPlayer(ctx, p, camX, camY);
    }
    if (localPlayer) drawPlayer(ctx, localPlayer, camX, camY);

    for (const f of world.effects) drawEffect(ctx, { x: f[0], y: f[1], type: 'poof' }, camX, camY);
  }

  drawHud(ctx);
  requestAnimationFrame(frame);
}

function drawHud(ctx) {
  ctx.fillStyle = PALETTE.black;
  ctx.fillRect(0, 0, 320, 22);
  ctx.fillStyle = PALETTE.gray;
  ctx.fillRect(0, 22, 320, 1);

  drawText(ctx, 'SCORE ' + String(state.team.score).padStart(6, '0'), 4, 4, PALETTE.white);
  drawText(ctx, 'LIVES ' + state.team.lives, 122, 4, PALETTE.red);
  drawText(ctx, 'CMD ' + state.team.commands + '/3', 236, 4, PALETTE.yellow);

  const names = Object.entries(state.names);
  let nx = 4;
  for (const [id, name] of names) {
    drawText(ctx, name, nx, 188, id === String(state.selfId) ? PALETTE.green : PALETTE.cyan);
    nx += textWidth(name) + 10;
  }

  if (state.status === 'levelclear') banner(ctx, 'LEVEL CLEAR!', PALETTE.white, PALETTE.blue);
  else if (state.status === 'gameover') banner(ctx, 'GAME OVER', PALETTE.white, PALETTE.red);
  else if (state.status === 'win') banner(ctx, 'YOU WAKED UP!', PALETTE.white, PALETTE.green);
  else if (replay) {
    drawText(ctx, 'REPLAY ' + (state.replayTick || 0) + '/' + state.replayLength, 250, 4, PALETTE.cyan);
  } else if (!state.connected) banner(ctx, 'CONNECTING...', PALETTE.white, PALETTE.blue);

  if (state.demoName && performance.now() - state.demoNameTime < 4000) {
    drawText(ctx, 'SAVED ' + state.demoName, 120, 4, PALETTE.green);
  }
}

function banner(ctx, text, fg, bg) {
  const w = textWidth(text) + 16;
  const x = Math.round((320 - w) / 2), y = 88;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, 22);
  drawText(ctx, text, x + 8, y + 7, fg);
}

function fitCanvas() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / 320, window.innerHeight / 200)));
  canvas.style.width = 320 * scale + 'px';
  canvas.style.height = 200 * scale + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
if (demoFile) startReplay(demoFile).then(() => requestAnimationFrame(frame));
else requestAnimationFrame(frame);
