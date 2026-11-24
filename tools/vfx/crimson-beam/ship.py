"""One command after any Umbrio generator run (2026-11-24: the shots-dir copy + hub batch JSON were retyped by hand 8 times).
Usage: python tools/vfx/crimson-beam/ship.py OUT PROJECT_ID [--at 2,4] [--cam 0,6,82,0,22,0] [--sheet t-id=file.webp ...] [--no-render]
- builds OUT/st (project.json, meta.json, geo/, tex/ data-url copies of --sheet files, uploads.json)
- runs the studio shots check once (frames at --at + clip.mp4) unless --no-render; needs SCRATCH and DEPS env (see umbrio-build)
- writes OUT/batch.json: every geo doc + OUT/tex/*.json + project + meta, ready for one ArtifactData batch"""
import base64, json, os, shutil, subprocess, sys

out, pid = sys.argv[1], sys.argv[2]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
out = os.path.abspath(out)
st = os.path.join(out, 'st')
shutil.rmtree(st, ignore_errors=True)
shutil.copytree(os.path.join(out, 'geo'), os.path.join(st, 'geo'))
os.makedirs(os.path.join(st, 'tex'), exist_ok=True)
shutil.copy(os.path.join(out, 'live', 'p.json'), os.path.join(st, 'project.json'))
shutil.copy(os.path.join(out, 'live', 'm.json'), os.path.join(st, 'meta.json'))
open(os.path.join(st, 'uploads.json'), 'w').write('{}')
for i, a in enumerate(sys.argv):
    if a == '--sheet':
        tid, path = sys.argv[i + 1].split('=', 1)
        json.dump({'kind': 'image', 'data': 'data:image/webp;base64,' + base64.b64encode(open(path, 'rb').read()).decode()}, open(os.path.join(st, 'tex', tid + '.json'), 'w'))

writes = [{'op': 'set', 'collection': f'projects/{pid}/geo', 'doc_id': f[:-5], 'file_path': os.path.join(out, 'geo', f)} for f in sorted(os.listdir(os.path.join(out, 'geo')))]
tex = os.path.join(out, 'tex')
if os.path.isdir(tex):
    writes += [{'op': 'set', 'collection': f'projects/{pid}/tex', 'doc_id': f[:-5], 'file_path': os.path.join(tex, f)} for f in sorted(os.listdir(tex))]
writes += [{'op': 'set', 'collection': 'projects', 'doc_id': pid, 'file_path': os.path.join(out, 'live', 'p.json')},
           {'op': 'set', 'collection': 'meta', 'doc_id': pid, 'file_path': os.path.join(out, 'live', 'm.json')}]
assert len(writes) <= 50, f'{len(writes)} writes: split into batches of <= 50'
json.dump(writes, open(os.path.join(out, 'batch.json'), 'w'))
print(json.dumps({'writes': len(writes), 'batch': os.path.join(out, 'batch.json')}))

if '--no-render' not in sys.argv:
    studio = os.path.join(os.path.dirname(__file__), '..', '..', '3d', 'studio')
    env = dict(os.environ, SHOTS_TAB=st, SHOTS_AT=arg('--at', '2,4'), SHOTS_CAM=arg('--cam', '0,6,82,0,22,0'), SHOTS_DEVICE='desktop', SHOTS_VIDEO='1')
    r = subprocess.run(['node', 'test/run.mjs', 'shots'], cwd=os.path.abspath(studio), env=env, capture_output=True, text=True, timeout=280)
    print((r.stdout + r.stderr).strip().splitlines()[-1] if (r.stdout + r.stderr).strip() else 'no output')
