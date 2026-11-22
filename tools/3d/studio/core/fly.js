// Fly mode (loaded on first use): move through a scene like a game camera, no zoom limit.
// Touch: left joystick moves, one-finger drag looks, pinch moves forward/back, ▲▼ rise/sink, − + speed.
// Desktop: WASD / arrows move, Q/E (or C/Space) down/up, Shift ×4, drag looks, wheel moves. Esc or the Fly button exits.
export function startFly(nav) {
  const { THREE, el, orbit, requestRender, loop } = nav
  const capture = (n, id) => { try { n.setPointerCapture(id) } catch {} }          // synthetic or ended pointers can't be captured
  const cam = nav.camera()
  const R = Math.max(1, nav.sceneR())
  let speed = Math.max(2, R * 0.12)                       // studs per second
  const look = Math.max(0.5, R * 0.01)                    // orbit target distance ahead (also sets the near plane)
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir)
  let yaw = Math.atan2(-dir.x, -dir.z), pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)))
  const keys = new Set(), joy = { x: 0, y: 0 }, vel = new THREE.Vector3(), up = { v: 0 }
  let running = false, dead = false, pinch = null, lookPtr = null
  orbit.enabled = false

  // ---------- overlay ----------
  const ui = document.createElement('div'); ui.className = 'fly-ui'
  ui.innerHTML = `<style>.fly-ui{position:absolute;inset:0;pointer-events:none;z-index:5;font:600 12px Inter,system-ui,sans-serif;color:#fff}
.fly-ui>*{pointer-events:auto;position:absolute;touch-action:none;user-select:none;-webkit-user-select:none}
.fly-joy{left:16px;bottom:16px;width:116px;height:116px;border-radius:50%;background:#0006;border:1px solid #fff4}
.fly-joy i{position:absolute;left:38px;top:38px;width:40px;height:40px;border-radius:50%;background:#fffc;box-shadow:0 2px 8px #0008}
.fly-ud{right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px}.fly-ud b,.fly-sp b{display:grid;place-items:center;width:48px;height:44px;border-radius:12px;background:#0007;border:1px solid #fff4;font-size:18px}
.fly-sp{right:76px;bottom:16px;display:flex;gap:6px;align-items:center}.fly-sp span{min-width:54px;text-align:center;background:#0007;border-radius:10px;padding:6px 4px}
.fly-tip{left:50%;top:12px;transform:translateX(-50%);background:#0008;border-radius:10px;padding:6px 10px;pointer-events:none!important;white-space:nowrap}</style>
<div class="fly-joy"><i></i></div><div class="fly-ud"><b data-u="1">▲</b><b data-u="-1">▼</b></div>
<div class="fly-sp"><b data-s="0.5">−</b><span></span><b data-s="2">+</b></div><div class="fly-tip">Fly · drag to look · joystick or WASD to move</div>`
  el.appendChild(ui)
  const spEl = ui.querySelector('.fly-sp span'), knob = ui.querySelector('.fly-joy i'), pad = ui.querySelector('.fly-joy')
  const showSpeed = () => { spEl.textContent = (speed < 10 ? speed.toFixed(1) : Math.round(speed)) + '/s' }
  showSpeed()
  setTimeout(() => ui.querySelector('.fly-tip')?.remove(), 3500)
  ui.querySelectorAll('[data-s]').forEach(b => b.addEventListener('pointerdown', e => { e.stopPropagation(); speed = Math.min(R * 4, Math.max(0.05, speed * +b.dataset.s)); showSpeed() }))
  ui.querySelectorAll('[data-u]').forEach(b => {
    b.addEventListener('pointerdown', e => { e.stopPropagation(); capture(b, e.pointerId); up.v = +b.dataset.u; kick() })
    const off = () => { up.v = 0 }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off)
  })
  let joyId = null
  const joyMove = e => { const r = pad.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l } joy.x = x; joy.y = y; knob.style.transform = `translate(${x * 38}px,${y * 38}px)`; kick() }
  pad.addEventListener('pointerdown', e => { e.stopPropagation(); joyId = e.pointerId; capture(pad, e.pointerId); joyMove(e) })
  pad.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e) })
  const joyOff = e => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; knob.style.transform = '' }
  pad.addEventListener('pointerup', joyOff); pad.addEventListener('pointercancel', joyOff)

  // ---------- look (drag) and pinch (forward/back) on the viewport ----------
  const touches = new Map()
  const down = e => {
    if (ui.contains(e.target)) return
    e.stopPropagation(); e.preventDefault()
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    capture(el, e.pointerId)
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); lookPtr = null }
    else if (touches.size === 1) lookPtr = e.pointerId
  }
  const move = e => {
    const t = touches.get(e.pointerId); if (!t) return
    e.stopPropagation(); e.preventDefault()
    const dx = e.clientX - t.x, dy = e.clientY - t.y; t.x = e.clientX; t.y = e.clientY
    if (touches.size >= 2 && pinch !== null) {
      const [a, b] = [...touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y)
      step(new THREE.Vector3(0, 0, 0), (d - pinch) / 40); pinch = d
    } else if (e.pointerId === lookPtr) {
      const k = 0.0045 * (nav.persp().fov / 50)
      yaw -= dx * k; pitch = Math.max(-1.55, Math.min(1.55, pitch - dy * k)); apply()
    }
  }
  const upE = e => { if (!touches.delete(e.pointerId)) return; e.stopPropagation(); if (touches.size < 2) pinch = null; if (!touches.size) lookPtr = null; else lookPtr = [...touches.keys()][0] }
  const wheel = e => { e.preventDefault(); e.stopPropagation(); step(new THREE.Vector3(), -Math.sign(e.deltaY) * (e.shiftKey ? 2 : 0.6)) }
  const ctx = e => e.preventDefault()
  el.addEventListener('pointerdown', down, true); el.addEventListener('pointermove', move, true)
  el.addEventListener('pointerup', upE, true); el.addEventListener('pointercancel', upE, true)
  el.addEventListener('wheel', wheel, { capture: true, passive: false }); el.addEventListener('contextmenu', ctx, true)

  // ---------- keys (window capture: the editor's own shortcuts never see them while flying) ----------
  const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])
  const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '') || e.target?.isContentEditable
  const kd = e => {
    if (typing(e)) return
    if (e.code === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); nav.exit(); return }
    if (!MOVE.has(e.code) || e.ctrlKey || e.metaKey) return
    e.stopImmediatePropagation(); e.preventDefault(); keys.add(e.code); kick()
  }
  // a missed keyup kept the camera flying: Meta/Ctrl swallow keyups (macOS), focus can leave the page mid-press
  const ku = e => { if (e.key === 'Meta' || e.key === 'Control') keys.clear(); if (keys.delete(e.code)) e.stopImmediatePropagation() }
  const blur = () => keys.clear()
  const vis = () => { if (document.hidden) keys.clear() }
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); addEventListener('blur', blur)
  document.addEventListener('visibilitychange', vis); el.addEventListener('focusout', blur)

  // ---------- motion ----------
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3()
  function basis() {
    fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
    right.set(Math.cos(yaw), 0, -Math.sin(yaw))
  }
  function apply() {
    basis()
    const c = nav.camera()
    orbit.target.copy(c.position).addScaledVector(fwd, look)
    c.lookAt(orbit.target); requestRender()
  }
  function step(_, metres) { basis(); nav.camera().position.addScaledVector(fwd, metres * speed * 0.25); apply() }
  function kick() { if (running || dead) return; running = true; loop(frame) }
  let sdt = 1 / 60
  function frame(dt) {
    if (dead) { running = false; return false }
    sdt += (Math.min(dt, 1 / 20) - sdt) * 0.25            // smoothed step: one slow frame no longer jumps the camera
    const k = (n, ...c) => c.some(x => keys.has(x)) ? n : 0
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 1
    const f = k(1, 'KeyW', 'ArrowUp') - k(1, 'KeyS', 'ArrowDown') - joy.y
    const s = k(1, 'KeyD', 'ArrowRight') - k(1, 'KeyA', 'ArrowLeft') + joy.x
    const u = k(1, 'KeyE', 'Space') - k(1, 'KeyQ', 'KeyC') + up.v
    basis()
    tmp.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s); tmp.y += u
    if (tmp.lengthSq() > 1) tmp.normalize()
    tmp.multiplyScalar(speed * fast)
    const moving = tmp.lengthSq() > 0
    vel.lerp(tmp, 1 - Math.exp(-sdt * (moving ? 12 : 30)))   // ease in; release stops in ~0.1 s (no drift)
    nav.camera().position.addScaledVector(vel, sdt); apply()
    if (!moving && vel.lengthSq() < speed * speed * 1e-4) { vel.set(0, 0, 0); running = false; return false }
  }
  apply()

  return function stop() {
    dead = true
    el.removeEventListener('pointerdown', down, true); el.removeEventListener('pointermove', move, true)
    el.removeEventListener('pointerup', upE, true); el.removeEventListener('pointercancel', upE, true)
    el.removeEventListener('wheel', wheel, true); el.removeEventListener('contextmenu', ctx, true)
    removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('blur', blur)
    document.removeEventListener('visibilitychange', vis); el.removeEventListener('focusout', blur)
    ui.remove()
    basis(); orbit.target.copy(nav.camera().position).addScaledVector(fwd, Math.max(look * 6, 2))
    orbit.enabled = true; orbit.update(); requestRender()
  }
}
