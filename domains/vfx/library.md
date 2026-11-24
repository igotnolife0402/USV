---
summary: Every VFX sheet ever made, in Claude-Hub db vfx; Umbrio Effects picks from it; Claude greps library.tsv
updated: 2026-11-24
status: current
---
# VFX library (owner 2026-11-24: "all vfx ever made save the same place, easily accessible, no mass delay for Claude")

## Where
- Store: Claude-Hub https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF, asset store (sheet PNG) + db collection `vfx`, doc id = slug.
- Doc: `{name, asset, grid, frames, life, loop, size, blend, kind, src}`; `kind` = flipbook (Grid8x8, 64 f) | action (Grid4x4, 16 f) | symbol (grid 1, static).
- Picker: Umbrio Sandbox Animate tab → Effects ([vfx.js](../../tools/3d/studio/plugins/vfx.js) `shared()`): search box, All/Flipbook/Action/Symbol chips, thumbs load only when scrolled into view.
- Claude's index: [library.tsv](library.tsv) = `slug, name, kind, grid, frames, asset`, one line per effect. Find one: `grep -i "slash" domains/vfx/library.tsv | head`. Never open the PNGs to search.

## Contents (2026-11-24: 676 + the 5 hand-made docs)
| Prefix | Source set | Kind | Count |
|---|---|---|---|
| gen- | vfx100 generator (crystal burst, dragon swing, embers, ... v01-v10) | flipbook | 100 |
| nf-, vb-, real- | stages/fx latest (36), beam tests (10), realistic (1; the other smoke/real sheets were pixel-identical to gen-) | flipbook | 47 |
| act- | unique.py element combos (no repeats, white) | action | 67 |
| sym-, ref-, icon- | symbols, reference cut-outs, batch.py icons | symbol | 462 |
- Left out on purpose: band splits (`-bXofY`), `-color`/`-glow` copies (white only, tinted in the tool), rejected sets mix/mix2/u24 (owner: identical), test dirs, 49 pixel-identical duplicates.

## Adding effects (rule: every generator run ends here)
1. Sheets white RGBA (light = alpha). `python3 tools/vfx/library.py SCRATCH OUT` collects + dedupes (add the new set to `SRC`).
2. Upload `OUT/png` with Artifact `asset: true`, 25 per call, record `NNN id` lines (a sub-agent keeps the 600-line results out of the main context).
3. `python3 tools/vfx/library.py docs OUT IDS DOCDIR` → `writes-KK.json`; ArtifactData `batch` each (50 per call, doc id = slug; existing docs need `if_version`).
4. Regenerate library.tsv, commit it. Verify: ArtifactData `list vfx` with `out_dir` and count the files.
- Hub page code changes (vfx.js) need a hub republish; ask the owner first ([studio](../3d/studio.md) Live build 5).
