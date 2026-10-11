// Demo recording: the engine is deterministic, so a demo is
// { initial state, per-tick inputs } and replays bit-for-bit.

import { LEVELS, parseLevel, simulate, snapshot } from './engine.js';

export function serialize(g) {
  return JSON.parse(JSON.stringify(g));
}

export function startDemo(g) {
  return { v: 1, tickRate: 60, levelIndex: g.levelIndex, initial: serialize(g), inputs: [] };
}

export function record(demo, g, inputs) {
  demo.inputs.push([g.tick, inputs]);
}

export function replayStream(demo) {
  const g = JSON.parse(JSON.stringify(demo.initial));
  g.level = parseLevel(LEVELS[demo.levelIndex]);
  let i = 0;
  return {
    get length() { return demo.inputs.length; },
    get game() { return g; },
    done() { return i >= demo.inputs.length; },
    next() {
      if (i >= demo.inputs.length) return null;
      const [, inputs] = demo.inputs[i++];
      simulate(g, inputs);
      return snapshot(g);
    },
  };
}

export function replay(demo) {
  const g = JSON.parse(JSON.stringify(demo.initial));
  g.level = parseLevel(LEVELS[demo.levelIndex]);
  // tiles are rebuilt from source; keep the live item/enemy state from the recording
  const src = LEVELS[demo.levelIndex];
  g.level.w = src.w; g.level.h = src.h; g.level.gw = src.gw; g.level.gh = src.gh;
  const frames = [];
  for (const [tick, inputs] of demo.inputs) {
    simulate(g, inputs);
    frames.push(snapshot(g));
  }
  return { frames, game: g };
}
