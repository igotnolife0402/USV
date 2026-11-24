---
summary: Every VFX sheet ever made, white only, in vfx/sheets; find by grepping vfx/index.tsv; rules for painting with gradients and textures.
updated: 2026-11-24
status: current
---
# VFX library (owner 2026-11-24: "all vfx in the same file, anybody needing vfx knows exactly where they are")

## Where
- `vfx/sheets/<slug>.png`: one file per effect, **white only** (light = alpha, grey+alpha PNG). Colour is added at use time, never stored.
- `vfx/index.tsv`: one row per sheet: `slug  name  kind  grid  frames  life  src`. Never open the sheets to search; grep the index:
  `grep -i slash vfx/index.tsv | cut -f1-5`, `grep -c . vfx/index.tsv`, `awk -F'\t' '$3=="action"' vfx/index.tsv | head`
- Slug prefix = family: `gen` physics flipbooks, `nf` stage flipbooks, `vb` beams, `act` actions (slash/smash/wind), `sym` symbols, `ref` reference cut-outs, `icon` icon cut-outs.

| kind | grid | frames | size | Roblox |
|---|---|---|---|---|
| flipbook | 8 | 64 | 1024 | `FlipbookLayout = Grid8x8` |
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
8. Layer one effect from several sheets (smoke -> glow -> core -> sparks, see `.claude/skills/vfx/SKILL.md`); each layer gets its own ramp from the same palette.

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

## Adding effects
Generator output lands in scratch first. Then: add its folder to `SRC` in `tools/vfx/library.py` (prefix, kind, grid, frames, life) and run `python3 tools/vfx/library.py SCRATCH vfx`: it dedupes by pixels, writes white sheets and rebuilds the index. Commit `vfx/`.
