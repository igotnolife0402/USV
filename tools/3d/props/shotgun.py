#!/usr/bin/env python3
"""Pump shotgun, voxel-look textured studio meshes (helpers from guns.py).

python3 shotgun.py OUT [--check] [--preview]
Writes OUT/geo/*.json, OUT/<NAME>.json, OUT/live/p1.json + m1.json (Umbrio one-stage build).
--check: mesh check, detail floor (--class prop), attach (one piece), prop z-fight. Exit 0 = all pass.
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import guns as G  # noqa: E402
from guns import B, S, pair, poly, side, tube, screws, row, tex, mk, glow, STEEL, GUNM, DARK  # noqa: E402,F401

NAME, TITLE = "tactical-shotgun", "Tactical Shotgun"
# palette (variants change only these)
BODY, BODYD, BODYL, BODYTEX = "#2A2C30", "#1E2024", "#3A3D43", "noise"
RECV, BEAD, SHELL, BRASS = "#5E6B47", "#3CFF6A", "#C8322B", "#D9A63A"
BARREL_END, TUBE_END = 10.0, 9.4  # x where barrel / magazine tube end


@P.prop(NAME, TITLE)
def shotgun(rng):
    W = 0.66
    BE, TE = BARREL_END, TUBE_END
    p = [
        mk("buttpad", S(0.0, 0.2, 0.95, 2.4, W - 0.04), "#17181B", "grip", roughness=0.9),
        mk("stock", poly([(0.2, 1.0), (2.2, 1.6), (2.2, 2.3), (0.2, 2.45)], W - 0.12), BODY, "body", roughness=0.6),
        mk("wrist", poly([(2.2, 1.6), (2.95, 1.75), (2.95, 2.3), (2.2, 2.3)], W - 0.16), BODYD, "body", roughness=0.6),
        mk("checkering", side([(2.3, 2.2), (2.85, 2.2), (2.85, 1.85), (2.3, 1.72)], (W - 0.16) / 2 + 0.02),
           "#2A2C31", "grip", roughness=0.9),
        mk("receiver", S(2.9, 5.0, 1.55, 2.45, W), RECV, "metal", metalness=0.7, roughness=0.35),
        mk("receiver-top", S(3.0, 4.9, 2.45, 2.55, W - 0.2), DARK, "metal", metalness=0.6),
        mk("port", B(3.6, 4.5, 1.95, 2.3, W / 2, W / 2 + 0.05), "#24272C", "metal", metalness=0.5),
        mk("loading-gate", S(3.4, 4.6, 1.45, 1.56, W - 0.2), DARK, "metal", metalness=0.6),
        mk("guard", P.merge(S(3.0, 4.0, 1.0, 1.1, 0.2), S(3.9, 4.0, 1.1, 1.55, 0.2)), GUNM, "metal", metalness=0.6),
        mk("trigger", poly([(3.4, 1.55), (3.53, 1.55), (3.51, 1.22), (3.43, 1.2)], 0.12, 0.015), STEEL, "metal", metalness=0.8),
        mk("barrel", tube(5.0, BE, 2.2, [(0.17, 0), (0.17, BE - 5.0)], seg=32), STEEL, "metal", metalness=0.8, roughness=0.3),
        mk("muzzle", tube(BE, BE + 0.25, 2.2, [(0.21, 0), (0.21, 0.12), (0.19, 0.14), (0.19, 0.25)], seg=32), DARK, "metal", metalness=0.7),
        mk("rib", S(5.0, BE - 0.1, 2.36, 2.43, 0.16, 0.012), DARK, "metal", metalness=0.6),
        glow("bead", S(BE - 0.15, BE - 0.02, 2.42, 2.52, 0.08, 0.012), BEAD),
        mk("mag-tube", tube(5.0, TE, 1.86, [(0.17, 0), (0.17, TE - 5.0)], seg=32), GUNM, "metal", metalness=0.7),
        mk("mag-cap", tube(TE, TE + 0.25, 1.86, [(0.19, 0), (0.19, 0.18), (0.15, 0.25)], seg=32), STEEL, "metal", metalness=0.8),
        mk("clamp", S(TE - 0.5, TE - 0.3, 1.66, 2.4, 0.4), DARK, "metal", metalness=0.6),
        mk("pump", S(5.6, 7.6, 1.6, 2.12, W - 0.08), BODY, "body", roughness=0.6),
        mk("pump-grooves", row(lambda x: pair(x, x + 0.08, 1.66, 2.06, (W - 0.08) / 2, (W - 0.08) / 2 + 0.04),
                               [5.75 + i * 0.22 for i in range(9)]), BODYD, "body"),
        mk("action-bars", pair(4.9, 5.7, 1.8, 1.9, 0.1, 0.16), STEEL, "metal", metalness=0.8),
        mk("saddle", B(3.0, 4.6, 1.62, 2.35, -(W / 2 + 0.06), -W / 2), DARK, "metal", metalness=0.5),
        mk("shells", P.merge(*[B(x, x + 0.16, 1.72, 2.3, -(W / 2 + 0.15), -(W / 2 + 0.05)) for x in [3.08 + i * 0.24 for i in range(6)]]),
           SHELL, None, roughness=0.5),
        mk("shell-caps", P.merge(*[B(x, x + 0.16, 1.64, 1.74, -(W / 2 + 0.15), -(W / 2 + 0.05)) for x in [3.08 + i * 0.24 for i in range(6)]]),
           BRASS, None, metalness=0.8, roughness=0.3),
        mk("screws", screws([(3.2, 2.2), (4.7, 2.2), (4.7, 1.75)], W / 2 + 0.04), STEEL, "metal", metalness=0.8),
        mk("sling", P.merge(S(0.7, 0.9, 1.15, 1.35, 0.12), S(TE - 0.2, TE, 1.58, 1.72, 0.12)), STEEL, "metal", metalness=0.8),
    ]
    P.ground(p)
    return p, {"body": tex(BODYTEX, [BODY, BODYD, BODYL], 3), "metal": tex("brushed", [STEEL, "#7E858F", "#E1E5EA"], 4),
               "grip": tex("grip", ["#303135", "#1E1F22", "#45474D"], 8)}


def live(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, NAME + ".json")))
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    doc = {"name": TITLE, "v": 1, "updated": t, "objects": d["objects"], "textures": d.get("textures", {}), "anims": {},
           "camera": {"pos": [5, 4, 12], "target": [5, 1.5, 0], "fov": 50, "ortho": False}}
    json.dump(doc, open(os.path.join(out, "live", "p1.json"), "w"), separators=(",", ":"))
    json.dump({"name": TITLE, "updated": t, "count": len(d["objects"]), "ai": True, "building": False},
              open(os.path.join(out, "live", "m1.json"), "w"), separators=(",", ":"))
    return os.path.join(out, "live", "p1.json")


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, [NAME], 7, "--check" in a, "--preview" in a, "toon")
    proj = live(out)
    if "--check" in a:
        here = os.path.dirname(os.path.abspath(__file__))
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= G.attach(NAME)
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
