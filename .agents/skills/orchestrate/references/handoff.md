# Handoff — orchestrate

Use build-feature `references/handoff.md` in full: it already carries the sections this
workflow needs (What was built, Changes, Run before using, Verified incl. browser,
Assumptions, Things I'm unsure about, Remaining gaps, Next steps, Suggested commit
message, merge verdict line). Keep its rules — a ❌ with pasted output beats a false ✅,
and "none" under any gap section must be earned by the review loop.

Orchestrate adds one section, inserted before **Suggested commit message**. Build it
from `run-state.md`, not from memory.

```markdown
## Orchestration log
| Unit | Agent type | Tier | Cycles to clean | Notes |
|---|---|---|---|---|
| A backend … | implementer-opus-high | high | 2 | one auth finding fixed in cycle 1 |
| B frontend … | implementer-opus | medium | 1 | |
| C seed data … | implementer-sonnet | low | 1 | |
| D docs … | implementer-sonnet → implementer-opus | low | 1 | escalated: invented a section the packet did not list |
Review: N findings in cycle 1, M in cycle 2, 0 in cycle 3 (or: capped, see gaps).
Routing: N units sonnet, M opus, K escalations (why, one line each).
Orchestrator did directly: contract, migration, <one-line fixes>.
Fallback used: <"none" | "general-purpose + model (implementer-* types not listed)">
```

"Things I'm unsure about" in the base template covers judgement calls made by **you or
by any agent** — pull every unresolved-looking agent decision into it, with the file.
