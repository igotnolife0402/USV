# 3d-editor interface contract (Wave 0 writes this verbatim into src/core/)

Rules: modules import ONLY from `src/core/*` and `three`. Each module exports `mount(ctx: EditorContext): void` from `src/<module>/index.ts`. All scene mutations go through `ctx.history.execute(cmd)`. Objects are identified by `object.uuid`.

## src/core/types.ts
```ts
import type { Object3D, Scene, PerspectiveCamera, WebGLRenderer } from 'three';
export type Id = string;                          // Object3D.uuid
export type GizmoMode = 'translate' | 'rotate' | 'scale';
export interface Command { name: string; execute(): void; undo(): void; }
export interface Events {
  'selection:changed': { id: Id | null };
  'object:added':      { id: Id; parentId: Id | null };
  'object:removed':    { id: Id };
  'object:changed':    { id: Id; keys: string[] };     // e.g. ['position'], ['material.color']
  'scene:replaced':    {};                              // after load / new
  'history:changed':   { canUndo: boolean; canRedo: boolean };
  'gizmo:mode':        { mode: GizmoMode };
  'viewport:focus':    { id: Id };
}
export interface EditorContext {
  store: Store; bus: Bus; history: History;
  dom: { viewport: HTMLElement; left: HTMLElement; right: HTMLElement; menubar: HTMLElement };
}
export interface Store {
  scene: Scene; camera: PerspectiveCamera; renderer: WebGLRenderer | null; // renderer set by viewport
  selected: Id | null;
  gizmoMode: GizmoMode;
  get(id: Id): Object3D | undefined;   // scene.getObjectByProperty('uuid', id)
  select(id: Id | null): void;         // sets selected + emits selection:changed
  setScene(scene: Scene): void;        // replaces scene, clears history, emits scene:replaced
}
export interface Bus {
  on<K extends keyof Events>(k: K, fn: (p: Events[K]) => void): () => void;   // returns unsubscribe
  emit<K extends keyof Events>(k: K, p: Events[K]): void;
}
export interface History {
  execute(cmd: Command): void;   // runs, pushes, clears redo, emits history:changed
  undo(): void; redo(): void;
  canUndo(): boolean; canRedo(): boolean; clear(): void;
}
```

## src/core/bus.ts
`export function createBus(): Bus` — Map<string, Set<fn>>; emit calls handlers in subscription order; a throwing handler is caught + console.error'd, others still run.

## src/core/history.ts
`export function createHistory(bus: Bus, limit = 100): History` — two arrays; execute drops oldest beyond `limit`.

## src/core/store.ts
`export function createStore(bus: Bus): Store` — new Scene (background `#2b2b30`), camera (fov 50, pos 5,4,7, lookAt 0), hemisphere + directional light, `selected=null`, `gizmoMode='translate'`.

## src/core/commands.ts (shared commands; modules may add their own Command classes in their own files)
```ts
export class AddObject implements Command      { constructor(ctx: EditorContext, obj: Object3D, parentId?: Id) }   // add, select, emit object:added; undo removes
export class RemoveObject implements Command   { constructor(ctx: EditorContext, id: Id) }                       // remembers parent + index; undo re-inserts
export class SetTransform implements Command   { constructor(ctx: EditorContext, id: Id, key: 'position'|'rotation'|'scale', to: [number,number,number], from?: [number,number,number]) }
export class SetValue implements Command       { constructor(ctx: EditorContext, id: Id, path: string, to: unknown, from?: unknown) } // path like 'name', 'visible', 'material.roughness', 'material.color' (hex number)
export class Reparent implements Command       { constructor(ctx: EditorContext, id: Id, newParentId: Id | null, index?: number) }
```
Every command emits the matching event in both execute and undo. Gizmo drags: record `from` on `mouseDown`, issue ONE `SetTransform` on `mouseUp` (not per frame).

## Module responsibilities (events each must emit / listen to)
| Module | Emits | Listens |
|---|---|---|
| viewport | `selection:changed` (via store.select on click), `object:changed` (via SetTransform) | `selection:changed`, `object:*`, `scene:replaced`, `gizmo:mode`, `viewport:focus` |
| ui (explorer, inspector) | via commands only | `object:*`, `selection:changed`, `scene:replaced` |
| assets/io | via AddObject; `store.setScene` on load | — |
| fx | via AddObject for emitters | `selection:changed` (edit selected emitter) |

## Save format
`{ "format": "mini-editor", "version": 1, "scene": <scene.toJSON()>, "camera": { "position": [x,y,z], "target": [x,y,z] } }` — load with `new ObjectLoader().parse(json.scene)`. Particle emitters store params in `object.userData.emitter`; SFX presets in `scene.userData.sfx` (array of sfx params JSON, see sfx skill).

## DOM
`index.html`: `<div id="menubar"></div><div id="app"><aside id="left"></aside><main id="viewport"></main><aside id="right"></aside></div>`; CSS grid `32px 1fr` rows, `240px 1fr 300px` columns.
