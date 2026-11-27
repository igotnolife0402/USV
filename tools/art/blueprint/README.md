---
summary: Standard project layout blueprint (PNG) for every build; HTML is the single source, render.cjs makes the PNG.
updated: 2026-11-27
status: current
---
# blueprint

The standard structure every project follows: root layout, src/ per project type, rules, lifecycle, README header.

- Source of truth: `blueprint.html` (edit the layout here only).
- Render: `node tools/art/blueprint/render.cjs` → `tools/art/blueprint/out/project-blueprint.png` (3840x2400, gitignored).
- Check: the render exits 1 on any page error or any panel whose text overflows its box; PASS = clean.
