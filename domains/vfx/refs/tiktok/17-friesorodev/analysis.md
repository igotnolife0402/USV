---
summary: Ref 17: Roblox rideable lava-shark pet from one prompt; multi-angle turnaround sheet, then a Claude prompt with animation + idle notes
updated: 2026-11-25
status: current
---
# 17 · "Tutorial on how to make pets like me" (Roblox mount pet)
48.9 s · 146/488 kept (screen recording: long static stretches dropped) · 16 caption cues → `sheets_cues/`. On-screen UI text is too small at sheet size; the steps come from the captions.

## Result shown (0.0-4.5 s)
Rideable shark mount in a Roblox pet game: voxel-dense body, dark navy #1a1a5a with magenta/red #e0206a stripes, red spines and fins, glowing orange #ff8a20 eyes, big white teeth, swims through the air with a snake-like S-wave (1.9-2.3 s, top view). The UI shows "DISMOUNT", coins, a plot marker.

## The workflow (captions, timed)
1. 5.2 s: find a reference image (they browse a gallery of shark art).
2. 7.9-12.2 s: ask an image AI for "this animal from many angles" → a turnaround sheet (front, side, top, back, 3/4, close-ups) in one image (14.7-30.4 s shows the sheet).
3. 14.7 s: give the sheet to Claude.
4. 17.1-33.1 s: have it write the build prompt, including: the animation type ("shark snake-like"), the idle animations, and the model quality.
5. 35.1-40.5 s: the prompt it gave back (long; "tell it to shorten it").
6. 41.7 s: paste that prompt + the turnaround image into Claude → the model.

## What we take
- A turnaround sheet (front/side/top/back) gives far better 3D results than one picture: it fixes proportions on every axis. Our 3D route should ask for or make one first (Umbrio can render our own angle sheets; owner rule: no outside AI generators unless named).
- Every creature prompt should name: the motion style (e.g. S-wave swim, amplitude and speed), 2-3 idle animations, the colour bands, and the quality target.
- Swim animation recipe: body as 6-10 segments, each rotated by sin(t·2.5 + i·0.6) × 12° about the up axis, tail segments amplified ×1.5; fins flap at 2× body frequency.

## Not verified
- Exact prompt text (unreadable at this size; zoom frames 35-38 s if needed); whether Claude or Studio built the mesh.
