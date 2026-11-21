---
summary: Done criteria for sounds/SFX/music: plays without clipping, trimmed, gesture-unlocked on web, binaries out of git.
updated: 2026-11-21
status: current
triggers: [sound, sfx, audio, music, jsfxr, webaudio]
---
# Checklist: audio
- [ ] Used the [sfx skill](.claude/skills/sfx/SKILL.md); followed the [audio playbook](domains/audio/playbook.md).
- [ ] Each requested sound exists, named by use (jump, hit, coin), short and trimmed.
- [ ] No clipping: peak <= -1 dBFS / gain <= 1; consistent loudness across the set.
- [ ] Web: AudioContext resumed on first user gesture; procedural/jsfxr params saved in code.
- [ ] Roblox: asset ids / SoundService setup recorded in the domain note or state file.
- [ ] Generated wav/ogg/mp3 out of git unless tiny and required; generator params committed.
## Verify (one)
- Play each sound once (browser page / Studio / Artifact): audible, no errors.
## Log
- log.md entry (sounds, tool used, path). Errors → [audio errors](domains/audio/errors.md) + lesson.
