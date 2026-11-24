---
summary: Anime VFX rules from 148 stills (every 3 s) of 5 effect fights in the owner's reference video; colours, layering, rhythm, scale tricks
updated: 2026-11-24
status: current
---
# Anime VFX reference (owner 2026-11-24: "screenshot every 3rd second")

Source: youtu.be/ljMl9px0WXI (AMV compilation). Owner picked "VFX fights only". Stills via Firecrawl embed screenshots, 3 s apart, studied by 8 sub-agents + spot-checked (sheet F seen directly).
Captured 148 of 383 before Firecrawl's daily MCP credits ran out (reset 2026-11-24 21:05 UTC):
A Sukuna/Mahoraga 8:12-9:09 (20) · B 10:54-11:21 (10) · C Jinwoo/Beru 21:25-22:22 (20) · D Xuan/Shanchu 24:12-25:06 (19) · E 26:27-27:24 (20) · F Gogeta/Broly 28:36-29:30 (19) · G Naruto&Sasuke 30:56-31:53 (20) · H 32:59-33:56 (20).
Missing ranges are queued (queue/pc.md). Stills 3 s apart are usually different shots: they show looks, not motion; frame-level tricks (hit-stop, 1-frame flashes) need the PC frame-by-frame pass.

## The recipe (seen in every fight)
1. **Desaturated world, one saturated effect hue.** Base scenes are grey-blue, maroon or lavender (luma low, saturation low); only the effect is saturated. Seen: A grey night + white glow; G maroon + cyan lightning 31:44; E lavender + lime/red crystals.
2. **White core → saturated body → darker same-hue edge** (3 tones, hard cel edges + a thin soft glow). Seen: F green fan 28:39 (#f5f53d / #afde44 / #447a2c), F cyan barrage 29:27 (#e4fdfe / #73e0f1 / #2170c1), G lightning 31:44, D teal 24:54.
3. **One hue per character / attack**, consistent across shots: G Naruto gold vs Sasuke cyan vs Momoshiki red; C Jinwoo cyan vs Beru magenta; D/E red vs lime/cyan crystals split down the frame.
4. **Complementary clash at the contact point**: C 21:55 blue aura vs orange sparks; E 26:48 red vs lime beams meeting on one line; G 30:59 warm/cool diagonal split.
5. **Tiny figure vs huge effect** (the main scale trick): F 28:39 and 29:27 (effect fills 3/4 of frame), A 8:36 facade into hundreds of glowing shards with a tiny body, H 33:53 giant white sphere over 3 tiny figures, G 31:47 tiny figure in a vast plane.
6. **Rhythm: quiet → big → wide aftermath.** Calm close-up or black frame right before the hit (C 21:37, 21:43 black; H 33:47 black → 33:50 calm → 33:53 sphere), then a wide aftermath (A 9:00 smoke city, G 31:53 crater, H 33:08 small figure vs smoke wall).
7. **Impact frames exist, used once**: B 11:18 colour inversion (body black, light white) + radial speed lines + RGB split; F 29:18 two-value white wedge on black; 9:12 (first study) white paper + ink + red. Full-screen white-out flash once per fight: G 31:02, E 27:12, D 24:18.
8. **Effects light the world**: D 24:54 ground lit cyan under the hot spot; C 22:13 god-rays through trees; bloom spills over lineart (G 31:14-31:17 aura washes the face white).
9. **Debris = small dark angular chips** against bright effects (D, A 8:21, F 29:27 black rock chunks at the beam impact line), plus soft white smoke swooshes (A 8:30) and dust bands (A 8:15 horizontal shockwave band at body height).
10. **Grade swap for a power moment**: C 22:07-22:16 whole frame pink/magenta for Beru's reveal; E 27:18-27:24 same pose recoloured yellow → cyan → magenta lightning (colour-cycling power-up).
11. **Shapes, not particles**: beams are tapered crescent bands (F 28:39), slashes are crescent arcs with echo arcs (C 22:01, F 29:06), lightning is thick wavy branching bolts (E 27:18, G 31:23); sparks are sparse (a few specks), never showers.
12. **Camera**: low angles for power (F 29:15), Dutch tilts (G 31:23, A 8:33), top-down for craters with leading lines (A 8:21 crosswalk), extreme close-ups with motion smear (A 8:57), circular vignette on a kick (F 29:06). Whole-frame shake blur was not visible in stills (needs frame-by-frame).

## Apply to the crimson beam (Umbrio)
- Base: darker, desaturated ground/sky (rule 1); keep the beam the only saturated hue, with white core → crimson body → dark maroon edge (rule 2, already close).
- Add ONE complementary accent at the contact point: cyan sparks or rune glints (rule 4).
- Quiet beat before impact: 0.2-0.3 s near-black dip at 1.3 s, then the strike (rule 6).
- One impact frame at 1.5 s: 2 values (white world, black silhouettes, beam kept crimson) for 1-2 frames (rule 7).
- Light the ground crimson under the base (rule 8); dark chip debris (rule 9); wide aftermath shot at the end (rule 6).
- Owner rule 9 still holds: one big payoff, everything else subtle; the reference itself does this.

## Built from these rules
- Cyan Nova (Umbrio tab nova-1124, `tools/vfx/crimson-beam/umbrio_nova.py`, 2026-11-24). Impact frame in Umbrio = a small white Neon sphere enclosing the camera (inside fog-near); a world-sized sphere gets fogged into a grey gradient.
- Cyan Nova v2 (nova2-1124, `umbrio_nova2.py`), owner 6/10 on v1 ("orb not crystal, looks 2d, underwhelming"): hero = solid faceted mesh with Neon veins on its edges, energy = 3 noise-displaced ForceField shells rotating on different axes + crawling Neon arcs + tilted orbit rings (never a camera-facing flipbook card for a 3D volume), payoff = thick helix-wrapped beams + 90 m shock rings + spikes on the shock front. Camera at 82 m still makes the hero small (0.4 % of frame): frame the hero closer.
- Orbs/energy spheres (owner 2026-11-24 "no gradient, no texture, 1 layer"): >= 5 nested noise shells stepping the hue dark->light outward, each with a procedural texture (clouds/marble/stripes) and its own spin axis so layers shear, plus a thin Neon rim ring and a warm accent arc. Template: `umbrio_void.py` LAYERS.
