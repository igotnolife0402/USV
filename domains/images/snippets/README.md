# Images snippets

Belongs here: prompt assembly helpers and Studio thumbnail object JSON (text, Baseplate, glow). Prompt text itself lives only in `tools/art/styles/index.html`.

## Assemble a prompt from the styles page (node, vault root)
```js
// node prompt.js "Voxel art" "a dragon knight" Roblox Thumbnail
const h = require('fs').readFileSync('tools/art/styles/index.html', 'utf8')
const S = eval(h.match(/const STYLES=(\[[\s\S]*?\]\])/)[1]), A = eval(h.match(/const ADDONS=(\[[\s\S]*?\]\])/)[1])
const [name, subject, ...add] = process.argv.slice(2)
const s = S.find(r => r[0].toLowerCase() === name.toLowerCase())
console.log([s[2].replaceAll('[SUBJECT]', subject), ...A.filter(a => add.includes(a[0])).map(a => a[1])].join(' '))
```

## Thumbnail headline (Studio `text` object)
```json
{"type": "text", "text": "+999", "font": "Luckiest Guy", "size": 1.5, "fill": ["#fff27a", "#ffb300"], "stroke": "#3a1500", "strokeW": 0.13, "shadow": "#000", "shadowOff": [0.05, 0.08], "glow": "#ffb300", "skew": -8, "face": "camera", "overlay": true}
```

## Roblox studded Baseplate
```json
{"tex": {"kind": "procedural", "pattern": "studs", "colors": ["#ffffff"], "count": 1, "scale": 1},
 "part": {"type": "part", "shape": "box", "name": "Baseplate", "size": [256, 1, 256], "pos": [0, -0.5, 0], "color": "#2bc22b", "texture": "<tex id>"}}
```
