// Tiny WebAudio blip synth: square waves, no samples.
// The context is created and resumed on the first user gesture; tones are only
// scheduled once it is actually running, otherwise they would all queue at
// currentTime 0 and fire together as one burst.

let ctx = null;
let master = null;
const MAX_VOICES = 6;
let voices = 0;
let played = 0;

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', vol = 1, sweep = 0) {
  if (!ctx || ctx.state !== 'running' || voices >= MAX_VOICES) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  voices++;
  played++;
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => { voices--; };
}

window.__audio = () => (ctx ? { state: ctx.state, voices, played, time: Math.round(ctx.currentTime * 1000) / 1000 } : null);

export function sfx(kind) {
  if (!ctx) return;
  switch (kind) {
    case 'shoot': tone(680, 0.09, 'square', 0.5, -420); break;
    case 'jump': tone(220, 0.14, 'square', 0.4, 380); break;
    case 'land': tone(120, 0.06, 'square', 0.25, -40); break;
    case 'memory': tone(1200, 0.06, 'square', 0.4, 200); break;
    case 'gem': tone(900, 0.1, 'square', 0.5, 500); tone(1400, 0.12, 'square', 0.4, 400); break;
    case 'life': tone(700, 0.12, 'square', 0.5, 700); break;
    case 'command': tone(500, 0.16, 'square', 0.6, 900); break;
    case 'kill': tone(400, 0.12, 'square', 0.5, -300); break;
    case 'death': tone(300, 0.35, 'square', 0.6, -250); break;
    case 'lifelost': tone(180, 0.4, 'square', 0.6, -120); break;
    case 'clear': tone(600, 0.18, 'square', 0.6, 400); break;
    case 'win': tone(400, 0.5, 'square', 0.7, 1200); break;
    case 'gate': tone(1000, 0.2, 'square', 0.5, 600); break;
  }
}
