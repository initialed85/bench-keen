// Scripted play-through in a headless browser, dumping canvas regions as ASCII.
import { chromium } from 'playwright';

const EGA = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170], [170, 0, 0], [170, 0, 170],
  [170, 85, 0], [170, 170, 170], [85, 85, 85], [85, 85, 255], [85, 255, 85],
  [85, 255, 255], [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];
const CH = ' kbgrcmowsBGCRMyW'.split('');

function ascii(step, region) {
  return `(() => {
    const EGA = ${JSON.stringify(EGA)};
    const CH = ${JSON.stringify(CH)};
    const cv = document.getElementById('screen');
    const c = cv.getContext('2d');
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const rows = [];
    const x0 = ${region.x0}, x1 = ${region.x1}, y0 = ${region.y0}, y1 = ${region.y1};
    for (let y = y0; y < y1; y += ${step}) {
      let line = '';
      for (let x = x0; x < x1; x += ${step}) {
        const i = (y * cv.width + x) * 4;
        let best = 0, bd = 1e9;
        for (let k = 0; k < EGA.length; k++) {
          const dr = d[i] - EGA[k][0], dg = d[i + 1] - EGA[k][1], db = d[i + 2] - EGA[k][2];
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const snap = async (label, step, region) => {
  console.log(`=== ${label} ===`);
  console.log(await page.evaluate(ascii(step, region)));
};

const playerRegion = { x0: 40, y0: 80, x1: 120, y1: 120 };

await snap('stand', 1, playerRegion);
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(120);
  await snap(`walk ${i}`, 1, playerRegion);
}
await page.keyboard.up('ArrowRight');

await page.keyboard.press('KeyX');
await page.waitForTimeout(120);
await snap('shoot', 1, { x0: 40, y0: 80, x1: 160, y1: 120 });

await page.keyboard.down('Space');
await page.waitForTimeout(150);
await snap('jump', 1, { x0: 40, y0: 60, x1: 120, y1: 130 });
await page.keyboard.up('Space');

console.log('state:', JSON.stringify(await page.evaluate(() => {
  const d = window.__dbg;
  return { cam: d.state.cam, score: d.state.team.score, items: d.state.latest.i.filter((i) => i[4]).length,
    enemies: d.state.enemies.length, local: { x: d.localPlayer.x, y: d.localPlayer.y, anim: d.localPlayer.anim } };
})));
console.log('console:', logs.length ? logs.join('\n') : '(clean)');
await browser.close();
