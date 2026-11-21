# Studio: tests

Back to the [README](../README.md).

`node test/run.mjs [suite] [--grep text]` runs every `test/*.mjs` in Chromium against the mock runtime and exits 1 on a failure. A suite exports `async (t) => {}`; `t.test(name, fn)`, `t.ok/eq/near/log`, `s = await t.open({device: 'desktop'|'phone', hash, claude: false|{latency}, allowErrors})` gives `s.page, s.eval(fn, arg), s.run(cmd, args), s.scene(), s.project(name, opts) -> id, s.waitFor(fn, arg, ms), s.idle(), s.shot(name), s.noErrors()`. `window.__mock` exposes the fake db (`get`, `external`, `stats`).
- Setup (scratch folder, never committed): `npm i three@0.186.1 three-mesh-bvh@0.9.16 three-bvh-csg@0.0.18 mp4-muxer@5.2.2`, then `DEPS=<folder>/node_modules SCRATCH=<scratchpad> node test/run.mjs`. A `X.min.js` the CDN would minify is served as `X.js` unless DEPS holds one.
- Tests serve at `https://studio.test` (a secure context: WebCodecs only exists there).
- Check an export before it goes up (10 s): `SHOTS_TAB=<OUT/studio> SHOTS_AT=1,2,3 [SHOTS_CAM=x,y,z,tx,ty,tz] node test/run.mjs shots` → `<SCRATCH>/shots/shots.jpg` (phone, Animate mode, one frame per time); a no-op in the full suite. Thumbnails: `SHOTS_DEVICE=desktop` (16:9). Phone-grade depth: `SHOTS_DEPTH16=1` (+ `SHOTS_NEAR=0.1`) → `shots/d16.jpg`. The vfx suite fails over 45 s.
- WebGL runs on the CPU: Mesa llvmpipe when the machine has it (about 3.5 min for the full suite), else SwiftShader (about 9 min); `GL=swiftshader|llvmpipe` forces one. The GPU process is CPU-bound, so suites run one at a time: parallel runs broke the speed checks.
