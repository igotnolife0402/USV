# props

Detailed 3D props for Roblox-style thumbnails, as studio mesh objects, in two styles. One file, Python 3 + numpy only.

## Styles
- `lowpoly` (default, owner): the Roblox look. Crisp faceted forms, 6-24 sided lathes, icospheres at 1 subdivision, small crisp chamfers (0.02-0.05 studs), chunky plane-cut rocks, faceted foliage and cloud clumps. Every mesh is `"smooth": false` with per-face normals: vertices are split wherever facets differ, and non-planar polygons are triangulated. Natural, slightly desaturated colours with studio textures: `woodgrain` (wood, bark), `rock`, `brushed` (metal), `grass`, `grip` (wheel rim), `carbon` (dash trim). Under 3k triangles per prop; all 15 props build in ~2 s.
- `toon` (`--style toon`): the earlier bubbly cartoon set. Big fillets, 32-144 sided lathes, displaced blobs, welded smooth normals. It writes exactly the same bytes as before the low-poly style was added (verified by md5).

## Steps
1. `python3 props.py OUT <name|all> [--seed N] [--style lowpoly|toon] --check` writes `OUT/geo/<geoId>.json` per mesh and `OUT/<name>.json` per prop (same ids and names in both styles). It prints the table (parts, tris, KB) and fails on any bad face, geo file over 225 KB, or run over 20 s. The triangle cap is 3k per prop for lowpoly and 12k for toon. Lowpoly also fails if a mesh is smooth shaded or if a vertex is shared by facets more than 20 degrees apart.
2. Optional `--preview`: `OUT/preview_lowpoly.png` (lowpoly) or `OUT/preview.png` (toon). A contact sheet from the built-in numpy z-buffer rasteriser (flat colour, lambert, black outlines); a quick look, not the studio look.
3. Studio: add the prop's `objects` (and `textures`) to a project; each mesh's `geo` is the id of its `OUT/geo/<geo>.json` doc. Move, turn or scale the whole prop through the root group (`<name>-root`).
4. Same seed, same bytes: rebuilds are identical. `--seed` changes rocks, cliff, foliage, cloud and palm fronds.

## Low-poly triangles (default style)
barrel 1680 · bush 320 · car-hood 1724 · cliff 1088 · cloud 400 · crate 2628 · dashboard 2544 · palm-tree 980 · road-sign 676 · rock-1/2/3 80 each · steering-wheel 1452 · traffic-cone 748 · tree 410. Same parts and sizes as the table below, but crisp: cone base gets a raised square lip and a dark rubber base. The dashboard is a chamfered prism shell (sloped lower face for the glovebox) with a gauge binnacle. Crate boards are 44-triangle chamfered boxes. Barrel staves show as V-grooved facets. The road sign has a flat raised rim ring. Every low-poly prop sits on y = 0.

