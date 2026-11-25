---
summary: Frost Comet showcase: written spec per generator sheet (owner 2026-11-25: spec before code, result checked against it)
updated: 2026-11-25
status: current
---
# Frost Comet: sheet specs (cell 160 px, centre 0,0, +y = down; 16 frames, t = 0..1; ugen erodes everything after t 0.55)
Story: air freezes high up → ice comet falls → impact at T → comet core freezes into one ice crystal → frost cracks spread
→ crystal shatters into glitter → frost mist rises and fades. Every layer answers "what causes this?".

## fc-gather (anticipation: air freezing around the sky point)
- f0: 22 faint short streaks on a ring r ≈ 67 px (42 %), value 0.5, centre dot r 2.
- peak t 0.85: streaks pulled to r ≈ 8 px, spiralled +1.2 rad; centre dot r 10, value 1.
- last: one bright centre glow, ring gone, erosion breaks it into specks.
- Motion: inward spiral only. Stroke 0.3 → 2.6 px. NOT: outward burst, rings, beams, default outward motes (motes off).
- Ramp ice (#04122e #0a3a7a #2a8ce0 #6ae4ff #d6f8ff #fff), texture noise 0.35.
## fc-trail (comet tail; the 3D ice head carries the core; played with life 2.4 s, cut at 1.2 s so erosion never shows)
- f0..peak: 5 thin fanned streaks from head (0,+35) up to (0,-70), centre 2.6 px, sides 1.1 px, tapering; 8 ice chips stream up; head disc r 8.
- Whole sheet stays the same shape (falling object, camera-facing), only shimmer. Head disc r 11 at (0, 35).
- NOT: flame tongues, flicker > ±5 px, diagonal motion inside the cell. Ramp ice, texture streaks 0.4.
## fc-shock (flat ground ring: impact pressure)
- f0: ring r ≈ 10 px, thick 2.6 px (radius starts 30 %). peak t 0.1: ring r ≈ 40 px, brightest. last: ring r 72 px (45 %), thin 0.4 px, eroded.
- Second ring 0.08 later at 75 % radius, half thickness. 16 frost ticks (6 px, radial) ride the outer ring.
- NOT: polygon, vertical rise, filled disc. Ramp ice, texture cells 0.45.
## fc-glitter (ice fragments thrown up then falling)
- 18 short streaks (7 % of life) launched upward ±75°, gravity pulls them down; streak length ≤ 12 % of cell; plus default motes.
- NOT: flames, long rays. Ramp glint (#0a3a7a #6ae4ff #d6f8ff #fff), texture noise 0.3.
## fc-cracks (flat decal: frost spreading through frozen ground)
- f0: empty-ish + nothing. peak t 0.3: 7 thin jagged cracks from r 22 px (crystal base covers the centre; no centre blob) to 50-100 % of 64 px, one side branch each.
- last: cracks hold, erosion melts them. Stroke 1.4 → 0.3 px taper (thin: ugen glow fattens lines). NOT: lightning glow, beams. Ramp ice, cells 0.5.
## fc-mist (cold air pooling and lifting; normal blend)
- 9 soft puffs growing from centre to 55 % R, drifting up 18 px by the end; erosion = mist thinning.
- NOT: black smoke, accent colour except at edges. Ramp mist (#04122e #1a2a5a #6a6ac8 #b8a8ff #d6f8ff), noise 0.5.
