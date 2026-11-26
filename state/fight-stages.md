---
summary: State for the stage-by-stage fight build (new fight, 6 rendered stages)
updated: 2026-11-24
status: current
---
# fight-stages
Goal: new fight (not the supernova duel) rendered at every stage: 1 blocking, 2 splines, 3 impact frames, 4 camera+cine, 5 lighting, 6 vfx.
Assumption: reuse the Kaito/Ren rig models; choreography, timing, camera, light, fx all new.
Files: tools/3d/avatar/duel/stages/{build.py,finish.mjs,README.md}
Status: done 2026-11-24 (s1-s6 rendered, preview artifact "Crossing Build Stages")
- Gate PASS (4 contacts); lint s2 6, s6 6 (from 10): all Ren wrist flip at ground smash 2.75; fix = hand-rot regulariser in pose() (L-161).
