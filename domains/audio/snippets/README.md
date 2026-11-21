# Audio snippets

Belongs here: WebAudio synth functions, preset tables, encoders (WAV), sequencers, mixer/compressor setups.
Naming: `<what>.<ext>` (e.g. `sfx-synth.js`, `wav-encode.js`, `presets.js`). Dependency-free, works in Artifacts and OfflineAudioContext.

## Preset synth (runtime or offline context)
```js
let noise;
export function play(p, ctx, out = ctx.destination, t = ctx.currentTime) {
  const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.frequency.value = p.lowpass ?? 20000;
  let src;
  if (p.wave === 'noise') {
    if (!noise || noise.sampleRate !== ctx.sampleRate) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
  } else {
    src = ctx.createOscillator(); src.type = p.wave;
    const v = 1 + (Math.random() - 0.5) * 0.1; // ±5% pitch variance
    src.frequency.setValueAtTime(p.freq * v, t);
    if (p.freqEnd) src.frequency.exponentialRampToValueAtTime(p.freqEnd * v, t + (p.slideTime ?? p.decay));
  }
  const end = t + p.attack + p.decay;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p.volume, t + p.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(f).connect(g).connect(out); src.start(t); src.stop(end + 0.02);
}
export const PRESETS = { coin: { wave: 'square', freq: 900, freqEnd: 1400, slideTime: 0.06, attack: 0.002, decay: 0.15, volume: 0.3 },
  explosion: { wave: 'noise', lowpass: 1200, attack: 0.005, decay: 0.8, volume: 0.6 } };
```

## AudioBuffer → 16-bit WAV Blob
```js
export function toWav(buf) {
  const ch = buf.getChannelData(0), n = ch.length, dv = new DataView(new ArrayBuffer(44 + n * 2));
  const s = (o, str) => [...str].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); s(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, ch[i])); dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
  return new Blob([dv], { type: 'audio/wav' });
}
```

## Offline render + unlock on gesture
```js
async function renderPreset(p) {
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * (p.attack + p.decay + 0.05)), 44100);
  play(p, ctx); return toWav(await ctx.startRendering());
}
let ac; addEventListener('pointerdown', () => { ac ??= new AudioContext({ latencyHint: 'interactive' }); ac.resume(); }, { once: true });
```
