---
summary: Web build pipeline: file layout per stack, assets and image formats, verify loop, deploy targets
updated: 2026-11-21
status: current
triggers: [vite, deploy, build, github pages, netlify, assets, favicon]
---
# Web pipeline

## 1. Layout
Single file (default):
```
site/index.html        inline CSS + JS, inline SVG icons
site/assets/           optional images (.webp/.avif/.svg)
```
Vite app:
```
app/index.html  app/vite.config.ts  app/package.json
app/src/main.ts(x)  app/src/style.css  app/src/components/*
app/public/            copied as-is (favicon.svg, og.png, robots.txt)
```

## 2. Build
1. `npm create vite@latest app -- --template vanilla-ts|react-ts` → `cd app && npm i`.
2. Dev: `npm run dev` (port 5173). Prod: `npm run build` → `dist/`; `npm run preview` to check build.
3. Type check: `npx tsc --noEmit`.

## 3. Assets
| Asset | Format | Rule |
|---|---|---|
| Photos | .webp (or .avif), .jpg fallback | <= 200 KB hero, set width/height, `srcset` 1x/2x |
| Icons/logos | inline SVG | `currentColor` fill, `aria-hidden` when decorative |
| Favicon | `favicon.svg` + 32px `.png`/`.ico` | `<link rel="icon" href="/favicon.svg">` |
| Social card | `og.png` 1200x630 | `og:title/description/image` meta |
| Fonts | woff2, max 2 families | `preload` the main one; Artifacts: system stack |
| 3D | .glb (Draco/meshopt) | via three.js GLTFLoader; see [3d pipeline](domains/3d/pipeline.md) |

## 4. Verify (PC)
serve → chrome-devtools-mcp/playwright-mcp `navigate` → screenshot 1440x900 + 390x844 → list console messages → click CTA → fix → re-screenshot.

## 5. Deploy
- GitHub Pages: static `site/` or `dist/`; Vite needs `base: '/<repo>/'`.
- Netlify/Vercel/Cloudflare Pages: build `npm run build`, output `dist`.
- Mobile: commit files; deployment needing CLI login → [queue/pc.md](queue/pc.md).

## 6. Artifact export (mobile)
One self-contained HTML. CDN scripts pinned: `https://cdn.jsdelivr.net/npm/<pkg>@<x.y.z>/<file>`. No external images. Save the same file to `site/index.html` in the repo.
