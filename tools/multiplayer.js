// Two-player smoke test: both join the same room, both drive, verify shared state.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';

const browser = await chromium.launch({ headless: true });
const a = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const b = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const p of [a, b]) {
  p.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:22222/?room=dream', { waitUntil: 'networkidle' });
}
await a.waitForTimeout(1000);
await b.waitForTimeout(1000);

const snap = (p) => p.evaluate(() => ({
  self: window.__dbg.state.selfId,
  players: window.__dbg.state.latest.p.map((q) => [q[0], Math.round(q[1]), Math.round(q[2]), q[5]]),
  score: window.__dbg.state.team.score,
  lives: window.__dbg.state.team.lives,
  cmds: window.__dbg.state.team.commands,
  cam: window.__dbg.state.cam,
}));

console.log('A', JSON.stringify(await snap(a)));
console.log('B', JSON.stringify(await snap(b)));

await a.evaluate(autopilot);
await b.evaluate(autopilot);
for (let i = 1; i <= 8; i++) {
  await a.waitForTimeout(1000);
  console.log(`t=${i}s A`, JSON.stringify(await snap(a)));
  console.log(`t=${i}s B`, JSON.stringify(await snap(b)));
}

// shared HUD text on both screens
const hud = (p) => p.evaluate(() => {
  const cv = document.getElementById('screen');
  return cv.getContext('2d').getImageData(0, 0, 320, 200).data[0];
});
console.log('A hud px', await hud(a), 'B hud px', await hud(b));

await a.screenshot({ path: 'shot-A.png' });
await b.screenshot({ path: 'shot-B.png' });
await browser.close();
