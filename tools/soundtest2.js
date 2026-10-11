// Hold fire: blips should track the fire rate, never pile up.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.keyboard.press('KeyX');          // first gesture unlocks audio
await page.keyboard.down('ArrowRight');
await page.keyboard.down('KeyX');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1000);
  console.log(`t=${i}s`, JSON.stringify(await page.evaluate(() => window.__audio())));
}
await page.keyboard.up('KeyX');
await page.keyboard.up('ArrowRight');
await browser.close();
