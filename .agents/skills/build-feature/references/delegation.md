# Delegation — the unit packet and the parallel-safety rule

This file holds the two things both skills share: what a unit packet must contain, and
when two units may run side by side. **Who** executes a unit is decided elsewhere:

- `build-feature` (single agent): you execute every unit yourself, in order, and write
  the packet as your own working notes so the review has something objective to check.
- `orchestrate` (Claude Code with the Agent tool): the orchestrator writes the packet and
  spawns an `implementer-*` agent per unit. Agent type, model and effort tier come from
  `.agents/skills/orchestrate/references/model-routing.md` and `effort-tiers.md`; the
  full spawn packet (role, effort block, hard limits, report format, Sonnet addendum) is
  in `agent-packets.md` there. Do not improvise delegation outside orchestrate.

## Why delegation fails (and how to prevent it)

Subagents share **nothing** with you: no conversation history, no rules you've read,
no decisions you've made. Every failure mode of delegation is a missing sentence in
the packet. Write packets as if onboarding a competent contractor on day one. The same
discipline makes a single-agent run reviewable: a unit without a packet cannot be
checked against anything but your own memory.

## Parallel-safety rule

Two units may run in parallel **only if** their file sets are disjoint and both depend
only on the frozen contract. A backend unit (`backend/src/modules/**`) and a frontend
unit (`frontend/**`, `weekend-grills-pos/**` or `bakar-roast/**`) qualify once the schema,
DTOs and endpoint signatures are done and written into the plan. Two units editing the
same module, `app.module.ts`, or the same `lib/api.ts` never qualify.

## The unit packet (required sections)

```
## Task
One paragraph: what to build and the definition of done.

## Contract (frozen — do not change)
- Endpoints: METHOD /path — guard/role (public | JwtAuthGuard + @Roles(...)) — request DTO — response type
- Types: paste the DTOs and the frontend response types, or their exact file location
- Schema: paste the relevant Prisma models (lead already applied the local migration + generate)

## Files
- Modify: exact paths
- Create: exact paths
- Do NOT touch: anything outside these (especially backend/prisma/schema.prisma and migrations)

## Conventions (do not rediscover — obey)
- Read .cursor/rules/project.mdc, then backend.mdc + backend-folderstructure.mdc or
  frontend.mdc + frontend-folderstructure.mdc (whichever applies)
- Storefront UI: also docs/branding.md and .cursor/rules/branding-typography-nav.mdc
- weekend-grills-pos: .cursor/rules/weekend-grills-pos.mdc instead of the storefront rules
- Mirror this existing feature: <path to the closest analog you found in Phase 0>
- Backend: controller = request/response, service = logic, Prisma via PrismaService,
  class-validator DTOs, Nest HTTP exceptions, money as Prisma.Decimal; guards are opt-in
  (no global guard) — every admin route carries @UseGuards(JwtAuthGuard)
- Frontend: api<T>() from lib/api.ts; money via lib/money.ts; shadcn components/ui;
  next/image; server components unless interaction needs a client one; mobile first

## Verify before reporting done
- frontend: npm run lint && npx tsc --noEmit
- backend / weekend-grills-pos / bakar-roast: npx tsc --noEmit (no working lint there)
- Report: files changed, decisions made, anything you were unsure about
```

## After a unit is done

Do not trust "done" — yours or an agent's. The unit's result enters the Phase 4 review
loop as an untrusted diff checked against this packet. If anything was flagged as
uncertain, resolve it explicitly before the review; never let a guess become a silent
decision.