## Props, toon style (sizes in studs, W x H x D; front faces +Z, base on y = 0 unless noted)
| Name | Size | Tris | Parts (mesh: colour) and detail |
|---|---|---|---|
| `traffic-cone` | 0.78 x 1.07 x 0.78 | 7.6k | body #FF6A00: concave lathe, flared skirt, curled top rim; bands #FFFFFF: 2 proud lathe rings with rounded edges; base #E25500: rounded-square slab with bevel + raised tube lip |
| `steering-wheel` | 1.6 x 1.6 x 0.7 | 9.7k | rim #2B2F3A: torus with 12 inner finger-grip bumps; mark #F21D2B: top band; spokes metal: 3 tapered elliptic sweeps (wide bottom spoke); hub #3A3F4B; logo disc #F21D2B + chrome ring + gold star; column stub with shroud. Centred on the origin, faces +Z |
| `dashboard` | 5.0 x 1.3 x 1.7 | 11.1k | shell #3E4658: rounded box, curved plan, bulged top; trim #5A6680: overhanging top lip + gauge hood; dark #16181E: gauge panel, screen bezel, vent cups, tick marks, glovebox seam strip; 2 dials #F4F6FA with chrome rings, red needles, caps; 2 round vents with 4 tilted slats + tab; glowing screen #3FB6FF with UI bars; chrome glovebox handle |
| `car-hood` | 4.0 x 0.9 x 3.6 | 8.7k | panel #2A7DFF: domed rounded panel, centre power bulge, brows over the lamps; 2 headlights: body-colour cups, chrome rings, emissive lens domes #FFF6C9; chrome badge |
| `road-sign` | 2.6 x 3.15 x 0.34 (board 2.6 x 0.9) | 3.6k | board #F21D2B: bevelled rounded rectangle; rim #FFFFFF: raised tube border; post metal with domed top, 2 clamp bands, bracket plate, washers; 2 hex bolt heads (flat shaded) |
| `rock-1`, `rock-2`, `rock-3` | ~2 (wide, tall, flat) | 5.1k each | stone #D99A5E / #C4854D / #CF9055 + noise texture: icosphere (sub 4) displaced by fbm, 8 soft facet cuts (stylised low-poly, smooth shaded), flat bottom |
| `cliff` | ~12 x 40 x 12 | 10.9k | rock-a #D99A5E, rock-b #C4854D (+ noise texture): 6 chunky faceted strata + 6 side boulders, alternating tones; grass #5ED13E: lumpy cap with frosting drips overhanging the rock |
| `tree` | 5.2 x 6.2 x 4.3 | 7.8k | trunk #9A5F30: curved tapered sweep, 5 root lobes, bark grooves, 2 branches; leaves-a #3FC24A, leaves-b #2FA83A: 5 puffy displaced blobs |
| `bush` | 3.1 x 1.5 x 2.9 | 6.4k | leaves-a/b: 5 puffy blobs, flat bottom |
| `cloud` | 6.8 x 2.8 x 3.6 | 9.0k | puffs #FFFFFF + puffs-back #EEF4FF: 7 soft blobs, flat bottom, faint glow |
| `palm-tree` | 6.1 x 6.8 x 6.0 | 7.2k | trunk #B9773E: curved sweep with 11 stacked segment rings + root flare; fronds-a/b: 6 drooping fronds (V-folded, tapered, scalloped leaflet edges, with thickness); crown; 3 coconuts #6B4423 |
| `crate` | 1.5 cube | 11.4k | planks #B9773E: 3 rounded planks per face with gaps; frame #9E5F2C: 12 rounded edge boards; core #5A3A1E behind the gaps; 36 nail heads; planks texture |
| `barrel` | 1.24 x 1.6 x 1.27 | 8.8k | staves #B9773E: bulged lathe with 16 crowned staves and grooves, recessed lids with rims; 2 hoops #6E7682 (metal) with 12 rivets; bung #7A4A22; planks texture |

Metal is #C9CED6, metalness 0.7, roughness 0.3.

## Output format
- `OUT/geo/<geoId>.json`: `{"verts": [x,y,z,...], "faces": [[a,b,c(,d)],...], "uvs": [u,v,...] | null}`; polygons counter-clockwise from outside, Y up, coords rounded to 1/1000. `geoId` = `<prop>-<part>`.
- `OUT/<name>.json`: `{"name", "objects", "root", "textures"?}`. Root group `<name>-root` (`pos`, `rot` degrees XYZ, `scale`), one mesh per colour (`<name>-<part>`: `geo`, `color`, `smooth`, `roughness`, `metalness`, optional `emissive`, `emissiveIntensity`, `texture`). Textures are procedural (`noise` for rock, `planks` for wood).

## Building blocks (for new props; all in `props.py`)
- `@prop("name", "Title")` on `fn(rng) -> (parts, textures|None)`; `part(id, mesh, color, **material)`; `ground(parts)` puts the lowest point on y = 0.
- `lathe(profile, seg, closed=False, rmod=None)`: (r, y) profile spun around +Y (open: bottom axis, out, up, back in; closed: counter-clockwise). `rmod(theta, y, r)` reshapes radius (stars, staves, grips).
- `fillet(points, radius, n, closed)`: rounds every corner of a profile; per-corner radii allowed. Use it on every profile: it is what makes edges bubbly.
- `sweep(path, rad, seg, closed, caps="round"|"flat", ref, shape)`: tube along a path; `rad` scalar, per point, per point `[rN, rB]` (ellipse) or per point per angle; `ref` fixes the frame normal (planar rims); `shape` a custom closed cross-section (frond).
- `rbox(size, r, seg, div)`: box with all edges rounded, welded; `div` adds inner rows for deforming. `slab(hw, hh, depth, rad, bevel)`: bevelled rounded-rectangle board facing +Z. `rrect(hw, hh, rad)`: outline + normals.
- `icosphere(sub)`, `blob(...)` (puffy foliage/cloud), `boulder(...)` + `facets(...)` (cartoon rock), `Noise(rng)` / `.fbm`, `cubeish`, `smoothstep`, `torus_profile`, `hex_bolt`, `nail`, `dial`, `vent`.
- Mesh helpers: `xf(mesh, t, r, s)`, `merge(...)`, `orient(mesh)` (fixes winding by signed volume), `box_uv(mesh, scale)`.
- Low-poly: `@low("name")` registers the lowpoly build of an existing prop (same ids). `lpart(id, mesh, color, tex, uv, **material)` makes a part flat shaded, splits it per facet (`flat`) and gives it per-facet box uvs (`face_uv`). `lptex(*keys)` returns the textures. Shapes: `cbox(size, r)` (44-triangle chamfered box), `box`, `prism(poly_zy, hw, ch)` (chamfered extrusion of a convex profile), `frame_ring(outline, outer, inner, z0, z1)` (raised border), `ring_rect` (lathe hoop profile), `chunk(rng, sub, scale, jitter, cuts)` (faceted polyhedron with snapped plane cuts), `clumps`, `floor_cut` (exact flat base), `lp_nail`, `lp_dial`, `lp_vent`, `lp_frond`.

