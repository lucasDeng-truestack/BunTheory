# Review checklist — repo-specific

Run mechanical checks first (cheap, objective), then read the diff. Report findings as
a numbered list with file:line; fix, then re-review only the fixes.

## 1) Mechanical checks

```bash
# Type + lint per touched app. Only frontend has a working lint (bakar-roast has the
# script but no ESLint config, so `next lint` would stop at a setup prompt); the other
# apps are checked with tsc. Never `next build` / `nest build` an app whose dev server
# is running.
cd frontend           && npm run lint && npx tsc --noEmit
cd bakar-roast        && npx tsc --noEmit
cd backend            && npx tsc --noEmit
cd weekend-grills-pos && npx tsc --noEmit

# Frontend rule violations in the diff — each hit needs a fix or a justification
git diff -- frontend bakar-roast weekend-grills-pos | grep -nE '^\+.*<img[ >]'              # must be next/image
git diff -- frontend ':!frontend/lib/api.ts' ':!frontend/services' | grep -nE '^\+.*\bfetch\('  # backend calls go through lib/api.ts `api<T>()`
git diff -- frontend | grep -nE '^\+.*(toFixed\(2\)|RM ?\$\{)'                              # money display via lib/money.ts formatRM / toAmount

# Backend rule violations in the diff
git diff -- backend/src | grep -nE '^\+.*new PrismaClient\('                                # Prisma only through PrismaService
git diff -- backend/src | grep -nE '^\+.*(parseFloat|Number\().*(price|total|subtotal|amount)' # money stays Prisma.Decimal
git diff -- backend/src | grep -nE '^\+.*@(Get|Post|Put|Patch|Delete)\('                     # every new route: @UseGuards(JwtAuthGuard) on it, or public in the contract

# Leftovers
git diff | grep -nE '^\+.*console\.log'
```

## 2) Backend review (`.cursor/rules/backend.mdc`, `backend-folderstructure.mdc`)

- [ ] Feature lives in `backend/src/modules/<name>/` with controller, service, module and
      `dto/`; shared helpers in `src/common`.
- [ ] Controller handles request/response only; business logic is in the service.
- [ ] Prisma is reached only through `PrismaService`.
- [ ] Every body/query input has a class-validator DTO (the global `ValidationPipe` in
      `main.ts` enforces it).
- [ ] Guards are opt-in per route — there is no global guard. Every admin route has
      `@UseGuards(JwtAuthGuard)` (plus `RolesGuard` / `@Roles` where the contract says);
      a route without it must be a customer route the contract lists as public.
- [ ] Errors are Nest HTTP exceptions (`BadRequestException`, `NotFoundException`, …) —
      no ad-hoc `res.status(...)` or plain `Error`.
- [ ] Endpoints return typed responses matching the contract.
- [ ] Money math uses `Prisma.Decimal`; totals are computed server-side, never trusted
      from the request.
- [ ] Order creation still respects the published batch, max-orders limit and the
      ordering toggle (`NO_BATCH` path). `backend.mdc` asks for rate limiting on order
      creation but no throttler is installed yet; do not claim it exists.
- [ ] Schema changed? Migration is in `backend/prisma/migrations/`, applied to the local
      DB only, client regenerated; seed (`src/database/seed.ts`) still runs.

## 3) Frontend review (`.cursor/rules/frontend.mdc`, `frontend-folderstructure.mdc`)

- [ ] Backend calls go through `lib/api.ts` (`api<T>()`) / the `services/` layer — no
      raw `fetch` in components.
- [ ] Server components by default; `"use client"` only where state or events need it.
- [ ] Reuses `components/ui` (shadcn) primitives and existing feature components; no
      duplicated widget that already exists under `components/`.
- [ ] Images use `next/image`.
- [ ] Loading, empty and error states exist for every data fetch; failures are shown to
      the user, not only logged.
- [ ] Money rendered via `lib/money.ts` (`formatRM`, `toAmount`).
- [ ] Mobile first: checked at phone width; big tap targets, minimal form input.
- [ ] Typography and nav follow `.cursor/rules/branding-typography-nav.mdc` and
      `docs/branding.md` (display font for headings, nav, buttons, labels).
- [ ] `weekend-grills-pos/` changes follow `.cursor/rules/weekend-grills-pos.mdc` and its
      own design folder, not the storefront's look.
- [ ] Next.js version differs per app (15.x in `frontend` / `bakar-roast`, 16.x in
      `weekend-grills-pos`); APIs used exist in that app's version.

## 4) Cross-cutting

- [ ] Matches the plan's contract exactly (paths, shapes, guards/roles).
- [ ] No leftover debug: `console.log`, commented-out blocks, unused imports.
- [ ] Naming/idiom matches neighboring code (compare with the analog feature).
- [ ] Anything the implementer flagged as "unsure" has been resolved explicitly.
- [ ] Sends a WhatsApp message? It goes through `modules/notifications`, and the API
      still works when Twilio is not configured (send is skipped, not thrown).
- [ ] No secret, credential or `.env` value in the diff.

## 5) Performance

- [ ] `grep -n "findMany" <changed backend files>` — list queries on orders and other
      growing tables are bounded (`take`, date/batch filter) or justified in a comment.
- [ ] No query inside a loop (N+1); use `include`/`select` or one `in` query.
- [ ] Schema diff: every new foreign key or filtered column has an `@@index`.
- [ ] Frontend: independent fetches run in parallel; no fetch added to a layout that
      re-runs on every navigation.

## Severity discipline

Order findings: correctness → security → convention violations → style.
A style nit never blocks handoff on cycle 3; an unguarded admin route always does.
