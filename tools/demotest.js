// Record a scripted run, replay it, and check the frames match.
import { createGame, simulate, snapshot } from '../src/engine.js';
import { startDemo, record, replay } from '../src/demo.js';

const g = createGame(0);
const pid = g.join('Keen').id;

const demo = startDemo(g);
const live = [];
for (let i = 0; i < 600; i++) {
  const p = g.players[0];
  const inp = { right: true, left: false, jump: p.onGround && (i % 40 < 12), fire: i % 7 === 0, down: false };
  record(demo, g, { [pid]: inp });
  simulate(g, { [pid]: inp });
  live.push(snapshot(g));
}

const { frames } = replay(demo);
let diff = 0;
for (let i = 0; i < live.length; i++) {
  if (JSON.stringify(live[i]) !== JSON.stringify(frames[i])) {
    if (diff === 0) console.log('first diff at tick', i, JSON.stringify(live[i]).slice(0, 160), '\n', JSON.stringify(frames[i]).slice(0, 160));
    diff++;
  }
}
console.log(`frames=${frames.length} diffs=${diff} score=${frames.at(-1).team.score} taken=${frames.at(-1).i.filter((x) => x[4]).length}`);

