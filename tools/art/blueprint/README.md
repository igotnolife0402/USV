---
summary: Blueprint PNGs: project layout + one per domain (model, vfx, animation) with every step, basics, gates and files; render.cjs makes them.
updated: 2026-11-27
status: current
---
# blueprint

The standard structure every project follows: root layout, src/ per project type, rules, lifecycle, README header.

- Project layout: `blueprint.html`. Domain sheets: one shared layout `sheet.html?s=<key>`, content in `sheets.js` (steps = [name, do, out, gate]).
- New domain sheet: add a key to `SHEETS` in sheets.js and to `PAGES` in render.cjs; facts come from that domain's playbook/pipeline (change the note first).
- Render: `node tools/art/blueprint/render.cjs [layout model vfx animation]` → `tools/art/blueprint/out/<name>-blueprint.png` (3840x2400, gitignored).
- Check: the render exits 1 on any page error or any panel whose text overflows its box; PASS = clean.
