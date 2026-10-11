// Geometry validation: invincible bot walks right, jumps at edges/walls/spikes/ledges.
// Confirms every level is traversable end-to-end and staircases are reachable.
import { createGame, simulate, TILE, PLAYER, LEVELS } from '../src/engine.js';

function tile(g, tx, ty) {
  const L = g.level;
  if (ty < 0 || ty >= L.h) return '.';
  if (tx < 0 || tx >= L.w) return '#';
  return L.tiles[ty * L.w + tx];
}

for (let li = 0; li < LEVELS.length; li++) {
  const g = createGame(li);
  const p = { id: 1, slot: 0, name: 'Bot', x: g.level.spawn.x + 3, y: g.level.spawn.y + TILE - PLAYER.h,
    vx: 0, vy: 0, w: PLAYER.w, h: PLAYER.h, dir: 1, state: 'play', onGround: false, walkFrame: 0,
    shootTimer: 0, fireCooldown: 0, deadTimer: 0, invuln: 999, jumpLatch: false, dropLatch: false,
    hitWall: 0, dropping: 0, anim: 'stand' };
  g.players.push(p);
  let hold = 0, t = 0, maxX = 0, deaths = 0, last = 'play';
  while (g.status === 'play' && t < 60 * 400) {
    p.invuln = 999;
    const inp = { right: true };
    const fx = Math.floor((p.x + p.w + 3) / TILE);
    const footY = Math.floor((p.y + p.h + 1) / TILE);
    const midY = Math.floor((p.y + p.h - 8) / TILE);
    const support = tile(g, fx, footY) !== '.';
    const wall = '#X'.includes(tile(g, fx, midY));
    const spike = ['^', 'X'].includes(tile(g, fx, midY)) || ['^', 'X'].includes(tile(g, fx + 1, midY));
    const ledge = ['=', 'C'].includes(tile(g, fx, footY - 2)) || ['=', 'C'].includes(tile(g, fx + 1, footY - 2));
    if (p.onGround && (!support || wall || spike || ledge)) hold = 22;
    if (hold > 0) { inp.jump = true; hold--; }
    simulate(g, { 1: inp });
    g.events.length = 0;
    maxX = Math.max(maxX, p.x);
    if (p.state === 'dead' && last !== 'dead') deaths++;
    last = p.state;
    t++;
  }
  const cmds = g.level.items.filter(i => i.type === 'command' && i.taken).length;
  console.log(`L${li + 1} ${LEVELS[li].name}: status=${g.status} t=${(t / 60).toFixed(0)}s maxX=${Math.round(maxX / TILE)}/${g.level.w} commands=${cmds} items=${g.level.items.filter(i => i.taken).length}/${g.level.items.length} deaths=${deaths}`);
}
