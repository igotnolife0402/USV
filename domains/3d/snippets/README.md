# 3D snippets

Belongs here: bpy helpers (normalize import, safe material, export) and three.js scene/loader setups.
Naming: `<what>.<ext>` (e.g. `normalize-import.blend.py`, `viewer.html`, `gltf-load.js`). bpy files end `.blend.py`.

## bpy: normalize an imported object (scale to height, sit on ground)
```python
import bpy
from mathutils import Vector
def normalize(obj, height_m):
    bpy.ops.wm.save_mainfile()
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    h = max(p.z for p in pts) - min(p.z for p in pts)
    if h > 0: obj.scale *= height_m / h
    bpy.context.view_layer.update()
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    obj.location.z -= min(p.z for p in pts)
```

## bpy: material color the right way
```python
import bpy
def set_color(obj, rgba, rough=0.5):
    mat = bpy.data.materials.new(obj.name + "_mat"); mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    obj.data.materials.clear(); obj.data.materials.append(mat)
```

## three.js viewer (pinned, Artifact-safe)
```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(devicePixelRatio);
r.setSize(innerWidth, innerHeight); r.toneMapping = THREE.ACESFilmicToneMapping; document.body.appendChild(r.domElement);
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
cam.position.set(2, 1.5, 3);
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment()).texture;
scene.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.2, 128, 16), new THREE.MeshStandardMaterial({ color: 0x6c8cff, roughness: 0.3, metalness: 0.2 })));
const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true;
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
r.setAnimationLoop(() => { ctl.update(); r.render(scene, cam); });
</script>
```
