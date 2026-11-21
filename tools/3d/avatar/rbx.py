"""Read Roblox files with no dependencies: binary/XML models (.rbxm/.rbxmx, gzip or LZ4/zstd-free chunks) and meshes
(v1 text, v2-v5 binary: positions, normals, UVs, faces of LOD 0). Used to build avatars from the real catalog items.

  python3 rbx.py dump model.rbxm        # instance tree with string, Vector3 and CFrame properties
  python3 rbx.py mesh file.mesh out.obj"""
import gzip, re, struct, sys


def lz4_block(src, size):
    out = bytearray(); i = 0
    while i < len(src):
        tok = src[i]; i += 1; n = tok >> 4
        if n == 15:
            while True:
                b = src[i]; i += 1; n += b
                if b != 255: break
        out += src[i:i + n]; i += n
        if i >= len(src): break
        off = src[i] | src[i + 1] << 8; i += 2; m = tok & 15
        if m == 15:
            while True:
                b = src[i]; i += 1; m += b
                if b != 255: break
        m += 4; st = len(out) - off
        for k in range(m): out.append(out[st + k])          # overlapping copies are byte-wise by design
    return bytes(out[:size])


def _planes(b, n, w=4):
    return [int.from_bytes(bytes(b[j * n + k] for j in range(w)), 'big') for k in range(n)]


def _floats(b, n):
    return [struct.unpack('>f', struct.pack('>I', ((x >> 1) | (x << 31)) & 0xFFFFFFFF))[0] for x in _planes(b, n)]


def _ints(b, n):
    return [(x >> 1) ^ -(x & 1) for x in _planes(b, n)]


def read_model(data):
    """-> {referent: {'class', 'props': {name: value}, 'parent', 'children'}} for binary or XML models."""
    if data[:2] == b'\x1f\x8b': data = gzip.decompress(data)
    if data.startswith(b'<roblox!'): return _binary(data)
    return _xml(data.decode('utf-8', 'replace'))


def _binary(d):
    p = 32; classes = {}; inst = {}
    while p < len(d):
        name = d[p:p + 4]; clen, ulen = struct.unpack_from('<II', d, p + 4); p += 16
        raw = d[p:p + (clen or ulen)]; p += clen or ulen
        body = lz4_block(raw, ulen) if clen else raw
        if name == b'INST':
            cid, ln = struct.unpack_from('<II', body, 0); cname = body[8:8 + ln].decode(); q = 8 + ln + 1
            n, = struct.unpack_from('<I', body, q); q += 4
            refs = _ints(body[q:q + 4 * n], n); acc = 0; ids = []
            for r in refs: acc += r; ids.append(acc); inst[acc] = {'class': cname, 'props': {}, 'parent': None, 'children': []}
            classes[cid] = ids
        elif name == b'PROP':
            cid, ln = struct.unpack_from('<II', body, 0); pname = body[8:8 + ln].decode(); t = body[8 + ln]; v = body[9 + ln:]
            ids = classes.get(cid, []); n = len(ids); vals = None
            if t == 0x01:
                vals, q = [], 0
                for _ in range(n):
                    ln2, = struct.unpack_from('<I', v, q); vals.append(v[q + 4:q + 4 + ln2].decode('utf-8', 'replace')); q += 4 + ln2
            elif t == 0x0E:
                x, y, z = (_floats(v[i * 4 * n:(i + 1) * 4 * n], n) for i in range(3)); vals = list(zip(x, y, z))
            elif t == 0x10:
                q, rots = 0, []
                for _ in range(n):
                    rid = v[q]; q += 1
                    if rid == 0: rots.append(struct.unpack_from('<9f', v, q)); q += 36
                    else: rots.append(_rotid(rid))
                x, y, z = (_floats(v[q + i * 4 * n:q + (i + 1) * 4 * n], n) for i in range(3))
                vals = [(pos, rot) for pos, rot in zip(zip(x, y, z), rots)]
            elif t == 0x02: vals = [bool(b) for b in v[:n]]
            elif t == 0x04: vals = _floats(v, n)
            if vals is not None:
                for i, val in zip(ids, vals): inst[i]['props'][pname] = val
        elif name == b'PRNT':
            n, = struct.unpack_from('<I', body, 1)
            kids, pars = [], []
            acc = 0
            for r in _ints(body[5:5 + 4 * n], n): acc += r; kids.append(acc)
            acc = 0
            for r in _ints(body[5 + 4 * n:5 + 8 * n], n): acc += r; pars.append(acc)
            for c, pa in zip(kids, pars):
                if pa != -1: inst[c]['parent'] = pa; inst[pa]['children'].append(c)
        elif name == b'END\x00': break
    return inst


