import { createGame, simulate, snapshot, stepPlayer, LEVELS, parseLevel, TILE, PLAYER } from '../src/engine.js';

const g = createGame(0);
console.log('level', g.level.name, 'size', g.level.w, 'x', g.level.h, 'items', g.level.items.length, 'enemies', g.enemies.length, 'spawn', g.level.spawn);
const p = { id: 1, slot: 0, name: 'Ego', x: g.level.spawn.x + 3, y: g.level.spawn.y + TILE - PLAYER.h, vx: 0, vy: 0,
  w: PLAYER.w, h: PLAYER.h, dir: 1, state: 'play', onGround: false, walkFrame: 0, shootTimer: 0, deadTimer: 0,
  invuln: 0, jumpLatch: false, dropLatch: false, hitWall: 0, dropping: 0, anim: 'stand' };
g.players.push(p);

// settle on ground
for (let i = 0; i < 30; i++) simulate(g, { 1: {} });
console.log('after settle: y=', p.y, 'onGround=', p.onGround, 'anim=', p.anim);

// walk right for 300 ticks, firing every 20 ticks
for (let i = 0; i < 600; i++) {
  const inp = { right: true, fire: i % 25 === 0 };
  if (i % 60 < 12) inp.jump = true;
  simulate(g, { 1: inp });
}
const s = snapshot(g);
console.log('after run: x=', p.x, 'y=', p.y, 'state=', p.state, 'score=', g.team.score, 'commands=', g.team.commands,
  'lives=', g.team.lives, 'enemies left=', g.enemies.filter(e => !e.dead).length, 'status=', g.status, 'cam=', g.cameraX.toFixed(1));
console.log('items taken:', g.level.items.filter(i => i.taken).length, '/', g.level.items.length);
console.log('events sample:', g.events.slice(0, 6));

// check no NaN
const bad = [p.x, p.y, p.vx, p.vy, g.cameraX].filter(v => !Number.isFinite(v));
console.log(bad.length ? 'NaN DETECTED ' + bad : 'numbers OK');

// spike death test
const g2 = createGame(0);
const p2 = { ...p, x: 16 * TILE, y: 9 * TILE, vy: 1, state: 'play', invuln: 0 };
g2.players.push(p2);
for (let i = 0; i < 40; i++) simulate(g2, { 1: {} });
console.log('spike test: state=', p2.state, 'lives=', g2.team.lives);

// gate test
const g3 = createGame(0);
const p3 = { ...p, x: 138 * TILE, y: 7 * TILE + 2, state: 'play', invuln: 0 };
g3.players.push(p3);
g3.team.commands = 3;
for (let i = 0; i < 10; i++) simulate(g3, { 1: {} });
console.log('gate test: status=', g3.status);
for (let i = 0; i < 200; i++) simulate(g3, { 1: {} });
console.log('after clear: level=', g3.levelIndex, g3.level.name, 'status=', g3.status, 'commands=', g3.team.commands);

// full playthrough of all levels
const g4 = createGame(0);
const p4 = { ...p, x: g4.level.spawn.x + 3, y: g4.level.spawn.y + TILE - PLAYER.h, state: 'play', invuln: 0 };
g4.players.push(p4);
let ticks = 0;
while (g4.status !== 'win' && ticks < 60 * 600) {
  const inp = { right: true, fire: true, jump: true, down: false };
  simulate(g4, { 1: inp });
  ticks++;
}
console.log('playthrough: status=', g4.status, 'ticks=', ticks, 'score=', g4.team.score, 'level=', g4.levelIndex);
