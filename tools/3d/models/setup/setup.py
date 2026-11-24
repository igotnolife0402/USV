"""Realistic computer setup: oak desk on a steel frame, 27 in monitor, keyboard, mouse, glass-side PC tower.

usage: python3 setup.py OUT [--check] [--preview]
Writes OUT/setup.json + OUT/geo/*.json (Studio meshes, metres) and OUT/live/p1..p3.json + m1..m3.json
(Umbrio live stages: desk, tower, monitor + peripherals). --check = mesh check + detail floor + attach + zfight + seethru.
Pieces live in setup_desk.py, setup_tower.py, setup_screen.py (each `parts() -> (parts, textures)`).
"""
# @style: realistic
# @model: computer-setup | desk + monitor + keyboard + mouse + PC tower, 1.40 x 0.70 m desk
# @run: python3 setup.py OUT --check
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # props helpers live one level up
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import guns as G  # noqa: E402
import setup_desk  # noqa: E402
import setup_tower  # noqa: E402
import setup_screen  # noqa: E402

NAME, TITLE = "setup", "Computer Setup"
PIECES = [setup_desk, setup_tower, setup_screen]   # one Umbrio live stage per piece, in this order
STAGES = []


@P.prop(NAME, TITLE)
def setup(rng):
    allp, tex = [], {}
    STAGES.clear()
    for mod in PIECES:
        p, t = mod.parts()
        clash = set(tex) & set(t)
        assert not clash, "texture key clash: %s" % sorted(clash)
        allp += p
        tex.update(t)
        STAGES.append([x["id"] for x in p])
    ids = [x["id"] for x in allp]
    assert len(ids) == len(set(ids)), "duplicate part ids"
    return allp, tex


def live(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, NAME + ".json")))
    root = d["root"]
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    objs = {root: d["objects"][root]}
    for i, ids in enumerate(STAGES):
        for k in ids:
            objs[NAME + "-" + k] = d["objects"][NAME + "-" + k]
        doc = {"name": TITLE, "v": 1, "updated": t, "objects": dict(objs), "textures": d["textures"], "anims": {},
               "camera": {"pos": [1.9, 1.5, 2.3], "target": [0, 0.7, 0], "fov": 50, "ortho": False}}
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump({"name": TITLE, "updated": t, "count": len(objs) - 1, "ai": True, "building": i < len(STAGES) - 1},
                  open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    missing = set(d["objects"]) - set(objs)
    assert not missing, "parts not in any stage: %s" % sorted(missing)
    return os.path.join(out, "live", "p%d.json" % len(STAGES))


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, [NAME], 7, "--check" in a, "--preview" in a, "toon")
    proj = live(out)
    here = os.path.dirname(os.path.abspath(__file__))
    zf = os.path.join(here, "..", "..", "zfight", "zfight.py")
    # cut hidden same-facing faces < 12 cm apart (nested frames, parts resting on the desk), keep ids
    fx = os.path.join(out, "fix")
    rc |= subprocess.call([sys.executable, zf, "fix", proj, os.path.join(out, "geo"), fx], stdout=subprocess.DEVNULL)
    for f in os.listdir(os.path.join(fx, "geo")):
        os.replace(os.path.join(fx, "geo", f), os.path.join(out, "geo", f))
    if "--check" in a:
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= G.attach(NAME)
        rc |= subprocess.call([sys.executable, zf, "check", proj, os.path.join(out, "geo")])
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "seethru.py"), "check",
                               proj, os.path.join(out, "geo")])
    return rc


if __name__ == "__main__":
    sys.exit(main())
