"""Fetch real Roblox catalog items (no login: assetdelivery + thumbnails APIs) into a kit folder the render reads.

  python3 catalog.py KIT --body 86500008,86500036,86500054,86500064,86500078 --hair 63690008 \
      --shirt 144076358 --pants 144076760 --face 144075659
  python3 catalog.py KIT --user <username>      # everything that avatar wears now, R6 or R15

KIT/kit.json: parts (R15 MeshParts: name, mesh file, CFrame, size, rig attachments), accessories (mesh, texture,
scale, offset, attachment), shirt/pants template and face image files. KIT/refs/: catalog thumbnails to check colours."""
# @style: helper
import json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rbx

AD = 'https://assetdelivery.roblox.com/v1/asset/?id={}'
UA = {'User-Agent': 'vault-avatar/1.0', 'Accept-Encoding': 'gzip'}


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                b = r.read()
                return __import__('gzip').decompress(b) if b[:2] == b'\x1f\x8b' else b
        except Exception as e:
            if k == tries - 1: raise
            time.sleep(1.5 * (k + 1))


def asset(kit, aid, ext):
    p = os.path.join(kit, f'{aid}.{ext}')
    if not os.path.exists(p): open(p, 'wb').write(get(AD.format(aid)))
    return p


def image(kit, aid):
    """Image id, or a Decal/Shirt/Pants whose template points at one."""
    p = asset(kit, aid, 'bin'); b = open(p, 'rb').read()
    if b[:4] == b'\x89PNG' or b[:3] == b'\xff\xd8\xff':
        q = p[:-3] + ('png' if b[:4] == b'\x89PNG' else 'jpg'); os.replace(p, q); return os.path.basename(q)
    if os.path.exists(p[:-3] + 'png'): return os.path.basename(p[:-3] + 'png')
    m = rbx.read_model(b); os.remove(p)
    for o in m.values():
        for k in ('Texture', 'ShirtTemplate', 'PantsTemplate'):
            if rbx.asset_id(o['props'].get(k)): return image(kit, rbx.asset_id(o['props'][k]))
    raise ValueError(f'{aid}: no image inside')


def mesh(kit, aid):
    p = os.path.join(kit, f'{aid}.mesh.json')
    if not os.path.exists(p):
        P, N, U, F = rbx.read_mesh(get(AD.format(aid)))
        json.dump({'P': [[round(c, 5) for c in v] for v in P], 'N': [[round(c, 4) for c in v] for v in N],
                   'U': [[round(c, 5) for c in v] for v in U], 'F': [list(f) for f in F]}, open(p, 'w'), separators=(',', ':'))
    return os.path.basename(p)


def body(kit, aid, folder='R15ArtistIntent'):
    m = rbx.read_model(open(asset(kit, aid, 'rbxm'), 'rb').read()); out = []
    for o in m.values():
        if o['class'] != 'Folder' or o['props'].get('Name') != folder: continue
        for c in o['children']:
            mp = m[c]; pr = mp['props']
            if mp['class'] != 'MeshPart': continue
            att = {m[a]['props']['Name']: m[a]['props']['CFrame'][0] for a in mp['children'] if m[a]['class'] == 'Attachment'}
            out.append({'name': pr['Name'], 'mesh': mesh(kit, rbx.asset_id(pr['MeshId'])), 'cf': pr['CFrame'], 'size': pr['size'], 'att': att,
                        'texture': image(kit, rbx.asset_id(pr['TextureID'])) if rbx.asset_id(pr.get('TextureID')) else None})
    return out


def accessory(kit, aid):
    """Rigid accessory: handle mesh (SpecialMesh or MeshPart), texture, and the handle attachment's full CFrame (rotation matters)."""
    m = rbx.read_model(open(asset(kit, aid, 'rbxm'), 'rb').read())
    acc = next(o for o in m.values() if o['class'] == 'Accessory'); h = next(m[c] for c in acc['children'] if m[c]['class'] in ('Part', 'MeshPart'))
    sm = next((m[c]['props'] for c in h['children'] if m[c]['class'] == 'SpecialMesh'), None)
    att = next(m[c]['props'] for c in h['children'] if m[c]['class'] == 'Attachment')
    src = sm or h['props']; tex = rbx.asset_id(src.get('TextureId') or src.get('TextureID'))
    return {'name': acc['props']['Name'], 'mesh': mesh(kit, rbx.asset_id(src['MeshId'])), 'texture': image(kit, tex) if tex else None,
            'meshpart': sm is None, 'size': h['props'].get('size'), 'scale': (sm or {}).get('Scale', (1, 1, 1)), 'offset': (sm or {}).get('Offset', (0, 0, 0)),
            'attachment': att['Name'], 'att_cf': att['CFrame'][0], 'att_rot': att['CFrame'][1]}


