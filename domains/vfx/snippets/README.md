# VFX snippets

Belongs here: emitters, particle pools, shader boilerplate, noise functions, post-processing setups.
Naming: `<what>.<ext>` (e.g. `particle-pool.js`, `fbm.frag.glsl`, `bloom-setup.js`). Artifact-safe: no external textures.

## Canvas 2D particle pool (additive burst)
```js
const P = Array.from({ length: 2000 }, () => ({ life: 0 }));
function burst(x, y, n = 40, hue = 30) {
  for (const p of P) { if (n <= 0) break; if (p.life > 0) continue; n--;
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
    Object.assign(p, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, max: 0.3 + Math.random() * 0.4, hue }); }
}
function updateParticles(dt) { for (const p of P) if (p.life > 0) {
  p.life -= dt / p.max; p.vx *= 0.96; p.vy = p.vy * 0.96 + 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
function drawParticles(ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of P) if (p.life > 0) { const r = 1 + 3 * p.life;
    ctx.fillStyle = `hsla(${p.hue + 30 * p.life},100%,${50 + 40 * p.life}%,${p.life})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); }
  ctx.restore(); }
```

## Full-screen fragment shader (fbm noise glow)
```glsl
precision highp float;
uniform float uTime; uniform vec2 uResolution;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a*n(p); p *= 2.0; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution; float t = mod(uTime, 1000.0);
  float f = fbm(uv * 3.0 + vec2(0.0, -t * 0.4));
  vec3 col = mix(vec3(0.05,0.0,0.1), vec3(1.0,0.5,0.1), smoothstep(0.4, 0.9, f * (1.2 - uv.y)));
  gl_FragColor = vec4(col, 1.0);
}
```

## three.js bloom (pinned import map as in 3d snippets)
```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 1.2, 0.4, 0.8));
composer.addPass(new OutputPass()); // render with composer.render() instead of renderer.render()
```
