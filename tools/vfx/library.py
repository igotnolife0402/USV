"""Owner 2026-11-24: 'put all vfx in the same file and have anybody needing vfx know exactly where they are' (no artifact).
Collects every generated white sheet into the repo folder vfx/: vfx/sheets/<slug>.png + vfx/index.tsv (one line per effect, grep it,
never open images to search). Dedupes by pixel hash, re-saves white sheets as grey+alpha PNG (white RGB carries nothing), names
= <set>-<id>. Painting rules (gradients, textures, tint): vfx/README.md.
  python3 tools/vfx/library.py SCRATCH vfx   (add a new generator's folder to SRC first)"""
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
    os.makedirs(out + '/sheets', exist_ok=True); seen, man, st, slugs, names = set(), [], dict(dupes=0, skipped=0), set(), {}
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
            px.save(f'{out}/sheets/{slug}.png', optimize=True)
            nm = re.sub(r'\s+', ' ', re.sub(r'^\d+\s*', '', re.sub(r'[-_]+', ' ', ident).replace('+', ' + '))).strip().title()
            names[nm] = names.get(nm, 0) + 1
            nm = nm if names[nm] == 1 else f'{nm} {names[nm]}'                          # picker list needs unique labels
            e = dict(slug=slug, name=nm, file=f'{slug}.png', grid=grid, frames=frames, life=life, kind=kind, src=f'{pat.split("/")[0]}/{b}.png')
            e.update(meta(f)); man.append(e)
    with open(f'{out}/index.tsv', 'w') as f:
        f.write('slug\tname\tkind\tgrid\tframes\tlife\tsrc\n')
        for e in man: f.write(f"{e['slug']}\t{e['name']}\t{e['kind']}\t{e['grid']}\t{e['frames']}\t{e['life']}\t{e['src']}\n")
    st['effects'] = len(man); st['mb'] = round(sum(os.path.getsize(f'{out}/sheets/{e["file"]}') for e in man) / 1e6, 1)
    st['by_kind'] = {k: sum(e['kind'] == k for e in man) for k in ('flipbook', 'action', 'symbol')}; print(st)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
