// Environment, scene camera (hero shot) and the three camera bookmarks from the spec.
import { PALETTE as C, OAK } from '../lib/layout.mjs'

export function environment() {
  return { bg: C.sky, grid: false, light: 'day', look: 'roblox', fog: { color: C.fog, near: 420, far: 1300 } }
}

export function camera() {
  return {
    pos: [64, 42, 78], target: [0, 9, 0], fov: 50, ortho: false,
    bookmarks: {
      1: { pos: [0, 12, 26], target: [0, 10, -40] },                           // Spawn view: player eye height on the pad (top 6.9)
      2: { pos: [0, 430, 120], target: [0, 0, -6] },                           // Overview
      3: { pos: [OAK[0] + 60, 34, OAK[2] + 66], target: [OAK[0], 26, OAK[2]] } // Detail: the oak
    }
  }
}
