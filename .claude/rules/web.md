---
paths: ["**/*.html","**/*.css","**/*.tsx","**/*.jsx","domains/web/**"]
---
# Web rules
- Default to one self-contained `index.html`; add a framework only when the task needs components/routing.
- Never ship lorem ipsum; write real copy.
- Every page has viewport meta, `<title>`, one `h1`, semantic landmarks, alt text and visible focus.
- Layout must work 360-1920 px with no horizontal scroll; use `svh/dvh` not `vh` for full-height heroes.
- Serve over http for modules/fetch; never debug via `file://`.
- PC: verify with a desktop + mobile screenshot and 0 console errors before done.
- Artifacts: pin every CDN version; no external images or fonts.
- No new npm dependency for what a few lines of code or native HTML/CSS can do.
- Done = checklists/web.md; new failures go into domains/web/errors.md.
- Cloud sessions: headless Chromium + Playwright are preinstalled (`require('playwright')` from any dir, no install); screenshot-check pages there (profiles/mobile.md).
