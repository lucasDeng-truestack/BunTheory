---
name: build-feature
description: Lead-developer workflow for building features in this repo — clarify requirements first, architect, build contract first, review and fix in a loop, verify, then hand off. Use for any multi-step feature, refactor, or new module when you are the only agent (Cursor, Codex, a single Claude Code session without subagents, or a change too small to be worth orchestrating). In Claude Code with the Agent tool and a feature spanning more than a couple of files, use the orchestrate skill instead — it wraps this one. Invoke before writing any code.
---

# Build Feature — Lead Developer Workflow

You are acting as the lead developer on this codebase. Your job is not to write code
fastest — it is to ship the *right* change, verified, consistent with the repo's rules,
and cleanly handed off. Follow the five phases in order. Each phase has a gate; do not
pass a gate by assumption.

**Golden rule: facts live in the repo — go read them. Intent lives with the user — go ask.**
Never burn tokens guessing at intent, and never interrupt the user for facts you can
grep for yourself.

**Which skill?** This skill is the single-agent path: you do every unit yourself, in
order. If you are in Claude Code, the `Agent` tool is available, and the change spans
more than a couple of files or more than one app, stop and invoke `orchestrate` instead
— it runs these same phases with plan mode as the approval gate and delegates the units
to Opus/Sonnet subagents. The references under `references/` are shared by both skills;
edit them here, never copy them.

## Phase 0 — Context (read before anything)

0. **Record the baseline.** Save `git status --porcelain` and `git diff --stat` to your
   notes (scratchpad if you have one). This repo often carries unrelated uncommitted
   work; the review in Phase 4 must scope to *this* task's files, not the whole tree.
1. Read `AGENTS.md` (services, ports, database, gotchas) and `.cursor/rules/project.mdc`
   to identify which app(s) the feature touches: `backend/` (NestJS + Prisma),
   `frontend/` (Bun Theory storefront + admin, Next.js), `weekend-grills-pos/` (separate
   POS app, own theme) or `bakar-roast/`. Getting the app wrong wastes the entire task.
2. Read the applicable rules: `.cursor/rules/backend.mdc` + `backend-folderstructure.mdc`,
   `frontend.mdc` + `frontend-folderstructure.mdc`, and for storefront UI
   `docs/branding.md` + `branding-typography-nav.mdc`. POS work → `weekend-grills-pos.mdc`
   and the `UI Design Weekend Grills/` folder instead of the storefront rules.
3. Find the closest existing feature and read it end-to-end (controller → service → DTO
   → `lib/api.ts` call → page → components). Copy its shape. A feature that ignores an
   existing pattern is wrong even if it works.
4. Check `docs/` (`product.md`, `cart-and-menu.md`, `setup.md`) for a doc about this area
   before designing anything.

## Phase 1 — Clarify (gate: requirements are unambiguous)

Before designing, list every open question. Answer from the codebase what you can.
For the rest, **ask the user in one batch** — do not trickle questions one at a time,
and do not proceed on guesses. Questions that are almost always worth asking for this
repo when the request doesn't specify:

- **Scope:** which surfaces (customer storefront, admin, POS, backend only)?
- **Data:** new tables/fields, or reuse? Does existing data need a migration or a seed
  change?
- **Access:** public customer route, or admin behind `JwtAuthGuard` / `@Roles`? Which role?
- **UX:** page, dialog or inline? What does it look like on a phone first?
- **Notifications:** does this send or change a WhatsApp message?
- **Edge policy:** what should happen on the ugly path (ordering closed / no published
  batch, max orders reached, item sold out, empty list, upstream failure)?

If the user is unavailable, state your assumptions explicitly at the top of your plan,
choose the most conservative option, and flag them again in the handoff.

**Gate:** you can state, in two sentences, what will exist when you're done and how the
user will confirm it works. If you can't, you're not ready.

## Phase 2 — Architect (gate: written plan exists)

Write the plan down before implementing (a short markdown block is enough):

- Files to create/modify, grouped by app.
- Schema changes → plan the migration name; in the implement phase **apply locally
  only**: confirm `DATABASE_URL` in `backend/.env` points at localhost first (a Neon or
  other remote URL means stop and ask), then `npm run db:migrate -- --name <name>`
  (without `--name` it stops at a prompt) and `npm run db:generate` from the repo root. Never `npm run db:reset`. Never leave
  pending local migrations unapplied.
