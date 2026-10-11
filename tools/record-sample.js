// Drive one player for a while and save a sample recording.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:22222/?name=KEEN', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(autopilot);
await page.waitForTimeout(25000);
const saved = await page.evaluate(async () => (await fetch('/api/demo/save', { method: 'POST' })).json());
console.log('sample saved', JSON.stringify(saved));
await browser.close();
