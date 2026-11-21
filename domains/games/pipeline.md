---
summary: Browser game pipeline: file layout, loop architecture, asset formats, test automation, build and deploy
updated: 2026-11-21
status: current
triggers: [game pipeline, sprite sheet, game assets, game build]
---
# Games pipeline

## 1. Layout
Small game (default, single file):
```
game/index.html      canvas + inline <script type="module">
```
Grown game (> ~600 lines):
```
game/index.html  game/src/main.js (loop)  game/src/input.js  game/src/entities.js
game/src/audio.js  game/src/config.js  game/assets/ (sprites .png, sfx .wav/.ogg, models .glb)
```

## 2. Architecture
1. `CONFIG` tunables → `state` object (mode: title|play|over, entities, score).
2. Loop: rAF → accumulate dt (clamp 0.1) → `while (acc >= STEP) update(STEP)` → `render()`.
3. `update` never touches DOM; `render` never mutates state.
4. Input map: `keys` set + pointer state, read in update.
5. Pools for bullets/particles; `alive` flag, reuse.

## 3. Assets
| Asset | Format | Rule |
|---|---|---|
| Sprites | PNG sheet, power-of-2 optional, 1 px padding | Atlas JSON `{name:{x,y,w,h}}` |
| Pixel art | PNG, integer scale | smoothing off |
| SFX | .wav (short) / .ogg (music) | Or generated at runtime; see [audio pipeline](domains/audio/pipeline.md) |
| 3D | .glb ≤ 5 MB, Draco/meshopt | [3d pipeline](domains/3d/pipeline.md) |
| Fonts | system or one woff2 | Artifact: system only |
Free sources (PC): Kenney.nl (CC0), OpenGameArt (check license), Poly Pizza (CC0/CC-BY models).

## 4. Test (PC)
serve → playwright-mcp/chrome-devtools-mcp navigate → console clean → screenshot title → press start → hold keys 1-2 s → screenshot → verify score/position changed → force game over → restart works.
Expose `window.__game = state` in dev for automation to read state via evaluate.

## 5. Build/deploy
Single file: copy as-is. Multi-file: `npx vite build` (base `./`) → `dist/`. Host on GitHub Pages / itch.io (zip `dist/`, index.html at root).
Mobile: Artifact + repo file; publishing to itch.io → [queue/pc.md](queue/pc.md).
