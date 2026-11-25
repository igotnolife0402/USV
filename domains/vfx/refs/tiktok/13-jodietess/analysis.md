---
summary: Ref 13: Blender stylised pistol skin set (2 days) filmed off a laptop; one shared base, skins via palette + silhouette add-ons
updated: 2026-11-25
status: current
---
# 13 · "i'm getting better and better" (Blender gun skins, phone-filmed laptop)
30.2 s · 275/302 kept (hand-held, so almost every frame changes) · no captions · on-screen "- 2 days" · sheets 1, 5, 9, 12 viewed (2-4, 6-8, 10-11 not: the same orbit around the same 9 guns, not visually verified).

## What it shows
A grid of ~9 stylised pistols in the Blender viewport, orbited and zoomed: plain white/blue, black/blue, tan, white/gold, purple demon (horns, ring sight), gold angel (wings, halo), orange/black flame, ice-crystal blue (11-12 s close-up), red spiky dragon.

## Why the set reads as "skins", not 9 models
- One shared pistol base (same slide, grip, trigger guard, proportions); every skin = palette swap + 1-3 silhouette add-ons (horns, wings, crystal spikes, flame fins, a dangling chain charm). Cheap to make, reads as a big collection.
- 2-tone palettes with a dark break colour: e.g. ice = #6fc8ff faces + #1a3a8a shade + black #111 panel lines; demon = #6a2a9a + magenta #e040c0 glow lines + black.
- Flat-shaded faceted faces (low-poly crystal look) with hard black panel lines and bevels: reads at icon size.
- A charm on a chain hangs from the barrel (ice skin) = small extra that sells "premium".

## Replication recipe
- Umbrio / three.js: build one base pistol generator (slide, frame, grip with stippling, trigger guard, sights, barrel, mag, panel-line insets with real depth); a skin = { palette: [main, shade, line, accent], addons: [...] } table; add-ons as separate generators (horn pair, wing pair, crystal cluster, flame fins, chain charm) attached to named sockets (top_slide, muzzle, grip_back).
- Roblox: same base MeshPart + per-skin texture (SurfaceAppearance) + add-on MeshParts welded at attachments; a skin catalogue in one ModuleScript table.
- Owner style rule: this is stylised; realistic stays the default unless the owner names stylised.

## Not verified
- Unviewed sheets; whether the add-ons are separate meshes or sculpted into each gun.
