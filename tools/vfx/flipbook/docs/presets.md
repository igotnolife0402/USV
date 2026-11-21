# flipbook: presets

What each preset makes and how (physics, time). Back to the [README](../README.md).

| Preset | What | Physics | Time |
|---|---|---|---|
| `explosion` | white-hot flash → fireball → rising, self-shadowed soot cloud; one-shot 2 s, 64 frames | 80³ fluid, 36 steps, 37 key renders (one per sim step), the other frames are 2D motion tweens: each key warped along its screen-space gas flow, blended (`fluid.tween`): combustion (fuel → heat + soot), expansion source in the pressure solve, buoyancy, vorticity confinement, curl-noise stirring | ~23 s |
| `black-hole` | purple-black lensed disk with glossy filaments, light-swallowing soot lanes and dark halo, spiral arms falling inward, breathing photon ring; 64-frame 24 fps loop (2.7 s) | Schwarzschild null geodesics (a = -3 h² x / r⁵), Novikov-Thorne disk, Doppler beaming g³; seamless differential rotation from m-fold layers turning 1/m rev per loop | ~8 s |

| `kamehameha-charge` | blue plasma ball: limb-brightened shell, swirling granulation, streamer corona, lightning arcs striking and decaying (3 alive); 64-frame 24 fps loop | dielectric breakdown model lightning (Laplace field, growth ~ phi^2.6); colour from spectra: ionised-argon (Ar II) lines over a Cherenkov continuum around a 15000 K core (Wyman CIE fit); film-like exposure runs blue -> cyan -> white | ~5 s |
| `kamehameha-beam` | energy-wave segment flowing along its length (VelocityParallel), helical flux tubes, ragged edge; 64-frame 24 fps loop | optically thin plasma column (projected Gaussian = Abel transform), helical vortex tubes, fbm advected with the flow; two-scale glare | ~5 s |
| `slash` | sword-swing crescent: crisp outer edge, soft inside, white-hot fresh edge, speed streaks, thins and cools toward the tail; one-shot 0.6 s | long-exposure streak of a swept blade, afterglow e^-age/decay, eased swing (accelerate, brake), element lines + 15000 K core | ~1 s |
| `embers` | sparks flung off the swing, motion-blurred, cooling | ballistic: drag ~ v..v², gravity, Newtonian cooling, blackbody(T), brightness ~ T⁴ | ~2 s |
| `flame-arc` | fire tongues licking out of the blade's wake, leaving thin soot | fbm fuel carried outward (buoyancy), blackbody(k0 + k1 T), emission ~ (K/k_ref)⁴ | ~1 s |
| `shock` | impact flash + torn blast-wave shell, one-shot from frame `delay` | Sedov-Taylor shell R ~ t^(2/5), glow ~ t^-6/5, 15000 K core, element lines | ~3 s |
| `glints` | tumbling mirror flakes that twinkle, lingering dust | ballistic flakes, normals turning (Rodrigues), specular lobe (n.h)^shine | ~2 s |
| `lightsaber-blade` | saber blade side view for the studio's 3D beam (`shape: beam`): white core, blue sheath, hum flicker, shimmer; tiles along x (finish `across=True`); 64-frame 24 fps loop | optically thin plasma column (Gaussian), Ar II blue lines (457.9-488.0 nm) over a 15000 K core, film exposure; 3.6 s, x seam 0.99 x neighbour step |
