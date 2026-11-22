---
summary: Applied lesson rules for roblox (from lessons.md); read with the playbook before any roblox task.
updated: 2026-11-22
status: current
---
# Roblox rules (applied lessons)
- Roblox Studio has a built-in MCP; the old studio-rust-mcp-server repo is deprecated, do not install it (L-009)
- Cloud bundle limit is 100 MB; keep binaries (.blend, .rbxl, .wav, builds) out of git, commit generator scripts (L-013)
- wrote Luau scripts when the owner wanted a UI designed in Studio; "build me X" means the built thing in the target tool unless scripts are asked (L-027)
- Never invent Roblox asset ids; leave named slots (SheetAssetIds / AssetId) and list which file goes where (L-032)
- Run tools/roblox/rbxmx-check.mjs before handing over any .rbxmx (L-033)
- The theme the owner names is built first everywhere the camera sees; no placeholders (L-035)
- always re-read a hub project's version right before writing it; never reuse a pin from an earlier turn (L-055)
- the live hub is the source of truth for tools/3d/studio: pull and diff before every edit, commit what you publish (L-056)
- pipeline fixes across formats are complex tier; ask before any Open Cloud upload, up front (L-057)
- rbxmx uploads: contentType model/x-rbxm (L-058)
- never index Studio instances by bare name: FindFirstChild + IsA checks, assets via GetObjects (L-059)
- every turn that touches Studio or Roblox exports invokes the roblox skill again, even mid-task (each owner message is a new turn) (L-060)
- check Studio mode before Edit calls; always stop play tests when done (L-064)
- PC shots: DEPS=<deps>/node_modules NODE_TOOLS=<deps> CHROME=<chrome.exe>, copy live/pfinal+mfinal to studio/project.json+meta.json first (L-070)
- before briefing workers on a new kit, run the kit through a dense test (one material > 8k tris, every outline) and the audit; check the full set render once before any polish round (L-072)
- never touch the Studio camera; check looks on the export render; pre-tool hook denies it (L-079)
- verify Roblox looks from the Sandbox shots render, never Studio capture; read vault tools from the main checkout (L-085)
- crew: spawn 3 workers in the brain's first tool message with <=5-line prep briefs, design while they prep, send <=15-line value specs via SendMessage (L-095)
- crew: merge-gate defects go to the owning workers in one parallel SendMessage; every crew run ends with a measured phase timing report + fixes done/needed (L-099)
- Stop hook: every non-simple task logs improved: >= 3 fixes; crew spawn > 30 s or specs > 90 s after spawn is a slow signal (L-101)
