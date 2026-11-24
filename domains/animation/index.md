---
summary: Animation domain entry - key poses tweened in the Studio animator, one motion spec per creature, clips for Studio, Roblox and video
updated: 2026-11-21
status: current
triggers: [animation, animate, clip, key pose, keyframe, keyframes, easing, ease, walk, idle, motion, pose, poses, timeline, swing, ik]
---
# Animation

- [rules](domains/animation/rules.md): every applied lesson rule for this domain; read with the playbook.

Motion for 3D pieces: key poses with `smooth` (sine in-out) tweens in the Studio animator; one motion spec per creature drives the Studio clip, the Roblox script and the MP4.

## Read in this order
0. [Umbrio animator rules](domains/animation/umbrio-animator.md): read first for any Umbrio animation, rig or cutscene (slerp, auto ease, warp, IK, mirror, lint, timing numbers).
0b. [Cinematic baseline](domains/animation/cinematic-baseline.md): the owner's 4 reference clips measured frame by frame; `anim.cine` applies push-in, slow-mo, dip + flash, hit-stop, shake and settle in one call (floor for every clip).
1. [Playbook](domains/animation/playbook.md): rules, which tool, PC vs mobile.
2. [Errors](domains/animation/errors.md): symptom → fix.
3. [Pipeline](domains/animation/pipeline.md): spec → key poses → Studio clip → Roblox KeyframeSequence / Lua → MP4.
4. [Snippets](domains/animation/snippets/README.md): sine ease and action window in Python, JS, Lua.

## Skill and done
- Skill: [3d-editor](.claude/skills/3d-editor/SKILL.md) (Studio animator); Roblox playback: [roblox](.claude/skills/roblox/SKILL.md).
- Done: [checklists/3d.md](checklists/3d.md) plus the shots check of the clip (`SHOTS_AT=1,2,3`, `SHOTS_VIDEO=1`).
- Modes: [profiles/pc.md](profiles/pc.md), [profiles/mobile.md](profiles/mobile.md); PC-only leftovers → [queue/pc.md](queue/pc.md).

## Code
- Creature specs: [beast](tools/3d/beast/README.md) (`rig.py`: `evalpose`, `window`, `key_poses`, `ANIM_LUA`; templates `orc.py`, `dragon.py`; video `video.html`/`video.mjs`).
- Avatar clips: [avatar](tools/3d/avatar/README.md) (`POSES`, `CLIPS`, `ik_arm`, `arc_keys`).
- Fight cutscene (two fighters, one clip, world fx, 2026-11-24): [duel](tools/3d/avatar/duel/README.md): `avatar.py --clipfile` per fighter, then `duel.py SPEC OUT` (beat gate: no action > 2 s).
- Studio eases + timeline: `tools/3d/studio/plugins/anim.js`, test `tools/3d/studio/test/anim.mjs`; R6 KeyframeSequence export: `tools/3d/studio/plugins/roblox.js`.

## Related domains
- [3D](domains/3d/index.md): models, rigs, Studio. [VFX](domains/vfx/index.md): flipbooks timed to clips. [Roblox](domains/roblox/index.md): Animator, Motor6D.
