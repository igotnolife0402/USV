#!/usr/bin/env python3
"""Toon cottage for the studio (numpy only), built as three aligned props.

python3 house.py OUT [--check] [--preview]
Builders: house_a.py (body), house_b.py (roof), house_c.py (door, windows, porch).
Writes OUT/geo/*.json, OUT/<part>.json and OUT/house.json (one project, all parts at the origin).
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import house_a, house_b, house_c  # noqa: E402,F401  (register builders)

NAMES = ["house-body", "house-roof", "house-trim"]


def combine(out):
    objs, tex = {}, {}
    for n in NAMES:
        d = json.load(open(os.path.join(out, n + ".json")))
        d["objects"][d["root"]]["pos"] = [0, 0, 0]
        objs.update(d["objects"])
        tex.update(d.get("textures", {}))
    doc = {"name": "House", "v": 1, "updated": "2026-11-22T00:00:00Z", "objects": objs, "textures": tex,
           "camera": {"pos": [16, 10, 20], "target": [0, 5, 0], "fov": 50, "ortho": False}}
    with open(os.path.join(out, "house.json"), "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    tab = os.path.join(out, "studio")
    os.makedirs(tab, exist_ok=True)
    shutil.copytree(os.path.join(out, "geo"), os.path.join(tab, "geo"), dirs_exist_ok=True)
    for f, d in (("project.json", doc), ("uploads.json", {}),
                 ("meta.json", {"name": "House", "updated": doc["updated"], "count": len(objs), "ai": True,
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
    if "--check" in a:
        import subprocess
        here = os.path.dirname(os.path.abspath(__file__))
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               os.path.join(out, "studio", "project.json"), os.path.join(out, "studio", "geo")])
    return rc


if __name__ == "__main__":
    sys.exit(main())
