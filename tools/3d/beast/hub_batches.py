#!/usr/bin/env python3
"""Plan the ArtifactData batches that put a shadow_mesh build into a hub project (one tab).
python3 hub_batches.py OUT PROJECT_ID [OLD_GEO_DIR]  -> prints one JSON writes-array per line:
geo docs packed to <= 960 KB / 49 writes per batch, then (optional) deletes of the old geo ids. The project + meta write
goes last, by hand, pinned to the versions just read (if_version). file_path entries are relative to OUT."""
# @style: helper
import json, os, sys
out, pid = sys.argv[1], sys.argv[2]; old = sys.argv[3] if len(sys.argv) > 3 else None
col = f'projects/{pid}/geo'; gd = os.path.join(out, 'geo')
ids = sorted(os.listdir(gd)); cur, size, batches = [], 0, []
for f in ids:
    s = os.path.getsize(os.path.join(gd, f))
    if cur and (size + s > 960_000 or len(cur) >= 49): batches.append(cur); cur, size = [], 0
    cur.append({'op': 'set', 'collection': col, 'doc_id': f[:-5], 'file_path': 'geo/' + f}); size += s
if cur: batches.append(cur)
if old:
    keep = {f[:-5] for f in ids}; dels = [f[:-5] for f in sorted(os.listdir(old)) if f[:-5] not in keep]
    for i in range(0, len(dels), 49):
        batches.append([{'op': 'delete', 'collection': col, 'doc_id': g, 'if_version': 1} for g in dels[i:i + 49]])
for b in batches: print(json.dumps(b, separators=(',', ':')))
