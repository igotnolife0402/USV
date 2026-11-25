#!/usr/bin/env python3
"""Hooded sorcerer (Elemental Onslaught caster), realistic cloth + gold trim, casting pose (right arm forward, -Z).

python3 sorcerer.py OUT [--check]
Writes OUT/geo/*.json, OUT/sorcerer.json, OUT/live/p1.json + m1.json (Umbrio stage 1 of the cinematic import).
--check: mesh check, detail floor (--class prop), prop z-fight. Exit 0 = all pass.
"""
# @style: realistic
# @model: sorcerer | Hooded sorcerer in layered robes, gold trim, glowing eyes, casting pose
# @run: python3 sorcerer.py OUT --check
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import props as P  # noqa: E402
from guns import tex, mk, glow  # noqa: E402

NAME, TITLE = "sorcerer", "Sorcerer"
ROBE, ROBED, ROBEL = "#3a3046", "#231c2c", "#4c4160"
GOLD, GOLDD, GOLDL = "#b8913f", "#7a5c22", "#e8c878"
SKIN = "#8a6a58"


def ring(r, tube, y, n=48, m=10):
    """Horizontal torus (belt, cuffs on the vertical axis, trims) as a closed lathe of a small circle."""
    prof = [(r + tube * math.cos(a), y + tube * math.sin(a)) for a in np.linspace(0, 2 * math.pi, m, endpoint=False)]
    return P.lathe(prof, n, True)


def ring_on(c, axis, r, tube, n=40):
    """Torus around an arbitrary axis (sleeve cuffs on a pointing arm)."""
    axis = np.asarray(axis, float) / np.linalg.norm(axis)
    a = np.cross(axis, [0, 1, 0] if abs(axis[1]) < 0.9 else [1, 0, 0]); a /= np.linalg.norm(a)
    b = np.cross(axis, a)
    path = [np.asarray(c) + r * (math.cos(t) * a + math.sin(t) * b) for t in np.linspace(0, 2 * math.pi, n, endpoint=False)]
    return P.sweep(path, tube, 10, closed=True)


