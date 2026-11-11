# Agent packets

Subagents share nothing with you: no conversation, no rules you read, no plan you
approved. Every delegation failure is a missing sentence in the packet. Build packets
from these templates, pasting real content — file paths, types, endpoint shapes — never
"see the plan".

Spawn with the `Agent` tool: `subagent_type` is the agent type the plan assigned —
`implementer-opus-high`, `implementer-opus` or `implementer-sonnet` (`.claude/agents/`,
routed per `references/model-routing.md`; fall back to `general-purpose` with
`model: "opus"` or `model: "sonnet"` only if the session does not list them) — and
`description` names the unit and model (e.g. `Unit A backend batch limits (opus-high)`). Spawn every
parallel-safe unit in one message. Agents run in the background; the harness notifies
you when one reports — never predict or paraphrase a result you have not received.

## Implementer packet

Start from build-feature `references/delegation.md` → "The unit packet" and keep
all of its sections (Task, Contract, Files, Conventions, Verify). Then add:

```
## Role
You are one implementer in a multi-agent build. An orchestrator owns the contract and
will validate your work against it before a separate code review. Other agents are
working on other units in parallel — stay inside your file set or you will collide
with them.

## Effort: <low|medium|high>
<paste the matching block from references/effort-tiers.md>

## Hard limits
- Do not modify backend/prisma/schema.prisma, backend/prisma/migrations, or any file
  not listed under Files. If you believe you need to, stop and report why instead.
- Do not run any git command that changes state (add, commit, push, stash, checkout).
- Do not run Prisma migrations, db:reset or db:seed; the orchestrator owns the database.
- Do not "improve" neighbouring code you were not asked to touch.

## Report format
Files changed (path — what)
Decisions made (each with the reason)
Edge cases covered
Unsure about (be specific; empty only if genuinely nothing)
Lint result (paste the command and the last lines of output)
```

### Sonnet addendum (append to every Sonnet implementer or fixer packet)

Sonnet executes instructions well and improvises badly. The packet must therefore
replace every "make X work" with "in file F, do Y". Add this block after `## Files`,
and expand `## Files` so every path has a bullet saying exactly what changes in it.

```
## Per-file instructions (follow literally)
- <path> — mirror <analog path> (functions/sections ...); rename <A> to <B>; add fields <list>
- <path> — add entry `<key>` after `<existing key>`; copy the block above
- ...

## Stop conditions (report instead of guessing)
- The analog and these instructions disagree.
- A file you need is not in the Files list.
- You would have to choose a name, a label, a colour, a layout or a copy string that
  is not written here.
- Lint fails for a reason outside the listed files.
When a stop condition fires, finish the files that are unaffected, then report with
the exact question. Do not fill the gap with your best guess.

## What done looks like
- `git diff --stat` touches only the listed files.
- <the mechanical check for this unit: npm run lint / npx tsc --noEmit exit 0 / grep X returns N hits>
```

If you cannot write the per-file bullets without hand-waving, the unit is not
Sonnet-eligible — re-route it to Opus before spawning.

## Fixer packet

Used in Phase E. One fixer per touched app; disjoint file sets may run in parallel.
Agent type per `references/model-routing.md`: Sonnet only when every finding is
convention or style tier and states its expected fix; otherwise Opus, at the high tier when
any finding is correctness or security.

```
## Task
Apply the review findings below to the working tree. Fix only what is listed. The
implementation was already validated against the contract; your job is to make these
specific findings go away without changing behaviour that was not flagged.

## Findings (verbatim — fix each, in this order)
1. <file:line> — <finding>
2. ...

## Contract (frozen — do not change)
<paste from the plan>

## Files you may touch
<the unit's file set; if a finding requires a file outside it, stop and report>

## Conventions
- Read .cursor/rules/backend.mdc + backend-folderstructure.mdc or frontend.mdc +
  frontend-folderstructure.mdc (whichever applies), and docs/branding.md for storefront
  UI (.cursor/rules/weekend-grills-pos.mdc for the POS).
- Fixes must use the same helpers the checklist demands (PrismaService, class-validator
  DTOs, Nest HTTP exceptions, Prisma.Decimal, lib/api.ts, lib/money.ts, components/ui).
  Do not introduce a new pattern to fix an old one.

## Effort: <tier of the most severe finding>
<paste the matching block from references/effort-tiers.md>

## Hard limits
Same as the implementer packet: no files outside the set, no git state changes, no
migrations, no unrelated refactors.

## Report format
For each finding number: fixed (how) | not fixed (why — e.g. false positive, needs
contract change, outside file set)
Lint result (paste)
Anything you noticed that is a new finding but was not on the list (do not fix it —
report it)
```

## Corrections to an agent that already reported

Use `SendMessage` to the same agent rather than a new spawn: it keeps the context of
what it built. Send the exact gap ("the contract returns `OrderSummary` but you
return the raw Prisma order") and the expected result. Wait for it to report again
before validating.

## When not to spawn

A fix that is one or two lines and unambiguous costs less to do yourself than to
package. Do it, note it in the orchestration log, move on. Anything larger goes to an
agent — not because you can't, but because the workflow's value is that the person
who wrote the plan is not the person writing the code.
