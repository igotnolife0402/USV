#!/usr/bin/env python3
"""Three original voxel guns -> Roblox .rbxmx (anchored, greedy-merged Parts, 1 voxel = VS studs).
Usage: python3 guns.py OUTDIR        writes OUTDIR/<gun>.rbxmx (one Model each) + OUTDIR/guns.rbxmx (all three, for view.html)
Gate (exit 1 on fail): every gun is ONE 6-connected voxel body (no floating parts), part count and size in range."""
import os, sys
import numpy as np
from xml.sax.saxutils import escape

VS = 0.2                                   # studs per voxel: pistol ~5 studs long, sniper ~16
GX, GY, GZ, OY, OZ = 90, 34, 13, 6, 4     # grid size; y/z offsets so magazines/scope bells fit below/outside 0

PAL = [None, ('white', (232, 236, 240), 's'), ('dark', (44, 48, 56), 's'), ('metal', (128, 134, 144), 's'),
       ('grip', (30, 32, 38), 's'), ('olive', (92, 104, 70), 's'), ('olive_d', (68, 78, 52), 's'),
       ('tan', (188, 160, 112), 's'), ('wood', (128, 82, 48), 's'), ('wood_d', (98, 62, 36), 's'),
       ('orange', (240, 122, 36), 's'), ('cyan_n', (60, 230, 255), 'n'), ('red_n', (255, 64, 56), 'n'),
       ('glass', (90, 150, 220), 'g'), ('black', (22, 22, 26), 's')]
C = {n: i for i, (n, _, _) in enumerate(PAL[1:], 1)}
KIND = {'s': ('272', 0, 0), 'n': ('288', 0, 0), 'g': ('1568', .3, .25)}   # Material token (Plastic/Neon/Glass), Transparency, Reflectance


def new():
    return np.zeros((GX, GY, GZ), np.uint8)


def box(g, x0, x1, y0, y1, z0, z1, c):
    g[x0:x1, y0 + OY:y1 + OY, z0 + OZ:z1 + OZ] = C[c] if c else 0


def pistol():
    """Plasma pistol: white slide, cyan energy lines, angled black grip."""
    g = new()
    box(g, 6, 24, 9, 14, 0, 5, 'white')            # slide
    box(g, 8, 22, 11, 12, 0, 5, 'cyan_n')          # energy line through both sides
    box(g, 6, 24, 8, 9, 0, 5, 'dark')              # frame rail
    for x in range(15, 22, 2): box(g, x, x + 1, 13, 14, 0, 5, 'dark')   # top vents
    box(g, 24, 28, 9, 13, 1, 4, 'metal')           # barrel
    box(g, 28, 29, 9, 13, 1, 4, 'cyan_n')          # muzzle glow
    box(g, 27, 28, 13, 14, 2, 3, 'white')          # front sight
    box(g, 7, 9, 14, 15, 1, 4, 'dark')             # rear sight
    for y in range(-1, 8):                         # grip leans back toward the bottom
        s = (8 - y) // 3
        box(g, 7 - s, 12 - s, y, y + 1, 0, 5, 'grip')
    box(g, 4, 10, -2, -1, 0, 5, 'dark')            # mag base
    box(g, 6, 7, 2, 7, 0, 5, 'dark')               # grip back strap
    box(g, 12, 18, 4, 5, 1, 4, 'dark')             # trigger guard bottom
    box(g, 17, 18, 5, 8, 1, 4, 'dark')             # guard front
    box(g, 13, 14, 5, 8, 2, 3, 'metal')            # trigger
    box(g, 18, 22, 6, 8, 1, 4, 'white')            # under-rail block
    return g


