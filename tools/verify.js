// Final check: live game renders a player on ground tiles; replay renders the recorded run.
import { chromium } from 'playwright';
import { autopilot } from './autopilot.js';

const EGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],[85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];
const CH = ' kbgrcmowsBGCRMyW'.split('');
const view = (x0, y0, x1, y1) => `(() => {
  const EGA=${JSON.stringify(EGA)}, CH=${JSON.stringify(CH)};
  const cv=document.getElementById('screen'); const d=cv.getContext('2d').getImageData(0,0,320,200).data;
  const rows=[];
  for(let y=${y0};y<${y1};y++){let l='';for(let x=${x0};x<${x1};x++){const i=(y*320+x)*4;let b=0,bd=1e9;for(let k=0;k<16;k++){const dr=d[i]-EGA[k][0],dg=d[i+1]-EGA[k][1],db=d[i+2]-EGA[k][2];const dd=dr*dr+dg*dg+db*db;if(dd<bd){bd=dd;b=k;}}l+=CH[b+1];}rows.push(l);}
  return rows.join('\\n');
})()`;

const browser = await chromium.launch({ headless: true });

const live = await browser.newPage({ viewport: { width: 1280, height: 800 } });
live.on('pageerror', (e) => console.log('[live]', e.message));
await live.goto('http://127.0.0.1:22222/', { waitUntil: 'networkidle' });
await live.waitForTimeout(1200);
console.log('=== LIVE (spawn area) ===');
console.log(await live.evaluate(view(40, 90, 120, 122)));
await live.evaluate(autopilot);
await live.waitForTimeout(3000);
console.log('live after 3s', await live.evaluate(() => JSON.stringify({
  score: window.__dbg.state.team.score, x: Math.round(window.__dbg.localPlayer.x),
  cam: window.__dbg.state.cam })));

const demo = (await (await fetch('http://127.0.0.1:22222/api/demos')).json())[0].name;
const rp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
rp.on('pageerror', (e) => console.log('[replay]', e.message));
await rp.goto(`http://127.0.0.1:22222/?demo=${demo}`, { waitUntil: 'networkidle' });
await rp.waitForTimeout(1500);
console.log('=== REPLAY', demo, '===');
console.log(await rp.evaluate(view(140, 88, 190, 120)));
console.log('replay state', await rp.evaluate(() => JSON.stringify({
  tick: window.__dbg.state.replayTick, len: window.__dbg.state.replayLength,
  score: window.__dbg.state.team.score, cam: window.__dbg.state.cam })));

await browser.close();
