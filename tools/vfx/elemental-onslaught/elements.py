# Elemental Onslaught v3 spec (owner 2026-11-25: "all are beams, make each element unique and eye-catching, e.g. poison =
# bubbles + eroding"). No beam shapes: every element gets its own 3D hero (parts with tracks) plus pack flipbooks.
#   python3 elements.py umbrio-base.json umbrio-spec.json  (base = camera, env, pack-sheet layers; writes the full spec)
# poison: glass bubbles float hand->T in wobbling arcs, swell and pop; corrosive puddle spreads, darkens, bubbles, fumes
# fire: core+shell fireball on an arc with comet trail; scorch disc; darkness: black hole with spinning accretion ring
# pulling rocks in, then collapse; light: sky pillar slams down, halo ring; rock: spikes erupt in a line to T, then sink;
# arcane: 3 grimoires orbit the caster then fly into T one by one. Finale: pillar + spike ring + six-colour payoff.
# v4 (owner: "use vfx generator inside of hub"): gen-* sheets = hub VFX Generator scripts (gen-sheets.json), baked by
# bake-sheets.cjs with the hub's own ugen.js; they are each element's main flipbook layer.
import json, math, random, sys
src, out = sys.argv[1], sys.argv[2]
S = json.load(open(src)); R = random.Random(7)
H, T = S['hand'], S['T']
r3 = lambda v: [round(x, 3) for x in v]
lerp = lambda a, b, k: [a[i] + (b[i] - a[i]) * k for i in range(3)]

# v5 (owner: "purple circle under a white beam, old vfx don't match"): no carry-over pack cards; every layer is placed on
# purpose, max gen sheet + one shape-fit partner per element, all colours from PAL (one table: ramps, parts, lights, circle)
PAL = {'poison': ('#e8ffb0', '#7be04a', '#2f5a14'), 'fire': ('#fff1b0', '#ff6a1a', '#7a1a05'),
       'void': ('#c9a8ff', '#4a1f8a', '#0a0612'), 'holy': ('#ffffff', '#ffe9a0', '#c89a3a'),
       'earth': ('#f0d9b0', '#8a6a48', '#3a2c20'), 'arcane': ('#dff4ff', '#5fb8ff', '#1e3f8a')}
S['ramps'] = {k: f'{sh},{m},{c},#ffffff' for k, (c, m, sh) in PAL.items()}
S['ramps']['dust'] = '#2a2620,#6a6050,#b0a48c'
S['name'] = 'Elemental Onslaught v5'
S['rims'] = [dict(S['rims'][0], color='#ffe9c0', base=0.6)]
for im in S['impacts']:
    el = {'#7be04a': 'poison', '#ff7a1f': 'fire', '#9b5bff': 'void', '#ffd34a': 'holy', '#d09a5a': 'earth', '#5fb8ff': 'arcane'}.get(im['color'])
    if el: im['color'] = PAL[el][1] if el != 'void' else PAL[el][0]
fx = []
parts = {'ground': S['parts']['ground']}
n = [0]
def part(name, shape, size, color, pos, tr, mat='SmoothPlastic', **kw):
    n[0] += 1; k = f'p{n[0]:03d}'
    parts[k] = dict(name=name, shape=shape, size=r3(size), color=color, material=mat, pos=r3(pos), tracks=tr, **kw)
def vis(t0, t1):  # hidden outside [t0, t1]
    return [[0, False, 'step'], [round(t0, 3), True, 'step'], [round(t1, 3), False, 'step']]
def keys(lst, ease='linear'):
    return [[round(t, 3), r3(v) if isinstance(v, list) else v, ease] for t, v in lst]
def fb(slug, ramp, t, pos, size, life=0.6, **kw):
    fx.append(dict(slug=slug, ramp=ramp, t=round(t, 3), pos=r3(pos), size=size, life=life, **kw))