def post(url, obj):
    req = urllib.request.Request(url, data=json.dumps(obj).encode(), headers={**UA, 'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r: return r.read()


LAYERED = ('ShirtAccessory', 'PantsAccessory', 'JacketAccessory', 'SweaterAccessory', 'ShortsAccessory', 'TShirtAccessory',
           'DressSkirtAccessory', 'LeftShoeAccessory', 'RightShoeAccessory', 'EyebrowAccessory', 'EyelashAccessory')


def user(kit, name):
    """What a user's avatar wears right now (public APIs: users + avatar) -> kit fields; the raw answer stays in KIT/avatar.json."""
    uid = json.loads(post('https://users.roblox.com/v1/usernames/users', {'usernames': [name], 'excludeBannedUsers': False}))['data'][0]['id']
    a = json.loads(get(f'https://avatar.roblox.com/v1/users/{uid}/avatar')); json.dump(a, open(os.path.join(kit, 'avatar.json'), 'w'), indent=1)
    out = {'rig': a.get('playerAvatarType', 'R15'), 'colors': a.get('bodyColor3s') or {}, 'scales': a.get('scales'), 'headless': False,
           'parts': [], 'accessories': [], 'shirt': None, 'pants': None, 'tshirt': None, 'face': None, 'skipped': [], 'ids': []}
    for x in a['assets']:
        t, aid = x['assetType']['name'], x['id']; out['ids'].append(aid)
        if t in ('Torso', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg') and out['rig'] == 'R15': out['parts'] += body(kit, aid)
        elif t in ('Head', 'DynamicHead') and 'headless' in x['name'].lower(): out['headless'] = True
        elif t in LAYERED: out['skipped'].append(f"{x['name']} ({t}: layered clothing)")
        elif t.endswith('Accessory') or t == 'Hat': out['accessories'].append(accessory(kit, aid))
        elif t == 'Shirt': out['shirt'] = image(kit, aid)
        elif t == 'Pants': out['pants'] = image(kit, aid)
        elif t == 'TShirt': out['tshirt'] = image(kit, aid)
        elif t == 'Face': out['face'] = image(kit, aid)
        elif t not in ('Animation', 'EmoteAnimation', 'ClimbAnimation', 'FallAnimation', 'IdleAnimation', 'JumpAnimation', 'RunAnimation', 'SwimAnimation', 'WalkAnimation', 'MoodAnimation'):
            out['skipped'].append(f"{x['name']} ({t})")
    return out


def refs(kit, ids):
    os.makedirs(os.path.join(kit, 'refs'), exist_ok=True)
    d = json.loads(get('https://thumbnails.roblox.com/v1/assets?assetIds={}&size=420x420&format=Png'.format(','.join(map(str, ids)))))
    for t in d['data']:
        if t.get('imageUrl'): open(os.path.join(kit, 'refs', f"{t['targetId']}.png"), 'wb').write(get(t['imageUrl']))


if __name__ == '__main__':
    a = sys.argv; kit = a[1]; os.makedirs(kit, exist_ok=True)
    arg = lambda k: [int(x) for x in a[a.index(k) + 1].split(',')] if k in a else []
    if '--user' in a:
        out = user(kit, a[a.index('--user') + 1]); ids = out.pop('ids')
    else:
        out = {'rig': 'R15', 'parts': [p for b in arg('--body') for p in body(kit, b)], 'accessories': [accessory(kit, h) for h in arg('--hair')],
               'shirt': image(kit, arg('--shirt')[0]) if arg('--shirt') else None, 'pants': image(kit, arg('--pants')[0]) if arg('--pants') else None,
               'face': image(kit, arg('--face')[0]) if arg('--face') else None}
        ids = arg('--hair') + arg('--shirt') + arg('--pants')
    refs(kit, ids)
    json.dump(out, open(os.path.join(kit, 'kit.json'), 'w'), indent=1)
    print(out['rig'], len(out['parts']), 'parts | accessories:', [x['name'] for x in out['accessories']], '| headless' if out.get('headless') else '',
          '| skipped:', out.get('skipped') or 'none')
