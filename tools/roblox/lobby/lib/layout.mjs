// Shared layout numbers (studs). The fenced lobby is SIZE x SIZE centred on the origin; spawn at the origin.
export const SIZE = 300
export const HALF = SIZE / 2
export const OUTER = 700            // surroundings extent
export const SPAWN_CLEAR = 40       // radius kept free of other zones' solid parts
export const OAK = [0, 0, -95]      // centrepiece position
export const UNIT = 0.1             // 10x method: hero pieces are authored in 0.1-stud working units
export const PROJECT_ID = 'studio-lobby-4d1e'
export const PROJECT_NAME = 'Studio Lobby'

export const PALETTE = {
  lawn: '#6cb84a', meadow: '#5aa23c', meadowFar: '#4f9636',
  stone: '#a7a39a', stoneDark: '#7f7b73', dirt: '#9b7a52',
  wood: '#8a5a33', woodDark: '#5e3c22', bark: '#5b4030',
  leaf: '#4f9a35', leafLight: '#6fbf45', leafDark: '#3c7d2a',
  spawn: '#e8eef2', spawnGlow: '#7fe3ff', lantern: '#ffd27a',
  sky: '#9fd0f2', fog: '#cfe7f6',
  slate: '#6d7480', marble: '#eef0ee', gold: '#e2b84a', clover: '#3fdc6a', cloverDeep: '#1f9a45', glass: '#dff6ff'
}
