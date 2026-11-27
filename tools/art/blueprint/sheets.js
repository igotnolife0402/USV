// Content for each domain blueprint (sheet.html?s=<key>). Facts mirror domains/<d>/playbook.md, pipeline.md, detail.md;
// change the note first, then this file. Step = [name, what to do, output, gate].
const AX = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cfe6ff" stroke-width="1.5"/>`;
const SHEETS = {
model: {
  title: 'MODEL', dn: 'PB-101', sub: 'REALISTIC 3D MODEL · UMBRIO SANDBOX · CUSTOM MESHES + TEXTURES + REAL THICKNESS',
  steps: [
    ['REFERENCE', 'List what the real thing is made of (sword: pommel, grip wrap, guard, fuller, edge bevel). Pick class prop | hero | scene.', 'part list + class', 'owner ref matched'],
    ['SCALE', '1 unit = 1 m, origin at base centre, +Y up. One joint group per moving part, pivot at the joint.', 'bounds + groups', 'real-world size'],
    ['PRIMARY', 'Big forms as custom meshes: tapered swept tubes, lathes, bevelled extrusions. Never raw primitives.', 'silhouette', 'reads from far'],
    ['SECONDARY', 'Trims, rims, straps, rivets, ridges, seams, hinges: separate parts sitting proud ≥ 1 cm.', 'mid detail', 'no floating parts'],
    ['TERTIARY', 'Chips, wear, grooves, engravings, stitches. Vary size and rotation: no perfect repeats.', 'close detail', 'no repetition'],
    ['SURFACES', 'Texture on every non-glow part (wood, brushed, fabric, rock...). Glow = separate Neon parts.', 'materials', '≥ 70% textured'],
    ['LIVE BUILD', 'Write stage by stage into a fresh Umbrio tab, the exact model only: no ground, no scenery.', 'Umbrio tab', 'read-back matches'],
    ['GATES', 'zfight check, detail.py --class, attach check, then cut useless tris / split meshes so caps pass.', 'shipped model', 'all PASS + looked'],
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
  files: `<b>&lt;model&gt;/</b>
├─ README.md   <i>run · test · status</i>
├─ SPEC.md     <i>ref parts · class</i>
├─ <b>scripts/</b>
│  └─ build.py <i>stages → tab</i>
├─ <b>src/parts/</b>  <i>meshes + tex</i>
├─ <b>tests/</b>      <i>zfight · detail</i>
└─ <b>out/</b>        <i>project.json · glb</i>`,
},
vfx: {
  title: 'VFX', dn: 'PB-102', sub: 'VISUAL EFFECTS · WEB + ROBLOX · WHITE SHEETS, TINTED IN CODE · LAYERED, READABLE, 60 FPS',
  steps: [
    ['BRIEF', 'Element, colour word, mood, one-shot or loop. Grep vfx/index.tsv first: reuse a sheet before drawing one.', 'spec + colour ramp', 'scope = the ask'],
    ['TIMING', 'Lay the layers on a timeline: anticipation, core, secondary, residue. Gameplay hits ≤ 0.5 s.', 'timeline', 'reads in 0.5 s'],
    ['SHEETS', 'White flipbooks (4x4 / 8x8, power of 2), soft particle 64 px. Light must last past the flash.', 'vfx/sheets/*.png', 'no 1-frame pop'],
    ['CORE', 'Bright, fast, additive burst, 100-300 ms life. Only the core may end at pure white.', 'core layer', 'clear silhouette'],
    ['SECONDARY', 'Smoke and debris: slower, normal blend, gravity + drag. Same hue family as the core.', 'depth layer', 'hue within 35°'],
    ['RESIDUE', 'Embers / decals fading 0.5-2 s. Camera: shake 4-10 px decaying, hit-stop 30-80 ms.', 'tail + camera', 'no overkill'],
    ['TEST PAGE', 'Isolated page with trigger + FPS readout. Capture peak (~100 ms) and decay frames.', 'test.html', '60 fps, 0 errors'],
    ['INTEGRATE', 'spawn&lt;Name&gt;(x, y) with a pool, or Roblox Emit(n) / Beam / Trail. Save sheets + index row.', 'game-ready fx', 'looked in context'],
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
  files: `<b>&lt;effect&gt;/</b>
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
  title: 'ANIMATION', dn: 'PB-103', sub: 'KEY-POSE ANIMATION · ONE SPEC → STUDIO CLIP, ROBLOX, VIDEO · WEIGHT IS TIMING',
  steps: [
    ['SPEC', 'One motion spec per rig drives every output (clip, Roblox Lua, MP4). Edit the spec, never an output.', 'spec file', 'single source'],
    ['RIG', 'A group per joint at its pivot, meshes at rest under it. A pose = the groups\' rotations.', 'rig at rest', 'pivots correct'],
    ['KEY POSES', 'Keys only on turning points: anticipation, contact, extremes. A few per joint, never per frame.', 'pose set', 'fits with tol'],
    ['TIMING', 'Slow lift, long wind-up, held beat, fast cut, braked follow-through, slow recovery.', 'beat sheet', 'cut ≈ 0.22 s'],
    ['EASING', 'auto (Hermite) through motion; smooth only at real starts/stops; impacts out + hit-stop.', 'eased tracks', 'no linear jerks'],
    ['ARCS & IK', 'arc_keys in-betweens on fast cuts; wrists by two-bone IK; blades by aim; feet on the ground.', 'clean arcs', 'no clipping'],
    ['FX & CAMERA', 'Effects ride the clip at the contact point. Fights: anim.cine camera, grade, impact + rim lights.', 'cine pass', 'fx on contact'],
    ['CHECK', 'anim.lint 0, shots at 3 times + MP4, payoff as a 12 fps sheet. Fights: FK gate first.', 'clip + MP4', 'lint 0 + looked'],
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
  files: `<b>&lt;clip&gt;/</b>
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
