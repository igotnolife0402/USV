#!/usr/bin/env python3
"""Detail-floor gate for Studio projects. Thresholds and metric definitions live in floor.json.

  python detail.py check project.json geo/ [--class prop|hero|scene] [--json]
Exit 0 pass, 1 fail, 2 bad input."""
# @style: helper
import argparse, collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EST = {'box': 12, 'wedge': 8}          # other shapes (sphere/capsule/cylinder/cone/torus) = 200
EST_DEFAULT = 200


def bad(msg):
    print('bad input:', msg, file=sys.stderr); sys.exit(2)


def load_json(p):
    try:
        return json.load(open(p, encoding='utf-8'))
    except (OSError, ValueError) as e:
        bad(f'{p}: {e}')


def measure(project, gdir, floor):
    doc = load_json(project)
    objs = doc.get('objects') or (doc.get('scene') or {}).get('objects')
    if not isinstance(objs, dict): bad('no "objects" (top level or under "scene")')
    parts, geo_tris, geo_ext, missing = [], {}, {}, set()
    for o in objs.values():
        if not isinstance(o, dict) or o.get('type') not in ('part', 'mesh'): continue
        if (o.get('transparency') or 0) >= 0.95 or o.get('temp') or o.get('shadowOnly'): continue
        parts.append(o)
    tris = est = 0
    for o in parts:
        if o['type'] == 'mesh':
            g = o.get('geo')
            if g not in geo_tris:
                f = os.path.join(gdir, str(g) + '.json')
                if not g or not os.path.exists(f): missing.add(g); geo_tris[g] = 0
                else:
                    gd = load_json(f); geo_tris[g] = sum(max(len(fc) - 2, 0) for fc in gd.get('faces', []))
                    v = gd.get('verts', [])   # bbox extents stand in for size (meshes carry no size field)
                    geo_ext[g] = [max(v[i::3]) - min(v[i::3]) for i in range(3)] if v else None
            tris += geo_tris[g]
        else:
            n = EST.get(o.get('shape', 'box'), EST_DEFAULT); tris += n; est += n
    n = len(parts)
    nonglow = [o for o in parts if o.get('material') != 'Neon']
    tex = [o for o in nonglow if o.get('texture')]
    def size(o):
        if o['type'] == 'mesh' and geo_ext.get(o.get('geo')):
            sc = o.get('scale') or [1, 1, 1]; return [e * x for e, x in zip(geo_ext[o['geo']], sc)]
        return o.get('size') or [4, 1, 2]
    sizes = collections.Counter(tuple(round(float(x), 2) for x in size(o)) for o in parts)
    colors = {tuple(int(c[i:i + 2], 16) // 16 for i in (1, 3, 5)) for c in (o.get('color', '#a3a2a5') for o in parts)}
    surf = {('t', o['texture']) for o in parts if o.get('texture')} | {('m', o.get('material', 'Plastic')) for o in parts}
    return {
        'parts': n,
        'mesh_ratio': round(sum(o['type'] == 'mesh' for o in parts) / n, 3) if n else 0,
        'textured_ratio': round(len(tex) / len(nonglow), 3) if nonglow else 0,
        'colors': len(colors), 'surfaces': len(surf),
        'tris': tris, 'tris_estimated': est,
        'same_size_ratio': round(max(sizes.values()) / n, 3) if n else 1,
        'max_mesh_tris': max(geo_tris.values(), default=0),
        'missing_geo': sorted(map(str, missing)),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('cmd', choices=['check']); ap.add_argument('project'); ap.add_argument('geo')
    ap.add_argument('--class', dest='cls', default='hero'); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    floor = load_json(os.path.join(HERE, 'floor.json'))
    if a.cls not in floor['classes']: bad('class must be one of ' + ', '.join(floor['classes']))
    t, mx = floor['classes'][a.cls], floor['max_tris_per_mesh']
    m = measure(a.project, a.geo, floor)
    rows = [  # name, value, need text, ok
        ('parts', m['parts'], f">= {t['min_parts']}", m['parts'] >= t['min_parts']),
        ('mesh_ratio', m['mesh_ratio'], f">= {t['min_mesh_ratio']}", m['mesh_ratio'] >= t['min_mesh_ratio']),
        ('textured_ratio', m['textured_ratio'], f">= {t['min_textured_ratio']}", m['textured_ratio'] >= t['min_textured_ratio']),
        ('colors', m['colors'], f">= {t['min_colors']}", m['colors'] >= t['min_colors']),
        ('surfaces', m['surfaces'], f">= {t['min_surfaces']}", m['surfaces'] >= t['min_surfaces']),
        ('tris', m['tris'], f">= {t['min_tris']}" + (f" (incl. {m['tris_estimated']} estimated)" if m['tris_estimated'] else ''), m['tris'] >= t['min_tris']),
        ('same_size_ratio', m['same_size_ratio'], f"<= {t['max_same_size_ratio']}", m['same_size_ratio'] <= t['max_same_size_ratio']),
        ('max_mesh_tris', m['max_mesh_tris'], f"<= {mx}", m['max_mesh_tris'] <= mx),
        ('missing_geo', len(m['missing_geo']), '== 0', not m['missing_geo']),
    ]
    failed = [r[0] for r in rows if not r[3]]
    if a.json:
        print(json.dumps({'class': a.cls, 'metrics': m, 'failed': failed, 'pass': not failed}, indent=1))
    else:
        for n, v, need, ok in rows: print(f"{'PASS' if ok else 'FAIL'} {n} {v} (need {need})")
        print('DETAIL PASS' if not failed else 'DETAIL FAIL: ' + ', '.join(failed))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
