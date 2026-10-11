// Sound behaviour: context state, scheduled voices, and events per snapshot.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const audio = () => page.evaluate(() => window.__audio());
await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
console.log('after load (no gesture)', JSON.stringify(await audio()));
await page.keyboard.press('KeyX');
await page.waitForTimeout(100);
console.log('after first key', JSON.stringify(await audio()));
await page.evaluate(autopilot);
let peak = 0;
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(500);
  const a = await audio();
  peak = Math.max(peak, a.voices);
  console.log(`t=${i * 0.5}s`, JSON.stringify(a), 'events/snapshot', await page.evaluate(() => window.__dbg.state.latest.ev.length));
}
console.log('peak voices', peak);
await browser.close();
