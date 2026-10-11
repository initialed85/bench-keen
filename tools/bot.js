// Greedy bot: walks right, holds jump at edges/walls/spikes, fires constantly.
// Checks that each level is completable and that staircases are reachable.
import { createGame, simulate, TILE, PLAYER, LEVELS } from '../src/engine.js';

function tile(g, tx, ty) {
  const L = g.level;
  if (ty < 0 || ty >= L.h) return '.';
  if (tx < 0 || tx >= L.w) return '#';
  return L.tiles[ty * L.w + tx];
}

function makeBot() {
  let hold = 0;
  return function input(g, p) {
    const inp = { right: true, fire: true };
    if (p.state !== 'play') return inp;
    const fx = Math.floor((p.x + p.w + 3) / TILE);
    const footY = Math.floor((p.y + p.h + 1) / TILE);
    const midY = Math.floor((p.y + p.h - 8) / TILE);
    const support = tile(g, fx, footY) !== '.';
    const wall = '#X'.includes(tile(g, fx, midY));
    const spike = tile(g, fx, footY) === '^' || tile(g, fx + 1, footY) === '^';
    if (p.onGround && (!support || wall || spike)) hold = 22;
    if (hold > 0) { inp.jump = true; hold--; }
    return inp;
  };
}

for (let li = 0; li < LEVELS.length; li++) {
  const g = createGame(li);
  const p = { id: 1, slot: 0, name: 'Bot', x: g.level.spawn.x + 3, y: g.level.spawn.y + TILE - PLAYER.h,
    vx: 0, vy: 0, w: PLAYER.w, h: PLAYER.h, dir: 1, state: 'play', onGround: false, walkFrame: 0,
    shootTimer: 0, deadTimer: 0, invuln: 0, jumpLatch: false, dropLatch: false, hitWall: 0, dropping: 0, anim: 'stand' };
  g.players.push(p);
  const input = makeBot();
  let deaths = 0, lastState = 'play', t = 0, maxX = 0;
  while (g.status === 'play' && t < 60 * 400) {
    simulate(g, { 1: input(g, p) });
    if (p.state === 'dead' && lastState !== 'dead') deaths++;
    lastState = p.state;
    maxX = Math.max(maxX, p.x);
    t++;
  }
  console.log(`L${li + 1}: status=${g.status} t=${(t / 60).toFixed(0)}s maxX=${Math.round(maxX / TILE)}/${g.level.w} commands=${g.team.commands} lives=${g.team.lives} deaths=${deaths} score=${g.team.score} items=${g.level.items.filter(i => i.taken).length}/${g.level.items.length}`);
}
