// Renders blueprint.html to out/project-blueprint.png (2x, 3840x2400).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'blueprint.html'));
  // Overflow check: any box whose content spills past its border fails the render.
  const spill = await p.$$eval('.box', bs => bs.filter(b => b.scrollHeight > b.clientHeight + 2 || b.scrollWidth > b.clientWidth + 2).map(b => b.querySelector('.tag').textContent));
  await p.screenshot({ path: path.join(out, 'project-blueprint.png') });
  await b.close();
  if (errs.length || spill.length) { console.error('FAIL', errs, spill); process.exit(1); }
  console.log('PASS', path.join(out, 'project-blueprint.png'));
})();
