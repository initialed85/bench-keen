// Record a live run, save the demo, then replay it in a second page.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';

const browser = await chromium.launch({ headless: true });

const live = await browser.newPage({ viewport: { width: 1280, height: 800 } });
live.on('pageerror', (e) => console.log('[live pageerror]', e.message));
await live.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await live.waitForTimeout(800);
await live.evaluate(autopilot);
for (let i = 0; i < 15; i++) {
  await live.waitForTimeout(1000);
  const s = await live.evaluate(() => ({
    score: window.__dbg.state.team.score, cmds: window.__dbg.state.team.commands,
    lives: window.__dbg.state.team.lives, x: Math.round(window.__dbg.localPlayer.x),
  }));
  console.log(`live t=${i + 1}s`, JSON.stringify(s));
}

const saved = await live.evaluate(async () => {
  const r = await fetch('/api/demo/save', { method: 'POST' });
  return r.json();
});
console.log('saved', JSON.stringify(saved));

const replay = await browser.newPage({ viewport: { width: 1280, height: 800 } });
replay.on('pageerror', (e) => console.log('[replay pageerror]', e.message));
await replay.goto(`http://127.0.0.1:22222/?demo=${saved.name}`, { waitUntil: 'networkidle' });
for (let i = 0; i < 15; i++) {
  await replay.waitForTimeout(1000);
  const s = await replay.evaluate(() => ({
    tick: window.__dbg.state.replayTick, len: window.__dbg.state.replayLength,
    score: window.__dbg.state.team.score, cmds: window.__dbg.state.team.commands,
    lives: window.__dbg.state.team.lives,
    players: window.__dbg.state.latest ? window.__dbg.state.latest.p.map((p) => [p[0], Math.round(p[1]), Math.round(p[2])]) : null,
  }));
  console.log(`replay t=${i + 1}s`, JSON.stringify(s));
}

await replay.screenshot({ path: 'shot-replay.png' });
await browser.close();
