#!/usr/bin/env python3
"""Live studio stage: stages/stage<i>.json -> live/p<i>.json (project) + live/m<i>.json (tab meta), `updated` = now,
so the open studio shows the tab with a green live dot. Usage: python3 stamp.py <stage number> [thumb.jpg]"""
import json, os, sys, time, base64
i = sys.argv[1]; t = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())   # ISO, like every studio date
p = json.load(open(f'stages/stage{i}.json')); p['updated'] = t
m = {'name': p['name'], 'updated': t, 'count': len(p['objects']), 'ai': True}
if len(sys.argv) > 2: m['thumb'] = 'data:image/jpeg;base64,' + base64.b64encode(open(sys.argv[2], 'rb').read()).decode()
os.makedirs('live', exist_ok=True)
for f, d in ((f'live/p{i}.json', p), (f'live/m{i}.json', m)): json.dump(d, open(f, 'w'), separators=(',', ':'))
print(m['count'], 'objects')
