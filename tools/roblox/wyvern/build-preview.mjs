// Inlines spec/motion/geo/texture/pose into preview.src.html -> out/wyvern.html (one self-contained page).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const mods = ['spec', 'motion', 'geo', 'texture', 'pose'];
const wrap = (name) => {
  let src = fs.readFileSync(path.join(here, `${name}.mjs`), 'utf8');
  const exp = [];
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/(\w+)\.mjs';/gm, (_, names, m) => `const {${names}} = M_${m};`);
  src = src.replace(/^export (const|function|class) (\w+)/gm, (_, kw, n) => { exp.push(n); return `${kw} ${n}`; });
  return `const M_${name} = (() => {\n${src}\nreturn { ${exp.join(', ')} };\n})();`;
};
const html = fs.readFileSync(path.join(here, 'preview.src.html'), 'utf8').replace('/*@@MODULES@@*/', () => mods.map(wrap).join('\n'));
const out = path.join(here, 'out'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'wyvern.html'), html);
console.log(`out/wyvern.html ${(html.length / 1024).toFixed(0)} KB`);
