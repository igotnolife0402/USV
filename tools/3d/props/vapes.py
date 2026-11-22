#!/usr/bin/env python3
"""Five original vape props for the studio (toon style, numpy only).

python3 vapes.py OUT [--check] [--preview]
Builders live in vape_a.py, vape_b.py, vape_c.py (registered into props.PROPS).
Writes OUT/geo/*.json, OUT/<name>.json per vape and OUT/vapes.json (all five in a row, one project).
"""
# @style: toon
# @model: pod-vape, box-mod, disposable-vape, vape-pen, mech-mod | Five toon vape props in a row, 1.6 studs apart
# @run: python3 vapes.py OUT --check
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import vape_a, vape_b, vape_c  # noqa: E402,F401  (register builders)

NAMES = ["pod-vape", "box-mod", "disposable-vape", "vape-pen", "mech-mod"]
GAP = 1.6  # studs between vape centres


def combine(out):
    objs, tex = {}, {}
    for i, n in enumerate(NAMES):
        d = json.load(open(os.path.join(out, n + ".json")))
        d["objects"][d["root"]]["pos"] = [(i - 2) * GAP, 0, 0]
        objs.update(d["objects"])
        tex.update(d.get("textures", {}))
    doc = {"name": "Vapes", "v": 1, "updated": "2026-11-22T00:00:00Z", "objects": objs, "textures": tex,
           "camera": {"pos": [0, 1.6, 6.5], "target": [0, 0.6, 0], "fov": 50, "ortho": False}}
    with open(os.path.join(out, "vapes.json"), "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    # studio tab folder (shots check / upload): project.json, meta.json, uploads.json, geo/
    tab = os.path.join(out, "studio")
    os.makedirs(tab, exist_ok=True)
    shutil.copytree(os.path.join(out, "geo"), os.path.join(tab, "geo"), dirs_exist_ok=True)
    for f, d in (("project.json", doc), ("uploads.json", {}),
                 ("meta.json", {"name": "Vapes", "updated": doc["updated"], "count": len(objs), "ai": True,
                                "building": False})):
        with open(os.path.join(tab, f), "w") as fh:
            json.dump(d, fh, separators=(",", ":"))


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, NAMES, 7, "--check" in a, "--preview" in a, "toon")
    combine(out)
    if "--check" in a:   # one command runs every gate: mesh check, detail floor, prop-scale z-fight
        import subprocess
        here = os.path.dirname(os.path.abspath(__file__))
        for n in NAMES:
            rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                                   os.path.join(out, n + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               os.path.join(out, "studio", "project.json"), os.path.join(out, "studio", "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
