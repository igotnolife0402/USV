---
summary: Done criteria for websites/landing pages (< 5 min): responsive, accessible basics, no console errors, one visual check.
updated: 2026-11-21
status: current
triggers: [website, landing, html, css, portfolio]
---
# Checklist: web (< 5 min)
- [ ] Used the [website skill](.claude/skills/website/SKILL.md) scaffold; followed the [web playbook](domains/web/playbook.md).
- [ ] Every requested section/page exists with real copy (no lorem unless asked).
- [ ] Responsive: works at 375px and 1280px; no horizontal scroll.
- [ ] Basics: semantic tags, alt text, labels on inputs, visible focus, readable contrast.
- [ ] No console errors; local links/assets resolve; Artifacts: no external assets, pinned CDN versions.
- [ ] Single entry point runs as documented (open index.html or `npm run dev`).
## Verify (one)
- pc: open in built-in browser/Chrome, screenshot desktop + 375px width, read console.
- mobile: Artifact preview, or `node --check` on JS; queue "visual check in Chrome" if layout-critical.
## Log
- log.md entry (what was built, path). Errors fixed → [web errors](domains/web/errors.md) + lesson bump.
