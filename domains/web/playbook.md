---
summary: Fastest proven path to a top-quality website in under 5 minutes; PC browser-verified, mobile via Artifacts
updated: 2026-11-21
status: current
triggers: [website, landing page, web app, html, css, react]
---
# Web playbook

## Default stack (pick the first that fits)
1. Single `index.html` with inline `<style>`/`<script>`: landing pages, portfolios, one-pagers. No build.
2. Vite + vanilla TS or React: multi-view apps needing state/components.
3. Next.js/Astro only when the user asks for SSR/routing/blog content.
No framework for a static page. No new dependency for what 20 lines of code can do.

## PC (/pc)
1. Scaffold: write `index.html` directly (or `npm create vite@latest app -- --template react-ts`).
2. Content first: real headline, real copy, real sections. No lorem ipsum.
3. Style: CSS custom properties for palette/spacing/type scale; `clamp()` fluid type; grid/flex; one accent color.
4. Serve: `npx serve .` or `npx vite` (never open via `file://` when using modules/fetch).
5. Verify with chrome-devtools-mcp or playwright-mcp: navigate, screenshot at 1440x900 and 390x844, read console (must be 0 errors), click main CTA.
6. Fix what the screenshot shows; re-screenshot once. Stop at checklist pass.
7. Optional: Lighthouse via chrome-devtools-mcp performance trace when asked for perf.

## Mobile fallback (/mobile)
- Headless Chromium + Playwright work for one small screenshot check (profiles/mobile.md); no local files. Build as an Artifact (single HTML) so the user sees it rendered on the phone; mirror the final file into the repo.
- Artifacts: pin CDN versions (`https://cdn.jsdelivr.net/npm/pkg@x.y.z/...`), cannot load external images/fonts reliably: use inline SVG, CSS gradients, system font stack.
- Self-check by reading: valid nesting, all IDs referenced exist, no console-error patterns (undefined vars, missing closing tags).
- Append PC steps to [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 screenshot desktop+mobile, check console, Lighthouse — web site/index.html`

## Quality bar
- Responsive 360 px → 1920 px; no horizontal scroll; tap targets >= 44 px.
- Accessible: semantic landmarks (`header/nav/main/footer`), one `h1`, alt text, labels on inputs, contrast >= 4.5:1, visible focus, `prefers-reduced-motion` respected.
- `<meta name="viewport">`, `<title>`, meta description, favicon (inline SVG data URI OK).
- 0 console errors. Images sized (`width/height`) + `loading="lazy"` below the fold.
- Looks designed: consistent spacing scale (4/8 px), max line length ~70ch, hero with clear CTA, hover/focus states, subtle motion only.

## Speed tricks
- Start from the skeleton in [snippets](domains/web/snippets/README.md); never type boilerplate.
- One file until it hurts; split only when > ~400 lines or multiple pages.
- Use system font stack or one Google font (PC only); skip icon libraries: inline SVG.
- Dark mode via `color-scheme: light dark` + `light-dark()` or one media query.
- Screenshot both sizes in one turn; batch fixes.

## Done
Run [checklists/web.md](checklists/web.md). New failure → add a row to [errors](domains/web/errors.md).
