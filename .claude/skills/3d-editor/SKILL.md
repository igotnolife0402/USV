---
name: 3d-editor
description: 'Use for a browser 3D editor, mini-Blender, scene/level editor or modeling tool (complex tier, < 30 min), or to extend the owner''s Studio editor (tools/3d/studio). Contracts first, 2-4 sub-agents in own worktrees, 3-try cap, qa-gate. Contract in modules.md.'
---
# 3d-editor — browser mini-Blender (complex tier, < 30 min)

## Models: detail floor
- Any model (generator, Studio tab, Blender): meet [detail floor](../../../domains/3d/detail.md); `python tools/3d/detail/detail.py check project.json geo/ --class hero` passes before done.

## Animations: cinematic floor (owner 2026-11-24)
- Every clip: `auto` eases through motion, hit-stops on impacts, `anim.lint` 0. Fights, cutscenes, payoffs and loops: `anim.cine` too, then read the 12 fps sheet of the payoff second ([cinematic-baseline](../../../domains/animation/cinematic-baseline.md)).

## Step 0: the owner already has an editor
- [Studio](../../../domains/3d/studio.md) (`tools/3d/studio`): parts, mesh edit, sculpt, anim, textures, paint, draw, VFX, GUI, import/export, MP4, with a test suite. A feature for "the editor" = a Studio plugin: one file in `plugins/`, one line in `plugins/index.js`, a `<link rel="modulepreload">` in `index.html` if it loads at boot (else `import()` on first use), a suite in `test/`. Read only [plugins](../../../tools/3d/studio/docs/plugins.md) and [plugin API](../../../tools/3d/studio/docs/plugin-api.md).
- Verify: `node test/run.mjs <suite>` plus `core` (boot caps, always: the 800 KB cap was found broken at 819 KB on 2026-11-25, L-144), env vars per [tests](../../../tools/3d/studio/docs/tests.md). No new plugins unasked.
- Big features: names/params at boot (small list file), heavy code via `import()` on first use (modlist.js + modops.js pattern).
- Only a separate, new editor goes through the module recipe below.

## Base choice (decide in one line)
- Default: lean custom app. `npm create vite@latest editor -- --template vanilla-ts`, `npm i three`. Borrow structure from the three.js editor (MIT; `editor/js/` in the three repo: `Editor.js`, `Viewport.js`, `Sidebar.*`, `History.js`, `commands/*`). Its Command pattern + Signals map 1:1 onto `modules.md`.
- Owner wants "everything now" → fork the three.js editor files (keep MIT header), add SFX/VFX panels as new modules.

## Modules (one owner each; contract: `.claude/skills/3d-editor/modules.md`)
| # | Module | Files | Owner |
|---|---|---|---|
| 0 | Store, event bus, commands, history, types | `src/core/*`, `package.json`, `tsconfig.json`, `index.html`, `src/main.ts` | Lead (Wave 0) |
| 1 | Viewport: WebGLRenderer, PerspectiveCamera, OrbitControls, TransformControls gizmo (W/E/R), raycast selection, grid, resize, selection BoxHelper | `src/viewport/*` | Agent A |
| 2 | Scene explorer tree (select, rename, reparent by drag, visibility) + inspector (transform, material, light props) | `src/ui/explorer.ts`, `src/ui/inspector.ts`, `src/ui/panel.css` | Agent B |
| 3 | Primitives (box, sphere, plane, cylinder, torus, point/dir light) + MeshStandardMaterial (color, metalness, roughness, emissive) + glTF import/export (GLTFLoader/GLTFExporter) + save/load JSON (`scene.toJSON` / `ObjectLoader`) + localStorage autosave | `src/assets/*`, `src/io/*` | Agent C |
| 4 | Procedural SFX panel (sfx skill params → WebAudio, WAV export) + particle VFX panel (Points emitter, presets) | `src/fx/*` | Agent D |
| — | Menubar + keybinds + wiring after merge | `src/ui/menubar.ts`, `src/main.ts` | Lead |

Smaller request → merge agents C+D or drop D. Never more than 4 agents.

## Steps
1. (2 min) Write `state/3d-editor.md`: goal, module table, agent → files, status column, try counts.
2. (5 min) Wave 0, lead only: scaffold, write `src/core/{types,bus,store,commands,history}.ts` exactly per modules.md, `src/main.ts` that builds the `EditorContext` and calls each module's `mount(ctx)`. `npx tsc --noEmit` clean. Commit. Core is FROZEN; only the lead changes it.
3. (1 min) Per agent: `git worktree add .worktrees/<id> -b swarm/<id>/3d-<module>` (ensure `.worktrees/` in .gitignore).
4. (12 min) Spawn agents in ONE message (parallel). Each brief contains:
   - goal + exclusive file list + its worktree path;
   - "read `.claude/skills/3d-editor/modules.md` and `lessons.md` first";
   - "export `mount(ctx: EditorContext): void` from `src/<module>/index.ts`; import only from `src/core`";
   - "every scene mutation goes through `ctx.history.execute(cmd)`";
   - "run `npx tsc --noEmit` before reporting; 3 fix attempts, then revert your files and report BLOCKED";
   - "report <= 8 lines: result, files, checks".
5. (3 min) Run the qa-gate agent (`.claude/agents/qa-gate.md`) per branch: type check, build, contract adherence, secrets. FAIL → defect list back to that agent (counts toward its 3 tries).
6. (4 min) Merge PASS branches one at a time; after each: `npx tsc --noEmit && npm run build`. Wire menubar (File: New/Open JSON/Save JSON/Import glTF/Export glTF; Edit: Undo/Redo/Delete; Add: primitives, lights) and keys (Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y, Delete, F focus, W/E/R gizmo mode).
7. (3 min) Verification; update state note; `git worktree remove .worktrees/<id>` each; `log.md` line.

## Quality rules
- Every mutation is a Command with `execute`/`undo`; UI never sets `object.position` directly.
- Modules talk only through `ctx.store` + `ctx.bus`; no cross-module imports.
- Layout: menubar top 32px, explorer left 240px, viewport center, inspector right 300px; dark theme (`#1e1e22` panels, `#2a2a30` lines, one accent).
- OrbitControls disabled while gizmo drags (`dragging-changed`); gizmo detached when nothing selected.
- Delete disposes geometry/material; autosave every 10 s + `beforeunload`.

## Verification
1. `npx tsc --noEmit` and `npm run build` clean.
2. `npm run dev`, then in Chrome (PC): add box → move with gizmo → change color in inspector → undo x2 → redo x1 (state matches) → rename in tree → export glTF → import it (same object) → Save JSON → reload → Open JSON (scene restored) → play one SFX preset → spawn one particle preset. Screenshot. Zero console errors.

## Done-check (`checklists/3d.md`)
- [ ] Verification steps 1-2 pass; screenshot taken.
- [ ] qa-gate PASS on every merged branch.
- [ ] Worktrees removed, state note updated, lesson added for anything that took > 1 try.

## Time target
30 min total as timed above. Agent past 3 tries → ship without that module, note it in state file.

## Mobile
No dev server or browser automation. Do steps 1-2 in the repo; implement modules yourself or with sub-agents on exclusive file lists (no worktrees needed if git worktree is unavailable); preview viewport + gizmo as a single-file three.js HTML Artifact (CDN import map). Queue: `- [ ] YYYY-MM-DD npm i && npm run build && run editor verification step 2 in Chrome — mobile build of editor/`.
