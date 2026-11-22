import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

PREFIX = ("liv-", "din-", "kit-", "bath-", "bed-")
MERGE = {"din-pads": "din-chairs", "liv-books": "liv-bookshelf", "liv-lamp-shade": "liv-lamp",
         "bed-frame": "bed", "bed-headboard": "bed", "bed-mattress": "bed", "bed-duvet": "bed",
         "bed-pillows": "bed", "bed-throw": "bed", "bed-lamps": "bed-nightstands",
         "bed-lamp-shades": "bed-nightstands", "bed-knobs": "bed-nightstands"}


def _key(pid):
    full = "-".join(pid.split("-")[:3])
    if full in MERGE:
        return MERGE[full]
    k = "-".join(pid.split("-")[:2])
    if k.startswith("kit-"):
        return "kit"
    if k.startswith("bath-"):
        return "bath"
    return MERGE.get(k, k)


def _rot_y(a):
    a = np.radians(a)  # SIDES angles are degrees
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _shells(mesh):
    v = np.asarray(mesh.v, float)
    n = len(v)
    _, inv = np.unique(np.round(v, 4), axis=0, return_inverse=True)  # weld: fuv splits every face into its own vertices
    inv = inv.ravel()
    r, c = [], []
    for f in mesh.f:
        for i in range(len(f)):
            r.append(inv[f[i]])
            c.append(inv[f[(i + 1) % len(f)]])
    if not r:
        return []
    m = coo_matrix((np.ones(len(r)), (r, c)), shape=(inv.max() + 1,) * 2)
    _, lab = connected_components(m, directed=False)
    lab = lab[inv]
    used = np.zeros(n, bool)
    used[np.unique(np.concatenate([np.asarray(f) for f in mesh.f]))] = True
    out = []
    for l in np.unique(lab[used]):
        s = v[(lab == l) & used]
        out.append((s.min(0), s.max(0)))
    return out


def _touch(a, b, e=0.01):
    return np.all(np.minimum(a[1], b[1]) - np.maximum(a[0], b[0]) >= -e)


def check(parts, H):
    shells = {}
    for p in parts:
        pid = p["id"]
        if not pid.startswith(PREFIX) or pid.endswith("-rug") or "-rug" in pid.split("-")[1:2]:
            continue
        shells.setdefault(_key(pid), []).extend(_shells(p["mesh"]))
    raw = [(k, b) for k, sh in shells.items() for b in sh]  # window rule: single shells (merged AABBs gave false hits)
    objs = []
    for k, sh in shells.items():
        sh = list(sh)
        changed = True
        while changed:
            changed = False
            for i in range(len(sh)):
                for j in range(i + 1, len(sh)):
                    if _touch(sh[i], sh[j]):
                        sh[i] = (np.minimum(sh[i][0], sh[j][0]), np.maximum(sh[i][1], sh[j][1]))
                        del sh[j]
                        changed = True
                        break
                if changed:
                    break
        objs += [(k, b) for b in sh]
    bad = 0
    for i in range(len(objs)):
        for j in range(i + 1, len(objs)):
            (ka, a), (kb, b) = objs[i], objs[j]
            if ka == kb:
                continue
            lo, hi = np.maximum(a[0], b[0]), np.minimum(a[1], b[1])
            if (hi - lo).min() > 0.01:
                print("CLEAR FAIL overlap", ka, kb, "at", np.round((lo + hi) / 2, 2).tolist())
                bad += 1
    for n, ang, L, wo in H.SIDES:
        R = _rot_y(ang)
        for table, name, yf in ((H.GROUND, "ground", H.F0), (H.UPPER, "upper", H.F1)):
            for cu, w, ya, yb in table[n]:
                zlo = np.array([cu - w / 2, ya + 0.06 + 0.05, wo - H.T - 0.25])  # tall within 25 cm of the wall, > 5 cm over the sill
                zhi = np.array([cu + w / 2, yb, wo - H.T])
                for k, (mn, mx) in raw:
                    cs = np.array([[x, y, z] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])])
                    loc = cs @ R
                    lo, hi = np.maximum(loc.min(0), zlo), np.minimum(loc.max(0), zhi)
                    if (hi - lo).min() > 0.01:
                        print("CLEAR FAIL window", k, "blocks", n, "window at u=%s (%s)" % (cu, name))
                        bad += 1
    print("CLEAR FAIL (%d problems)" % bad if bad else "CLEAR PASS (%d objects)" % len(objs))
    return 1 if bad else 0
