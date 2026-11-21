# zfight

The z-fight gate (owner, permanent): no studio build goes live, or is called finished, until `check` passes. One file,
Python 3 + numpy.

Why: phones resolve depth far more coarsely than desktops, so surfaces that face the same way and overlap flicker
there even when they are 4-12 cm apart (stair carpet on stone, rugs on floors, trim on walls, glass in frames).
A desktop render looking clean proves nothing.

## Steps
1. Read the tab back (project doc + every `geo` doc it references) into `project.json` and `geo/`.
2. `python3 zfight.py check project.json geo/`: prints level overlaps (< 1.5 cm) and layered ones (< 12 cm) in m2
   and the worst doc pairs; exit 1 over 0.5 m2.
3. On FAIL: `python3 zfight.py fix project.json geo/ out/` (a few minutes for 300k faces). It separates level
   overlaps (the smaller connected piece moves 1.5 cm out) and cuts away every face part covered by a same-facing face
   less than 12 cm in front (big covers first; shredded faces dropped when mostly hidden). Mirrored copies of one doc
   first get one doc per object (`out/project-patch.json` repoints them) so each copy is cut on its own. It runs
   `check` again (up to 3 rounds), merges duplicate vertices, splits docs over 220 KB into extra objects, and writes
   `out/geo/` plus `out/project-patch.json` (full objects to write). Each face may become at most 1 piece per m2
   (no sliver storms). The cathedral (330k faces): 3,027 m2 of fighting overlap -> 3 m2, 8 min, under 1 GB RAM.
4. Upload the fixed docs under NEW geo ids (geometry is immutable: the page caches by id), point the objects at them in
   the same write, delete the old docs, then read the tab back and run `check` on that read-back, never on local files.

## Build rules that keep it passing
- Never stack a decal, rug, runner, trim, panel or glass on a surface: make it one plane (inlay) or cut the surface
  under it. Floors: boards and tiles edge to edge, their base 10 cm under them with no top face.
- Shots check on phone-grade depth: `SHOTS_DEPTH16=1 SHOTS_NEAR=0.1 node test/run.mjs shots` (studio) writes
  `shots/d16.jpg` rendered through a 16-bit depth buffer.
