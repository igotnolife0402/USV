---
summary: Every VFX sheet ever made, white only, in vfx/sheets; find by grepping vfx/index.tsv; rules for painting with gradients and textures.
updated: 2026-11-25
status: current
---
# VFX library (owner 2026-11-24: "all vfx in the same file, anybody needing vfx knows exactly where they are")

## Where
- `vfx/sheets/<slug>.png`: one file per effect, **white only** (light = alpha, grey+alpha PNG). Colour is added at use time, never stored.
- Sheets made in the hub vfx generator (owner 2026-11-25: one path for every tool, on `main`): the hub cannot write git, so its db collection `vfxsheets` is only an **inbox**. Any Claude session moves it here: ArtifactData list `vfxsheets` (out_dir scratch) → `node tools/vfx/hub_import.mjs <scratch>/vfxsheets vfx` (redraws each from code+seed with showcase/lib/ugen.js, LA PNG, slug `gen-<name>`, src `hub/<key>`) → ArtifactData update each doc `{repo: slug}` → republish the hub with the new `vfx/sheets` files + `vfx/index.tsv` as `{from: 'vfx/index.tsv', contentType: 'text/plain'}` (.tsv is not a served type). Sheets at or over the quality floor (jump >= 3, > 4 empty frames) are never saved and are scrapped on import. Names say what the sheet is (`smoke cloud`), never the prompt (`gunshot smoke cloud`). `tools/vfx/library.py` keeps `hub/` rows on rebuild.
- `vfx/index.tsv`: one row per sheet: `slug  name  kind  grid  frames  life  src`. Never open the sheets to search; grep the index:
  `grep -i slash vfx/index.tsv | cut -f1-5`, `grep -c . vfx/index.tsv`, `awk -F'\t' '$3=="action"' vfx/index.tsv | head`
- Only the newest, owner-approved set lives here (owner 2026-11-24 deleted the older gen/nf/vb/ref/icon/sym sets): 67 `act-` actions (slash, smash, wind, ...) + 30 `sym-` symbols, plus `gen-` sheets imported from the hub generator (26 on 2026-11-25).

| kind | grid | frames | size | Roblox |
|---|---|---|---|---|
| action | 4 | 16 | 1024 | `FlipbookLayout = Grid4x4` |
| symbol | 1 | 1 | 256 | no flipbook (static texture) |

`life` = suggested ParticleEmitter Lifetime (s). Upload a sheet to Roblox and use its asset id; never invent ids.

## Painting rules
1. **One dominant hue + white-hot core + at most one accent.** Faint edges get the deepest hue, the brightest pixels stay near white.
2. **Gradient map, not a flat tint**: light (alpha) picks a colour from a ramp edge -> core, e.g. fire `#7a1010 -> #ff4a12 -> #ffa21f -> #ffe7a0 -> #fff`. Flat tint of a white sheet looks like a sticker.
3. **Colour over life** = a second gradient in time: hot at birth, cooler and darker as it dies (fire: yellow -> orange -> deep red; magic: white -> hue -> dark hue).
4. **Textures break flat areas, never the silhouette**: multiply 25-40 % noise / cells / streaks inside the alpha; keep edges soft. Scroll the texture over time for energy (Beam `TextureSpeed`, shader UV offset).
5. **Blend**: glow, fire, magic, sparks = additive (`LightEmission = 1`). Smoke, dust, debris = normal blend (`LightEmission = 0`), dark grey ramp `#1a1a1f -> #5a5a62 -> #9a9aa2`, never additive (it turns into fog).
6. **Value contrast** against the scene: on bright skies add a darker hue at the edges or a normal-blend dark layer behind; on dark scenes keep the core small so it does not bloom into a blob.
7. **Never bake colour into vfx/sheets** and never add colour copies: a painted file goes to scratch or the game, the library stays white.
8. **Every layer painted on its own** (owner 2026-11-25, L-156): no layer cap; smoke/glow/core/sparks/decal each get their own 4-7 stop ramp that shifts hue >= 20 deg (dark edge -> bright end) + a texture (noise/cells/streaks, 0.35-0.5); never reuse one painted png for two layers. Only core layers end `#ffffff`; glow/sparks/decal end in a bright saturated colour (stacked white ends blow out grey-white). Enforced by `paintCheck` in tools/vfx/showcase/generator.html and build.mjs (paints each layer itself).

