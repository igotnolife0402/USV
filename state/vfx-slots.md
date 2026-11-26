---
summary: Task state for the vfx generator slot upgrade (parallel slots, exact duration, 60 s cap, Opus 5.5 medium)
updated: 2026-11-25
status: superseded
superseded_by: profiles/tools.md
---
# vfx-slots
- File: tools/vfx/showcase/generator.html (+ new lib/ugen-worker.js, ugen.js untouched).
- Slot: {id, prompt, dur(ms int), set{style,hue,intensity,camera,loop,seed,lock,bg}, status, ctrl, spec, P{S,B,res}, timing{model,draw,total,calls[]}}.
- Model: sample opts {model:'claude-opus-5-5', modelTier:'complex', effort:'medium'}; res.modelApplied shown (supported in sample.d.ts 0.2.99).
- cache: sample `cache` is a 5-min answer replay, not prompt caching -> stays false.
- Exact length: fitDuration scales clip.warp clip-time axis to target ms (story time untouched), clip.len = ms/1000.
- Hook: vfxgen.seek/payoff/spec kept; + slot(i), slots, clipLen(), fxVisible(), timings.
- Verify: Playwright on the hub page, mocked sample (real model time not measurable headless).
- Done 2026-11-25: hub v60 (runtime 0.2.99). Headless mocked check: 3 calls 0.6 ms apart, clipLen 1.234/3/7.5 exact, 0 fx at len, 38.9 s wall (1 slot 15.0 s).
