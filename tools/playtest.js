// Gameplay smoke test in a headless browser: walk right, jump, fire; report state.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';

const EGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],[85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];
const CH = ' kbgrcmowsBGCRMyW'.split('');

function ascii(step, x0, y0, x1, y1) {
  return `(() => {
    const EGA=${JSON.stringify(EGA)}, CH=${JSON.stringify(CH)};
    const cv=document.getElementById('screen'); const d=cv.getContext('2d').getImageData(0,0,320,200).data;
    const rows=[];
    for(let y=${y0};y<${y1};y+=${step}){let l='';for(let x=${x0};x<${x1};x+=${step}){const i=(y*320+x)*4;let b=0,bd=1e9;for(let k=0;k<16;k++){const dr=d[i]-EGA[k][0],dg=d[i+1]-EGA[k][1],db=d[i+2]-EGA[k][2];const dd=dr*dr+dg*dg+db*db;if(dd<bd){bd=dd;b=k;}}l+=CH[b+1];}rows.push(l);}
    return rows.join('\\n');
  })()`;
}

const report = () => ({
  cam: window.__dbg.state.cam,
  score: window.__dbg.state.team.score,
  lives: window.__dbg.state.team.lives,
  cmds: window.__dbg.state.team.commands,
  taken: window.__dbg.state.latest.i.filter((i) => i[4]).length,
  enemiesAlive: window.__dbg.state.latest.e.filter((e) => !e[5]).length,
  player: { x: Math.round(window.__dbg.localPlayer.x), y: Math.round(window.__dbg.localPlayer.y),
    anim: window.__dbg.localPlayer.anim, state: window.__dbg.localPlayer.state },
  status: window.__dbg.state.status,
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

console.log('start', JSON.stringify(await page.evaluate(report)));

await page.evaluate(autopilot);
for (let i = 1; i <= 60; i++) {
  await page.waitForTimeout(1000);
  console.log(`t=${i}s`, JSON.stringify(await page.evaluate(report)));
}

console.log('enemies near camera', JSON.stringify(await page.evaluate(() =>
  window.__dbg.state.latest.e.filter((e) => !e[5] && Math.abs(e[2] - window.__dbg.state.cam[0]) < 200)
    .map((e) => [e[1], e[2], e[3], e[4]])
)));

console.log('=== view ===');
console.log(await page.evaluate(ascii(2, 0, 24, 160, 100)));
console.log('console:', logs.length ? logs.join('\n') : '(clean)');
await browser.close();
