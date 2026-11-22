"""Expression face textures in the Roblox head-decal layout (the kit's face.png: skin background, eyes at y 0.29,
mouth around y 0.68), drawn the way thumbnail artists exaggerate them: big white eyes with ink rims, shiny pupils, raised
brows, an open mouth with teeth and tongue. Replaces a head's face texture, so the real avatar head shows the expression.

  python3 faces.py OUT.png shocked|scared|grin|cry|smirk [--skin #f2f3f3] [--size 512]
"""
# @style: helper
import sys
from PIL import Image, ImageDraw

INK, WHITE, MOUTH, TONGUE = (20, 18, 22), (255, 255, 255), (96, 22, 30), (236, 96, 112)


def face(kind='shocked', skin='#f2f3f3', S=512):
    k = 4; W = S * k; im = Image.new('RGB', (W, W), skin); d = ImageDraw.Draw(im)
    p = lambda x, y: (int(x * W), int(y * W)); L = int(W * 0.016)
    def eye(cx, cy, rx, ry, px=0.0, py=0.0, pr=0.032):
        d.ellipse([p(cx - rx, cy - ry), p(cx + rx, cy + ry)], fill=WHITE, outline=INK, width=L)
        d.ellipse([p(cx + px - pr, cy + py - pr * 1.1), p(cx + px + pr, cy + py + pr * 1.1)], fill=INK)
        h = pr * 0.38; d.ellipse([p(cx + px - pr * 0.4 - h, cy + py - pr * 0.5 - h), p(cx + px - pr * 0.4 + h, cy + py - pr * 0.5 + h)], fill=WHITE)
    def brow(x0, y0, x1, y1, xm, ym):
        d.line([p(x0, y0), p(xm, ym), p(x1, y1)], fill=INK, width=int(L * 1.6), joint='curve')
        for x, y in ((x0, y0), (x1, y1)): r = L * 0.8; c = p(x, y); d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=INK)
    def mouth(cx, cy, rx, ry, teeth=True):
        box = [p(cx - rx, cy - ry), p(cx + rx, cy + ry)]
        m = Image.new('L', (W, W), 0); ImageDraw.Draw(m).ellipse(box, fill=255)
        inner = Image.new('RGB', (W, W), MOUTH); di = ImageDraw.Draw(inner)
        di.ellipse([p(cx - rx * 0.7, cy + ry * 0.15), p(cx + rx * 0.7, cy + ry * 1.25)], fill=TONGUE)
        if teeth: di.rectangle([p(cx - rx, cy - ry), p(cx + rx, cy - ry * 0.55)], fill=WHITE)
        im.paste(inner, (0, 0), m); d.ellipse(box, outline=INK, width=L)
    if kind == 'grin':
        eye(0.39, 0.30, 0.07, 0.08, 0.0, 0.0); eye(0.61, 0.30, 0.07, 0.08, 0.0, 0.0)
        d.chord([p(0.27, 0.48), p(0.73, 0.86)], 0, 180, fill=WHITE, outline=INK, width=L)
        for x in (0.36, 0.43, 0.5, 0.57, 0.64): d.line([p(x, 0.67), p(x, 0.83)], fill=(150, 150, 160), width=L // 2)
    elif kind == 'smirk':
        eye(0.39, 0.31, 0.065, 0.05, 0.012, 0.005, 0.026); eye(0.61, 0.30, 0.065, 0.05, 0.012, 0.005, 0.026)
        brow(0.32, 0.22, 0.46, 0.22, 0.39, 0.19); brow(0.54, 0.19, 0.68, 0.17, 0.61, 0.15)
        d.arc([p(0.38, 0.52), p(0.66, 0.72)], 20, 150, fill=INK, width=int(L * 1.4))
    elif kind == 'cry':
        brow(0.30, 0.24, 0.46, 0.20, 0.38, 0.23); brow(0.54, 0.20, 0.70, 0.24, 0.62, 0.23)
        for cx in (0.38, 0.62): d.line([p(cx - 0.06, 0.31), p(cx, 0.28), p(cx + 0.06, 0.31)], fill=INK, width=int(L * 1.4), joint='curve')
        for cx in (0.36, 0.64): d.rounded_rectangle([p(cx - 0.02, 0.33), p(cx + 0.02, 0.62)], int(W * 0.02), fill=(95, 200, 255))
        mouth(0.5, 0.70, 0.11, 0.07)
    else:                                      # shocked (default) / scared: wide eyes, raised brows, open O mouth
        sc = kind == 'scared'
        brow(0.29, 0.17, 0.46, 0.15, 0.37, 0.11); brow(0.54, 0.15, 0.71, 0.17, 0.63, 0.11)
        eye(0.385, 0.30, 0.085, 0.105, 0.0, -0.01 if sc else 0.01, 0.028 if sc else 0.034); eye(0.615, 0.30, 0.085, 0.105, 0.0, -0.01 if sc else 0.01, 0.028 if sc else 0.034)
        mouth(0.5, 0.68, 0.12 if sc else 0.095, 0.08 if sc else 0.11, teeth=sc)
    return im.resize((S, S), Image.LANCZOS)


if __name__ == '__main__':
    a = sys.argv[1:]; opt = lambda k, v: a[a.index(k) + 1] if k in a else v
    face(a[1] if len(a) > 1 else 'shocked', opt('--skin', '#f2f3f3'), int(opt('--size', 512))).save(a[0])