# ---- POISON (B 1.6): bubbles + erosion
B = 1.6
for i in range(9):
    d = R.uniform(0.22, 0.48); t0 = B + 0.35 + i * 0.07; fly = R.uniform(0.6, 0.8)
    end = [T[0] + R.uniform(-1.2, 1.2), R.uniform(0.3, 1.4), T[2] + R.uniform(-1.0, 1.0)]
    mid = lerp(H, end, 0.5); mid[1] += R.uniform(0.6, 1.3); mid[0] += R.uniform(-0.8, 0.8)
    pop = t0 + fly
    part(f'Poison bubble {i}', 'sphere', [d] * 3, '#86ff52', H, {
        'pos': keys([(t0, H), (t0 + fly * 0.5, mid), (pop, end)], 'smooth'),
        'scale': keys([(t0, [0.2] * 3), (t0 + 0.15, [1] * 3), (pop - 0.08, [1.35] * 3), (pop, [0.05] * 3)]),
        'visible': vis(t0, pop)}, mat='Glass', transparency=0.35)
    fb('gen-poison-bubble', 'poison', pop - 0.3, end, round(d * 4, 2), life=0.5)
P = [T[0], 0.015, T[2]]
part('Corrosion puddle', 'cylinder', [3.6, 0.02, 3.6], '#5cff2e', P, {
    'scale': keys([(B + 0.9, [0.05, 1, 0.05]), (B + 1.6, [1, 1, 1]), (B + 2.8, [1.15, 1, 1.15]), (B + 3.0, [0.02, 1, 0.02])], 'out'),
    'color': keys([(B + 0.9, '#5cff2e'), (B + 1.8, '#1f6a12'), (B + 2.8, '#060a05')]),
    'visible': vis(B + 0.9, B + 3.0)}, mat='Neon')
for i in range(7):  # boiling bubbles on the puddle, each rises, swells, pops
    a = R.uniform(0, 6.28); rr = R.uniform(0.2, 1.4); t0 = B + 1.1 + i * 0.2; q = [P[0] + math.cos(a) * rr, 0.05, P[2] + math.sin(a) * rr]
    d = R.uniform(0.15, 0.35)
    part(f'Boil bubble {i}', 'sphere', [d] * 3, '#a6ff70', q, {
        'pos': keys([(t0, q), (t0 + 0.5, [q[0], d * 0.45, q[2]])], 'out'),
        'scale': keys([(t0, [0.1] * 3), (t0 + 0.45, [1.2] * 3), (t0 + 0.5, [0.05] * 3)]),
        'visible': vis(t0, t0 + 0.5)}, mat='Glass', transparency=0.3)
    fb('gen-poison-bubble', 'poison', t0 + 0.1, [q[0], 0.3, q[2]], 1.0, life=0.5)
fb('gen-poison-erode', 'poison', B + 1.2, [T[0], 0.04, T[2]], 4.2, life=1.6, flat=True, opacity=0.85)
fb('act-065-fountain-rise', 'poison', B + 1.4, [T[0], 0.9, T[2]], 3.0, life=1.6, blend='normal', opacity=0.5)  # green fumes

# ---- FIRE (B 4.6): fireball on an arc + scorch
B = 4.6; t0, t1 = B + 0.45, B + 0.85
arc = [lerp(H, [T[0], 1.0, T[2]], k) for k in (0, 0.5, 1)]; arc[1][1] += 1.0
for nm, d, col, tr in (('Fireball core', 0.42, '#fff1b0', 0), ('Fireball shell', 0.8, '#ff5a12', 0.45)):
    part(nm, 'sphere', [d] * 3, col, H, {
        'pos': keys([(t0, arc[0]), (t0 + 0.2, arc[1]), (t1, arc[2])], 'smooth'),
        'scale': keys([(B, [0.1] * 3), (t0, [1] * 3), (t1, [1.3] * 3), (t1 + 0.05, [0.05] * 3)]),
        'visible': vis(B, t1 + 0.05)}, mat='Neon', transparency=tr)
part('Scorch', 'cylinder', [3.2, 0.02, 3.2], '#ff6a1a', [T[0], 0.02, T[2]], {
    'scale': keys([(t1, [0.1, 1, 0.1]), (t1 + 0.25, [1, 1, 1])], 'out'),
    'color': keys([(t1, '#ff8a2a'), (t1 + 0.8, '#3a1206'), (t1 + 2.0, '#0c0806')]),
    'visible': vis(t1, B + 3.0)}, mat='Neon')
