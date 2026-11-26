// Writes out/Wyvern.glb (one mesh node per part, straight rest pose, studs) + texture PNGs + out/parts.json.
// Usage: node export-glb.mjs [outDir]   (no deps; ~2 s)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build, ANCHOR_REST } from './geo.mjs';
import { scales, membrane } from './texture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, 'out'));
fs.mkdirSync(out, { recursive: true });

// --- PNG (RGBA8) ---
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function png(W, H, rgba) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const sc = scales(), mem = membrane();
const pngs = { scales: png(sc.W, sc.H, sc.color), scalesN: png(sc.W, sc.H, sc.normal), membrane: png(mem.W, mem.H, mem.color) };
fs.writeFileSync(path.join(out, 'WyvernScales.png'), pngs.scales);
fs.writeFileSync(path.join(out, 'WyvernScales_N.png'), pngs.scalesN);
fs.writeFileSync(path.join(out, 'WyvernMembrane.png'), pngs.membrane);

// --- glTF ---
const parts = build();
const restOf = (p) => [0, 0, ANCHOR_REST[p.anchor]];
const bin = [], views = [], accessors = [];
let off = 0;
const pushView = (buf, target) => {
  const pad = (4 - (buf.length % 4)) % 4; bin.push(buf, Buffer.alloc(pad));
  views.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) }); off += buf.length + pad; return views.length - 1;
};
const acc = (arr, type, comp, target, minmax) => {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), view = pushView(buf, target);
  const n = { VEC3: 3, VEC2: 2, SCALAR: 1 }[type];
  accessors.push({ bufferView: view, componentType: comp, count: arr.length / n, type, ...(minmax || {}) }); return accessors.length - 1;
};
const imgView = Object.fromEntries(Object.entries(pngs).map(([k, b]) => [k, pushView(b)]));
const MAT = { scales: 0, membrane: 1, eye: 2 };
const meshes = [], nodes = [{ name: 'Wyvern', children: [] }];
for (const p of parts) {
  const P = new Float32Array(p.pos.length * 3), N = new Float32Array(p.pos.length * 3), T = new Float32Array(p.pos.length * 2);
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  p.pos.forEach((q, i) => { for (let k = 0; k < 3; k++) { const v = q[k] - p.center[k]; P[i * 3 + k] = v; lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); N[i * 3 + k] = p.nrm[i][k]; } T[i * 2] = p.uv[i][0]; T[i * 2 + 1] = p.uv[i][1]; });
  const I = new Uint32Array(p.idx);
  const prim = { attributes: { POSITION: acc(P, 'VEC3', 5126, 34962, { min: lo, max: hi }), NORMAL: acc(N, 'VEC3', 5126, 34962), TEXCOORD_0: acc(T, 'VEC2', 5126, 34962) }, indices: acc(I, 'SCALAR', 5125, 34963), material: MAT[p.mat] };
  meshes.push({ name: p.name, primitives: [prim] });
  const r = restOf(p);
  nodes.push({ name: p.name, mesh: meshes.length - 1, translation: [r[0] + p.center[0], r[1] + p.center[1], r[2] + p.center[2]] });
  nodes[0].children.push(nodes.length - 1);
}
const binBuf = Buffer.concat(bin);
const gltf = {
  asset: { version: '2.0', generator: 'usv wyvern export-glb.mjs' }, scene: 0, scenes: [{ name: 'Wyvern', nodes: [0] }], nodes, meshes,
  materials: [
    { name: 'WyvernScales', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0.05, roughnessFactor: 0.62 }, normalTexture: { index: 1 } },
    { name: 'WyvernMembrane', pbrMetallicRoughness: { baseColorTexture: { index: 2 }, metallicFactor: 0, roughnessFactor: 0.8 }, alphaMode: 'BLEND', doubleSided: true },
    { name: 'WyvernEye', pbrMetallicRoughness: { baseColorFactor: [0.5, 0.96, 1, 1], metallicFactor: 0, roughnessFactor: 0.3 }, emissiveFactor: [0.5, 0.96, 1] },
  ],
  textures: [{ source: 0, sampler: 0 }, { source: 1, sampler: 0 }, { source: 2, sampler: 0 }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  images: [{ bufferView: imgView.scales, mimeType: 'image/png' }, { bufferView: imgView.scalesN, mimeType: 'image/png' }, { bufferView: imgView.membrane, mimeType: 'image/png' }],
  accessors, bufferViews: views, buffers: [{ byteLength: binBuf.length }],
};
let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + binBuf.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(path.join(out, 'Wyvern.glb'), Buffer.concat([head, ch(json.length, 0x4e4f534a), json, ch(binBuf.length, 0x004e4942), binBuf]));
fs.writeFileSync(path.join(out, 'parts.json'), JSON.stringify(parts.map((p) => ({ name: p.name, anchor: p.anchor, mat: p.mat, tris: p.tris, center: p.center, size: p.size }))));
console.log(`Wyvern.glb ${(fs.statSync(path.join(out, 'Wyvern.glb')).size / 1024).toFixed(0)} KB, ${parts.length} parts, ${parts.reduce((a, p) => a + p.tris, 0)} tris -> ${out}`);
