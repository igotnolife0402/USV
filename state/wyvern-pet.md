---
summary: Task state for the 50-stud wyvern pet showcase loop (Roblox client + three.js preview)
updated: 2026-11-24
status: current
---
# wyvern-pet
- Folder: tools/roblox/wyvern (own Rojo project). One spec: spec.mjs -> motion.mjs bakes path/frames/channels -> gen-luau.mjs writes src/shared/WyvernBake.luau; geo.mjs -> export-glb.mjs (Wyvern.glb, not committed) + preview.
- Decision: own JS mesh generator (smooth swept tubes, hex-scale texture) instead of beast/rig.py (block painted).
- Decision: body = rigid segments placed by chord on a closed arc-length path (follow-the-leader); tricks are path shape + s-based roll.
- Open: Studio import + playtest (PC queue).
