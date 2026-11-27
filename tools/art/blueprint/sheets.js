// Content for each domain blueprint (sheet.html?s=<key>). Facts mirror domains/<d>/playbook.md, pipeline.md, detail.md;
// change the note first, then this file. Step = [name, what to do, worked example, output, gate].
const AX = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cfe6ff" stroke-width="1.5"/>`;
const SHEETS = {
model: {
  ex: 'IRON LONGSWORD (HERO)', title: 'MODEL', dn: 'PB-101', sub: 'REALISTIC 3D MODEL · UMBRIO SANDBOX · CUSTOM MESHES + TEXTURES + REAL THICKNESS',
  steps: [
    ['REFERENCE', 'List every sub-part the real thing is made of, then pick class prop | hero | scene.', 'pommel, grip wrap, crossguard, ricasso, fuller, edge bevel, rivets → hero', 'part list + class', 'owner ref matched'],
    ['SCALE', '1 unit = 1 m, origin at base centre, +Y up. One joint group per moving part, pivot at the joint.', '1.1 m long; origin at grip base; blade group pivots at the guard', 'bounds + groups', 'real-world size'],
    ['PRIMARY', 'Big forms as custom meshes: tapered swept tubes, lathes, bevelled extrusions. Never raw primitives.', 'blade = bevelled extrusion; grip = tapered tube; pommel = lathe', 'silhouette', 'reads from far'],
    ['SECONDARY', 'Trims, rims, straps, rivets, ridges, seams, hinges: separate parts sitting proud ≥ 1 cm.', 'leather wrap bands, guard rim, 2 rivets, fuller groove 4 mm deep', 'mid detail', 'no floating parts'],
    ['TERTIARY', 'Chips, wear, grooves, engravings, stitches. Vary size and rotation: no perfect repeats.', 'edge nicks, worn wrap edges, engraving on the ricasso', 'close detail', 'no repetition'],
    ['SURFACES', 'Texture on every non-glow part (wood, brushed, fabric, rock...). Glow = separate Neon parts.', 'brushed steel blade, leather grip, dark iron guard', 'materials', '≥ 70% textured'],
    ['LIVE BUILD', 'Write stage by stage into a fresh Umbrio tab, the exact model only: no ground, no scenery.', 'stage 1 blade → 2 guard → 3 grip → 4 pommel → read back', 'Umbrio tab', 'read-back matches'],
    ['GATES', 'zfight check, detail.py --class, attach check, then cut useless tris / split meshes so caps pass.', 'zfight PASS · detail --class hero PASS · every mesh ≤ 19k tris', 'shipped model', 'all PASS + looked'],
  ],
  svg: `<svg width="760" height="200" viewBox="0 0 760 200">
    <rect x="10" y="20" width="220" height="150" fill="none" stroke="#cfe6ff" stroke-width="2.5"/>
    <text x="10" y="192" font-size="13">PRIMARY · silhouette (far)</text>
    <rect x="270" y="20" width="220" height="150" fill="none" stroke="#cfe6ff" stroke-width="2.5"/>
    <rect x="270" y="20" width="220" height="16" fill="none" stroke="#ffd166" stroke-width="1.5"/><rect x="270" y="154" width="220" height="16" fill="none" stroke="#ffd166" stroke-width="1.5"/>
    <rect x="330" y="36" width="12" height="118" fill="none" stroke="#ffd166"/><rect x="418" y="36" width="12" height="118" fill="none" stroke="#ffd166"/>
    <text x="270" y="192" font-size="13">+ SECONDARY · trims (mid)</text>
    <rect x="530" y="20" width="220" height="150" fill="none" stroke="#cfe6ff" stroke-width="2.5"/>
    <rect x="530" y="20" width="220" height="16" fill="none" stroke="#ffd166" stroke-width="1.5"/><rect x="530" y="154" width="220" height="16" fill="none" stroke="#ffd166" stroke-width="1.5"/>
    <rect x="590" y="36" width="12" height="118" fill="none" stroke="#ffd166"/><rect x="678" y="36" width="12" height="118" fill="none" stroke="#ffd166"/>
    ${[0,1,2,3,4,5].map(i=>`<circle cx="${545+i*40}" cy="28" r="2.5" fill="#fff"/><circle cx="${545+i*40}" cy="162" r="2.5" fill="#fff"/>`).join('')}
    <path d="M620 70 l14 10 l-6 14 M650 110 l20 4 M560 60 l8 22" stroke="#fff" fill="none"/>
    <text x="530" y="192" font-size="13">+ TERTIARY · wear (close)</text></svg>`,
  basics: [
    '<b>Many separate parts</b> in joint groups, never one fused mesh.',
    '<b>Real thickness</b>: every panel has depth; nothing paper-thin.',
    '<b>No stacking</b> rugs, decals or glass on a surface: one plane or cut.',
    '<b>Every piece touches</b> its group body; auras are VFX, not geometry.',
    '<b>Build max detail first</b>, then trim triangles at the end.',
    '<b>Realistic</b> unless the owner names a style; scope = the model only.',
  ],
  gates: [
    ['Hero: parts', '≥ 40'], ['Hero: custom meshes', '≥ 60%'], ['Hero: textured', '≥ 70%'], ['Hero: colours / surface types', '≥ 6 / ≥ 3'],
    ['Hero: triangles', '≥ 15k'], ['Any one size group', '≤ 25%'], ['Prop: parts', '≥ 15'], ['Tris per mesh (Roblox cap 20k)', '≤ 19k'],
    ['zfight: level overlap', '< 1.5 cm'], ['zfight: layered overlap', '< 12 cm'], ['Proud detail offset', '≥ 1 cm'], ['Web GLB', '≤ 5 MB'],
  ],
  files: `<b>iron-longsword/</b>
├─ README.md   <i>run · test · status</i>
├─ SPEC.md     <i>ref parts · class</i>
├─ <b>scripts/</b>
│  └─ build.py <i>stages → tab</i>
├─ <b>src/parts/</b>  <i>meshes + tex</i>
├─ <b>tests/</b>      <i>zfight · detail</i>
└─ <b>out/</b>        <i>project.json · glb</i>`,
},
vfx: {
  ex: 'FIRE IMPACT (ORANGE, ONE-SHOT)', title: 'VFX', dn: 'PB-102', sub: 'VISUAL EFFECTS · WEB + ROBLOX · WHITE SHEETS, TINTED IN CODE · LAYERED, READABLE, 60 FPS',
  steps: [
    ['BRIEF', 'Element, colour word, mood, one-shot or loop. Grep vfx/index.tsv first: reuse a sheet before drawing one.', 'fire hit, orange → red, one-shot; index.tsv has an explosion sheet: reuse it', 'spec + colour ramp', 'scope = the ask'],
    ['TIMING', 'Lay the layers on a timeline: anticipation, core, secondary, residue. Gameplay hits ≤ 0.5 s.', 'flash 0-50 · core 30-300 · smoke 80-900 · embers 250-2000 ms', 'timeline', 'reads in 0.5 s'],
    ['SHEETS', 'White flipbooks (4x4 / 8x8, power of 2), soft particle 64 px. Light must last past the flash.', '8x8 white fireball flipbook + 64 px soft dot, tinted orange in code', 'vfx/sheets/*.png', 'no 1-frame pop'],
    ['CORE', 'Bright, fast, additive burst, 100-300 ms life. Only the core may end at pure white.', '24 additive fire sprites, life 0.2 s, white → yellow → orange', 'core layer', 'clear silhouette'],
    ['SECONDARY', 'Smoke and debris: slower, normal blend, gravity + drag. Same hue family as the core.', '10 grey smoke puffs, drag 3, slow rise; 6 debris chunks with gravity', 'depth layer', 'hue within 35°'],
    ['RESIDUE', 'Embers / decals fading 0.5-2 s. Camera: shake 4-10 px decaying, hit-stop 30-80 ms.', '15 embers fade over 1.5 s; shake 6 px; hit-stop 50 ms', 'tail + camera', 'no overkill'],
    ['TEST PAGE', 'Isolated page with trigger + FPS readout. Capture peak (~100 ms) and decay frames.', 'fire-impact test.html: tap = trigger, FPS top-left, frames at 100 + 600 ms', 'test.html', '60 fps, 0 errors'],
    ['INTEGRATE', 'spawn&lt;Name&gt;(x, y) with a pool, or Roblox Emit(n) / Beam / Trail. Save sheets + index row.', 'spawnFireImpact(x, y) from a pool · Roblox: Emit(24) on hit', 'game-ready fx', 'looked in context'],
  ],
  svg: (() => { const L = [['ANTICIPATION',0,50,'#fff'],['CORE',30,300,'#ffd166'],['SECONDARY',80,900,'#cfe6ff'],['RESIDUE',250,2000,'#8fb8e6'],['CAMERA SHAKE',30,400,'#cfe6ff']];
    const x = t => 150 + Math.sqrt(t/2000)*590;
    return `<svg width="760" height="210" viewBox="0 0 760 210">${L.map((l,i)=>`<text x="0" y="${28+i*34}" font-size="12">${l[0]}</text><rect x="${x(l[1])}" y="${16+i*34}" width="${x(l[2])-x(l[1])}" height="16" fill="none" stroke="${l[3]}" stroke-width="2"/>`).join('')}
    ${AX(150,190,745,190)}${[0,50,100,300,1000,2000].map(t=>`${AX(x(t),186,x(t),194)}<text x="${x(t)-10}" y="207" font-size="11">${t}</text>`).join('')}<text x="640" y="180" font-size="11">ms (√ scale)</text></svg>` })(),
  basics: [
    '<b>Layer it</b>: core + secondary + residue reads richer than one big emitter.',
    '<b>Value contrast</b> against the background beats more particles.',
    '<b>Colour ramp</b>: one element hue family; the colour word wins.',
    '<b>One big effect at completion</b>, small subtle ones elsewhere.',
    '<b>Pool everything</b>: no allocation per frame; warm up shaders.',
    '<b>Respect reduced motion</b>; no full-screen flashing over 3 Hz.',
  ],
  gates: [
    ['Gameplay hit length', '≤ 0.5 s'], ['Core life', '100-300 ms'], ['Residue life', '0.5-2 s'], ['Shake / hit-stop', '4-10 px / 30-80 ms'],
    ['Canvas 2D particles', '~2,000'], ['three.js instanced', '~50,000'], ['Full-screen passes', '≤ 3 @ DPR ≤ 2'], ['Bloom', '1, half res'],
    ['Frame time (4x throttle)', '≤ 16 ms'], ['Roblox texture', '≤ 1024 px'], ['Hue spread in ramp', '≤ 35°'], ['Flashing', '≤ 3 Hz'],
  ],
  files: `<b>fire-impact/</b>
├─ README.md   <i>run · test · status</i>
├─ SPEC.md     <i>element · timing</i>
├─ <b>src/</b>
│  ├─ test.html <i>trigger + FPS</i>
│  └─ presets.js
├─ <b>scripts/</b>    <i>draw sheets</i>
├─ <b>tests/</b>      <i>peak + decay</i>
└─ <b>out/</b> → vfx/sheets + index.tsv`,
},
animation: {
  ex: 'HEAVY SWORD SLASH', title: 'ANIMATION', dn: 'PB-103', sub: 'KEY-POSE ANIMATION · ONE SPEC → STUDIO CLIP, ROBLOX, VIDEO · WEIGHT IS TIMING',
  steps: [
    ['SPEC', 'One motion spec per rig drives every output (clip, Roblox Lua, MP4). Edit the spec, never an output.', 'slash.py: POSES ready / windup / strike / follow + one CLIP', 'spec file', 'single source'],
    ['RIG', 'A group per joint at its pivot, meshes at rest under it. A pose = the groups\' rotations.', 'groups at shoulder, elbow, wrist, hips; sword under the hand group', 'rig at rest', 'pivots correct'],
    ['KEY POSES', 'Keys only on turning points: anticipation, contact, extremes. A few per joint, never per frame.', '5 keys: ready · wind-up (blade back) · contact · follow · recover', 'pose set', 'fits with tol'],
    ['TIMING', 'Slow lift, long wind-up, held beat, fast cut, braked follow-through, slow recovery.', 'lift 0.3 · wind-up 0.5 · hold 0.15 · cut 0.22 · follow 0.3 · recover 0.5 s', 'beat sheet', 'cut ≈ 0.22 s'],
    ['EASING', 'auto (Hermite) through motion; smooth only at real starts/stops; impacts out + hit-stop.', 'wind-up auto · cut eases out · 0.1 s hit-stop at contact', 'eased tracks', 'no linear jerks'],
    ['ARCS & IK', 'arc_keys in-betweens on fast cuts; wrists by two-bone IK; blades by aim; feet on the ground.', '3 arc_keys on the cut; ik_arm puts the wrist on the grip; feet keyed flat', 'clean arcs', 'no clipping'],
    ['FX & CAMERA', 'Effects ride the clip at the contact point. Fights: anim.cine camera, grade, impact + rim lights.', 'swing trail on the tip path; camera push-in + shake on contact', 'cine pass', 'fx on contact'],
    ['CHECK', 'anim.lint 0, shots at 3 times + MP4, payoff as a 12 fps sheet. Fights: FK gate first.', 'anim.lint 0 · shots at 0.8 / 1.1 / 1.6 s · 12 fps payoff sheet', 'clip + MP4', 'lint 0 + looked'],
  ],
  svg: (() => { const P = [['LIFT',0,.18],['WIND-UP',.18,.48],['HOLD',.48,.58],['CUT',.58,.66],['FOLLOW',.66,.8],['RECOVER',.8,1]];
    const x = t => 20 + t*720;
    const curve = 'M20 150 C 120 150, 170 120, 186 115 S 330 70, 366 60 L 438 60 C 450 60, 470 175, 495 178 C 520 180, 560 170, 596 160 C 650 150, 700 150, 740 150';
    return `<svg width="760" height="215" viewBox="0 0 760 215">${AX(20,190,740,190)}${P.map(p=>`${AX(x(p[1]),40,x(p[1]),194)}<text x="${x(p[1])+4}" y="206" font-size="11">${p[0]}</text>`).join('')}
    <path d="${curve}" fill="none" stroke="#ffd166" stroke-width="2.5"/>${[[20,150],[186,115],[366,60],[438,60],[495,178],[596,160],[740,150]].map(p=>`<rect x="${p[0]-5}" y="${p[1]-5}" width="10" height="10" fill="#0b3a6e" stroke="#fff" stroke-width="1.5"/>`).join('')}
    <text x="24" y="30" font-size="11">blade angle · □ = key pose</text><text x="372" y="50" font-size="11">hit-stop</text></svg>` })(),
  basics: [
    '<b>Poses first, then timing, then easing</b>: never animate frame by frame.',
    '<b>Anticipation → action → follow-through</b> on every big move.',
    '<b>Contact, not swings</b>: clashes are keys where both blades meet.',
    '<b>Root keys keep feet grounded</b>; never move a big build\'s root on phones.',
    '<b>Effects ride the clip</b> (start / life), parented to hands.',
    '<b>End on something</b>: a held silhouette or drifting embers, never black.',
  ],
  gates: [
    ['anim.lint faults', '0'], ['Fast cut', '≈ 0.22 s'], ['Hit-stop hold', '0.08-0.15 s'], ['Clip fps for fast cuts', '60'],
    ['Single Euler jump', '< 150° (arc_keys)'], ['Blade turn at shoulder', '> 120°'], ['Blade contact distance', '≤ 0.15 stud'], ['Fighter gap', '≈ blade × 0.8'],
    ['Blade tip height', '≥ 0.05'], ['Shots check', '3 times + MP4'], ['Payoff review', '12 fps sheet'], ['Roblox priority', 'Action'],
  ],
  files: `<b>heavy-slash/</b>
├─ README.md   <i>run · test · status</i>
├─ SPEC.md     <i>beats · contacts</i>
├─ <b>src/</b>
│  ├─ spec.py  <i>poses + clips</i>
│  └─ rig/     <i>joint groups</i>
├─ <b>scripts/</b>    <i>spec → outputs</i>
├─ <b>tests/</b>      <i>lint · FK · shots</i>
└─ <b>out/</b>        <i>clip · rbxmx · mp4</i>`,
},
};
