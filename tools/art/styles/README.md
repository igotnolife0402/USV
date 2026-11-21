# styles

The owner's library of 20 image-style prompts (2026-11-13) as one phone page: type the subject, tap a style, toggle add-ons (Roblox, design sheet, thumbnail), copy the finished prompt. The last subject, style and add-ons are remembered on that device.

## Data
- `STYLES` in `index.html`: `[name, how it works, prompt]`; every prompt keeps `[SUBJECT]`.
- `ADDONS`: `[name, text]`, appended after the style prompt in list order.
- Mixing tips sit in the page's "Mixing styles" box: two or three styles at most, and say what each controls.

## For Claude
- A style word from the owner (voxel, low-poly, claymation...) means that row's prompt is the spec and its "how it works" line the checklist, for images and 3D pieces alike.
- New or better style: edit its row in place (one best version), then republish the page if it is hosted (no build step: the file is the page). Rules: [images playbook](../../../domains/images/playbook.md).
