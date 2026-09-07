# Handoff — commit message and PR description (US-0112)

## Commit message

```
feat(plan-in-bookings-report): show the deducted plan and its validity window

Add plan_nombre, plan_fecha_inicio and plan_fecha_fin to
reservas_reporte_view, which backs all three bookings-report surfaces
(per-training CSV, Gestión de Reservas, Mis Reservas). Each column is
coalesce(<ledger lookup>, <reservas.suscripcion_id lookup>) so both
confirmed bookings and deferred plan purchases resolve; the ledger lookup
is a LEFT JOIN LATERAL ... limit 1 so the name and both dates always
describe the same subscription. The dates stay real `date` columns.

Widen reserva_servicios SELECT from administrador-only to tenant staff via
get_trainer_or_admin_tenants_for_authenticated_user(), so coaches — who
already have access to Gestión de Reservas and the per-training CSV — see
plan data instead of a silently blank column.

Drop suscripciones_select_authenticated. That blanket `USING (true)` policy
from the initial migration (20260221000100:525) had been live since day one
because the `drop` that would have removed it sits inside that file's
commented-out ROLLBACK block, so every authenticated user could read every
subscription row in the database. It had to go: the view's su_dir fallback
joins suscripciones directly, so leaving it would have surfaced other
athletes' and other tenants' plan names and validity windows through the
report. Dropping it makes the scoped owner/admin/trainer policies
load-bearing — including for getServicioEntitlements, which reads
suscripciones tenant+athlete-scoped when staff book on behalf of an athlete.

Record suscripcionId in reserva_servicios for unlimited entitlements too, so
those bookings are attributable to a plan. No deduction results: the RPC
independently re-reads `unidades_restantes is null` and skips the update.

Render the plan as one two-line column after Entrenamiento in both
management tables via a shared ReservaPlanCell, and add three separate
columns to all three CSV exports. Plan dates are date-only values, so they
use a split-and-rebuild formatter — a bare new Date('2026-03-01') parses as
UTC midnight and renders 28 Feb in es-CO.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## PR description

```markdown
## Summary

Surfaces the plan a booking's service units were deducted from — and that
subscription's validity window — across all three bookings-report surfaces,
so bookings can be reconciled against sold plans without cross-referencing
the subscriptions module row by row.

Implements US-0112 via the OpenSpec change `plan-in-bookings-report`.

## What changed

**View** — `reservas_reporte_view` gains `plan_nombre`, `plan_fecha_inicio`
and `plan_fecha_fin` (31 columns, up from 28; `security_invoker = true`
preserved). Each is `coalesce(<ledger>, <reservas.suscripcion_id>)`, covering
both the confirmed path and the deferred plan-purchase path (US-0106/US-0110).
The ledger lookup is a `LEFT JOIN LATERAL ... limit 1` rather than a
`string_agg`, so the name and both dates always describe the same
subscription — a merged "Plan A, Plan B" could not be paired with a single
date range.

**RLS** — `reserva_servicios` SELECT widened from administrador-only to
tenant staff. Coaches previously got a silently blank Plan column, which is
indistinguishable from "this booking used no plan".

**Security fix (unplanned, found during verification)** — the blanket
`suscripciones_select_authenticated USING (true)` policy is dropped. See the
note below.

**Write path** — `findServiceSubscriptionsToCharge` now records
`suscripcionId` for unlimited entitlements; previously it sent `null`, so the
link was absent from the database, not merely from the report.

**UI** — a single Plan column after *Entrenamiento* in both management tables
(name + muted validity sub-line, shared `ReservaPlanCell`), and three
separate columns in each of the three CSV exports.

## Heads-up: a pre-existing cross-tenant read on `suscripciones`

`suscripciones_select_authenticated USING (true)` has been live since the
initial migration — the `drop` that would have removed it is inside that
file's commented-out ROLLBACK block. Any authenticated user could read every
subscription row in the database, across all tenants.

This PR drops it, because the view's `su_dir` fallback joins `suscripciones`
directly and would otherwise have leaked other athletes' plan names and
dates through the report (measured: 24 such rows against local seed data).
Dropping it makes the `_own` / `_admin` / `_trainer` policies actually
load-bearing. **All 12 call sites that read `suscripciones` were audited**
and are covered by one of the three; the one to watch is
`planes.service.ts:374`, a delete-guard count that is admin-only and
tenant-scoped.

## Verification

Run against the local Supabase database (never the remote), impersonating
real seeded users via `request.jwt.claims`:

| Check | Result |
|---|---|
| View shape | 31 columns; all 28 legacy columns present; both plan dates `date`-typed; `security_invoker=true` |
| Athlete isolation | sees 5 own subscriptions (was 149), **0** other athletes'; 24 own rows with plan, **0** leaked (was 24 leaked) |
| Coach / admin | 641 rows, 476 with plan — identical for both roles |
| Coach fix is real | coach matches the admin-only helper 0×, the trainer-or-admin helper 1× |
| Cross-tenant | synthetic tenant-B subscription: visible to superuser, **0** rows and **0** leaked plan names for a tenant-A coach |
| Resolution paths | ledger 473/473 populated; no-plan 0/0; fallback resolves `pendiente` and cancelled-with-direct-link rows |
| Coherence | 0 rows where the name and dates come from different subscriptions |
| Multi-service | 2 services / 1 subscription → 1 view row, no LATERAL row multiplication |
| Open-ended | NULL `fecha_inicio`/`fecha_fin` → name kept, dates NULL (UI: `Sin fecha`) |
| Unlimited plan | ledger row records the subscription, `unidades_restantes` stays NULL, report populated |
| Finite plan | exactly one unit deducted (10 → 9) |
| Cancellation | units restored (9 → 10); cancelled row reports no plan (documented limitation) |
| Date rendering | `2026-03-01` → "1 de mar de 2026" (the old formatter gives "28 de feb de 2026") |
| CSVs | per-training 25 headers aligned 1:1 with 25 row keys; both management CSVs carry the three columns |
| xlsx export | untouched — 0 references to the view or plan fields |

`npx tsc --noEmit` passes. `npm run lint` reports 36 pre-existing problems,
byte-identical to the `develop` baseline; the files touched here lint clean.

**This project has no test runner, test script or test files, so no test
suite was run.**

## Known limitations (documented in the migration header)

- Cancelled bookings report no plan — `cancel_and_restore_service_units`
  deletes the ledger rows when restoring units.
- No backfill for unlimited plans — historical rows stored
  `suscripcion_id = NULL` and are not reconstructible.
- A booking drawing services from two subscriptions reports one,
  deterministically.

## Deployment

The migration was applied **locally only**. It drops a policy that has been
live since the initial migration, so review that change deliberately before
it reaches any shared environment.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
