# shatter

A breakable object for a studio tab: a light-cyan glowing triangular crystal, a chrome ball shot at it, and at contact the crystal swapped for its own Voronoi pieces flying out (numpy only, ~2 s). Notes: [3d playbook](../../../domains/3d/playbook.md). The flipbook effect comes from the VFX domain ([vfx](../../../domains/vfx/index.md)).

## Steps (live tab, permanent: write each stage the moment it is made; never inspect, size or render outputs before they are in the tab)
1. `python3 shatter.py OUT --pieces 100 [--seed 3] [--name Crystal] [--fx <png>]` → `OUT/geo/*.json`, `OUT/live/batch1..4.json` (ready ArtifactData batches: replace `<id>` with the project id and `IFV` with the doc's version), `OUT/project.json` (the finished scene), `OUT/meta.json`, `OUT/info.json`.
2. Effect: the flipbook tool's `crystal-burst` stack with `element=Hg` on every layer (mercury lines: light cyan) as `--name crystal-burst-cyan`; upload it as a hub asset, rerun with `--fx <png>`: the last step adds the flipbook at the impact (tex `fx-crystal-burst-cyan` = `{"asset": id}`).
3. Live build in the tab (owner: never built elsewhere and imported, never piece by piece): 4 batches, one per stage: the tab with crystal, ball and flight; then 45 pieces (geo + objects) per batch; the last starts the shatter motion and the effect. Never click the studio's tools: scripts write the data.
4. Check: the studio shots check on a folder with `geo/`, `project.json`, `meta.json`, `uploads.json` (`{tex id: png}`), `SHOTS_VIDEO=1`.

## How it works
- Crystal: a tall triangular pyramid (owner: a clean triangle), 10 studs; light cyan `#7fefff`, metalness 0.45, roughness 0.03, cyan emissive and a cyan `glow` halo (studio hero glow). Ball: chrome, metalness 1, roughness 0.015.
- Fracture: seeds inside the crystal, denser near the impact; each piece is the crystal clipped by the bisector planes to every other seed (exact tiling: pieces sum to the crystal's volume within 1e-5).
- Contact: the ray of the ball's flight meets the crystal surface; the whole crystal's `visible` turns off and the pieces' on at that frame.
- Motion: impulse away from the contact (falls off with distance) + the ball's push + a random lift, gravity -30 studs/s², constant spin; `pos` keys every 0.1 s, `rot` two linear keys. The ball keeps 30 % of its speed and drops.

## Files
| File | Does |
|---|---|
| `shatter.py` | crystal, fracture, motion, studio stages |
