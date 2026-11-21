#!/usr/bin/env python3
"""50x50-stud voxel city -> Roblox .rbxmx (1 voxel = 1 stud, anchored, greedy-merged Parts, one Model per area)
plus studio scene stages (projects/<id> docs, each under 250 KB) for a live build in the studio.
Usage: python3 city.py city.rbxmx [stage_dir]     Needs only numpy."""
import sys, os, json, math
import numpy as np
from xml.sax.saxutils import escape

W, H, D = 50, 52, 50                  # x, y (up), z in studs
G = np.zeros((W, H, D), np.uint8)     # palette index per voxel, 0 = air
GR = np.zeros((W, H, D), np.uint8)    # group (Model) per voxel
rng = np.random.default_rng(7)
R, S, B = 1, 2, 3                     # y of road layer, raised surface layer, first free layer

# ---------- palette: name -> colour, kind (s smooth plastic, n neon, g glass, w water) ----------
PAL, IDX = [None], {}
def pal(kind, **cols):
    for n, c in cols.items(): IDX[n] = len(PAL); PAL.append((n, c, kind))
pal('s', stone=(96, 98, 104), dirt=(118, 86, 60), asphalt=(58, 61, 68), dash=(240, 198, 60), zebra=(236, 236, 230),
    curb=(168, 170, 168), walk=(204, 200, 190), walk2=(190, 186, 176), grass1=(104, 168, 70), grass2=(92, 154, 62),
    grass3=(120, 182, 82), gravel=(196, 176, 136), hedge=(56, 118, 50), rock=(140, 142, 146), stone_l=(214, 214, 218),
    fl_red=(224, 68, 82), fl_yel=(246, 206, 70), fl_pur=(156, 98, 204), fl_wht=(244, 244, 240),
    leaf1=(72, 152, 60), leaf2=(58, 134, 50), leaf3=(94, 170, 72), leaf4=(44, 110, 46), pink1=(242, 164, 196), pink2=(228, 136, 176),
    trunk=(108, 76, 50), wood=(150, 106, 62), pole=(58, 62, 70), manhole=(44, 46, 52), red_d=(110, 34, 34), green_d=(32, 88, 44),
    amber=(196, 138, 40), hydrant=(214, 50, 44), bin=(40, 104, 70), mail=(44, 82, 170), duck=(246, 246, 240), beak=(240, 150, 40),
    stucco=(234, 220, 194), slate=(108, 116, 130), brick=(164, 82, 62), brick_d=(132, 64, 48), teal=(62, 148, 150),
    cream=(238, 228, 204), beige=(212, 190, 160), gray_d=(84, 90, 102), gray_l=(162, 166, 172), navy=(40, 56, 94),
    navy_l=(70, 90, 132), trim_w=(246, 246, 242), trim_d=(62, 64, 72), roof=(118, 122, 130), roof_d=(92, 96, 104),
    aw_red=(206, 58, 58), aw_grn=(58, 138, 90), aw_blu=(58, 108, 190), aw_org=(236, 128, 44), door=(112, 74, 46),
    peach=(240, 200, 152), sky=(168, 200, 232), roof_r=(168, 60, 50), roof_r2=(140, 46, 40), roof_b=(104, 72, 58), roof_b2=(84, 56, 44),
    fence=(246, 246, 242), tile=(232, 236, 240), soil=(96, 66, 44), veg=(70, 160, 60), tomato=(220, 60, 50),
    plaza1=(216, 206, 188), plaza2=(196, 184, 166), heli=(54, 56, 62), heli_y=(246, 200, 50),
    c_red=(210, 48, 48), c_blu=(48, 100, 212), c_taxi=(246, 196, 40), c_wht=(238, 238, 238), c_blk=(40, 42, 48),
    c_grn=(58, 160, 92), c_org=(240, 128, 40), c_sil=(176, 182, 190), c_tea=(40, 168, 170), tire=(30, 30, 34), bus=(40, 110, 200),
    bb_frame=(48, 50, 58), water_t=(122, 92, 62), water_t2=(96, 72, 50))
pal('n', lamp=(255, 232, 168), red_n=(255, 58, 48), green_n=(70, 236, 100), head_n=(255, 250, 226), dest=(255, 182, 40),
    sign_n=(255, 110, 170), sign_b=(80, 200, 255), sign_y=(255, 220, 60), heli_l=(255, 60, 60))
