---
summary: Audio domain entry: procedural SFX (WebAudio, jsfxr-style params), WAV export, game/UI sound, Roblox audio
updated: 2026-11-21
status: current
triggers: [audio, sfx, sound, sound effect, webaudio, jsfxr, wav, music, beep, chiptune, ogg]
---
# Audio

Sound effects and simple music, generated procedurally with WebAudio and exported as WAV.

## Read in this order
1. [Playbook](domains/audio/playbook.md): fastest path, PC vs mobile, quality bar.
2. [Errors](domains/audio/errors.md): symptom → fix table.
3. [Pipeline](domains/audio/pipeline.md): synth → OfflineAudioContext → WAV → OGG, loudness, Roblox upload.
4. [Snippets](domains/audio/snippets/README.md): sfx synth, WAV encoder.

## Skill and done
- Skill: [sfx](.claude/skills/sfx/SKILL.md)
- Done: [checklists/audio.md](checklists/audio.md)
- Modes: [profiles/pc.md](profiles/pc.md), [profiles/mobile.md](profiles/mobile.md); PC-only leftovers → [queue/pc.md](queue/pc.md)

## Related domains
- [Games](domains/games/index.md): SFX hooks in the game loop.
- [Web](domains/web/index.md): UI sounds.
- [VFX](domains/vfx/index.md): sync sound with visual hits.
- [Roblox](domains/roblox/index.md): Sound objects and upload limits.
