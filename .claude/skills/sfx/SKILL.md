---
name: sfx
description: 'Use for sound effects, game audio, procedural SFX, jsfxr/bfxr style sounds, WebAudio, hit/jump/coin/explosion/UI sounds or WAV export. Code-generated first: params JSON → AudioBuffer → WAV, with loudness consistency. On PC any connected audio tool is allowed after that.'
---
# sfx — procedural SFX (params JSON → AudioBuffer → WAV)

Order: generate in code first (zero assets, instant, tweakable). On PC, a connected audio MCP/tool may be used only if code can't reach the sound (voice, realistic foley, music).

## Params JSON (one schema for everything)
```json
{ "name":"coin", "wave":"square", "dur":0.18, "attack":0.002, "decay":0.04, "sustain":0.5, "release":0.12,
  "freq":880, "freqEnd":1760, "slideCurve":"exp", "vibratoDepth":0, "vibratoHz":0,
  "noise":0, "lpf":12000, "lpfEnd":0, "hpf":40, "arp":[1,1.5], "arpAt":0.06, "gain":0.8 }
```
`wave`: sine | square | saw | triangle | noise. `noise` 0-1 mixes white noise in. `arp` = frequency multipliers switched at `arpAt` seconds.

## Category presets (start here, then tweak)
| Category | wave | dur | freq → freqEnd | extras |
|---|---|---|---|---|
| hit | noise+square (noise 0.6) | 0.12 | 300 → 80 | lpf 3000, attack 0, decay fast |
| jump | square | 0.25 | 220 → 660 (exp) | slight vibrato 6 Hz depth 0.02 |
| coin | square | 0.18 | 880, arp [1, 1.5] at 0.06 | release 0.12 |
| explosion | noise (1.0) | 0.9 | 120 → 30 | lpf sweep 4000 → 300, long release |
| laser | saw | 0.2 | 1400 → 200 | hpf 200 |
| powerup | triangle | 0.5 | 300 → 1200, arp [1,1.25,1.5,2] | vibrato 8 Hz |
| ui click | sine | 0.04 | 1200 → 900 | attack 0.001 |
| ui confirm | triangle | 0.12 | 660, arp [1, 1.5] at 0.05 | |
| ui error | square | 0.2 | 200 → 150 | two pulses |
| hurt | saw+noise 0.3 | 0.2 | 500 → 150 | lpf 2500 |

## Renderer (OfflineAudioContext → AudioBuffer)
```js
export async function render(p, sr = 44100){
  const len = Math.ceil((p.dur + p.release) * sr), ctx = new OfflineAudioContext(1, len, sr), t0 = 0;
  const env = ctx.createGain(), out = ctx.createGain(); out.gain.value = p.gain ?? 0.8;
  let src;
  if (p.wave === 'noise') { const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random()*2-1; src = ctx.createBufferSource(); src.buffer = b; }
  else { src = ctx.createOscillator(); src.type = p.wave === 'saw' ? 'sawtooth' : p.wave;
    src.frequency.setValueAtTime(p.freq, t0);
    if (p.freqEnd) src.frequency[p.slideCurve === 'lin' ? 'linearRampToValueAtTime' : 'exponentialRampToValueAtTime'](Math.max(1, p.freqEnd), p.dur);
    (p.arp || []).forEach((m, i) => i && src.frequency.setValueAtTime(p.freq * m, (p.arpAt || 0.05) * i));
    if (p.vibratoDepth) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = p.vibratoHz; lg.gain.value = p.freq * p.vibratoDepth; l.connect(lg).connect(src.frequency); l.start(); } }
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.lpf ?? 12000;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = p.hpf ?? 40;
  const a = p.attack ?? 0.005, d = p.decay ?? 0.05, s = p.sustain ?? 0.6, r = p.release ?? 0.1;
  env.gain.setValueAtTime(0, 0); env.gain.linearRampToValueAtTime(1, a);
  env.gain.linearRampToValueAtTime(s, a + d); env.gain.setValueAtTime(s, p.dur); env.gain.linearRampToValueAtTime(0, p.dur + r);
  src.connect(hp).connect(lp).connect(env).connect(out).connect(ctx.destination);
  if (p.noise && p.wave !== 'noise') {              // mix white noise into the tonal source
    const b = ctx.createBuffer(1, len, sr), nd = b.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random()*2-1;
    const ns = ctx.createBufferSource(), ng = ctx.createGain(); ns.buffer = b; ng.gain.value = p.noise;
    ns.connect(ng).connect(hp); ns.start(0); }
  if (p.lpfEnd) lp.frequency.setValueAtTime(p.lpf ?? 12000, 0), lp.frequency.exponentialRampToValueAtTime(p.lpfEnd, p.dur);   // explosion sweep
  src.start(0); src.stop(p.dur + r);
  return normalize(await ctx.startRendering(), -1);   // peak -1 dBFS
}
export function normalize(buf, peakDb){
  const d = buf.getChannelData(0); let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  const k = m ? 10 ** (peakDb / 20) / m : 1;
  for (let i = 0; i < d.length; i++) d[i] *= k;
  return buf;
}
```
Explosion preset: `"lpf":4000, "lpfEnd":300`.

## Loudness consistency
- `normalize(buf, peakDb)`: scale so max |sample| = 10^(peakDb/20). Then category trims (RMS-based feel): ui -12 dB, coin/jump -6 dB, hit -3 dB, explosion 0 dB relative.
- Quick RMS check: `rms = sqrt(mean(x²))`; keep same-category sounds within ±2 dB RMS.
- No clicks: always attack >= 1 ms and release to 0. No DC: hpf >= 20 Hz.
- Variation at runtime: random pitch ±5% (`playbackRate`) and gain ±1 dB so repeats don't fatigue.

## WAV export (16-bit PCM mono)
```js
export function toWav(buf){
  const d = buf.getChannelData(0), sr = buf.sampleRate, b = new ArrayBuffer(44 + d.length*2), v = new DataView(b);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0,'RIFF'); v.setUint32(4, 36 + d.length*2, true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true);
  v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true);
  v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40, d.length*2, true);
  for (let i = 0; i < d.length; i++) v.setInt16(44 + i*2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true);
  return new Blob([b], { type: 'audio/wav' });
}
```
Download: `a.href = URL.createObjectURL(toWav(buf)); a.download = p.name + '.wav'`.

## Runtime playback (games)
Render all presets once at load into a `Map<name, AudioBuffer>`; `play(name)` = new `AudioBufferSourceNode` → shared master `GainNode` → destination. Create/resume the `AudioContext` on first user gesture. Roblox: export WAVs, owner uploads as audio assets (or use stock sounds); `SoundService` + `Sound:Play()` client-side.

## Verification (one check)
Render every category, play each once (PC: browser page or Artifact), confirm: no clicks, peaks <= -1 dBFS, same-category RMS within ±2 dB, WAV opens (non-zero length, correct duration).

## Done-check (`checklists/audio.md`)
- [ ] Params JSON per sound saved with the code.
- [ ] Normalized + category trims; no clicks/DC.
- [ ] WAV export works; runtime pitch/gain variation in games.

## Time target
Set of 5 game SFX < 5 min (presets + tweak + export).

## Mobile
Build an HTML Artifact: preset buttons, sliders bound to the params JSON, play + "Download WAV". Save params JSON + renderer in the repo. Queue only if assets must be uploaded or placed in Studio: `- [ ] YYYY-MM-DD upload <name>.wav to Roblox / copy into <project>/assets — mobile SFX`.
