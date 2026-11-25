---
summary: Verbatim copies of Umbrio Studio's cine.js, sample.js and vfx.js so the VFX generator plays clips exactly like Studio without importing another tool.
updated: 2026-11-25
status: current
---
# lib (vendored, do not edit here)
Copied unchanged from the Studio editor's `plugins/` folder (tools stay separate, repo-check rule). After changing those plugins, re-copy:
`for f in cine sample vfx; do cp <studio plugins>/$f.js tools/vfx/showcase/lib/$f.js; done`, then rerun the generator check (README).
