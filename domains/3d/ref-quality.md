---
summary: Owner reference quality bar (9 real desk-setup photos) as 8 build rules for every realistic model, with values to copy
updated: 2026-11-22
status: current
---
# Reference quality bar (owner photos 2026-11-22)

The owner sent 9 real desk-setup photos as the target for ALL future builds. Template that meets it: `tools/3d/props/setup.py` (+ `setup_desk/screen/tower.py`).

## What makes the references look real (apply to every model)
1. **Real silhouettes, not boxes**: every visible slab has rounded or bevelled edges (`P.rbox` r 3-12 mm, `P.slab`); thin things are thin (monitor shell 12 mm, bezel 5 mm, mat 4 mm).
2. **Assemblies, not blocks**: things are built the way they are made: standing desk = 2 two-stage columns + feet + caps + rails + crossbar + control panel; monitor = base + neck + rear housing + shell + panel; speaker = box + 2 drivers.
3. **Contact, no gaps**: everything rests on or sinks 1-5 mm into what holds it (riser on desk, monitor on riser, keyboard on mat). Floating or 2 mm-short parts read as fake.
4. **Warm, limited palette**: light oak or walnut wood + black or white metal + one accent (sage keycaps, cyan RGB). Never all-black; never more than one accent colour.
5. **Material contrast**: wood grain (`planks`/`woodgrain`), felt (`fabric`), brushed alu, matte plastic (`noise`), tinted glass (transparency 0.4). Every part textured except glass.
6. **Light sources glow softly**: screens show an image-like `gradient` (sunset/sky) with emissive 0.3-0.4; RGB fan rings emissive 0.9 in one colour. One glow family, not a rainbow (owner: no overkill).
7. **Lived-in props the object type always has**: desk setups = monitor riser, desk mat, wrist rest, speakers, plant. Only add props that belong to the asked object; no room, wall or floor (scope rule).
8. **Real proportions**: desk 1.40 x 0.70 x 0.76 m, top 40 mm, 27 in monitor 0.615 x 0.36 m, keyboard 75 % 0.33 x 0.125 m, tower 0.21 x 0.45 x 0.45 m.

## Gate before upload
- Zoom the `--preview` PNG (PIL crop x2) and check each of points 1-6; fix before writing to Umbrio.
- Then the usual: detail, attach, zfight, live stages, read back ([umbrio-build.md](umbrio-build.md)).
