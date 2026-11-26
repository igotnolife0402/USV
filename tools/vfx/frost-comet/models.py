"""Frost Comet hero meshes (owner 2026-11-26: "triangle shape, same colour everywhere, bland"; comet "tiny").
Comet: 1.9 m faceted ice rock with jutting ice spikes and a glowing core. Crystal: one cluster of 13 hexagonal
shards (no two alike) on a frozen base, marble-veined ice, an emissive heart in the main spire.
  python3 models.py OUT   -> OUT/geo/<gid>.json + OUT/models.json {objects, textures, groups}
Meshes are in group space: comet centred on its origin, crystal standing on y = 0."""
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # local copy of the props mesh kit (tools stay separate)
import meshkit as P

OUT = sys.argv[1]
rng = np.random.default_rng(26)
noise = P.Noise(np.random.default_rng(7))
ICE = ['#2fa8ff', '#6fd0ff', '#b8efff', '#f0fdff']   # darker marble read navy under night light


def shard(r, h, sides=6, tip=0.22, wob=0.06):
    """Hex prism with a faceted point; vertices nudged so every shard is unique, not a cone."""
    prof = [(0, -0.12), (r * 0.82, -0.12), (r, h * 0.1), (r * 0.94, h * (1 - tip)), (r * 0.35, h * (1 - tip * 0.35)), (0, h)]
    m = P.lathe(np.array(prof), sides, False)
    v = m.v.copy()
    k = 1 + wob * noise.fbm(v * 2.3 + rng.uniform(0, 40, 3), 2)[:, None]
    v[:, [0, 2]] *= k                                      # uneven faces
    v[:, 1] += h * 0.04 * rng.uniform(-1, 1) * (v[:, 1] > h * 0.9)
    m.v = v
    return m


def uv(m, s):
    return P.box_uv(m, s)


parts, tex = [], {}
tex['ice'] = {"kind": "procedural", "pattern": "marble", "colors": ICE, "scale": 0.9}
tex['iceDeep'] = {"kind": "procedural", "pattern": "marble", "colors": ['#0b4c8c', '#2fa8ff', '#6fd0ff', '#b8efff'], "scale": 0.7}
tex['frost'] = {"kind": "procedural", "pattern": "noise", "colors": ['#2fa8ff', '#8fe8ff', '#e8fbff', '#ffffff'], "scale": 0.35}
tex['rock'] = {"kind": "procedural", "pattern": "rock", "colors": ['#0b2a4c', '#1f5f9c', '#6fc8f0', '#d8f6ff'], "scale": 0.8}
tex['glow'] = {"kind": "procedural", "pattern": "gradient", "colors": ['#2fa8ff', '#8fe8ff', '#ffffff'], "scale": 2.6}

# ---- crystal cluster (group 'crystal', stands on y=0)
main = shard(0.46, 3.3, tip=0.2, wob=0.05)
parts.append(dict(g='crystal', id='spire', name='Crystal spire', mesh=uv(P.xf(main, r=(4, 15, 0)), 1.1),
                  color='#8fe8ff', texture='ice', roughness=0.08, metalness=0.15, transparency=0.22, emissive='#2fa8ff', emissiveIntensity=0.35))
heart = shard(0.17, 2.5, tip=0.3, wob=0.02)
parts.append(dict(g='crystal', id='heart', name='Crystal heart', mesh=uv(P.xf(heart, t=(0, 0.25, 0), r=(4, 15, 0)), 2.6),
                  color='#bff2ff', texture='glow', emissive='#6fd8ff', emissiveIntensity=2.2, roughness=0.3))
ring = [  # radius from centre, height, shard radius, outward tilt, yaw: one ring of 8 + 4 small, all different
    (0.42, 2.1, 0.27, 18), (0.5, 1.5, 0.22, 30), (0.38, 1.85, 0.25, 22), (0.55, 1.1, 0.18, 38),
    (0.45, 1.65, 0.23, 26), (0.52, 0.9, 0.15, 44), (0.4, 1.35, 0.2, 28), (0.5, 1.2, 0.19, 34),
    (0.8, 0.55, 0.1, 55), (0.85, 0.7, 0.12, 50), (0.78, 0.45, 0.09, 60), (0.82, 0.6, 0.11, 52)]