fb('gen-fire-burst', 'fire', t1 - 0.05, [T[0], 1.3, T[2]], 4.5, life=0.9)

# ---- DARKNESS (B 7.6): black hole + accretion ring pulling debris, collapse
B = 7.6; C = [T[0], 1.7, T[2]]; o, c = B + 0.6, B + 2.3
part('Black hole', 'sphere', [1.5] * 3, '#000000', C, {
    'scale': keys([(o, [0.05] * 3), (o + 0.3, [1] * 3), (c - 0.2, [1.15] * 3), (c, [0.02] * 3)], 'out'),
    'visible': vis(o, c)})
part('Accretion ring', 'torus', [3.4, 0.12, 3.4], '#a15cff', C, {
    'rot': keys([(o, [70, 0, 15]), (c, [70, 1440, 15])]),
    'scale': keys([(o, [0.05] * 3), (o + 0.35, [1] * 3), (c - 0.15, [0.8] * 3), (c, [0.02] * 3)]),
    'visible': vis(o, c)}, mat='Neon', rot=[70, 0, 15])
for i in range(8):  # rocks ripped off the ground into the hole
    a = R.uniform(0, 6.28); rr = R.uniform(2.0, 3.2); s0 = [C[0] + math.cos(a) * rr, 0.1, C[2] + math.sin(a) * rr]
    tt = o + 0.3 + i * 0.13; sz = R.uniform(0.15, 0.32)
    part(f'Pulled rock {i}', 'box', [sz, sz * 0.8, sz * 1.1], '#2a2630', s0, {
        'pos': keys([(tt, s0), (tt + 0.55, C)], 'in'),
        'rot': keys([(tt, [0, 0, 0]), (tt + 0.55, [R.uniform(200, 500), R.uniform(200, 500), 0])]),
        'scale': keys([(tt + 0.45, [1] * 3), (tt + 0.55, [0.05] * 3)]),
        'visible': vis(tt, tt + 0.55)}, mat='Slate')
fb('gen-dark-vortex', 'void', o + 0.1, C, 4.5, life=1.6)

# ---- LIGHT (B 10.6): sky pillar slams down + halo ring
def pillar(t, w, name):
    part(name, 'cylinder', [1, 30, 1], '#fff4c8', [T[0], 15, T[2]], {
        'scale': keys([(t, [0.05, 1, 0.05]), (t + 0.08, [w, 1, w]), (t + 0.5, [w * 0.6, 1, w * 0.6]), (t + 0.7, [0.02, 1, 0.02])], 'out'),
        'visible': vis(t, t + 0.7)}, mat='Neon')
    part(name + ' halo', 'torus', [1, 0.08, 1], '#ffe9a0', [T[0], 0.06, T[2]], {
        'scale': keys([(t, [w, 1, w]), (t + 0.6, [w * 6, 1, w * 6])], 'out'),
        'visible': vis(t, t + 0.6)}, mat='Neon')
pillar(11.35, 1.6, 'Light pillar')
fb('gen-light-pillar', 'holy', 11.3, [T[0], 3.0, T[2]], 6.0, life=1.0)

# ---- ROCK (B 13.6): spikes erupt in a line toward T, then sink
def spike(t, q, h, w, tilt, name, stay=1.4):
    down, up = [q[0], -h / 2 - 0.05, q[2]], [q[0], h * 0.38, q[2]]
    part(name, 'cone', [w, h, w], '#6e5a44', down, {
        'pos': keys([(t, down), (t + 0.12, up), (t + stay, up), (t + stay + 0.4, down)], 'out'),
        'visible': vis(t, t + stay + 0.4)}, mat='Slate', rot=tilt)
