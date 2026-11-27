// Renders every blueprint to out/*.png at 3840x2400. Fails on page errors or text overflowing any panel.
// Usage: node render.cjs [name...]   names: layout model vfx animation (default: all)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
// .step width is not checked: its connector arrow sits outside the box by design.
const PAGES = { layout: 'blueprint.html', model: 'sheet.html?s=model', vfx: 'sheet.html?s=vfx', animation: 'sheet.html?s=animation' };
(async () => {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PAGES);
  const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); let fail = 0;
  for (const name of want) {
    if (!PAGES[name]) { console.error('unknown', name); fail++; continue; }
    const p = await b.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, PAGES[name]));
    const spill = await p.$$eval('.box, .step, .card', els => els.filter(e => e.scrollHeight > e.clientHeight + 2 || (!e.classList.contains('step') && e.scrollWidth > e.clientWidth + 2))
      .map(e => (e.querySelector('.tag, h3') || e).textContent.slice(0, 40)));
    const file = path.join(out, (name === 'layout' ? 'project' : name) + '-blueprint.png');
    await p.screenshot({ path: file }); await p.close();
    if (errs.length || spill.length) { fail++; console.error('FAIL', name, errs, spill); } else console.log('PASS', file);
  }
  await b.close(); process.exit(fail ? 1 : 0);
})();