pal('g', glass_b=(122, 172, 214), glass_b2=(160, 200, 232), glass_t=(92, 176, 176), glass_t2=(130, 200, 196),
    glass_d=(54, 78, 116), glass_d2=(80, 110, 150), cglass=(46, 62, 88))
pal('w', water=(70, 150, 222), pool=(84, 204, 236))

GROUPS, cur = [None], 0
def group(name):
    global cur
    GROUPS.append(name); cur = len(GROUPS) - 1

def box(x0, x1, y0, y1, z0, z1, c):
    x0, z0, y0 = max(x0, 0), max(z0, 0), max(y0, 0); x1, z1, y1 = min(x1, W), min(z1, D), min(y1, H)
    if x0 >= x1 or y0 >= y1 or z0 >= z1: return
    G[x0:x1, y0:y1, z0:z1] = IDX[c] if c else 0
    GR[x0:x1, y0:y1, z0:z1] = cur if c else 0

def put(x, y, z, c): box(x, x + 1, y, y + 1, z, z + 1, c)
def pick(names, p=None): return names[rng.choice(len(names), p=p)]
def dist(x, z, cx, cz): return math.hypot(x + .5 - cx, z + .5 - cz)

def disk(cx, cz, r, y0, y1, c, r_in=-1.0):
    for x in range(int(cx - r) - 1, int(cx + r) + 2):
        for z in range(int(cz - r) - 1, int(cz + r) + 2):
            if r_in < dist(x, z, cx, cz) <= r: box(x, x + 1, y0, y1, z, z + 1, c)

def blob(cx, cy, cz, rx, ry, rz, names, p=None):
    """Leafy canopy: ellipsoid with a noisy edge, each voxel a random shade."""
    for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for z in range(int(cz - rz) - 1, int(cz + rz) + 2):
                e = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 + ((z + .5 - cz) / rz) ** 2
                if e <= 1 - .18 * rng.random(): put(x, y, z, pick(names, p))

LEAF, PINK = ['leaf1', 'leaf2', 'leaf3', 'leaf4'], ['pink1', 'pink2', 'pink1', 'leaf3']
def tree(x, z, r=2.2, h=3, y=B, names=LEAF):
    box(x, x + 1, y, y + h + 1, z, z + 1, 'trunk')
    blob(x + .5, y + h + r * .75, z + .5, r, r * .8, r, names, [.3, .3, .25, .15] if names is LEAF else None)

def pine(x, z, y=B):
    box(x, x + 1, y, y + 2, z, z + 1, 'trunk')
    for i, r in enumerate([2.3, 2.0, 1.6, 1.3, .9, .6]):
        disk(x + .5, z + .5, r, y + 2 + i, y + 3 + i, 'leaf4')
        for xx in range(x - 2, x + 3):
            for zz in range(z - 2, z + 3):
                if G[xx, y + 2 + i, zz] == IDX['leaf4'] and rng.random() < .3: put(xx, y + 2 + i, zz, 'leaf2')
    put(x, y + 8, z, 'leaf4')

# ---------- ground, roads, sidewalks ----------
ROAD = lambda x, z: 18 <= x < 23 or 18 <= z < 23
WALK = lambda x, z: (16 <= x < 25 or 16 <= z < 25) and not ROAD(x, z)
group('Ground')
box(0, W, 0, 1, 0, D, 'stone'); box(0, W, R, R + 1, 0, D, 'dirt')
group('Roads')
for x in range(W):
    for z in range(D):
        if not ROAD(x, z): continue
        c = 'asphalt'
        if x == 20 and not 16 <= z < 25 and z % 4 < 2: c = 'dash'
        if z == 20 and not 16 <= x < 25 and x % 4 < 2: c = 'dash'
        if (16 <= z < 18 or 23 <= z < 25) and 18 <= x < 23 and x % 2 == 0: c = 'zebra'     # crosswalks
        if (16 <= x < 18 or 23 <= x < 25) and 18 <= z < 23 and z % 2 == 0: c = 'zebra'
        if (z == 15 and x in (21, 22)) or (z == 25 and x in (18, 19)) or (x == 15 and z in (18, 19)) or (x == 25 and z in (21, 22)): c = 'zebra'  # stop lines
        put(x, R, z, c)
