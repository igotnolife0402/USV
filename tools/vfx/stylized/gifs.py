"""Owner 2026-11-24: 'save them as gifs so you don't waste sheets on the same vfx': one animated GIF per actions.py flipbook.
GIF has 1-bit alpha, so soft glow cannot be transparent: colour GIFs keep the navy backdrop, white GIFs are white-on-black (use as
additive / screen blend). Roblox ParticleEmitter still needs the Grid4x4 PNG sheet; the GIFs are one-file previews and for other engines.
  python3 gifs.py ACTION_DIR OUTDIR [ms_per_frame=50]  ->  OUTDIR/colour/NNN_kind_hue.gif, OUTDIR/white/NNN_kind_hue.gif"""
import sys, os, glob
from PIL import Image


def frames(sheet, bg=None):
    im = Image.open(sheet); n = im.width // 4; out = []
    for f in range(16):
        r, c = divmod(f, 4); fr = im.crop((c * n, r * n, (c + 1) * n, (r + 1) * n))
        if bg is not None:                                  # white RGBA sheet: light = alpha, composite on black
            b = Image.new('RGBA', fr.size, bg); b.alpha_composite(fr.convert('RGBA')); fr = b
        out.append(fr.convert('RGB').quantize(128, dither=Image.Dither.NONE))
    return out


def main(src, out, ms=50):
    os.makedirs(out + '/colour', exist_ok=True); os.makedirs(out + '/white', exist_ok=True); n = 0
    for f in sorted(glob.glob(f'{src}/*-color.png')):
        base = os.path.basename(f)[:-10]
        for kind, path, bg in (('colour', f, None), ('white', f'{src}/{base}.png', (0, 0, 0, 255))):
            fr = frames(path, bg); fr[0].save(f'{out}/{kind}/{base}.gif', save_all=True, append_images=fr[1:], duration=ms, loop=0, disposal=2)
        n += 1
    print(dict(gifs=n * 2, effects=n))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 50)