for i, (d, h, r, tilt) in enumerate(ring):
    yaw = i * 360 / 8 + rng.uniform(-14, 14) if i < 8 else 22 + (i - 8) * 90 + rng.uniform(-10, 10)
    a = math.radians(yaw)
    m = shard(r, h * rng.uniform(0.92, 1.08), sides=int(rng.choice([5, 6, 6, 7])), tip=rng.uniform(0.15, 0.3))
    m = P.xf(m, r=(0, 0, -tilt))                       # lean out along +x
    m = P.xf(m, t=(d * math.cos(a), 0.05, -d * math.sin(a)), r=(0, yaw, 0))
    deep = i % 3 == 1
    parts.append(dict(g='crystal', id='shard%d' % i, name='Crystal shard %d' % (i + 1), mesh=uv(m, 1.3),
                      color='#2fa8ff' if deep else '#8fe8ff', texture='iceDeep' if deep else 'ice',
                      roughness=0.1, metalness=0.12, transparency=0.25, emissive='#2fa8ff', emissiveIntensity=0.3))
base = P.icosphere(3)
bv = base.v * np.array([1.05, 0.32, 1.05])
bv *= (1 + 0.12 * noise.fbm(base.v * 2.1 + 3, 3))[:, None]
bv = P.facets(bv, rng, k=9, depth=0.78, strength=0.9)
bv[:, 1] = np.maximum(bv[:, 1], -0.02) + 0.06
base.v = bv
parts.append(dict(g='crystal', id='base', name='Frozen base', mesh=uv(base, 0.8), color='#8fe8ff', texture='frost', roughness=0.55))

# ---- comet (group 'comet', centred): faceted ice rock 1.9 m + spikes + glowing core showing through cracks
body = P.icosphere(4)
cv = body.v * (1 + 0.22 * noise.fbm(body.v * 1.6 + 11, 4))[:, None] * 0.95
cv = P.facets(cv, rng, k=11, depth=0.8, strength=0.85)
body.v = cv * np.array([1.0, 0.9, 1.12])
parts.append(dict(g='comet', id='rock', name='Comet ice rock', mesh=uv(body, 0.9), color='#6fc8f0', texture='rock', roughness=0.35, metalness=0.1))
core = P.icosphere(3)
core.v = core.v * 0.5   # 0.78 poked out of the rock as a pale bulb (render 2026-11-26)
parts.append(dict(g='comet', id='core', name='Comet core', mesh=uv(core, 1.0), color='#ffffff', texture='glow',
                  emissive='#8fe8ff', emissiveIntensity=3.0, transparency=0.35))
for i, d in enumerate(P.unit(rng.normal(size=(7, 3)))):
    if d[1] > 0.55:                                        # spikes point back/sideways, not along the fall
        d[1] = -d[1]
    h = rng.uniform(0.45, 0.85)
    m = shard(rng.uniform(0.08, 0.14), h, sides=5, tip=0.35)
    ax = np.cross([0, 1, 0], d); s = np.linalg.norm(ax)
    ang = math.acos(np.clip(d[1], -1, 1))
    # rodrigues: shard +Y onto d
    k_ = ax / max(s, 1e-9); K = np.array([[0, -k_[2], k_[1]], [k_[2], 0, -k_[0]], [-k_[1], k_[0], 0]])
    R = np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * K @ K
    m.v = (m.v @ R.T) + d * 0.72
    parts.append(dict(g='comet', id='spike%d' % i, name='Comet ice spike %d' % (i + 1), mesh=uv(m, 1.4),
                      color='#8fe8ff', texture='ice', roughness=0.1, transparency=0.2))

# ---- write
os.makedirs(os.path.join(OUT, 'geo'), exist_ok=True)
objs, tris = {}, 0
for p in P.fit_parts(parts):
    gid = 'fc-' + p['g'] + '-' + p['id']
    with open(os.path.join(OUT, 'geo', gid + '.json'), 'w') as fh:
        fh.write(P.geo_doc(p['mesh']))
    o = {"type": "mesh", "name": p['name'], "geo": gid, "parent": p['g'], "pos": [0, 0, 0], "rot": [0, 0, 0], "color": p['color'],
         "smooth": False, "roughness": p.get('roughness', 0.5), "metalness": p.get('metalness', 0.0), "texture": 'fc-' + p['texture']}
    for k in ('emissive', 'emissiveIntensity', 'transparency'):
        if k in p: o[k] = p[k]
    objs[gid] = o
    tris += sum(len(f) - 2 for f in p['mesh'].f)
json.dump({"objects": objs, "textures": {'fc-' + k: t for k, t in tex.items()}}, open(os.path.join(OUT, 'models.json'), 'w'))
print('%d mesh parts, %d tris, %d textures' % (len(objs), tris, len(tex)))
