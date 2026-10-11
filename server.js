// Authoritative server: runs the simulation at 60Hz, broadcasts snapshots over WebSocket.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

import { LEVELS, createGame, simulate, snapshot, TICK_HZ, VIEW_W, VIEW_H } from './src/engine.js';
import { startDemo, record } from './src/demo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 22222);

const app = express();
const DEMO_DIR = path.join(__dirname, 'demos');
fs.mkdirSync(DEMO_DIR, { recursive: true });
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/demos', express.static(DEMO_DIR));

app.get('/api/demos', (_req, res) => {
  const files = fs.readdirSync(DEMO_DIR).filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: f, bytes: fs.statSync(path.join(DEMO_DIR, f)).size }))
    .sort((a, b) => b.name.localeCompare(a.name));
  res.json(files);
});

app.post('/api/demo/save', (req, res) => {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const name = `keen-${stamp}.json`;
  if (!demo) { res.status(400).json({ error: 'no recording yet' }); return; }
  demo.names = Object.fromEntries(names);
  fs.writeFileSync(path.join(DEMO_DIR, name), JSON.stringify(demo));
  res.json({ name, ticks: demo.inputs.length, bytes: fs.statSync(path.join(DEMO_DIR, name)).size });
});
for (const f of ['engine.js', 'art.js', 'levels.js', 'demo.js']) {
  app.get('/shared/' + f, (_req, res) => res.type('js').sendFile(path.join(__dirname, 'src', f)));
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`bench-keen listening on http://0.0.0.0:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

const game = createGame(0);
let demo = null;
let demoStarted = false;
const MAX_DEMO_TICKS = 36000;   // 10 minutes at 60Hz
const inputs = new Map();      // id -> held input
const taps = new Map();        // id -> { fire, jump } accumulated between ticks
const conns = new Map();       // ws -> player id
const names = new Map();       // id -> name
let nextId = 1;

function makeName(slot) {
  const pool = ['KEEN', 'DREAMER', 'SLEEPER', 'WAKING', 'LUCID', 'REM', 'DREAM', 'SPRINTER'];
  return pool[slot % pool.length] + (slot >= pool.length ? '-' + slot : '');
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const slot = game.players.length;
  const name = (url.searchParams.get('name') || makeName(slot)).toUpperCase().slice(0, 10);
  const p = game.join(name);
  const id = p.id;
  if (!demoStarted) { demo = startDemo(game); demoStarted = true; }   // capture the roster at the first join
  conns.set(ws, id);
  names.set(id, name);
  inputs.set(id, { left: false, right: false, jump: false, fire: false, down: false });
  taps.set(id, { fire: false, jump: false });

  ws.send(JSON.stringify({
    type: 'init', you: id, slot: p.slot, name,
    levelIndex: game.levelIndex,
    view: [VIEW_W, VIEW_H],
    players: game.players.map((q) => ({ id: q.id, slot: q.slot, name: names.get(q.id) })),
  }));
  for (const other of wss.clients) {
    if (other !== ws && other.readyState === 1) {
      other.send(JSON.stringify({ type: 'join', id, name, slot: p.slot }));
    }
  }
  console.log(`join ${name} id=${id} (${game.players.length} players)`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'input') {
      const inp = msg.inp;
      inputs.set(id, {
        left: !!inp.left, right: !!inp.right,
        jump: !!inp.jump, fire: !!inp.fire, down: !!inp.down,
      });
      // a key tap can arrive and be released between two ticks; latch it
      if (inp.fire) taps.get(id).fire = true;
      if (inp.jump) taps.get(id).jump = true;
    }
  });

  ws.on('close', () => {
    const pid = conns.get(ws);
    conns.delete(ws);
    names.delete(pid);
    inputs.delete(pid);
    taps.delete(pid);
    game.leave(pid);
    console.log(`leave ${names.get(pid) || pid} (${game.players.length} players)`);
    for (const other of wss.clients) {
      if (other.readyState === 1) other.send(JSON.stringify({ type: 'leave', id: pid }));
    }
  });
});

// Fixed 60Hz simulation loop.
let acc = 0;
let last = Date.now();

function tick() {
  const now = Date.now();
  acc += now - last;
  last = now;
  const step = 1000 / TICK_HZ;
  let ran = 0;
  while (acc >= step && ran < 5) {
    const collected = {};
    for (const [id, inp] of inputs) {
      if (!game.players.some((p) => p.id === id)) continue;
      const t = taps.get(id);
      collected[id] = { ...inp, fire: inp.fire || t.fire, jump: inp.jump || t.jump };
      t.fire = false;
      t.jump = false;
    }
    simulate(game, collected);
    if (demo && demo.inputs.length < MAX_DEMO_TICKS) record(demo, game, collected);
    acc -= step;
    ran++;
  }
  if (ran > 0) {
    const snap = snapshot(game);
    snap.type = 'state';
    const payload = JSON.stringify(snap);
    for (const ws of wss.clients) {
      if (ws.readyState === 1) ws.send(payload);
    }
  }
}

setInterval(tick, 4);

console.log(`levels: ${LEVELS.map((l) => l.name).join(' | ')}`);