def rifle():
    """Assault rifle: olive body, tan stock, curved mag, red-dot sight."""
    g = new()
    box(g, 0, 3, 6, 15, 0, 5, 'black')             # butt pad
    box(g, 3, 13, 8, 14, 0, 5, 'tan')              # stock
    box(g, 6, 11, 9, 11, 0, 5, 0)                  # stock cut-out (lightening slot)
    box(g, 13, 36, 8, 16, 0, 5, 'olive')           # receiver
    box(g, 22, 30, 12, 14, 0, 1, 'olive_d'); box(g, 22, 30, 12, 14, 4, 5, 'olive_d')   # ejection port panels
    box(g, 13, 36, 8, 9, 0, 5, 'olive_d')          # lower edge
    box(g, 36, 52, 9, 15, 0, 5, 'olive_d')         # handguard
    for x in range(38, 51, 3): box(g, x, x + 2, 11, 13, 0, 5, 'black')   # vent slots (through)
    box(g, 36, 52, 14, 15, 0, 5, 'olive')          # handguard top
    box(g, 52, 60, 10, 13, 1, 4, 'metal')          # barrel
    box(g, 60, 64, 9, 14, 1, 4, 'dark')            # muzzle brake
    box(g, 61, 62, 10, 13, 0, 5, 'dark')
    box(g, 50, 51, 15, 18, 2, 3, 'dark')           # front sight post
    box(g, 14, 46, 16, 17, 1, 4, 'dark')           # top rail
    for x in range(15, 46, 2): box(g, x, x + 1, 17, 18, 1, 4, 'black')   # rail teeth
    box(g, 20, 22, 18, 19, 1, 4, 'black'); box(g, 28, 30, 18, 19, 1, 4, 'black')   # sight mounts
    box(g, 18, 32, 19, 23, 1, 4, 'dark')           # red-dot body
    box(g, 31, 32, 20, 22, 2, 3, 'red_n')          # emitter
    box(g, 18, 19, 20, 22, 2, 3, 'glass')          # rear lens
    for i in range(11):                            # curved magazine, sweeps forward as it drops
        y, s = 7 - i, i * i // 14
        box(g, 26 + s, 31 + s, y, y + 1, 1, 4, 'black' if i else 'olive_d')
    for y in range(0, 8):                          # pistol grip
        s = (8 - y) // 3
        box(g, 15 - s, 19 - s, y, y + 1, 0, 5, 'grip')
    box(g, 19, 25, 3, 4, 1, 4, 'dark'); box(g, 24, 25, 4, 8, 1, 4, 'dark')   # trigger guard
    box(g, 21, 22, 5, 8, 2, 3, 'metal')            # trigger
    box(g, 36, 52, 15, 16, 2, 3, 'orange')         # accent stripe
    box(g, 4, 12, 14, 15, 2, 3, 'orange')
    return g


