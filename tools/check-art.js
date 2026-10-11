import { SPRITES, TILES } from '../src/art.js';
let bad = 0;
for (const [k, g] of [...Object.entries(SPRITES), ...Object.entries(TILES)]) {
  const w = new Set(g.map(r => r.length));
  if (w.size > 1) { bad++; console.log(`ragged: ${k} widths=${[...w].join(',')}`); }
  for (const r of g) for (const ch of r) if (!(ch in {'.':1})) { /* palette check below */ }
}
const PAL = Object.keys((await import('../src/art.js')).PAL);
for (const [k, g] of [...Object.entries(SPRITES), ...Object.entries(TILES)]) {
  for (const r of g) for (const ch of r) if (!PAL.includes(ch)) { bad++; console.log(`bad char '${ch}' in ${k}`); }
}
console.log(bad ? `problems: ${bad}` : 'art OK: all rows uniform, all chars in palette');
