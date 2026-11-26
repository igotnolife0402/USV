"""Fireball hero meshes (owner 2026-11-26: "classic fireball that leaves burn marks on impact").
White-hot core inside two displaced flame shells (yellow inner, red-orange outer) plus a few molten embers
orbiting close: custom textured meshes, never a plain sphere. Group space, centred on the origin, ~1.3 m across.
  python3 models.py OUT   -> OUT/geo/<gid>.json + OUT/models.json {objects, textures}"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # local copy of the mesh kit (tools stay separate)
import meshkit as P

OUT = sys.argv[1]
rng = np.random.default_rng(11)
noise = P.Noise(np.random.default_rng(5))

tex = {
    'core': {"kind": "procedural", "pattern": "gradient", "colors": ['#ffd36a', '#fff3c4', '#ffffff'], "scale": 2.2},
    'flame': {"kind": "procedural", "pattern": "clouds", "colors": ['#ff7a12', '#ffb13a', '#ffe08a', '#fff6d8'], "scale": 0.6},
    'flameOut': {"kind": "procedural", "pattern": "clouds", "colors": ['#5a0c02', '#b8260a', '#ff5a10', '#ff9a2a'], "scale": 0.5},
    'magma': {"kind": "procedural", "pattern": "rock", "colors": ['#1a0904', '#4a1606', '#ff5a10', '#ffb13a'], "scale": 0.9},
}


def shell(r, amp, freq, seed, sub=4, stretch=1.25):
    """Icosphere pushed out by fbm, then pulled back along -z into a tongue so it reads as fire moving +z."""
    m = P.icosphere(sub)
    v = m.v.copy()
    n = noise.fbm(v * freq + seed, 4)
    v *= (1 + amp * n)[:, None] * r
    back = np.clip(-v[:, 2] / r, 0, None)                 # trailing side streams out behind the motion
    v[:, 2] -= back ** 1.6 * r * (stretch - 1) * 2.2
    v[:, [0, 1]] *= (1 - 0.35 * np.clip(back, 0, 1) ** 2)[:, None]
    m.v = v
    return m


parts = [
    dict(id='core', name='Fireball core', mesh=P.box_uv(P.xf(P.icosphere(3), s=0.3), 1.0), color='#fff3c4', texture='core',
         emissive='#ffd36a', emissiveIntensity=1.6, roughness=0.4),
    dict(id='inner', name='Inner flame', mesh=P.box_uv(shell(0.48, 0.22, 2.4, 3.0, stretch=1.35), 0.9), color='#ffb13a',
         texture='flame', emissive='#ff9a2a', emissiveIntensity=1.1, transparency=0.25, roughness=0.6),
    dict(id='outer', name='Outer flame', mesh=P.box_uv(shell(0.66, 0.3, 1.8, 9.0, stretch=1.6), 0.8), color='#ff5a10',
         texture='flameOut', emissive='#d8380c', emissiveIntensity=0.7, transparency=0.45, roughness=0.7),
]
for i in range(5):                                         # molten embers riding the flame edge, all different
    e = P.icosphere(1)
    ev = e.v * rng.uniform(0.05, 0.1) * (1 + 0.3 * noise.fbm(e.v * 3 + i * 7, 2))[:, None]
    ev = P.facets(ev, rng, k=4, depth=0.8, strength=0.9)
    d = P.unit(rng.normal(size=3) * [1, 1, 0.4] + [0, 0, -0.6])
    e.v = ev + d * rng.uniform(0.6, 0.8)
    parts.append(dict(id='ember%d' % i, name='Molten ember %d' % (i + 1), mesh=P.box_uv(e, 1.2), color='#ff7a12',
                      texture='magma', emissive='#ff5a10', emissiveIntensity=1.2, roughness=0.5))

# scorch needs a surface to show on (a burn mark on the black void was invisible, render 2026-11-26): small dirt patch only
tex['dirt'] = {"kind": "procedural", "pattern": "rock", "colors": ['#5a4a3a', '#7d6a55', '#a08a6e', '#c4b08f'], "scale": 1.4}   # night light: dark dirt hid the scorch
g = P.lathe(np.array([(0, 0), (3.2, 0), (3.6, -0.06), (3.8, -0.2), (0, -0.2)]), 48, True)
gv = g.v.copy(); top = gv[:, 1] > -0.01
gv[top, 1] += 0.03 * noise.fbm(gv[top] * 1.7 + 21, 3)
g.v = gv
parts.append(dict(id='ground', g='ground', name='Dirt patch', mesh=P.box_uv(g, 1.0), color='#a08a6e', texture='dirt', roughness=0.95))

os.makedirs(os.path.join(OUT, 'geo'), exist_ok=True)
objs, tris = {}, 0
for p in P.fit_parts([dict(p, g=p.get('g', 'fireball')) for p in parts]):
    gid = 'fb-' + p['id']
    with open(os.path.join(OUT, 'geo', gid + '.json'), 'w') as fh:
        fh.write(P.geo_doc(p['mesh']))
    o = {"type": "mesh", "name": p['name'], "geo": gid, "parent": None if p['g'] == 'ground' else 'fireball', "pos": [0, 0, 0], "rot": [0, 0, 0], "color": p['color'],
         "smooth": True, "roughness": p.get('roughness', 0.5), "metalness": 0.0, "texture": 'fb-' + p['texture']}
    for k in ('emissive', 'emissiveIntensity', 'transparency'):
        if k in p: o[k] = p[k]
    objs[gid] = o
    tris += sum(len(f) - 2 for f in p['mesh'].f)
json.dump({"objects": objs, "textures": {'fb-' + k: t for k, t in tex.items()}}, open(os.path.join(OUT, 'models.json'), 'w'))
print('%d mesh parts, %d tris, %d textures' % (len(objs), tris, len(tex)))
