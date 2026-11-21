---
name: website
description: 'Use for any website, landing page, portfolio, HTML/CSS page or web UI build (medium tier, < 5 min). Static single-folder site (index.html + styles.css + main.js) unless a framework is named. Outline/copy-only requests are simple tier: return the outline, no files.'
---
# website — static site recipe (< 5 min)

## Tier gate
- "outline", "sitemap", "copy", "structure", "plan" only → SIMPLE (< 1 min): reply with the section outline (H1, sections, CTA, one line each). No files. Stop.
- Owner names a framework (Next, React, Vite, Astro, Svelte) → use it, same design system, `npm create` scaffold, skip the rest of the layout below.
- Otherwise → this recipe, one thread, no plan mode, no sub-agents.

## Layout
```
<site-name>/
  index.html     # semantic sections, links styles.css + main.js (defer)
  styles.css     # tokens + layout + components
  main.js        # nav toggle, year, smooth reveal; no deps
  assets/        # only if images are supplied; else inline SVG / CSS gradients
```
Start by copying `.claude/skills/website/template.html` (one file with the CSS + JS inlined). Split into the 3 files: `<style>` → styles.css, `<script>` → main.js. Then replace copy/sections.

## Design system (10 lines, already in template)
1. Type scale 1.25: `--fs-0:1rem; --fs-1:1.25rem; --fs-2:1.563rem; --fs-3:1.953rem; --fs-4:clamp(2.2rem,5vw,3.6rem)`.
2. Font: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`; line-height 1.6 body, 1.1 headings.
3. ONE accent: `--accent` (+ `--accent-ink` for text on it). Everything else neutral greys.
4. Spacing 8px grid: `--s1:.5rem --s2:1rem --s3:1.5rem --s4:2rem --s5:3rem --s6:5rem`.
5. Gutters: 16px (`padding-inline:1rem`) on phones, container `max-width:72rem; margin-inline:auto`.
6. Mobile-first: base CSS = phone; `@media (min-width:48rem)` for grids/columns.
7. Dark mode tokens: `--bg --fg --muted --card --line` swapped in `@media (prefers-color-scheme:dark)`.
8. Radius `--r:12px`, one shadow `--shadow`.
9. Max line length 65ch for text blocks.
10. Motion: transitions 150-250ms; respect `prefers-reduced-motion`.

## Section patterns (pick, in this order)
- Header: logo + nav (collapses to button < 48rem) + CTA.
- Hero: H1 (one promise, <= 8 words), subline (<= 20 words), 1 primary + 1 ghost button, visual right on desktop.
- Social proof: logos row or 1-3 quotes.
- Features: 3-6 cards in `grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))`, icon + title + 1 sentence.
- How it works: 3 numbered steps.
- Pricing (if asked): 2-3 tiers, middle highlighted with accent border.
- FAQ: `<details><summary>` (native, no JS).
- CTA band: accent background, one button.
- Footer: links, © year (main.js fills `#year`).

## Accessibility basics (never skip)
- `<html lang>`, `<meta viewport>`, one `<h1>`, ordered headings, landmarks (`header nav main section footer`).
- Skip link to `#main`. Visible `:focus-visible` outline.
- Contrast >= 4.5:1 text, 3:1 large text/UI. Accent-on-white checked.
- Every `<img>` has `alt` (empty `alt=""` if decorative). Buttons are `<button>`, links are `<a href>`.
- Nav toggle has `aria-expanded` + `aria-controls`. Tap targets >= 44px.
- Forms: `<label for>`; no placeholder-as-label.

## Quality rules
- No lorem ipsum: write real, specific copy from the owner's brief.
- No external CDNs unless asked (works offline, opens via file://).
- No layout shift: images have width/height; fonts are system.
- `<title>` + `<meta name="description">` + OG title/description.
- Zero console errors.

## Verification (the ONE check)
PC: open `index.html` and screenshot at 390x844 and 1280x800 (Chrome MCP `resize_window` + screenshot, or Playwright if installed: `npx playwright screenshot --viewport-size=390,844 file:///.../index.html m.png`). Look at both: no horizontal scroll, nav works, hero readable, dark mode not broken.
Mobile: render the single-file version as an HTML Artifact; check it at narrow width in the Artifact viewer.

## Done-check (`checklists/web.md`)
- [ ] 3 files (or framework scaffold) exist, open with no build step.
- [ ] Phone + desktop screenshots checked, no overflow.
- [ ] Accessibility list above satisfied.
- [ ] Real copy, title/meta set, no console errors.
- [ ] `log.md` line if in the vault repo. Stop; no polish past the checklist.

## Time target
Scaffold 1 min, sections + copy 2-3 min, check 1 min. Over 5 min → ship what passes, list the rest in one line.

## Mobile
Files: write the 3 files in the repo (cloud session) AND show `template`-style single-file preview as an HTML Artifact. Screenshot check → append `- [ ] YYYY-MM-DD screenshot <site>/index.html at 390px + 1280px, fix overflow — built on mobile` to `queue/pc.md`. Deploy steps needing local tools → queue too.
