"""Two avatar.py studio outputs -> one Umbrio tab: a fight cutscene (both rigs, one clip, world-space flipbook effects).

  python3 duel.py SPEC.json OUT [--work DIR]   ($WORK in SPEC paths = DIR, default the cwd)

SPEC: {"name", "len", "camera", "fighters": [{"dir": avatar OUT, "tag": "a", "yaw": 90, "path": [[t, [x, y, z]]], "hide": t}],
       "fxdir": vfx.py OUT, "fx": [{"preset", "t", "life" | "dur" (loop), "pos", "size", "flat", "shape": "beam", "length", "speed",
       "rot", "move": [[t, [x, y, z]]], "grow": [[t, s]]}]}
Writes OUT/studio/{project,meta}.json, geo/, uploads.json, writes.json (ArtifactData batches, upload ids to fill) and prints the gate."""
# @style: helper
import json, os, shutil, sys, time

args = sys.argv[1:]
SPEC, OUT = json.load(open(args[0])), os.path.abspath(args[1])
BASE = os.path.dirname(os.path.abspath(args[0]))
WORK = os.path.abspath(args[args.index('--work') + 1]) if '--work' in args else os.getcwd()   # build outputs live outside the vault
P = lambda p: os.path.normpath(p.replace('$WORK', WORK) if p.startswith('$WORK') else p if os.path.isabs(p) else os.path.join(BASE, p))
ST = os.path.join(OUT, 'studio'); os.makedirs(os.path.join(ST, 'geo'), exist_ok=True)
LEN = SPEC.get('len', 20.0)

objs, tracks, textures, uploads, geos = {}, {}, {}, {}, []
for f in SPEC['fighters']:
    d = P(f['dir']); doc = json.load(open(os.path.join(d, 'studio', 'project.json'))); tag = f['tag']
    rid = lambda k: f'{tag}_{k}'
    for k, o in doc['objects'].items():
        o = dict(o); o['parent'] = rid(o['parent']) if o.get('parent') else None
        if o.get('texture', '').startswith('t-'): o['texture'] = f't-{tag}-' + o['texture'][2:]
        if o.get('tex', '').startswith('fx-'): o['tex'] = f'fx-{tag}-' + o['tex'][3:]
        if o['type'] == 'mesh':
            g = f"{tag}-{o['geo']}"; shutil.copy(os.path.join(d, 'studio', 'geo', o['geo'] + '.json'), os.path.join(ST, 'geo', g + '.json'))
            o['geo'] = g; geos.append(g)
        objs[rid(k)] = o
    root = rid('A0'); objs[root].update(pos=f['path'][0][1], rot=[0, f.get('yaw', 0), 0])
    for k, tr in doc['anims']['fight']['tracks'].items(): tracks[rid(k)] = tr
    # path keys: [t, [x, y, z]] or [t, [x, y, z], ease] (a 'step' holds, then jumps: cuts, hit-stops)
    tracks.setdefault(root, {})['pos'] = [[p[0], p[1], p[2] if len(p) > 2 else 'smooth'] for p in f['path']]
    if f.get('yaw_path'):        # footwork turns: [t, yaw deg]
        tracks[root]['rot'] = [[p[0], [0, p[1], 0], p[2] if len(p) > 2 else 'smooth'] for p in f['yaw_path']]
    if f.get('tint'):            # body clothing tint (multiplies the texture): tells two same-outfit fighters apart
        for k, o in objs.items():
            if k.startswith(tag + '_') and o['type'] == 'mesh' and any(w in o.get('name', '') for w in ('Torso', 'Arm', 'Leg', 'Hand', 'Foot')): o['color'] = f['tint']
    for e in f.get('extra', []):  # extra tracks on the fighter's own objects, matched by id prefix: {"match": "X0", "ch": "scale", "keys": [...]}
        for k in doc['objects']:
            if k.startswith(e['match']): tracks.setdefault(rid(k), {})[e['ch']] = [[q[0], q[1], q[2] if len(q) > 2 else 'step'] for q in e['keys']]
    if 'hide' in f:              # gone in the blast: a step to zero scale
        h = f['hide']; tracks[root]['scale'] = [[0, [1, 1, 1], 'step'], [h, [1, 1, 1], 'step'], [h + 0.01, [0, 0, 0], 'step']]
    for k, t in doc['textures'].items():
        src = f'{tag}-' + t['src']; textures[f't-{tag}-' + k[2:]] = dict(t, src=src, name=src)
    for k, p in json.load(open(os.path.join(d, 'studio', 'uploads.json'))).items():
        uploads[(f'fx-{tag}-' + k[3:]) if k.startswith('fx-') else f'{tag}-' + k] = p