### Roblox (ParticleEmitter)
- `Texture` = the sheet. `Color = ColorSequence` is the over-life gradient (rule 3). Roblox multiplies one colour per particle, so the light-based gradient map (rule 2) comes from stacking a large faint hue layer with a small white core layer, or from a pre-painted texture (paint.py below).
- `LightEmission` 1 for glow, 0 for smoke; `Brightness` 1-5; `Transparency` NumberSequence fade-in 0-10 %, fade-out last 40 %.
- `FlipbookLayout` per the table, `FlipbookMode = OneShot` (hits) or `Loop` (auras), `FlipbookFramerate = frames / life`.
- Beam/Trail: `Texture` + `TextureSpeed` for scrolling, `TextureMode = Wrap`, `Color` ColorSequence along the length.

### three.js
- Load as `Texture`, sample alpha: `float a = texture2D(map, uv).a; vec3 c = texture2D(ramp, vec2(a, 0.5)).rgb;` (ramp = 256x1 `DataTexture`), `gl_FragColor = vec4(c, a * life)`.
- Additive: `blending: THREE.AdditiveBlending, depthWrite: false, transparent: true`. Flipbook: uv = (uv + vec2(col, row)) / grid, frame = floor(t * frames).
- Texture overlay: multiply a scrolled noise sample into `a` before the ramp lookup (rule 4).

### Pre-painting a texture (when the engine can only tint)
`python3 tools/vfx/paint.py vfx/sheets/<slug>.png OUT.png --ramp fire --tex noise --grid 8`
Presets: fire, ice, electric, poison, holy, void, blood, wind; or hex stops `--ramp "#3a0a5e,#9b3dff,#fff"`. `--tex noise|cells|streaks`, `--tex-amt 0.35`. OUT goes to scratch or the game, never into vfx/sheets (rule 7).

## Built by (2026-11-25)
| Step | Tool | Output |
|---|---|---|
| Generate (physics flipbooks, Grid8x8) | `tools/vfx/flipbook/` | scratch |
| Generate (stylized action packs) | `tools/vfx/stylized/` | scratch |
| Generate (liquid) | `tools/vfx/liquid/` | scratch |
| Collect approved set into the library | `tools/vfx/library.py` | `vfx/sheets` + `vfx/index.tsv` |
| Colour a copy | `tools/vfx/paint.py` | scratch or the game |
| Showcase clip (Umbrio Studio) | `tools/vfx/showcase/` | Claude-Hub tab |
| Prompt → clip (owner types the animation) | `tools/vfx/showcase/generator.html` | Claude-Hub tile "vfx generator" |
- The `mix3` act- set is drawn by `tools/vfx/stylized/unique.py` (33 elements, 1-2 per sheet). Its browser port `tools/vfx/showcase/lib/ugen.js` draws NEW sheets the same way from Claude-written scripts in the Claude-Hub vfx generator (2026-11-25).

## Adding effects
Generator output lands in scratch first. A newer, better set replaces the old one (owner 2026-11-24): set `SRC` to the new set only, `git rm -r vfx/sheets vfx/index.tsv`, rebuild. To add alongside instead: add its folder to `SRC` in `tools/vfx/library.py` (prefix, kind, grid, frames, life) and run `python3 tools/vfx/library.py SCRATCH vfx`: it dedupes by pixels, writes white sheets and rebuilds the index. Commit `vfx/`.

## Showcase clip
`tools/vfx/showcase/build.mjs` + `spec.json`: 20 painted sheets on a crystal caster, anim.cine payoff at 8.5 s; story time is shorter than the clip (cine slow-mo adds ~2 s). Run `PLUGINS=tools/3d/studio/plugins node tools/vfx/showcase/build.mjs tools/vfx/showcase/spec.json FXDIR OUT`, check with `SHOTS_TAB=OUT/studio SHOTS_LINT=1 SHOTS_FPS=12 node test/run.mjs shots`.