for i in range(7):
    k = (i + 1) / 7; q = lerp([H[0], 0, -1.6], T, k); q[0] += R.uniform(-0.35, 0.35)
    spike(14.0 + i * 0.07, q, 1.0 + k * 2.2, 0.5 + k * 0.6, [R.uniform(-14, 14), R.uniform(0, 90), R.uniform(-14, 14)], f'Rock spike {i}')
    if i % 2 == 0: fb('gen-rock-fault', 'earth', 14.0 + i * 0.07, [q[0], 0.5, q[2]], 2.0 + k * 2, life=0.9)

# ---- ARCANE (B 16.6): three grimoires orbit the caster, then fly into T one by one
for i in range(3):
    ph = i * 2.094; ks = []
    for j in range(7):
        t = 16.6 + j * 0.09; a = ph + j * 0.9; ks.append((t, [math.cos(a) * 1.1, 1.6 + 0.1 * math.sin(a * 2), -0.3 + math.sin(a) * 1.1]))
    tl = 17.1 + i * 0.18; start = ks[-1][1]; hit = [T[0] + (i - 1) * 0.6, 1.2, T[2]]
    ks += [(tl, start), (tl + 0.4, hit)]
    part(f'Grimoire {i}', 'box', [0.34, 0.09, 0.46], ['#1e3f8a', '#2a5cc0', '#163070'][i], start, {
        'pos': keys(ks, 'smooth'),
        'rot': keys([(16.6, [0, 0, 0]), (tl, [20, 540, 10]), (tl + 0.4, [40, 900, 20])]),
        'scale': keys([(16.6, [0.1] * 3), (16.75, [1] * 3), (tl + 0.36, [1] * 3), (tl + 0.4, [0.05] * 3)]),
        'visible': vis(16.6, tl + 0.4)}, mat='Fabric')
    fb('gen-arcane-glyph', 'arcane', tl + 0.38, hit, 2.2, life=0.7)
    fx.append(dict(slug='act-046-spiral-bolt', ramp='arcane', t=round(tl, 3), pos=r3(start), size=0.9, life=0.4, move=[[0.4, r3(hit)]]))

# ---- FINALE: pillar + spike ring under the payoff (pack payoff flipbooks kept)
pillar(20.95, 2.6, 'Finale pillar')
fb('gen-finale-burst', 'holy', 21.0, [T[0], 2.4, T[2]], 9.0, life=1.4)
# caster circle: one flat glyph per element window in that element's colour (light = gold), 0.3 s overlap = crossfade
W = [('poison', 0.2, 2.9), ('fire', 2.6, 5.95), ('void', 5.65, 8.95), ('holy', 8.65, 11.9), ('earth', 11.6, 14.9), ('arcane', 14.6, 18.0)]
for el, a, b in W:
    fx.append(dict(slug='gen-arcane-glyph', ramp=el, t=a, pos=[0, 0.04, 0], size=3.2, life=0.6, dur=round(b - a, 2), fps=8,
                   flat=True, opacity=0.7))
# one shape-fit partner per element, its own ramp, under the hero
fb('act-037-streaks-fountain', 'fire', 5.55, [T[0], 1.4, T[2]], 3.0, life=1.0, opacity=0.7)
fb('act-012-spiral-streaks', 'void', 8.0, C, 3.4, life=1.0, opacity=0.65)
fb('act-039-streaks-sparkfall', 'holy', 11.45, [T[0], 1.6, T[2]], 3.0, life=1.0, opacity=0.65)
fb('act-066-rise-shards', 'earth', 14.3, [T[0], 0.8, T[2]], 3.0, life=0.9, opacity=0.75)
for i in range(10):
    a = i * 0.628; q = [T[0] + math.cos(a) * 2.6, 0, T[2] + math.sin(a) * 2.6]
    spike(21.25 + (i % 3) * 0.03, q, 2.4, 0.8, [math.degrees(math.sin(a)) * 0.35, 0, -math.degrees(math.cos(a)) * 0.35], f'Finale spike {i}', stay=1.8)

S['fx'], S['parts'] = fx, parts
json.dump(S, open(out, 'w'), indent=1)
print(sum(1 for e in fx if e['slug'].startswith('gen-')), 'generator fx', len(fx), 'fx', len(parts), 'parts', sum(1 for e in fx if e.get('beam')), 'beams')
