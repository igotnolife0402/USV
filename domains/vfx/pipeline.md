---
summary: VFX pipeline: effect test pages, shader file layout, sprite/flipbook textures, perf budgets, integration and Roblox mapping
updated: 2026-11-21
status: current
triggers: [flipbook, sprite sheet, shader files, vfx budget]
---
# VFX pipeline

## 1. Layout
```
tools/vfx/pages/<name>.html  isolated test page: trigger key/tap + FPS readout
tools/vfx/pages/shaders/<name>.vert.glsl, <name>.frag.glsl   (inline in Artifacts)
tools/vfx/pages/textures/<name>.png      sprites/flipbooks (generated or CC0)
tools/vfx/pages/presets.js               emitter presets {rate, life, speed, spread, gravity, drag, colors, size}
```

## 2. Build
1. Write emitter or shader in test page; one tunables object at top.
2. Trigger, screenshot peak + decay (PC automation), tune timing/curves.
3. Integrate: export a function `spawn<Name>(x, y)` or a three.js object factory; pool lives in the module.

## 3. Textures
| Kind | Format | Rule |
|---|---|---|
| Soft particle | 64x64 PNG radial gradient, white | Tint in code; generate via canvas when possible |
| Flipbook | PNG grid (e.g. 8x8 of 128 px), power of 2 | Frame = floor(life01 * frames) |
| Noise | 256x256 tileable PNG or in-shader noise | Prefer in-shader for Artifacts |
| Roblox | PNG ≤ 1024 px, flipbook 2x2/4x4/8x8 | ParticleEmitter.FlipbookLayout |

## 4. Shader boilerplate rules
- WebGL1/GLSL ES 1.0: `precision highp float;`, `gl_FragColor`. WebGL2: `#version 300 es` first line, `out vec4 fragColor`.
- Uniforms: `uTime`, `uResolution`, `uMouse`. UV = `gl_FragCoord.xy / uResolution`.
- three.js: `ShaderMaterial` (adds built-ins) vs `RawShaderMaterial` (you declare all).

## 5. Budgets (mid phone, 60 fps)
| Item | Cap |
|---|---|
| Canvas 2D particles | ~2,000 additive |
| three.js Points/instanced | ~50,000 |
| Full-screen frag passes | ≤ 3 at DPR ≤ 2 |
| Bloom | 1 UnrealBloomPass, half resolution |

## 6. Roblox mapping
Burst → `ParticleEmitter:Emit(n)`; trails → `Trail` between two Attachments; beams → `Beam`; glow → `PointLight` + `Bloom` in Lighting. Build via Studio MCP run code; mobile writes the setup as a `.luau` module and queues play-test in [queue/pc.md](queue/pc.md).
