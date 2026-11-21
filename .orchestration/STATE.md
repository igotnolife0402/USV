# SWARM MISSION CONTROL — STATE.md
- **Mission Goal:** Build the AI-only Super Vault (PC + phone, never fills, self-improving, fast)
- **Current Wave:** Wave 1 of 2 (Wave 0 contract frozen)
- **Active Agent Count:** 4 workers + 1 QA gate
- **Global Build Health:** UNVERIFIED

## Exclusive File Lock Registry
| Glob | Owner | Lock | Wave |
| :--- | :--- | :--- | :--- |
| CLAUDE.md, index.md, lessons.md, log.md, router.json, profiles/**, checklists/**, queue/**, state/**, archive/**, CLAUDE.local.md.example | W-CORE | WRITE | W1 |
| domains/**, .claude/rules/** | W-DOMAINS | WRITE | W1 |
| .claude/skills/**, .claude/agents/** | W-SKILLS | WRITE | W1 |
| hooks/**, scripts/**, tests/**, .github/**, .claude/settings.json, .claude/settings.local.json.example | W-HOOKS | WRITE | W1 |
| .orchestration/**, .gitignore, .gitattributes | Chief | WRITE | W0 |
