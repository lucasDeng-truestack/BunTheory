# Handoff template

End every feature task with this report. The user commits manually, did not watch the
work happen, and reads this to write the commit message and decide what to do next — so
it has to stand alone. Shared by `build-feature` and `orchestrate`; orchestrate appends
its orchestration log (see its own `references/handoff.md`).

```markdown
## What was built
One paragraph, user-language: what exists now that didn't before.

## Changes
- `path/to/file` — what and why (group by app)

## Run before using
# Schema/migrations: agent should already have applied locally (localhost DB only).
# Report what was applied, e.g.:
# Applied `2026..._add_...` via `npm run db:migrate`; regenerated the client (`npm run db:generate`).
# Only list commands here if a safety gate blocked local apply (non-local DATABASE_URL, etc.).

## Verified
- frontend:           npm run lint ✅/❌  tsc --noEmit ✅/❌ (paste failures verbatim if ❌)
- backend:            tsc --noEmit ✅/❌
- weekend-grills-pos / bakar-roast: tsc --noEmit ✅/❌ (if touched)
- prisma (if touched): migrate status up to date; client regenerated ✅/❌
- Browser: <screens opened, phone + desktop width, what you saw — or "not opened: no dev server">
- Manual: <what you exercised, or exact steps for the user to exercise>
- Docs updated: <paths> | Docs needed: <what, which file under docs/>

## Assumptions made (from Phase 1)
- <assumption> — chosen because <reason>; revisit if wrong

## Things I'm unsure about
Judgement calls you should sanity-check. One line each, with where to look.
- <decision> — <why it might be wrong> — see `path/to/file`

## Remaining gaps
- Escalated review findings (survived cycle 3): <file:line — finding — severity>
- Deferred scope (agreed in the plan or discovered mid-run): <what, and why deferred>
- Not verified: <anything in the verify strategy that could not be exercised>

## Next steps
Ordered. What you'd do next if this were your ticket.
1. <e.g. run the manual order flow against a published batch>
2. <e.g. follow-up for the POS surface>

## Suggested commit message
feat(<area>): <summary>

<Merge verdict line — see below>
```

## Merge verdict

End with one line the user can act on without reading the rest:

- `Ready to commit.` — checks clean everywhere, zero open findings, manual flow verified
  or clearly described.
- `Ready to commit with caveats.` — checks clean, only style-tier findings or unverified
  manual steps remain; listed above.
- `Do not merge yet.` — a correctness or security finding survived the loop, or
  lint/tsc fails. Say which.

## Rules

- Never mark "Verified" on hope. A ❌ with pasted output is a good handoff; a false ✅
  is the worst possible outcome of this workflow.
- "Remaining gaps: none" and "Unsure about: none" must be earned by the review loop,
  not assumed.
- Do not stage, commit, or push unless the user asked. Summarize so the user can.
- Local Prisma migrate + generate is the agent's job when migrations are part of the
  change. Never migrate, seed or reset a remote DB (Neon/production), and never tell the
  user to do it as a routine step.