- API surface: method + path + guard/role + request DTO + response type.
- Frontend: pages/components, which existing `components/ui` and `lib/` helpers you'll
  reuse (`lib/api.ts`, `lib/money.ts`, `lib/utils.ts` `cn`).
- Order of work: contract first, then units in dependency order (see Phase 3).
- Test/verify strategy: which lint/tsc commands, what manual flow proves it works, which
  screens to look at in the browser if a dev server is available. There is no automated
  E2E suite; say exactly which curl or browser steps prove it.

Before freezing the plan, re-check every number, count, path and version string in it
against the raw output it came from. A wrong fact in the plan is copied faithfully into
the code.

Show the plan to the user before implementing when the feature touches schema, money,
auth or more than one app; otherwise include it at the top of your response and
proceed. (Under `orchestrate`, plan mode makes this gate explicit.)

## Phase 3 — Implement

Work in units, contract first, in this order — the decomposition is the value even when
one agent does all of it, because the review in Phase 4 checks each unit against the
plan:

1. **Contract first:** Prisma schema + DTOs + controller route signatures + the frontend
   response types. Everything else depends on this. Apply the migration locally and
   regenerate the Prisma client now.
2. **Backend unit:** service + controller + module wiring, against the frozen contract.
3. **Frontend unit:** `lib/api.ts` calls + pages + components, against the same contract.
4. **Docs unit (optional):** `docs/` or `README.md` updates.

If the contract must change mid-way, stop, change it, update the plan, and re-check the
units already written against the new contract before continuing.

Write your own "packet" for each unit as working notes — the Task / Contract / Files /
Conventions / Verify sections from `references/delegation.md` — so Phase 4 has something
objective to review against. If you do have the `Agent` tool and find yourself wanting to
delegate a unit, that is the signal to switch to `orchestrate`; do not improvise a
delegation here.

## Phase 4 — Review Loop (gate: clean review)

You now switch roles: you are the reviewer, and the implementation is untrusted. Use
`references/review-checklist.md` — it contains the repo-specific checks and grep
patterns. Scope everything to the files this task touched (diff against the Phase 0
baseline). The loop:

1. Run the mechanical checks (lint/tsc per app, the checklist §1 greps).
2. In Claude Code, invoke the `code-review` skill at level `high` targeting the touched
   paths. Elsewhere, read the diff as a reviewer yourself: correctness, edge cases, rule
   compliance, reuse.
3. Walk checklist §2–§5 against the diff for what a generic review cannot know (layering,
   guards, DTO validation, money, batch and capacity rules, findMany bounds).
4. UI touched and a dev server configured (`.claude/launch.json` lists `frontend`)? Open
   the changed screens at phone and desktop width and look before you fix anything else;
   hierarchy and branding violations are not greppable.
5. Write findings as one numbered list with `file:line`, ordered by the checklist's
   severity discipline. Fix them. Re-review only the fixes.
6. Repeat until a pass produces zero findings. Cap at 3 cycles. If findings persist
   after 3, stop and escalate to the user with the remaining list — do not silently ship
   known issues, and do not loop forever.

## Phase 5 — Verify & Hand Off

- Run each touched app's checks (checklist §1: `npm run lint` + `npx tsc --noEmit` in
  `frontend`, `npx tsc --noEmit` in `backend` / `weekend-grills-pos` / `bakar-roast`)
  and report the real result. Never claim clean if it isn't. Do not run a production
  build of an app whose dev server is running.
- Exercise the feature if a dev server is available; otherwise say exactly what manual
  steps the user should run.
- Do not `git add` / `commit` / `push` unless the user asked for it.
- If the change touched `backend/prisma/`, confirm `npx prisma migrate status` (in
  `backend/`) is clean and the client was regenerated.
- Docs: name every doc you updated; if the feature changes documented behaviour and you did
  not update the doc, say so under remaining gaps.
- Write the handoff using `references/handoff.md`, including the merge verdict line. It
  must include assumptions made in Phase 1 and anything the review loop escalated.

## Anti-patterns (things that get this workflow fired)

- Writing code before Phase 1's gate. — Guessing auth, batch or capacity semantics.
- Hand-rolling a helper that exists in `lib/` or `components/ui`.
- Changing the contract after units are written without re-checking them.
- Reviewing the whole working tree instead of this task's diff. — Reviewing your own
  code generously.
- Reporting "done" without running the checks. — Committing without being asked.
- Migrating, seeding or resetting a database that is not on localhost.
- Improvising subagent delegation here instead of switching to `orchestrate`.
