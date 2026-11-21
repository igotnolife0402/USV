# Animation snippets

Belongs here: easing and action-window functions, IK helpers, key-pose fitting. One shape in every language so Studio, Roblox and video match.
Source of truth: `tools/3d/beast/rig.py` (`ease`, `window`) and `tools/3d/studio/plugins/anim.js` (`smooth`).

## Sine in-out (the Studio `smooth` ease)
```python
import math
def ease(u): return (1 - math.cos(math.pi * u)) / 2
```
```js
const smooth = x => (1 - Math.cos(Math.PI * x)) / 2   // keys on a wave's peaks replay the wave exactly
```
```lua
local function ease(u) return (1 - math.cos(math.pi * u)) / 2 end
```

## Action window (0 at rest, 1 during the action, sine ramps in/out)
```python
def window(b, a, e, rin, rout):  # b = time since action start; [a, e] = full-on span
    if b <= a - rin or b >= e + rout: return 0.0
    if b < a: return ease((b - a + rin) / rin)
    if b > e: return ease(1 - (b - e) / rout)
    return 1.0
```
```lua
local function window(b, a, e, rin, rout)
  if b <= a - rin or b >= e + rout then return 0 end
  if b < a then return ease((b - a + rin) / rin) end
  if b > e then return ease(1 - (b - e) / rout) end
  return 1
end
```
