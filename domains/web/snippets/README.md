# Web snippets

Belongs here: reusable, framework-free HTML/CSS/JS pieces (page skeleton, CSS reset/tokens, nav, reveal-on-scroll, form handling).
Naming: `<what>.<ext>` (e.g. `skeleton.html`, `tokens.css`, `reveal.js`). Self-contained, no build step, works in an Artifact.

## Page skeleton
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Title</title><meta name="description" content="One line.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>">
<style>
:root{color-scheme:light dark;--bg:#0b0d12;--fg:#e8eaf0;--accent:#6c8cff;--s:clamp(1rem,2vw,1.5rem)}
*{box-sizing:border-box;margin:0}
body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
main{max-width:70rem;margin:auto;padding:var(--s)}
h1{font-size:clamp(2rem,6vw,4rem);line-height:1.1}
a,button{min-height:44px}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body><header></header><main><h1>Headline</h1></main><footer></footer></body>
</html>
```

## Reveal on scroll
```js
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
// CSS: .reveal{opacity:0;translate:0 1rem;transition:.6s} .reveal.in{opacity:1;translate:0}
```

## Responsive card grid
```css
.grid{display:grid;gap:var(--s);grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))}
.card{padding:var(--s);border-radius:1rem;background:color-mix(in srgb,var(--fg) 6%,transparent)}
```