## Known limits
- No booleans: parts overlap instead of being cut in (seams, grooves and recesses are modelled as proud or sunk strips).
- UVs only on textured meshes, from a per-vertex box projection: texture seams show where the dominant axis flips.
- Triangle budget 12k per prop caps sphere subdivision (foliage and cliff chunks at icosphere sub 3).
- The preview is a debugging aid: no shadows, no studio materials or toon ramp.
- Low-poly texture uvs are per-facet box projections at a fixed scale; how the new studio patterns (`woodgrain`, `rock`, `brushed`, `grass`, `grip`, `carbon`) tile on them has not been looked at in the studio.

## Budget rules
- Count triangles per part before adding detail (12k per prop): thin decorative rings with many profile rows cost thousands.
- Tiny parts (ticks, bolts) are 6-sided flat-capped tubes, not rounded boxes (about 600 tris each).
- Keep rounded-box radius below half the thickness and bevel steps above the 1/1000 rounding, or faces degenerate.

## Small hand-held props (vapes, phones, tools): one-shot rules (owner 2026-11-22)
- `python3 vapes.py OUT --check --preview` is the template: one command runs mesh check, detail floor (`--class prop`) and `zfight.py check --prop`; copy it for any new small-prop set.
- `zfight --prop` = prop-scale bands (level < 4 mm, layered < 1 cm, fail > 0.02 m2): the default 12 cm band is for buildings and fails every proud detail on a 1-stud prop.
- Build it fault-free the first time: every proud detail >= 1.2 cm in front of what it sits on (stacked bezel → screen → digits too); no hidden core inside sleeves; no ring/plate lying on a face at < 1 cm; glass `transparency >= 0.5` (zfight ignores see-through parts, liquid stays).
- Small props are medium tier: one thread, no crew/sub-agents (spawning + merging cost more than the models).
- `guns.py OUT --check` (2026-11-22): 3 voxel-look guns (pistol 3.5k, rifle 3.5k, sniper 3k tris), textured chamfered mesh parts; gates: mesh check, detail --class prop, zfight --prop; writes OUT/live stages for the Umbrio build. Also `attach()`: no floating/gapped piece (one surface cluster per gun).
- `shotgun.py OUT --check [--preview]` (2026-11-22): tactical pump shotgun, 25 textured parts, 3k tris; palette = 4 constant lines at the top (variants change only those); writes OUT/live/p1+m1 for a one-batch Umbrio build (Umbrio project `tactical-shotgun`). Check ~1-3 min (attach sampling).

## House (2026-11-22, realistic)
`python3 house.py OUT --check`: realistic 2-storey house, 1 unit = 1 m, 8 x 6 m footprint, 110 textured parts (finished interior: plaster, oak floors, stair, partition; furniture in house_a.py living/dining, house_b.py kitchen/bath, house_c.py bedroom; stone plinth, brick ground floor, lap siding, stepped shingle roof, chimney, gutters, 6-over-6 sash windows, panelled oak door, canopy, steps). Writes OUT/live/p1-6 (shell, roof, details, interior, ground furniture, upper furniture) for the Umbrio build (project `furnished-house`). Recipe: [umbrio-build.md](../../../domains/3d/umbrio-build.md).
- `drones.py`: A/B of two /improve prompts (drone-a Sonnet-only, drone-b brief+Sonnet); hero class; `python3 drones.py OUT --check --preview`.
- `angles.py`: 8-view sheet (front/back/left/right/3-4s/top/low) of any props generator for blind ratings; `python3 angles.py GEN.py NAME OUT.png`.
