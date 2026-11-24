"""Owner 2026-11-24: 'all vfx ever made saved in the same place, for the animator to pick from, easily accessible without mass delay
for Claude to read'. Collects every generated white sheet into ONE folder + manifest for the Claude-Hub `vfx` library (the Umbrio
Animate tab's Effects list reads db collection `vfx`, docs {name, asset, grid, frames, fps, loop, life, size, blend}).
Dedupes by pixel hash, re-saves white sheets as grey+alpha PNG (white RGB carries no information), names = <set>-<id>.
  python3 library.py SCRATCH OUTDIR  -> OUTDIR/png/<slug>.png, OUTDIR/manifest.json [{slug,name,file,grid,frames,life,kind,src}]
Then upload OUTDIR/png with Artifact asset:true (<= 25 per call, ids -> `NNN id` lines), then
  python3 library.py docs OUTDIR IDS.txt DOCDIR [TSV]  -> DOCDIR/writes-KK.json + TSV (default domains/vfx/library.tsv) = ArtifactData batch entries for docs `vfx/<slug>`. Index: domains/vfx/library.md."""
import sys, os, re, json, glob, hashlib
import numpy as np
from PIL import Image

# (glob, set name, kind, default grid, frames, life). Older rejected mixes (mix, mix2, u24: owner called them identical) are skipped.
SRC = [('vfx100/*.png', 'gen', 'flipbook', 8, 64, 1.4), ('smoke/*.png', 'smoke', 'flipbook', 8, 64, 1.4),
       ('real/*.png', 'real', 'flipbook', 8, 64, 1.4), ('vb/*.png', 'vb', 'flipbook', 8, 64, 1.4),
       ('stages/fx/*.png', 'nf', 'flipbook', 8, 64, 1.0), ('mix3/action/*.png', 'act', 'action', 4, 16, .6),
       ('sym/*.png', 'sym', 'symbol', 1, 1, .6), ('vfx262/ref/*.png', 'ref', 'symbol', 1, 1, .6), ('vfx262/new/*.png', 'icon', 'symbol', 1, 1, .6)]

HUE = 'cyan|blue|purple|magenta|red|orange|gold|yellow|green|teal|white|pink|violet|lime|ice|fire'


def meta(png):
    j = png[:-4] + '.json'
    if not os.path.exists(j): return {}
    try: d = json.load(open(j))
    except Exception: return {}
    out = {}
    m = re.search(r'Grid(\d)x', d.get('FlipbookLayout', ''))
    if m: out['grid'] = int(m.group(1))
    for k, v in (('frames', 'frames'), ('Lifetime', 'life')):
        if isinstance(d.get(k), (int, float)): out[v] = d[k]
    return out


def main(scr, out):
    os.makedirs(out + '/png', exist_ok=True); seen, man, st, slugs, names = set(), [], dict(dupes=0, skipped=0), set(), {}
    for pat, tag, kind, grid, frames, life in SRC:
        for f in sorted(glob.glob(os.path.join(scr, pat))):
            b = os.path.basename(f)[:-4]
            if re.search(r'-b\d+of\d+$', b) or b.endswith('-color') or b.endswith('-glow'): st['skipped'] += 1; continue   # band/colour/glow splits of one effect
            im = Image.open(f).convert('RGBA'); a = np.asarray(im)
            h = hashlib.sha1(a.tobytes()).hexdigest()
            if h in seen: st['dupes'] += 1; continue
            seen.add(h)
            ident = re.sub(r'_(' + HUE + r')$', '', b)                                  # hue suffix means nothing on a white sheet
            ident = re.sub(r'^' + tag + r'-', '', ident)                                # nf-nf-burst -> nf-burst
            slug = re.sub(r'[^a-z0-9]+', '-', f'{tag}-{ident}'.lower()).strip('-')[:120]
            k = 2
            while slug in slugs: slug = re.sub(r'-\d+$', '', slug) if k > 2 else slug; slug = f'{slug}-{k}'; k += 1
            slugs.add(slug)
            white = (a[..., :3].min() > 250)
            px = Image.fromarray(np.dstack([a[..., 3], a[..., 3]]), 'LA') if white else im   # grey+alpha: same look, far smaller
            px.save(f'{out}/png/{slug}.png', optimize=True)
            nm = re.sub(r'\s+', ' ', re.sub(r'^\d+\s*', '', re.sub(r'[-_]+', ' ', ident).replace('+', ' + '))).strip().title()
            names[nm] = names.get(nm, 0) + 1
            nm = nm if names[nm] == 1 else f'{nm} {names[nm]}'                          # picker list needs unique labels
            e = dict(slug=slug, name=nm, file=f'{slug}.png', grid=grid, frames=frames, life=life, kind=kind, src=f'{pat.split("/")[0]}/{b}.png')
            e.update(meta(f)); man.append(e)
    json.dump(man, open(f'{out}/manifest.json', 'w'), indent=0)
    st['effects'] = len(man); st['mb'] = round(sum(os.path.getsize(f'{out}/png/{e["file"]}') for e in man) / 1e6, 1)
    st['by_kind'] = {k: sum(e['kind'] == k for e in man) for k in ('flipbook', 'action', 'symbol')}; print(st)


def docs(out, ids, dst, tsv='domains/vfx/library.tsv'):
    """manifest + `NNN <asset id>` lines (upload order) -> dst/NNN.json hub docs and dst/writes-KK.json (ArtifactData batch, 50 each)"""
    man = json.load(open(f'{out}/manifest.json')); got = dict(l.split() for l in open(ids) if l.strip())
    os.makedirs(dst, exist_ok=True); w, miss = [], []
    for i, e in enumerate(man):
        a = got.get(f'{i:03d}')
        if not a or a == 'FAILED': miss.append(e['slug']); continue
        d = dict(name=e['name'], asset=a, grid=e['grid'], frames=e['frames'], life=e['life'], loop=False, size=4, blend='add', kind=e['kind'], src=e['src'])
        json.dump(d, open(f'{dst}/{i:03d}.json', 'w')); w.append(dict(op='set', collection='vfx', doc_id=e['slug'], file_path=os.path.abspath(f'{dst}/{i:03d}.json')))
    with open(tsv, 'w') as f:                                                          # Claude's grep index: no image reads
        f.write('slug\tname\tkind\tgrid\tframes\tasset\n')
        for i, e in enumerate(man):
            if got.get(f'{i:03d}', 'FAILED') != 'FAILED': f.write(f"{e['slug']}\t{e['name']}\t{e['kind']}\t{e['grid']}\t{e['frames']}\t{got[f'{i:03d}']}\n")
    for k in range(0, len(w), 50): json.dump(w[k:k + 50], open(f'{dst}/writes-{k // 50:02d}.json', 'w'))
    print(dict(docs=len(w), missing=miss[:5], n_missing=len(miss), batches=(len(w) + 49) // 50))


if __name__ == '__main__':
    docs(*sys.argv[2:6]) if sys.argv[1] == 'docs' else main(sys.argv[1], sys.argv[2])