FXDIR = P(SPEC['fxdir'])
for i, e in enumerate(SPEC['fx']):
    meta = json.load(open(os.path.join(FXDIR, e['preset'] + '.json'))); v = e.get('variant')     # variant: a recoloured copy <preset>-<v>.png (tint.py)
    tid = 'fx-' + e['preset'] + (f'-{v}' if v else '')
    uploads[tid] = os.path.join(FXDIR, f"{e['preset']}-{v}.png" if v else meta['file'])
    loop = 'dur' in e; fps = meta.get('FlipbookFramerate', 24)
    life = e.get('life', meta['Lifetime']); dur = e['dur'] if loop else life
    o = dict(type='flipbook', name=f"FX {e['preset']} {e['t']}", tex=tid, grid=8, frames=meta['frames'], parent=None, pos=e['pos'],
             rot=e.get('rot', [0, 0, 0]), size=e['size'], start=e['t'], life=life, loop=loop, dur=dur, fps=fps if loop else round(64 / life, 2),
             blend='add', flat=bool(e.get('flat')))
    if e.get('shape') == 'beam': o.update(shape='beam', length=e['length'], speed=e.get('speed', 18))
    if e.get('parent'): o['parent'] = e['parent']                 # ride a rig group (auras, hand charges): pos is then local
    if e.get('alpha') is not None: o['opacity'] = e['alpha']
    fid = f'fx{i:03d}'; objs[fid] = o
    if e.get('move'): tracks.setdefault(fid, {})['pos'] = [[t, p, 'smooth'] for t, p in e['move']]
    if e.get('grow'): tracks.setdefault(fid, {})['scale'] = [[t, [s, s, s], 'smooth'] for t, s in e['grow']]
    for k in ('start', 'dur'):
        if not 0 <= o['start'] <= LEN or o['start'] + dur > LEN + 1e-6: sys.exit(f"Failed: {fid} {e['preset']} at {o['start']} + {dur} s leaves the 0-{LEN} s clip")

name = SPEC['name']; now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
doc = {'v': 1, 'name': name, 'objects': objs, 'textures': textures, 'updated': now, 'camera': SPEC['camera'],
       'anims': {'fight': {'name': name, 'len': LEN, 'fps': 60, 'loop': False, 'tracks': tracks,
                           **({'camera': SPEC['camera_keys']} if SPEC.get('camera_keys') else {})}},   # studio clip camera: {pos, target, fov, shake: [[t, v, ease]]}
       'env': SPEC.get('env') or {'bg': '#05070d', 'fog': None, 'grid': False, 'light': 'night'}}
json.dump(doc, open(os.path.join(ST, 'project.json'), 'w'), separators=(',', ':'))
json.dump({'name': name, 'updated': now, 'count': len(objs), 'ai': True}, open(os.path.join(ST, 'meta.json'), 'w'))
json.dump(uploads, open(os.path.join(ST, 'uploads.json'), 'w'), indent=1)

pid = name.lower().replace(' ', '-') + '-' + time.strftime('%H%M'); rel = os.path.relpath(ST, os.getcwd())
sz = lambda g: os.path.getsize(os.path.join(ST, 'geo', g + '.json'))
batches, cur, n = [], [], 0      # <= 45 writes and ~700 KB per db batch; project + meta last, so the tab opens complete
for w in [{'op': 'set', 'collection': f'projects/{pid}/geo', 'doc_id': g, 'file_path': f'{rel}/geo/{g}.json', '_b': sz(g)} for g in geos] + \
         [{'op': 'set', 'collection': f'projects/{pid}/tex', 'doc_id': t, 'data': {'asset': f'<upload id of {t}>'}, '_b': 40} for t in sorted(uploads)]:
    if cur and (n + w['_b'] > 700_000 or len(cur) >= 45): batches.append(cur); cur, n = [], 0
    n += w.pop('_b'); cur.append(w)
batches.append(cur + [{'op': 'set', 'collection': 'projects', 'doc_id': pid, 'file_path': f'{rel}/project.json'},
                      {'op': 'set', 'collection': 'meta', 'doc_id': pid, 'file_path': f'{rel}/meta.json'}])
json.dump(batches, open(os.path.join(OUT, 'writes.json'), 'w'), indent=1)

# gate: every timed thing sits inside the clip, and no fighter holds one action longer than the longest-beat cap
cap = SPEC.get('max_beat', 2.0); bad = []
for f in SPEC['fighters']:
    keys = json.load(open(P(f['clip'])))['keys'] if 'clip' in f else []
    for (t0, p0, *_), (t1, p1, *_) in zip(keys, keys[1:]):
        if t1 - t0 > cap and t0 < SPEC.get('still_from', LEN): bad.append(f"{f['tag']} {p0}->{p1} {t0}-{t1}")
    if keys and abs(keys[-1][0] - LEN) > 1e-6: bad.append(f"{f['tag']} clip ends at {keys[-1][0]}, not {LEN}")
print(f"{pid}: {len(objs)} objects, {len(geos)} geo, {len(uploads)} uploads, {sum(len(b) for b in batches)} writes in {len(batches)} batches, "
      f"{sum(1 for o in objs.values() if o['type'] == 'flipbook')} effects; beat gate: {'PASS' if not bad else 'FAIL ' + '; '.join(bad)}")