def _rotid(rid):
    """Axis-aligned rotation ids (the 24 cube rotations) -> row-major 3x3."""
    axes = [(1, 0, 0), (0, 1, 0), (0, 0, 1), (-1, 0, 0), (0, -1, 0), (0, 0, -1)]
    r0, r1 = axes[(rid - 1) // 6], axes[(rid - 1) % 6]
    r2 = (r0[1] * r1[2] - r0[2] * r1[1], r0[2] * r1[0] - r0[0] * r1[2], r0[0] * r1[1] - r0[1] * r1[0])
    return (*r0, *r1, *r2)


def _xml(t):
    inst, stack, nid = {}, [], 0
    for m in re.finditer(r'<Item class="([^"]+)"[^>]*>|</Item>|<(Content|string|Vector3|CoordinateFrame) name="([^"]+)">([\s\S]*?)</\2>', t):
        if m.group(1):
            inst[nid] = {'class': m.group(1), 'props': {}, 'parent': stack[-1] if stack else None, 'children': []}
            if stack: inst[stack[-1]]['children'].append(nid)
            stack.append(nid); nid += 1
        elif m.group(0) == '</Item>': stack.pop()
        elif stack:
            kind, name, body = m.group(2), m.group(3), m.group(4)
            if kind in ('Content', 'string'): val = re.sub(r'</?url>|<null>\s*</null>', '', body).strip()
            else:
                f = dict(re.findall(r'<(\w+)>([^<]*)</\1>', body)); g = lambda k: float(f.get(k, 0))
                val = (g('X'), g('Y'), g('Z')) if kind == 'Vector3' else ((g('X'), g('Y'), g('Z')), tuple(g(k) for k in ('R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22')))
            inst[stack[-1]]['props'][name] = val
    return inst


def asset_id(url):
    m = re.search(r'(?:id=|rbxassetid://)(\d+)', url or ''); return int(m.group(1)) if m else None


def read_mesh(data):
    """-> (positions, normals, uvs, faces) of LOD 0. UV v is flipped to bottom-up (OBJ/GL convention)."""
    if data[:2] == b'\x1f\x8b': data = gzip.decompress(data)
    head = data[:12].decode('ascii', 'replace')
    if head.startswith('version 1'):
        nums = [float(x) for x in re.findall(r'-?[\d.]+(?:e-?\d+)?', data.decode().split('\n', 2)[2])]
        P, N, U, F = [], [], [], []
        scale = 0.5 if head.startswith('version 1.00') else 1.0
        for i in range(0, len(nums) - 8, 9):
            P.append(tuple(c * scale for c in nums[i:i + 3])); N.append(tuple(nums[i + 3:i + 6])); U.append((nums[i + 6], 1 - nums[i + 7]))
        F = [(i, i + 1, i + 2) for i in range(0, len(P), 3)]
        return P, N, U, F
    ver = head[8:12]; p = data.index(b'\n') + 1
    if ver == '2.00':
        hs, vs, fs, nv, nf = struct.unpack_from('<HBBII', data, p); nlod = 0; lods = []
    elif ver.startswith('3'):
        hs, vs, fs, ls, nlod, nv, nf = struct.unpack_from('<HBBHHII', data, p); lods = None
    else:                                                     # 4.00 / 4.01 / 5.00
        hs, = struct.unpack_from('<H', data, p); nv, nf = struct.unpack_from('<II', data, p + 4); nlod, = struct.unpack_from('<H', data, p + 12)
        vs, fs = 40, 12
    p += hs; P, N, U = [], [], []
    for i in range(nv):
        x, y, z, nx, ny, nz, u, v = struct.unpack_from('<8f', data, p + i * vs)
        P.append((x, y, z)); N.append((nx, ny, nz)); U.append((u, 1 - v))
    p += nv * vs
    if not ver.startswith('2') and not ver.startswith('3'):    # v4+: skinning block when bones exist (skipped)
        nb, = struct.unpack_from('<H', data, data.index(b'\n') + 1 + 14)
        if nb: p += nv * 8
    faces = [struct.unpack_from('<3I', data, p + i * 12) for i in range(nf)]; p += nf * 12
    if nlod > 1:
        lo = struct.unpack_from(f'<{nlod}I', data, p); faces = faces[lo[0]:lo[1]]
    return P, N, U, faces


if __name__ == '__main__':
    if sys.argv[1] == 'dump':
        m = read_model(open(sys.argv[2], 'rb').read())
        def show(i, d=0):
            o = m[i]; pr = {k: (v if not isinstance(v, tuple) or len(v) != 2 else (tuple(round(c, 3) for c in v[0]),)) for k, v in o['props'].items()
                            if k in ('Name', 'MeshId', 'TextureID', 'TextureId', 'Size', 'CFrame', 'Offset', 'Scale', 'MeshType', 'ShirtTemplate', 'PantsTemplate', 'Texture', 'BodyPart', 'OverlayTextureId', 'BaseTextureId', 'AttachmentPoint', 'AttachmentPos')}
            print('  ' * d + o['class'], pr)
            for c in o['children']: show(c, d + 1)
        for i, o in m.items():
            if o['parent'] is None: show(i)
    elif sys.argv[1] == 'mesh':
        P, N, U, F = read_mesh(open(sys.argv[2], 'rb').read())
        with open(sys.argv[3], 'w') as f:
            for v in P: f.write('v %f %f %f\n' % v)
            for v in U: f.write('vt %f %f\n' % v)
            for a in F: f.write('f %d/%d %d/%d %d/%d\n' % tuple(x + 1 for t in a for x in (t, t)))
        print(len(P), 'verts', len(F), 'faces')
