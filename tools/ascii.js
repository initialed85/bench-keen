// Headless browser check: load the client, capture console errors, dump the canvas as ASCII.
import { chromium } from 'playwright';

const EGA = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170], [170, 0, 0], [170, 0, 170],
  [170, 85, 0], [170, 170, 170], [85, 85, 85], [85, 85, 255], [85, 255, 85],
  [85, 255, 255], [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];
const CH = ' kbgrcmowsBGCRMyW'.split('');

function asciiScript(step) {
  return `(() => {
    const EGA = ${JSON.stringify(EGA)};
    const CH = ${JSON.stringify(CH)};
    const cv = document.getElementById('screen');
    const c = cv.getContext('2d');
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const rows = [];
    const R = ${JSON.stringify(region)};
    const y0 = R ? R.y0 : 0, y1 = R ? R.y1 : cv.height;
    const x0 = R ? R.x0 : 0, x1 = R ? R.x1 : cv.width;
    for (let y = y0; y < y1; y += ${step}) {
      let line = '';
      for (let x = x0; x < x1; x += ${step}) {
        const i = (y * cv.width + x) * 4;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        let best = 0, bd = 1e9;
        for (let k = 0; k < EGA.length; k++) {
          const dr = r - EGA[k][0], dg = g - EGA[k][1], db = b - EGA[k][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bd) { bd = dist; best = k; }
        }
        line += CH[best + 1];
      }
      rows.push(line);
    }
    return rows.join('\\n');
  })()`;
}

const step = Number(process.argv[2] || 4);
const region = process.argv[3] ? JSON.parse(process.argv[3]) : null;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

console.log('=== initial ===');
console.log(await page.evaluate(asciiScript(step)));

await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1500);
console.log('=== walking right ===');
console.log(await page.evaluate(asciiScript(step)));

await page.keyboard.up('ArrowRight');
console.log('console:', logs.length ? logs.join('\n') : '(clean)');
await browser.close();
