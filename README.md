# bench-keen

Running [Niko1221/Strata](https://github.com/Niko1221/Strata)

```shell
./Strata/engine/strata --serve --pack ./Strata-data/packs/swift-iq2_xs --native ./Strata-data/models/swift-IQ2_XS/Swift-Qwen3.8-Flash-Next-GSQ-RCO-IQ2_XS-00001-of-00002.gguf --ple-gguf ./Strata-data/models/swift-IQ2_XS/Swift-Qwen3.8-Flash-Next-GSQ-RCO-IQ2_XS-00001-of-00002.gguf --expert-profile ./Strata/data/expert-profile.bin --expert-cache auto --prefill auto --spec 4 --spec-min-p 0.5 --mtp ./Strata-data/mtp/rt --max-context 131072 --kv int8
```

- GPU: AMD Radeon RX 9070 XT, 16 GB
- CPU: AMD Ryzen 5 5600X 6-Core Processor, 12 threads
- RAM: 48GB
  - 2 x 16GB 2133 MT/s (Corsair)
  - 2 x 8GB 2133 MT/s (GEIL)
- SSD: EDILOCA EN680E 1TB NVMe

## Prompts

```
i need you to whip me up a browser-based multiplayer side-scrolling game that is as possible to Command Keen 1 (visually and in playback style); of course it will have the key difference of being multiplayer

leave it running at 0.0.0.0:22222 when you're finished so i can validate it
```

---

```
nice work- i'm impressed. something up with the sound though; the first time something plays it just kinda plays some jarring noise sound on a loop over and over
```

# bench-keen

A browser-based, multiplayer side-scroller modelled on **Commander Keen 1 — Keen Dreams**:
320×200 pixel canvas, 16-colour EGA palette, 8×8 tiles, hand-authored pixel sprites,
60 Hz server-authoritative simulation, demo recording and playback.

## Run

```
npm install          # express + ws
npm start            # listens on http://0.0.0.0:22222
```

Open `http://<host>:22222/` in two or more tabs — they share one world.

**Controls:** `← →` move · `SPACE` jump (hold for a higher jump) · `X` fire · `↓` drop
through platforms.

## Recordings

The engine is **pure** (no `Math.random`, no clock reads), so a demo is exactly
`{ initial state, per-tick inputs }` and replays bit-for-bit.

- **F9** in the game saves the current recording to `demos/`.
- `/demos.html` lists recordings; a link opens `/?demo=<file>` which replays it at 60 Hz.
- API: `GET /api/demos`, `POST /api/demo/save`.

## Layout

| Path | Role |
| --- | --- |
| `src/engine.js` | simulation: physics, collisions, enemies, pickups, camera, snapshot. Shared by server and client. |
| `src/levels.js` | three levels, generated on a tile grid |
| `src/art.js` | EGA palette, tile and sprite pixel maps |
| `src/demo.js` | serialize / record / replay |
| `server.js` | Express + WebSocket, authoritative 60 Hz loop, demo recording |
| `public/js/game.js` | client: input, local prediction, interpolation, HUD |
| `public/js/renderer.js` | tile/sprite drawing with caching |
| `public/js/font.js` | 8×8 bitmap font |
| `public/js/audio.js` | WebAudio synth for sound effects |

The server serves `src/{engine,art,levels,demo}.js` at `/shared/*` so the client runs the
identical engine code.

## Tests

```
npm test        # headless, no browser: art integrity, engine, level traversal bots, demo determinism
npm run playtest      # one autopiloted player in a headless browser
npm run multiplayer   # two players in one room, shared state
npm run demoplay      # record live, save, replay in a second page
npm run record        # drive one player and save a sample recording to demos/
```

`npm test` success looks like:

```
art OK: all rows uniform, all chars in palette
gate test: status= levelclear
L1 THE DREAMSCAPE: status=play t=400s maxX=139/140 commands=2 items=18/22 deaths=0
frames=600 diffs=0 score=500 taken=3
```

The browser tests need `playwright` (a devDependency) and a downloaded chromium
(`npx playwright install chromium`).

## Notes

- The client predicts the local player with the same fixed 60 Hz step as the server, and
  renders remote state interpolated with a 90 ms buffer. Key taps are latched on both sides
  so a short press is never dropped between samples.
- Snapshot events are **drained** by `snapshot()`: they are per-tick, so a snapshot carries
  only what just happened. Sound effects are triggered from them, and the AudioContext is
  only scheduled once it is `running` (a suspended context queues every tone at time 0 and
  fires them as one burst on resume). Voices are capped at 6.
- `tools/bot2.js` proves every level is geometrically traversable and the commands are
  reachable; the in-browser autopilot is deliberately naive, so its deaths are its own AI
  limits, not level bugs.
