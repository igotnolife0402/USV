---
summary: Known image-prompt and thumbnail failures with cause and fix
updated: 2026-11-21
status: current
triggers: [thumbnail wrong, style wrong, glow invisible, text wraps, prompt off]
---
# Images errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Image doesn't match the owner's named style | Style paraphrased from memory | Use the `STYLES` row text verbatim; its "how it works" line is the checklist | 2026-11-13 |
| Muddy mixed-style image | 4+ styles, no stated jobs | 2-3 styles max, each with a job (geometry, lighting, mood) | 2026-11-13 |
| Subject hidden by effects at thumbnail size | No Roblox/Thumbnail add-on | Append the add-on (readable silhouette, one focal subject, details large) | 2026-11-13 |
| Thumbnail looks flat/cartoon when it shouldn't | Toon look used by default | Look `roblox`; `toon` only for cartoon requests | 2026-11-13 |
| Additive glow invisible | Glow on a white/bright sky | Dark sky for effect tabs (`--bg #0b0f1a`) | 2026-11-13 |
| Bloom halos on lit walls | Extra bloom added | Roblox look blooms only light energy above 2.5 (built in); add no extra bloom | 2026-11-13 |
| Headline wraps oddly before fonts load | Box sized for the web font | Size for the widest fallback, plus `tsc` | 2026-11-19 |
| Cluttered thumbnail | Too many hooks | 3-4 hooks max, one headline, 2 lines | 2026-11-13 |
| Guessed avatar colours/items | Not from catalog | Real catalog assets via `catalog.py`; look at `KIT/refs/*.png` once | 2026-11-13 |
| picture ask routed to 3d; panel text overflowed | 3d word 'template' misrouted a blueprint PNG ask; text overflow cost 3 renders | removed 3d template word; render.cjs overflow gate | 2026-11-27 |
