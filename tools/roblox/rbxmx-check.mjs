// Checks a Roblox .rbxmx (XML model) before delivery: tags balance, every <Ref> points at an existing referent,
// referents are unique, every Script/LocalScript/ModuleScript has a Source. Node 20+, no deps.
// Usage: node tools/roblox/rbxmx-check.mjs <file.rbxmx> [...]   (exit 1 on any problem)
//        node tools/roblox/rbxmx-check.mjs --self-test
// ponytail: regex scan, not a full XML parser; enough for Studio/vault exports, swap for a parser if odd XML shows up.
import { readFileSync } from 'node:fs'

export function checkRbxmx(xml) {
  const errs = []
  const body = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')
  const stack = []
  for (const m of body.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m
    if (self) continue
    if (!close) stack.push(name)
    else if (stack.pop() !== name) { errs.push(`unbalanced tag </${name}> at char ${m.index}`); break }
  }
  if (!errs.length && stack.length) errs.push(`unclosed <${stack.at(-1)}>`)
  if (!/<roblox[\s>]/.test(xml)) errs.push('no <roblox> root')
  const refs = [...xml.matchAll(/<Item\b[^>]*\breferent="([^"]+)"/g)].map(m => m[1])
  const seen = new Set()
  for (const r of refs) { if (seen.has(r)) errs.push(`duplicate referent ${r}`); seen.add(r) }
  for (const m of xml.matchAll(/<Ref\b[^>]*name="([^"]*)"[^>]*>([^<]*)<\/Ref>/g)) {
    const v = m[2].trim()
    if (v && v !== 'null' && !seen.has(v)) errs.push(`Ref ${m[1]} -> ${v} does not resolve`)
  }
  for (const m of xml.matchAll(/<Item\b[^>]*class="(Script|LocalScript|ModuleScript)"[^>]*>([\s\S]*?)<\/Properties>/g))
    if (!/<ProtectedString\b[^>]*name="Source"/.test(m[2])) errs.push(`${m[1]} without Source`)
  return { errs, items: refs.length }
}

function selfTest() {
  const ok = `<roblox version="4"><Item class="Model" referent="RBX1"><Properties><Ref name="PrimaryPart">RBX2</Ref></Properties>
<Item class="Part" referent="RBX2"><Properties><string name="Name">P</string></Properties></Item>
<Item class="Script" referent="RBX3"><Properties><ProtectedString name="Source"><![CDATA[print("<hi>")]]></ProtectedString></Properties></Item></Item></roblox>`
  const a = checkRbxmx(ok)
  if (a.errs.length || a.items !== 3) throw new Error('good file failed: ' + a.errs.join('; '))
  const bad = ok.replace('>RBX2</Ref>', '>RBX9</Ref>').replace('<ProtectedString name="Source"><![CDATA[print("<hi>")]]></ProtectedString>', '')
  const b = checkRbxmx(bad)
  if (!b.errs.some(e => e.includes('RBX9')) || !b.errs.some(e => e.includes('without Source'))) throw new Error('bad file passed: ' + b.errs.join('; '))
  if (!checkRbxmx(ok.replace('</Item></roblox>', '</roblox>')).errs.length) throw new Error('unbalanced file passed')
  console.log('rbxmx-check self-test: PASS')
}

const args = process.argv.slice(2)
if (args[0] === '--self-test') selfTest()
else if (args.length) {
  let fail = 0
  for (const f of args) {
    const { errs, items } = checkRbxmx(readFileSync(f, 'utf8'))
    console.log(`${f}: ${items} items, ${errs.length ? 'FAIL' : 'PASS'}`)
    for (const e of errs.slice(0, 20)) console.log('  ' + e)
    if (errs.length) fail = 1
  }
  process.exitCode = fail
}