for x, z in [(20, 9), (34, 20), (7, 21), (19, 40)]: put(x, R, z, 'manhole')
group('Sidewalks')
for x in range(W):
    for z in range(D):
        if WALK(x, z):
            edge = x in (17, 23) and not 16 <= z < 25 or z in (17, 23) and not 16 <= x < 25
            put(x, S, z, 'curb' if edge else ('walk2' if (z if 16 <= x < 25 else x) % 4 == 0 else 'walk'))

# ---------- SW park ----------
group('Park')
PC = (8.0, 8.0)
PATCH = rng.random((W // 3 + 1, D // 3 + 1))
pond = lambda x, z: dist(x, z, 3.6, 3.9) <= 2.5 or dist(x, z, 5.4, 2.7) <= 1.8
for x in range(16):
    for z in range(16):
        d = dist(x, z, *PC)
        if pond(x, z): put(x, R, z, 'water')
        elif x in (7, 8) or z in (7, 8) or 2.2 < d <= 3.6: put(x, S, z, 'gravel')
        elif d <= 2.2: put(x, S, z, 'stone_l')
        elif 3.6 < d <= 4.5 and not (x < 7 and z < 7): put(x, S, z, pick(['fl_red', 'fl_yel', 'fl_pur', 'fl_wht', 'grass1'], [.25, .25, .2, .15, .15]))
        else: put(x, S, z, ['grass1', 'grass2', 'grass3'][int(PATCH[x // 3, z // 3] * 3)])
for x in range(16):                                    # pond edge stones
    for z in range(16):
        if not pond(x, z) and any(pond(x + a, z + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))) and rng.random() < .65: put(x, S, z, 'rock')
for x, z in [(2, 5), (4, 2), (5, 4)]: put(x, R, z, 'leaf3')     # lily pads
put(3, S, 3, 'duck'); put(3, S + 1, 3, 'duck'); put(3, S, 4, 'duck'); put(3, S + 1, 2, 'beak')
disk(*PC, 2.2, B, B + 1, 'stone_l', 1.5); disk(*PC, 1.5, S, S + 1, 'water')     # fountain: rim, basin water
box(7, 9, B, B + 2, 7, 9, 'stone_l'); box(7, 9, B + 2, B + 3, 7, 9, 'water')
for x in range(16):                                    # low hedge border, gates on the paths
    for z in range(16):
        if (x in (0, 15) or z in (0, 15)) and x not in (7, 8) and z not in (7, 8) and not pond(x, z): put(x, B, z, 'hedge')
tree(3, 12, 2.4, 3); tree(12, 12, 2.7, 4); tree(12, 3, 2.2, 3); pine(13, 9)
for x, z in [(6, 13), (9, 2), (2, 9)]: box(x, x + 1, B, B + 4, z, z + 1, 'pole'); put(x, B + 4, z, 'lamp')
box(9, 10, B, B + 1, 11, 14, 'wood'); box(10, 11, B, B + 2, 11, 14, 'wood')          # benches facing the paths
box(2, 5, B, B + 1, 9, 10, 'wood'); box(2, 5, B, B + 2, 10, 11, 'wood')

# ---------- lots ----------
group('Lots')
for x in range(W):
    for z in range(D):
        if x < 16 and z < 16 or ROAD(x, z) or WALK(x, z): continue
        if x >= 35 and z < 16: put(x, S, z, 'grass3' if (x // 2) % 2 else 'grass1')   # yards: mowed stripes
        elif 25 <= x < 40 and 25 <= z < 38: put(x, S, z, 'plaza1' if int(max(abs(x - 32), abs(z - 31))) % 2 else 'plaza2')
        else: put(x, S, z, 'walk2' if x % 4 == 0 else 'walk')

# ---------- buildings ----------
def facade(x0, x1, z0, z1):
    """Each face: list of (x, z) cells left to right, and the outward step (dx, dz)."""
    return {'S': ([(x, z0) for x in range(x0, x1)], (0, -1)), 'N': ([(x, z1 - 1) for x in range(x1 - 1, x0 - 1, -1)], (0, 1)),
            'W': ([(x0, z) for z in range(z1 - 1, z0 - 1, -1)], (-1, 0)), 'E': ([(x1 - 1, z) for z in range(z0, z1)], (1, 0))}

def building(x0, x1, z0, z1, h, wall, style, glass, trim, base=B, shop='', awn=None, parapet=True, lobby=False):
    y0, y1 = base, base + h
    box(x0, x1, y0, y1, z0, z1, wall)
    g2 = glass if glass.endswith('2') else glass + '2'
    VAR = rng.random((64, 64)) < .14
    for f, (cells, (dx, dz)) in facade(x0, x1, z0, z1).items():
        L = len(cells)
        for u, (x, z) in enumerate(cells):
            pillar = u in (0, L - 1)
            for y in range(y0, y1):
                fy, fl = (y - y0) % 3, (y - y0) // 3
                c = wall
                if y == y1 - 1: c = trim                                   # cornice
                elif pillar: c = trim if style == 'strips' else wall
                elif fl == 0 and (f in shop or lobby):                     # ground floor shopfront
                    c = ('door' if not lobby else glass) if u == L // 2 and fy < 2 else (glass if fy < 2 else trim)
                elif fl == 0: c = glass if fy == 1 and u % 2 else wall
                elif style == 'grid': c = trim if fy == 0 else (glass if u % 2 else wall)
                elif style == 'ribbon': c = wall if fy == 0 else glass
                elif style == 'strips': c = trim if u % 3 == 0 else (glass if (u // 3) % 2 else g2)
                if c == glass and style != 'strips' and VAR[u // (3 if style == 'ribbon' else 1), fl]: c = g2   # blinds vary per window
                put(x, y, z, c)
            if f in shop and awn and not pillar:                           # striped awning over the shopfront
                put(x + dx, y0 + 2, z + dz, awn if u % 2 else 'trim_w')
    box(x0 + 1, x1 - 1, y1 - 1, y1, z0 + 1, z1 - 1, 'roof')
    if parapet:
        for x in range(x0, x1):
            for z in range(z0, z1):
                if x in (x0, x1 - 1) or z in (z0, z1 - 1): put(x, y1, z, trim)
    return y1

def ac(x, z, y):
    box(x, x + 2, y, y + 1, z, z + 2, 'gray_l'); put(x, y + 1, z, 'pole')

def stairs(x, z, y, wall):
    box(x, x + 3, y, y + 2, z, z + 3, wall); box(x, x + 3, y + 2, y + 3, z, z + 3, 'roof_d'); put(x + 1, y, z, 'door')

group('Corner Cafe')                     # S1
top = building(26, 33, 8, 15, 8, 'stucco', 'grid', 'glass_b', 'trim_w', shop='WN', awn='aw_red')
ac(28, 10, top); ac(31, 12, top)
group('Bakery')                          # S2 + billboard facing the avenue
top = building(26, 33, 1, 7, 11, 'slate', 'grid', 'glass_b', 'trim_w', shop='W', awn='aw_grn')
box(29, 30, top, top + 3, 2, 3, 'pole'); box(29, 30, top, top + 3, 5, 6, 'pole')
box(28, 29, top + 2, top + 7, 1, 7, 'bb_frame')
for y in range(top + 3, top + 6):
    for z in range(2, 6): put(27, y, z, 'sign_n' if (y + z) % 3 else 'sign_y')
group('Brick Shops')                     # N1 + water tower
top = building(1, 15, 26, 34, 12, 'brick', 'grid', 'glass_b', 'cream', shop='SE', awn='aw_blu')
for x, z in [(9, 28), (12, 28), (9, 31), (12, 31)]: box(x, x + 1, top, top + 2, z, z + 1, 'pole')
disk(11, 30, 2.1, top + 2, top + 6, 'water_t'); disk(11, 30, 2.1, top + 3, top + 4, 'water_t2'); disk(11, 30, 1.4, top + 6, top + 7, 'water_t2'); put(10, top + 7, 29, 'water_t2')
ac(3, 28, top); ac(3, 31, top); stairs(5, 29, top, 'brick_d')
group('Teal Tower')                      # N2
top = building(1, 8, 36, 48, 24, 'teal', 'ribbon', 'glass_t', 'trim_w', shop='E', awn='aw_org')
ac(2, 38, top); ac(4, 43, top); box(5, 6, top, top + 6, 45, 46, 'pole'); put(5, top + 6, 45, 'red_n')
group('Cream Flats')                     # N3 with balconies
top = building(9, 15, 38, 48, 16, 'cream', 'grid', 'glass_b', 'brick_d', shop='E', awn='aw_red')
for y in range(B + 4, top - 1, 3):
    for z in (40, 41, 44, 45): put(15, y, z, 'trim_w')
ac(10, 40, top); stairs(11, 44, top, 'brick_d')
group('Beige Offices')                   # T2 with a roof garden
top = building(26, 34, 40, 49, 22, 'beige', 'grid', 'glass_b', 'trim_d', shop='W', awn='aw_grn')
for x in range(27, 33):
    for z in range(41, 48): put(x, top - 1, z, pick(['grass1', 'grass2', 'grass3']))
tree(28, 43, 1.4, 2, top); tree(31, 46, 1.4, 2, top); box(30, 33, top, top + 1, 42, 43, 'wood')
group('Gray Tower')                      # T3
top = building(42, 50, 27, 35, 18, 'gray_d', 'ribbon', 'glass_b', 'gray_l', lobby=True)
ac(43, 28, top); ac(46, 28, top); stairs(45, 31, top, 'gray_d')
group('Skyline Tower')                   # T1: setback, helipad, antenna
top = building(36, 46, 38, 48, 30, 'navy', 'strips', 'glass_d', 'navy_l', lobby=True)
top = building(37, 44, 39, 46, 10, 'navy', 'strips', 'glass_d', 'navy_l', base=top, parapet=False)
box(38, 43, top - 1, top, 40, 45, 'heli')
disk(40.5, 42.5, 2.5, top - 1, top, 'heli_y', 1.9)
for x, z in [(39, 41), (39, 42), (39, 43), (40, 42), (41, 41), (41, 42), (41, 43)]: put(x, top - 1, z, 'trim_w')
for x, z in [(37, 39), (43, 39), (37, 45), (43, 45)]: put(x, top, z, 'heli_l')
box(44, 45, 33, 33 + 15, 46, 47, 'pole'); put(44, 48, 46, 'red_n')

# ---------- SE houses and yards ----------
def house(x0, x1, z0, z1, wall, rf, rf2, door_x):
    y1 = B + 5
    box(x0, x1, B, y1, z0, z1, wall)
    for f, (cells, _) in facade(x0, x1, z0, z1).items():
        for u, (x, z) in enumerate(cells):
            if 0 < u < len(cells) - 1 and u % 2:
                put(x, B + 1, z, 'sky'); put(x, B + 3, z, 'sky')
    box(door_x, door_x + 1, B, B + 2, z1 - 1, z1, 'door')
    for i in range(4):                                     # stepped gable roof, ridge along x
        za, zb = z0 - 1 + i, z1 + 1 - i
        if za >= zb: break
        box(x0, x1, y1 + i, y1 + i + 1, za, zb, wall)
        for z in (za, zb - 1): box(x0 - 1, x1 + 1, y1 + i, y1 + i + 1, z, z + 1, rf)
    box(x0 - 1, x1 + 1, y1 + 3, y1 + 4, z0 + 2, z1 - 2, rf2)
    box(x1 - 2, x1 - 1, y1, y1 + 5, z0 + 1, z0 + 2, 'brick'); put(x1 - 2, y1 + 5, z0 + 1, 'brick_d')
    box(door_x, door_x + 1, S, S + 1, z1, 16, 'walk')

group('Houses')
house(36, 43, 8, 14, 'peach', 'roof_r', 'roof_r2', 39)
house(44, 49, 8, 14, 'stucco', 'roof_b', 'roof_b2', 46)
group('Yards')
for x in range(35, 50):                                   # picket fence: low rail, every other picket taller
    for z in range(16):
        edge = x in (35, 49) or z in (0, 15) or (x == 43 and z < 8)
        if edge and not (z == 15 and x in (39, 46)) and G[x, B, z] == 0:
            put(x, B, z, 'fence')
            if (x + z) % 2 == 0: put(x, B + 1, z, 'fence')
box(37, 42, R, R + 1, 2, 6, 'pool'); box(37, 42, S, S + 1, 2, 6, None)
for x in range(36, 43):
    for z in range(1, 7):
        if not (37 <= x < 42 and 2 <= z < 6): put(x, S, z, 'tile')
box(36, 37, B, B + 1, 2, 4, 'trim_w'); box(36, 37, B, B + 1, 5, 7, 'aw_red')       # loungers
box(41, 42, B, B + 3, 6, 7, 'pole'); disk(41.5, 6.5, 1.6, B + 3, B + 4, 'aw_red'); put(41, B + 3, 6, 'trim_w')
for x in range(44, 47):
    for z in range(2, 7):
        put(x, S, z, 'soil')
        if z % 2 == 0: put(x, B, z, 'tomato' if (x + z) % 4 == 0 else 'veg')
tree(47, 3, 1.7, 3)

# ---------- plaza ----------
group('Plaza')
PZ = (32.5, 31.5)
disk(*PZ, 3.8, B, B + 2, 'stone_l', 3.0); disk(*PZ, 3.0, B, B + 1, 'water')
box(32, 33, B, B + 4, 31, 32, 'stone_l'); disk(*PZ, 1.9, B + 4, B + 5, 'stone_l', .8); disk(*PZ, 1.2, B + 5, B + 6, 'water'); put(32, B + 5, 31, 'water'); put(32, B + 6, 31, 'water')
for x, z in [(26, 26), (36, 26), (26, 34), (36, 34)]:
    box(x, x + 3, B, B + 1, z, z + 3, 'wood'); put(x + 1, B, z + 1, 'soil'); tree(x + 1, z + 1, 1.6, 2, B + 1, PINK)
for x0, z0, ax in [(30, 27, 'x'), (30, 36, 'x'), (27, 30, 'z'), (37, 30, 'z')]:
    if ax == 'x': box(x0, x0 + 3, B, B + 1, z0, z0 + 1, 'wood')
    else: box(x0, x0 + 1, B, B + 1, z0, z0 + 3, 'wood')
tree(47, 37, 1.8, 3); tree(41, 25, 1.6, 3); pine(12, 35)

# ---------- street furniture ----------
group('Street')
def lamp(x, z, dx, dz):
    box(x, x + 1, B, B + 6, z, z + 1, 'pole'); put(x + dx, B + 5, z + dz, 'pole'); put(x + dx, B + 4, z + dz, 'lamp')
for z in (4, 12, 41, 47): lamp(17, z, 1, 0)
for z in (4, 12, 29, 37, 45): lamp(23, z, -1, 0)
for x in (4, 12, 29, 37, 45): lamp(x, 17, 0, 1)
for x in (4, 12, 29, 37, 45): lamp(x, 23, 0, -1)
for x, z, go in [(17, 17, True), (23, 23, True), (23, 17, False), (17, 23, False)]:
    box(x, x + 1, B, B + 3, z, z + 1, 'pole')
    put(x, B + 3, z, 'green_n' if go else 'green_d'); put(x, B + 4, z, 'amber'); put(x, B + 5, z, 'red_d' if go else 'red_n'); put(x, B + 6, z, 'pole')
for x, z in [(16, 9), (24, 44), (33, 16), (9, 24)]: put(x, B, z, 'hydrant')
for x, z in [(24, 31), (16, 41), (40, 24)]: put(x, B, z, 'bin')
box(24, 25, B, B + 2, 10, 11, 'mail')
for x, z in [(16, 30), (17, 30), (16, 35), (17, 35)]: box(x, x + 1, B, B + 3, z, z + 1, 'pole')   # bus shelter
box(16, 17, B, B + 3, 31, 35, 'glass_b2'); box(16, 18, B + 3, B + 4, 30, 36, 'roof_d')
box(17, 18, B, B + 1, 32, 34, 'wood'); box(16, 17, B, B + 3, 35, 36, 'sign_b'); put(17, B + 4, 30, 'sign_b')

# ---------- traffic ----------
def car(x, z, d, body, taxi=False, L=5, bus=False):
    """Rear-left corner at (x, z), 2 wide, L long, heading d in +x -x +z -z."""
    for l in range(L):
        for w in range(2):
            ax = d[1] == 'x'
            xx = (x + (l if d[0] == '+' else L - 1 - l)) if ax else x + w
            zz = (z + (l if d[0] == '+' else L - 1 - l)) if not ax else z + w
            y = B
            if bus:
                put(xx, y, zz, 'tire' if l in (1, L - 2) else 'bus')
                put(xx, y + 1, zz, 'red_n' if l == 0 else 'head_n' if l == L - 1 else 'bus')
                put(xx, y + 2, zz, 'bus' if l == 0 else 'cglass')
                put(xx, y + 3, zz, 'dest' if l == L - 1 else 'trim_w')
                continue
            put(xx, y, zz, 'tire' if l in (1, 3) else body)
            put(xx, y + 1, zz, 'red_n' if l == 0 else 'head_n' if l == 4 else body)
            if l in (1, 3): put(xx, y + 2, zz, 'cglass')
            elif l == 2: put(xx, y + 2, zz, body)
            if taxi and l == 2: put(xx, y + 3, zz, 'sign_y')
group('Cars')
for x, z, d, c in [(18, 3, '-z', 'c_red'), (18, 42, '-z', 'c_wht'), (21, 9, '+z', 'c_taxi'), (21, 27, '+z', 'c_blu'),
                   (21, 40, '+z', 'c_grn'), (1, 18, '+x', 'c_blk'), (9, 18, '+x', 'c_org'), (33, 18, '+x', 'c_sil'),
                   (27, 21, '-x', 'c_taxi'), (40, 21, '-x', 'c_tea'), (5, 21, '-x', 'c_red')]:
    car(x, z, d, c, taxi=c == 'c_taxi')
group('Bus')
car(18, 29, '-z', 'bus', L=9, bus=True)

# ---------- merge into boxes ----------
def greedy(K, order):
    """Greedy box merge of equal keys; order = axis growth order (first axis grown first)."""
    Kt = K.transpose(order)
    done = np.zeros(Kt.shape, bool); out = []
    A, Bn, C = Kt.shape
    for c in range(C):
        for b in range(Bn):
            for a in range(A):
                k = Kt[a, b, c]
                if k == 0 or done[a, b, c]: continue
                a1 = a + 1
                while a1 < A and Kt[a1, b, c] == k and not done[a1, b, c]: a1 += 1
                b1 = b + 1
                while b1 < Bn and (Kt[a:a1, b1, c] == k).all() and not done[a:a1, b1, c].any(): b1 += 1
                c1 = c + 1
                while c1 < C and (Kt[a:a1, b:b1, c1] == k).all() and not done[a:a1, b:b1, c1].any(): c1 += 1
                done[a:a1, b:b1, c:c1] = True
                lo, hi = [0] * 3, [0] * 3
                for ax, (l, h) in zip(order, ((a, a1), (b, b1), (c, c1))): lo[ax], hi[ax] = l, h
                out.append((int(k), lo, hi))
    return out

def merged():
    K = G.astype(np.uint16) | (GR.astype(np.uint16) << 8)
    best = None
    for order in [(0, 2, 1), (2, 0, 1), (0, 1, 2), (1, 0, 2)]:
        bx = greedy(K, order)
        if best is None or len(bx) < len(best): best = bx
    return best

KIND = {'s': (272, 0, 0), 'n': (288, 0, 0), 'g': (1568, .25, .2), 'w': (272, .3, .25)}   # Material enum, Transparency, Reflectance

def rbxmx(boxes, path):
    by = {}
    for k, lo, hi in boxes: by.setdefault(k >> 8, []).append((k & 255, lo, hi))
    o, ref = ['<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
              'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'], [0]
    def rid(): ref[0] += 1; return f'RBX{ref[0]:06d}'
    o.append(f'<Item class="Model" referent="{rid()}"><Properties><string name="Name">VoxelCity</string></Properties>')
    for g in sorted(by):
        o.append(f'<Item class="Model" referent="{rid()}"><Properties><string name="Name">{escape(GROUPS[g])}</string></Properties>')
        for c, lo, hi in by[g]:
            name, (r, gg, b), kind = PAL[c]; mat, tr, rf = KIND[kind]
            cx, cy, cz = (lo[0] + hi[0]) / 2 - W / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2 - D / 2
            sx, sy, sz = hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]
            o.append(f'<Item class="Part" referent="{rid()}"><Properties><string name="Name">{name}</string>'
                     f'<bool name="Anchored">true</bool><token name="Material">{mat}</token>'
                     f'<CoordinateFrame name="CFrame"><X>{cx:g}</X><Y>{cy:g}</Y><Z>{cz:g}</Z><R00>1</R00><R01>0</R01><R02>0</R02>'
                     f'<R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>'
                     f'<Color3uint8 name="Color3uint8">{0xFF000000 | r << 16 | gg << 8 | b}</Color3uint8>'
                     f'<Vector3 name="size"><X>{sx}</X><Y>{sy}</Y><Z>{sz}</Z></Vector3>'
                     f'<token name="TopSurface">0</token><token name="BottomSurface">0</token>'
                     f'<float name="Transparency">{tr}</float><float name="Reflectance">{rf}</float>'
                     f'<bool name="CastShadow">{"false" if kind == "n" else "true"}</bool></Properties></Item>')
        o.append('</Item>')
    o.append('</Item></roblox>')
    open(path, 'w').write('\n'.join(o))
    return sum(len(v) for v in by.values())

# Studio stages: the build order the owner watches in the studio tab (ground -> details).
STAGES = [('Ground and roads', ['Ground', 'Roads', 'Sidewalks', 'Lots']), ('Park', ['Park']),
          ('Houses and yards', ['Houses', 'Yards']), ('Shops', ['Corner Cafe', 'Bakery', 'Brick Shops']),
          ('Towers', ['Teal Tower', 'Cream Flats', 'Beige Offices', 'Gray Tower', 'Skyline Tower']),
          ('Plaza and street', ['Plaza', 'Street']), ('Traffic', ['Cars', 'Bus'])]
MAT = {'n': 'Neon', 'g': 'Glass'}

def studio(outdir, name='Voxel City'):
    """Studio copy: merged per stage (not per Model) so it fits the 250 KB project doc; one group per stage."""
    os.makedirs(outdir, exist_ok=True)
    SG = np.zeros(256, np.uint16)
    for si, (_, groups) in enumerate(STAGES):
        for g in groups: SG[GROUPS.index(g)] = si + 1
    K = G.astype(np.uint16) | (SG[GR] << 8)
    boxes = min((greedy(K, o) for o in [(0, 2, 1), (2, 0, 1), (0, 1, 2), (1, 0, 2)]), key=len)
    objs, n, sizes = {}, 0, []
    def b36(i):
        s = ''
        while True:
            s = '0123456789abcdefghijklmnopqrstuvwxyz'[i % 36] + s; i //= 36
            if not i: return s
    for si, (title, _) in enumerate(STAGES):
        objs[f's{si}'] = {'type': 'group', 'name': title}
        for k, lo, hi in boxes:
            if k >> 8 != si + 1: continue
            pname, rgb, kind = PAL[k & 255]
            o = {'type': 'part', 'parent': f's{si}',
                 'pos': [(lo[0] + hi[0]) / 2 - W / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2 - D / 2],
                 'size': [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], 'color': '#%02x%02x%02x' % rgb}
            o['pos'] = [int(v) if v == int(v) else v for v in o['pos']]
            if kind in MAT: o['material'] = MAT[kind]
            if kind == 'w': o['transparency'] = .3
            if o['size'] == [4, 1, 2]: del o['size']
            objs[b36(n)] = o; n += 1
        doc = {'name': name, 'v': 1, 'objects': objs, 'anims': {}, 'textures': {},
               'env': {'bg': '#bcd7ee', 'grid': False, 'fog': None, 'light': 'studio'},
               'camera': {'pos': [-62, 58, -62], 'target': [0, 10, 0], 'fov': 50, 'ortho': False}}
        txt = json.dumps(doc, separators=(',', ':'))
        open(os.path.join(outdir, f'stage{si + 1}.json'), 'w').write(txt)
        sizes.append((title, n, len(txt)))
    return sizes

if __name__ == '__main__':
    boxes = merged()
    print('voxels', int((G > 0).sum()), 'parts', rbxmx(boxes, sys.argv[1] if len(sys.argv) > 1 else 'city.rbxmx'))
    if len(sys.argv) > 2:
        for t, n, s in studio(sys.argv[2]): print(f'stage {t}: {n} objects, {s / 1024:.0f} KB')
