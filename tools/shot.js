// Headless browser check: load the client, capture console errors, screenshot the canvas.
import { chromium } from 'playwright';

const shots = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const canvas = await page.$('#screen');
await canvas.screenshot({ path: 'shot-1.png' });

// walk right and fire
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1200);
await page.keyboard.press('Space');
await page.waitForTimeout(300);
await canvas.screenshot({ path: 'shot-2.png' });
await page.keyboard.press('KeyX');
await page.waitForTimeout(200);
await canvas.screenshot({ path: 'shot-3.png' });
await page.keyboard.up('ArrowRight');

console.log('console:', logs.length ? logs.join('\n') : '(clean)');
await browser.close();
