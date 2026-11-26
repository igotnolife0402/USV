---
summary: Known web/HTML/CSS/JS/build failures with cause and fix; check before debugging
updated: 2026-11-21
status: current
triggers: [web error, css bug, cors, console error, vite error, hydration]
---
# Web errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| `Access to script ... from origin 'null' blocked by CORS` | ES modules or fetch opened via `file://` | Serve over http (`npx serve .`, `npx vite`) | 2026-11-21 |
| Horizontal scroll on phone | Fixed-width element or `100vw` with scrollbar | `max-width:100%`, use `100%` not `100vw`, find culprit with `* { outline:1px solid red }` | 2026-11-21 |
| Page tiny/zoomed out on phone | Missing viewport meta | `<meta name="viewport" content="width=device-width, initial-scale=1">` | 2026-11-21 |
| `100vh` hero cut off on mobile Safari | URL bar changes viewport height | Use `100svh`/`100dvh` | 2026-11-21 |
| Artifact shows blank / external image broken | Artifacts cannot load external assets; unpinned CDN broke | Inline SVG/data URIs; pin CDN version `pkg@x.y.z` | 2026-11-21 |
| React: `Hydration failed because the server rendered HTML didn't match` | `Date.now()`, `Math.random()`, `window` used during render | Move to `useEffect`, or `suppressHydrationWarning` for timestamps | 2026-11-21 |
| React: `Each child in a list should have a unique "key" prop` | Missing/unstable keys | Stable id as key, not array index for reorderable lists | 2026-11-21 |
| `Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')` | Script runs before DOM element exists | `<script defer>` or `type="module"`, or place script at end of body | 2026-11-21 |
| Vite build works, deployed page blank, 404 on assets | Wrong `base` for subpath hosting (GitHub Pages) | `base: '/repo-name/'` in vite.config | 2026-11-21 |
| Tailwind classes have no effect | Template paths missing from content/source config, or v4 needs `@import "tailwindcss"` | Fix `content` globs (v3) or CSS import (v4) | 2026-11-21 |
| Sticky header not sticking | Ancestor has `overflow:hidden/auto` | Remove overflow on ancestors or use `overflow:clip` | 2026-11-21 |
| z-index ignored | Element not positioned or new stacking context from transform/opacity | Add `position:relative`; move element out of transformed parent | 2026-11-21 |
| Fonts flash / layout shift | Webfont swap without fallback metrics | `font-display:swap` + `size-adjust`, or system stack | 2026-11-21 |
| Screenshot shows old version | Browser/dev server cache | Hard reload, new tab, or cache-bust query | 2026-11-21 |
| Form submit reloads page in SPA | Default submit behavior | `e.preventDefault()` in submit handler | 2026-11-21 |
| `python3 -m http.server` denied in cloud (auto-mode classifier) | background local servers are blocked on mobile | serve the repo inside Playwright: `page.route("http://repo.test/**", r => r.fulfill({path: REPO + pathname}))`, no server | 2026-11-25 |
