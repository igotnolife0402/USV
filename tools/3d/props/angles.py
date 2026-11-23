#!/usr/bin/env python3
"""Every-angle sheet for any props-style generator: 8 views (front, back, left, right, two 3/4s, top, low 3/4).

python3 angles.py <generator.py> <prop-name> <out.png> [--label X] [--tile 360]
Used for blind ratings: no text on the sheet (props.label draws digits only); views are always in VIEWS order,
row 1: front, back, left, right; row 2: 3/4 front, 3/4 back, top, low 3/4.
"""
import importlib.util
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402

# (azimuth, elevation, caption): front is az 0 (looks down -Z); cover every side, the top and from below
VIEWS = [(0, 8, "FRONT"), (180, 8, "BACK"), (90, 8, "LEFT"), (-90, 8, "RIGHT"),
         (35, 22, "3/4 FRONT"), (215, 22, "3/4 BACK"), (0, 80, "TOP"), (30, -25, "LOW 3/4")]


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    gen, name, out = argv[0], argv[1], argv[2]
    lab = argv[argv.index("--label") + 1] if "--label" in argv else ""
    tile = int(argv[argv.index("--tile") + 1]) if "--tile" in argv else 360
    spec = importlib.util.spec_from_file_location("gen_mod", gen)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["gen_mod"] = mod
    spec.loader.exec_module(mod)  # registers the @P.prop in P.PROPS
    title, parts, _ = P.build(name, 7, "toon")
    cols, rows = 4, 2
    sheet = np.ones((rows * tile, cols * tile, 3)) * 0.91
    for k, (az, el, cap) in enumerate(VIEWS):
        big = P.render(parts, tile * 2, tile * 2, az=az, el=el)
        small = big.reshape(tile, 2, tile, 2, 3).mean((1, 3))
        r, c = divmod(k, cols)
        sheet[r * tile:(r + 1) * tile, c * tile:(c + 1) * tile] = small
    P.write_png(out, sheet)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1:])
