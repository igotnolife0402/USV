#!/usr/bin/env python3
"""Studio docs with `updated` = now (ISO), so open studio pages show the tab with a live dot.
  python3 stamp.py <out> final --mesh   fastest (default): the finished exact model. Prints the geo docs in groups of 4: write each
                                        group as one Artifact data batch, then one last batch: tex/pal, project <- live/pfinal.json,
                                        meta <- live/mfinal.json.
  python3 stamp.py <out> <i> --mesh     live stage i of out/studio/plan.json (only when the owner wants to watch it grow)
  python3 stamp.py <out> <i>            coarse part-only copy, stage i of out/stages/"""
import json, os, sys, time
out, i = sys.argv[1], sys.argv[2]; mesh = '--mesh' in sys.argv; now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
plan = json.load(open(os.path.join(out, 'studio', 'plan.json'))) if mesh else None
n = len(plan) if i == 'final' else int(i)
p = json.load(open(os.path.join(out, 'studio' if mesh else 'stages', f'stage{n}.json'))); p['updated'] = now
m = {'name': p['name'], 'updated': now, 'count': len(p['objects']), 'ai': True}
os.makedirs(os.path.join(out, 'live'), exist_ok=True)
for f, d in ((f'p{i}.json', p), (f'm{i}.json', m)): json.dump(d, open(os.path.join(out, 'live', f), 'w'), separators=(',', ':'))
if i == 'final':
    geo = [g for s in plan for g in s['geo']]
    for k in range(0, len(geo), 4): print('batch:', ' '.join(geo[k:k + 4]))
    print(f'last batch: tex/pal + live/p{i}.json + live/m{i}.json ({m["count"]} objects)')
else:
    geo = plan[n - 1]['geo'] if mesh else []
    print(f'stage {i}: {m["count"]} objects' + (f', geo docs: {" ".join(geo)}' if geo else ''))