def sniper():
    """Bolt-action sniper: walnut thumbhole stock, long barrel, suppressor, big scope, bipod."""
    g = new()
    box(g, 0, 3, 5, 16, 0, 5, 'black')             # recoil pad
    box(g, 3, 22, 7, 15, 0, 5, 'wood')             # stock
    box(g, 9, 15, 9, 12, 0, 5, 0)                  # thumbhole
    box(g, 6, 18, 15, 17, 1, 4, 'wood_d')          # cheek rest
    for y in range(0, 7):                          # grip below the thumbhole
        s = (7 - y) // 3
        box(g, 16 - s, 21 - s, y, y + 1, 0, 5, 'wood_d')
    box(g, 22, 44, 9, 15, 0, 5, 'dark')            # receiver
    box(g, 22, 54, 8, 10, 0, 5, 'wood')            # fore-end
    box(g, 36, 38, 12, 13, 5, 7, 'metal')          # bolt handle
    box(g, 37, 39, 11, 14, 7, 8, 'black')          # bolt knob
    box(g, 30, 36, 4, 8, 1, 4, 'black')            # box magazine
    box(g, 24, 29, 5, 6, 1, 4, 'dark'); box(g, 28, 29, 6, 8, 1, 4, 'dark')   # trigger guard
    box(g, 25, 26, 6, 8, 2, 3, 'metal')            # trigger
    box(g, 44, 72, 11, 14, 1, 4, 'metal')          # barrel
    box(g, 72, 86, 10, 15, 0, 5, 'black')          # suppressor
    for x in (74, 78, 82): box(g, x, x + 1, 10, 15, 0, 5, 'dark')   # suppressor rings
    box(g, 52, 54, 6, 8, 1, 4, 'dark')             # bipod hinge
    for i in range(8):                             # bipod legs, folded forward-down
        box(g, 54 + i, 55 + i, 5 - i // 2, 7 - i // 2, 0, 1, 'dark')   # 2 tall so each step shares a face
        box(g, 54 + i, 55 + i, 5 - i // 2, 7 - i // 2, 4, 5, 'dark')
    box(g, 54, 62, 6, 7, 1, 4, 'dark')             # leg crossbar keeps legs joined
    box(g, 26, 29, 15, 17, 1, 4, 'black'); box(g, 38, 41, 15, 17, 1, 4, 'black')   # scope rings
    box(g, 22, 46, 17, 21, 1, 4, 'dark')           # scope tube
    box(g, 30, 33, 21, 22, 2, 3, 'black'); box(g, 31, 32, 15, 21, 5, 6, 'black')   # turrets
    box(g, 31, 32, 18, 20, 4, 5, 'black')
    box(g, 46, 51, 16, 22, 0, 5, 'dark')           # objective bell
    box(g, 51, 52, 17, 21, 1, 4, 'glass')          # objective lens
    box(g, 18, 22, 16, 22, 0, 5, 'dark')           # eyepiece
    box(g, 17, 18, 17, 21, 1, 4, 'glass')          # eyepiece lens
    box(g, 46, 51, 22, 23, 2, 3, 'red_n')          # sight marker strip
    return g


GUNS = {'PlasmaPistol': pistol, 'AssaultRifle': rifle, 'SniperRifle': sniper}


def greedy(K):
    done, out = np.zeros(K.shape, bool), []
    A, B, Cn = K.shape
    for c in range(Cn):
        for b in range(B):
            for a in range(A):
                k = K[a, b, c]
                if k == 0 or done[a, b, c]: continue
                a1 = a + 1
                while a1 < A and K[a1, b, c] == k and not done[a1, b, c]: a1 += 1
                b1 = b + 1
                while b1 < B and (K[a:a1, b1, c] == k).all() and not done[a:a1, b1, c].any(): b1 += 1
                c1 = c + 1
                while c1 < Cn and (K[a:a1, b:b1, c1] == k).all() and not done[a:a1, b:b1, c1].any(): c1 += 1
                done[a:a1, b:b1, c:c1] = True
                out.append((int(k), (a, b, c), (a1, b1, c1)))
    return out


def components(g):
    """Number of 6-connected solid bodies (flood fill)."""
    seen, n = np.zeros(g.shape, bool), 0
    for start in zip(*np.nonzero(g)):
        if seen[start]: continue
        n += 1; stack = [start]; seen[start] = True
        while stack:
            p = stack.pop()
            for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
                q = (p[0] + d[0], p[1] + d[1], p[2] + d[2])
                if all(0 <= q[i] < g.shape[i] for i in range(3)) and g[q] and not seen[q]:
                    seen[q] = True; stack.append(q)
    return n


def model_xml(name, g, dy, rid):
    nz = np.nonzero(g)
    cx, cz = (nz[0].min() + nz[0].max() + 1) / 2, (nz[2].min() + nz[2].max() + 1) / 2
    y0 = nz[1].min()
    o = [f'<Item class="Model" referent="{rid()}"><Properties><string name="Name">{escape(name)}</string></Properties>']
    boxes = greedy(g)
    for k, lo, hi in boxes:
        pn, (r, gg, b), kind = PAL[k]; mat, tr, rf = KIND[kind]
        p = [((lo[0] + hi[0]) / 2 - cx) * VS, ((lo[1] + hi[1]) / 2 - y0) * VS + dy, ((lo[2] + hi[2]) / 2 - cz) * VS]
        s = [(hi[i] - lo[i]) * VS for i in range(3)]
        o.append(f'<Item class="Part" referent="{rid()}"><Properties><string name="Name">{pn}</string>'
                 f'<bool name="Anchored">true</bool><bool name="CanCollide">false</bool><token name="Material">{mat}</token>'
                 f'<CoordinateFrame name="CFrame"><X>{p[0]:.3f}</X><Y>{p[1]:.3f}</Y><Z>{p[2]:.3f}</Z><R00>1</R00><R01>0</R01><R02>0</R02>'
                 f'<R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>'
                 f'<Color3uint8 name="Color3uint8">{0xFF000000 | r << 16 | gg << 8 | b}</Color3uint8>'
                 f'<Vector3 name="size"><X>{s[0]:.3f}</X><Y>{s[1]:.3f}</Y><Z>{s[2]:.3f}</Z></Vector3>'
                 f'<token name="TopSurface">0</token><token name="BottomSurface">0</token>'
                 f'<float name="Transparency">{tr}</float><float name="Reflectance">{rf}</float>'
                 f'<bool name="CastShadow">{"false" if kind == "n" else "true"}</bool></Properties></Item>')
    o.append('</Item>')
    return o, len(boxes)


HEAD = ('<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">')


def main(out):
    os.makedirs(out, exist_ok=True)
    allx, ok, n = [HEAD], True, [0]
    def rid(): n[0] += 1; return f'RBX{n[0]:06d}'
    for i, (name, fn) in enumerate(GUNS.items()):
        g = fn()
        comp, vox = components(g), int((g > 0).sum())
        nz = np.nonzero(g); size = [(nz[a].max() - nz[a].min() + 1) * VS for a in range(3)]
        xml, parts = model_xml(name, g, 0, rid)
        open(os.path.join(out, name + '.rbxmx'), 'w').write('\n'.join([HEAD] + xml + ['</roblox>']))
        allx += model_xml(name, g, (2 - i) * 5.5, rid)[0]   # stacked vertically for the side-view render
        good = comp == 1 and 20 <= parts <= 400 and 3 <= size[0] <= 20
        ok &= good
        print(f'{name}: {vox} voxels -> {parts} parts, bodies {comp}, size {size[0]:.1f}x{size[1]:.1f}x{size[2]:.1f} studs',
              'OK' if good else 'FAIL')
    open(os.path.join(out, 'guns.rbxmx'), 'w').write('\n'.join(allx + ['</roblox>']))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'guns_out'))