@P.prop(NAME, TITLE)
def sorcerer(rng):
    fold = lambda th, y, r: r * (1 + 0.035 * np.sin(th * 9) * np.clip(1.1 - y, 0, 1))  # vertical cloth folds, stronger at the hem
    sh_r, sh_l = np.array([0.27, 1.38, 0.0]), np.array([-0.27, 1.38, 0.0])
    hand_r = sh_r + np.array([0, 0.02, -0.62])                       # right arm points at the target (-Z)
    hand_l = sh_l + np.array([-0.16, -0.5, -0.14])                   # left arm braced low and out
    p = [
        mk("robe", P.lathe([(0.0, 0.03), (0.62, 0.03), (0.6, 0.12), (0.47, 0.6), (0.35, 1.0), (0.28, 1.2), (0.25, 1.34), (0.0, 1.36)], 72, rmod=fold),
           ROBE, "cloth", roughness=0.92),
        mk("hem-trim", P.lathe([(0.6, 0.0), (0.66, 0.0), (0.665, 0.05), (0.645, 0.13), (0.59, 0.13)], 72, True), GOLD, "gold", metalness=0.8, roughness=0.35),
        mk("underrobe", P.lathe([(0.0, 0.0), (0.5, 0.0), (0.52, 0.03), (0.0, 0.03)], 48), ROBED, "cloth", roughness=1.0),
        mk("belt", ring(0.355, 0.04, 0.98, 64, 12), "#3b2a1c", "leather", roughness=0.7),
        mk("buckle", P.xf(P.rbox((0.12, 0.12, 0.04), 0.012, 2), (0, 0.98, -0.395)), GOLD, "gold", metalness=0.85, roughness=0.3),
        mk("sash-l", P.xf(P.slab(0.05, 0.26, 0.012, 0.014, 0.005, 2), (-0.09, 0.7, -0.4), (0.15, 0, 0.06)), "#6a1f2a", "cloth", roughness=0.9),
        mk("sash-r", P.xf(P.slab(0.045, 0.22, 0.012, 0.014, 0.005, 2), (0.08, 0.74, -0.39), (0.12, 0, -0.08)), "#6a1f2a", "cloth", roughness=0.9),
        mk("mantle", P.lathe([(0.0, 1.13), (0.52, 1.13), (0.5, 1.2), (0.42, 1.3), (0.3, 1.4), (0.17, 1.49), (0.0, 1.5)], 64, rmod=fold),
           ROBEL, "cloth", roughness=0.9),
        mk("mantle-trim", ring(0.52, 0.022, 1.13, 72, 10), GOLD, "gold", metalness=0.8, roughness=0.35),
        mk("hood", P.lathe([(0.0, 1.93), (0.13, 1.91), (0.21, 1.84), (0.245, 1.71), (0.24, 1.58), (0.2, 1.47), (0.0, 1.46)], 48,
                           rmod=lambda th, y, r: r * (1 + 0.06 * np.clip(-np.sin(th), 0, 1) * (y > 1.62))), ROBE, "cloth", roughness=0.92),
        mk("hood-rim", ring_on((0, 1.69, -0.215), (0, 0.08, 1), 0.14, 0.018), GOLD, "gold", metalness=0.8, roughness=0.35),
        P.part("face-shadow", P.xf(P.icosphere(3), (0, 1.68, -0.11), s=(0.14, 0.17, 0.1)), "#050407", smooth=True, roughness=1.0),
        glow("eye-l", P.xf(P.icosphere(2), (-0.05, 1.7, -0.205), s=(0.02, 0.014, 0.01)), "#9fd0ff"),
        glow("eye-r", P.xf(P.icosphere(2), (0.05, 1.7, -0.205), s=(0.02, 0.014, 0.01)), "#9fd0ff"),
        mk("sleeve-r", P.sweep([sh_r, (sh_r + hand_r) / 2, hand_r - (0, 0, -0.06)], np.array([0.12, 0.1, 0.085]), 20, caps="none"), ROBE, "cloth", roughness=0.92),
        mk("sleeve-l", P.sweep([sh_l, (sh_l + hand_l) / 2, hand_l + (0.03, 0.08, 0.02)], np.array([0.12, 0.1, 0.085]), 20, caps="none"), ROBE, "cloth", roughness=0.92),
        mk("cuff-r", ring_on(hand_r - (0, 0, -0.06), (0, 0, -1), 0.088, 0.016), GOLD, "gold", metalness=0.8, roughness=0.35),
        mk("cuff-l", ring_on(hand_l + (0.03, 0.08, 0.02), hand_l - sh_l, 0.088, 0.016), GOLD, "gold", metalness=0.8, roughness=0.35),
        mk("hand-r", P.xf(P.icosphere(3), hand_r + (0, 0, -0.03), s=(0.055, 0.07, 0.085)), SKIN, "skin", roughness=0.65),
        mk("hand-l", P.xf(P.icosphere(3), hand_l + (-0.01, -0.03, -0.01), s=(0.055, 0.085, 0.06)), SKIN, "skin", roughness=0.65),
        mk("chain", P.sweep([(-0.15, 1.42, -0.2), (-0.08, 1.3, -0.3), (0, 1.25, -0.33), (0.08, 1.3, -0.3), (0.15, 1.42, -0.2)], 0.008, 8), GOLD, "gold", metalness=0.85, roughness=0.3),
        mk("amulet", P.xf(P.rbox((0.08, 0.1, 0.025), 0.01, 2), (0, 1.2, -0.335)), GOLD, "gold", metalness=0.85, roughness=0.3),
        glow("amulet-gem", P.xf(P.icosphere(2), (0, 1.2, -0.355), s=(0.025, 0.032, 0.012)), "#7fe0ff"),
    ]
    P.ground(p)
    return p, {"cloth": tex("fabric", [ROBE, ROBED, ROBEL], 0.6), "gold": tex("brushed", [GOLD, GOLDD, GOLDL], 2),
               "leather": tex("noise", ["#3b2a1c", "#2a1d12", "#4e3926"], 1.5), "skin": tex("noise", [SKIN, "#6e5244", "#9e7e6a"], 0.5)}


def live(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, NAME + ".json")))
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    doc = {"name": "Elemental Onslaught", "v": 1, "updated": t, "objects": d["objects"], "textures": d.get("textures", {}), "anims": {},
           "env": {"bg": "#04050a", "grid": False, "fog": None, "light": "studio"},
           "camera": {"pos": [3.2, 1.9, -4.2], "target": [0, 1.3, 0], "fov": 45, "ortho": False}}
    json.dump(doc, open(os.path.join(out, "live", "p1.json"), "w"), separators=(",", ":"))
    json.dump({"name": "Elemental Onslaught", "updated": t, "count": len(d["objects"]), "ai": True, "building": True},
              open(os.path.join(out, "live", "m1.json"), "w"), separators=(",", ":"))
    return os.path.join(out, "live", "p1.json")


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, [NAME], 7, "--check" in a, False, "toon")
    proj = live(out)
    if "--check" in a:
        here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
