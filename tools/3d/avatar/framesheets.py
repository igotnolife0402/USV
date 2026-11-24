# Frame-review sheets: every shots-<t>.png -> labeled 4x2 sheets (owner rule: review EVERY frame).
# Usage: python3 framesheets.py <shots dir> <out dir> <tag F|Q> <crop x0,y0,x1,y1> [per=8]
import sys, glob, os
from PIL import Image, ImageDraw
src, out, tag = sys.argv[1], sys.argv[2], sys.argv[3]
box = tuple(int(v) for v in sys.argv[4].split(','))
per = int(sys.argv[5]) if len(sys.argv) > 5 else 8
fs = sorted(glob.glob(src + '/shots-*.png'), key=lambda f: float(f.split('shots-')[1][:-4]))
os.makedirs(out, exist_ok=True)
cw = 330; ch = int(cw * (box[3] - box[1]) / (box[2] - box[0])); cols = 4
for s in range(0, len(fs), per):
    sh = Image.new('RGB', (cw * cols, ch * ((per + cols - 1) // cols)), 'white'); dr = ImageDraw.Draw(sh)
    for j, f in enumerate(fs[s:s + per]):
        c = Image.open(f).convert('RGB').crop(box).resize((cw, ch)); x, y = (j % cols) * cw, (j // cols) * ch; sh.paste(c, (x, y))
        dr.rectangle((x, y, x + 110, y + 16), fill='black'); dr.text((x + 3, y + 2), f'{tag}{s + j} t={f.split("shots-")[1][:-4]}', fill='yellow')
    sh.save(f'{out}/{tag}{s // per:02d}.jpg', quality=88)
print(len(fs))
