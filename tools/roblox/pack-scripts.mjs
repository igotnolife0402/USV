// Pack Luau files into an Umbrio .rbxmx so models + code import as ONE uploaded asset (no pasting scripts through MCP).
// Usage: node tools/roblox/pack-scripts.mjs in.rbxmx out.rbxmx layout.json
// layout.json: [{"file":"src/server/RoundServer.server.luau","class":"Script","name":"RoundServer","children":[...]}]
// Paths are relative to layout.json. Adds one Folder "Scripts" inside the first top-level Item. Check with rbxmx-check.mjs.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const [inp, out, layoutPath] = process.argv.slice(2)
if (!layoutPath) { console.log('usage: node pack-scripts.mjs in.rbxmx out.rbxmx layout.json'); process.exit(1) }
const base = dirname(resolve(layoutPath))
let n = 0
const ref = () => 'MMS' + String(++n).padStart(29, '0')
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const item = (e, pad) => {
  const src = readFileSync(resolve(base, e.file), 'utf8').replace(/]]>/g, ']]]]><![CDATA[>')
  const kids = (e.children || []).map(c => item(c, pad + '\t')).join('')
  return `${pad}<Item class="${e.class}" referent="${ref()}"><Properties><string name="Name">${esc(e.name)}</string>` +
    `<ProtectedString name="Source"><![CDATA[${src}]]></ProtectedString></Properties>\n${kids}${pad}</Item>\n`
}
const layout = JSON.parse(readFileSync(layoutPath, 'utf8'))
const folder = `\t\t<Item class="Folder" referent="${ref()}"><Properties><string name="Name">Scripts</string></Properties>\n` +
  layout.map(e => item(e, '\t\t\t')).join('') + '\t\t</Item>\n'
const xml = readFileSync(inp, 'utf8')
const first = xml.indexOf('<Item ')
const close = xml.indexOf('</Properties>', first) + '</Properties>'.length
if (first < 0 || close < first) throw new Error('no top-level Item in ' + inp)
writeFileSync(out, xml.slice(0, close) + '\n' + folder + xml.slice(close))
console.log('packed', n - 1, 'scripts ->', out)
