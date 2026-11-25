// One sheet per message, drawn by ugen.makeSheet off the main thread so a slot's sheets draw at the same time on several cores.
import { makeSheet } from './ugen.js'
onmessage = async e => {
  const { id, code, seed } = e.data
  try { const r = await makeSheet(code, seed); postMessage({ id, blob: r.blob, empty: r.empty, jump: r.jump }) }
  catch (err) { postMessage({ id, error: err.message }) }
}
