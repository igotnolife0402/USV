---
summary: Supernova duel v2 rebuild (cinematic): contract, status, tries
updated: 2026-11-24
status: current
---
# supernova-duel v2
Contract: the improved prompt shot table S1-S12 (log.md 2026-11-24), 20.0 s, gates in domains/animation/playbook.md Cutscene rules.
| Step | Status | Tries |
|---|---|---|
| anim.js bars + test | done (anim 12/12) | 3 |
| contact solver + FK gate | done (6 contacts <= 0.05) | 4 |
| clips + camera + fx spec | done (31 cam keys, 49 fx) | 2 |
| tinted sheets, outfits | sheets done; outfits = tint only | 1 |
| upload fresh tab, read-back, zfight, frames | done: supernova-duel-ii-0143, zfight PASS | 1 |
Decision: one thread, no sub-agents (camera, contacts and fx are coupled; agents would each need the FK model).

Open: qa-gate not run (budget); aftermath embers barely visible; outfits same ids (tint only); faces are the default smile decal.
