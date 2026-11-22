// Procedural game SFX -> 16-bit mono WAV. Usage: node tools/audio/sfx.mjs OUT [name...]  (no deps)
// Each preset = layers of {wave, f0->f1 Hz sweep, attack/decay s, gain, noise}. Peak-normalised to -1 dBFS.
import { writeFileSync, mkdirSync } from 'node:fs'
const SR = 44100
const P = {
  Coin:      [{ w: 'sq', f: [988, 988], t: [0, 0.07], a: 0.002, d: 0.07, g: 0.5 }, { w: 'sq', f: [1319, 1319], t: [0.07, 0.3], a: 0.002, d: 0.23, g: 0.5 }],
  Button:    [{ w: 'tri', f: [660, 1320], t: [0, 0.12], a: 0.002, d: 0.12, g: 0.8 }, { w: 'sin', f: [1980, 1980], t: [0.06, 0.25], a: 0.002, d: 0.19, g: 0.3 }],
  Finish:    [0, 0.09, 0.18, 0.27].map((s, i) => ({ w: 'sq', f: [[523, 659, 784, 1047][i], [523, 659, 784, 1047][i]], t: [s, s + (i === 3 ? 0.6 : 0.12)], a: 0.003, d: i === 3 ? 0.55 : 0.11, g: 0.4 })),
  Hit:       [{ w: 'noise', f: [0, 0], t: [0, 0.18], a: 0.001, d: 0.17, g: 0.9, lp: 0.35 }, { w: 'sin', f: [180, 60], t: [0, 0.2], a: 0.001, d: 0.19, g: 0.9 }],
  Jump:      [{ w: 'sq', f: [220, 880], t: [0, 0.22], a: 0.003, d: 0.2, g: 0.45 }],
  Tick:      [{ w: 'sin', f: [880, 880], t: [0, 0.09], a: 0.001, d: 0.08, g: 0.8 }],
  Go:        [{ w: 'sq', f: [1047, 1047], t: [0, 0.45], a: 0.002, d: 0.43, g: 0.45 }, { w: 'sq', f: [1568, 1568], t: [0, 0.45], a: 0.002, d: 0.43, g: 0.25 }],
  Eliminate: [{ w: 'saw', f: [440, 110], t: [0, 0.7], a: 0.005, d: 0.68, g: 0.5 }, { w: 'noise', f: [0, 0], t: [0, 0.5], a: 0.01, d: 0.48, g: 0.25, lp: 0.15 }],
  Win:       [0, 0.12, 0.24, 0.36, 0.5].map((s, i) => ({ w: 'tri', f: [[523, 659, 784, 1047, 1319][i], [523, 659, 784, 1047, 1319][i]], t: [s, s + (i === 4 ? 1.0 : 0.16)], a: 0.004, d: i === 4 ? 0.95 : 0.15, g: 0.6 })),
  Whoosh:    [{ w: 'noise', f: [0, 0], t: [0, 0.4], a: 0.15, d: 0.25, g: 0.8, lp: 0.08, lp1: 0.4 }],
}
function render(layers) {
  const len = Math.ceil(Math.max(...layers.map(l => l.t[1])) * SR) + 64
  const out = new Float32Array(len)
  let seed = 7
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1
  for (const l of layers) {
    const n0 = Math.floor(l.t[0] * SR), n = Math.floor((l.t[1] - l.t[0]) * SR)
    let ph = 0, y = 0
    for (let i = 0; i < n; i++) {
      const u = i / n, t = i / SR, f = l.f[0] * (l.f[1] / Math.max(l.f[0], 1)) ** u || 0
      ph += f / SR
      const p = ph % 1
      let s = l.w === 'sin' ? Math.sin(2 * Math.PI * p) : l.w === 'sq' ? (p < 0.5 ? 1 : -1) : l.w === 'tri' ? 4 * Math.abs(p - 0.5) - 1 : l.w === 'saw' ? 2 * p - 1 : rnd()
      if (l.lp) { const k = l.lp1 ? l.lp + (l.lp1 - l.lp) * Math.sin(Math.PI * u) : l.lp; y += k * (s - y); s = y }
      const env = Math.min(1, t / l.a) * Math.max(0, 1 - Math.max(0, t - l.a) / l.d)
      out[n0 + i] += s * env * l.g
    }
  }
  let pk = 0
  for (const v of out) pk = Math.max(pk, Math.abs(v))
  const g = 0.89 / (pk || 1), b = Buffer.alloc(44 + len * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + len * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(len * 2, 40)
  for (let i = 0; i < len; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * g)) * 32767), 44 + i * 2)
  return { b, sec: len / SR, pk }
}
const [out, ...names] = process.argv.slice(2)
if (!out) { console.log('usage: node tools/audio/sfx.mjs OUT [' + Object.keys(P).join(' ') + ']'); process.exit(1) }
mkdirSync(out, { recursive: true })
for (const name of names.length ? names : Object.keys(P)) {
  const r = render(P[name])
  if (!(r.pk > 0) || r.sec > 2) throw new Error(name + ': silent or too long')
  writeFileSync(`${out}/${name}.wav`, r.b)
  console.log(name, r.sec.toFixed(2) + 's', (r.b.length / 1024).toFixed(0) + 'KB')
}
