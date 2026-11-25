## Context

`planes` carries two independent flags: `activo` and `es_publico` (US-0093). Access is enforced in the database:

- `planes_select_authenticated` — readable when (public AND active) OR caller is a member of the tenant OR caller holds a subscription to the plan. Written over the row's own columns (not `can_read_plan(id)`) because `INSERT … RETURNING` fails otherwise (`20260728000300_fix_select_policies_returning.sql`).
- `can_read_plan(uuid)` — same rule, used by the SELECT policies of `plan_tipos`, `planes_disciplina` and (through `can_read_plan_tipo`) `plan_tipos_servicios`. Latest definition: `20260916120200_miembros_pendiente_activacion.sql`.
- `can_subscribe_to_plan(uuid, uuid)` — `WITH CHECK` of `suscripciones_insert_own`.
- `suscripciones_insert_admin` — admins insert subscriptions for any plan of their tenant.

`activo` is read by many SQL functions, BI facts and client filters. Requirements: `specs/plan-hidden-status/spec.md`. Motivation: `proposal.md`.

## Goals / Non-Goals

**Goals:**
- A plan state that is assignable by admins yet invisible and non-purchasable for athletes, enforced by RLS.
- No behavior change for existing plans.
- Athletes who receive such a plan keep seeing it in their own subscriptions and can book with it.

**Non-Goals:**
- Courtesy-specific subscription/payment logic, per-subtype visibility, BI changes, new pages or components.

## Decisions

### 1. Additive boolean `visible_atletas` instead of replacing `activo` with an enum
The UI shows one three-value "Estado"; storage is `activo` + `visible_atletas`.
- *Alternative — `estado` enum replacing `activo`*: cleaner model, but requires rewriting every function, view, BI fact and client filter that reads `planes.activo`, with high regression risk for no user-visible gain.
- *Alternative — reuse `es_publico` with a third value*: conflates two axes (outside-tenant exposure vs. athlete visibility).

Mapping lives in one place, `getPlanEstado(plan)` / `PLAN_ESTADO_LABELS` in `planes.types.ts`.

### 2. Inactivating does not touch `visible_atletas`
`setEstado('inactivo')` only sets `activo = false`. Otherwise deactivating and reactivating a courtesy plan would silently expose it to athletes. Reactivation requires an explicit choice of Activo or Activo no visible.

### 3. Hidden plans can never be public — check constraint
`check (visible_atletas or not es_publico)`. With it, the public branches of `planes_select_authenticated` and `servicios_select_authenticated` cannot match a hidden plan, so `servicios` policy needs no change. The form clears and disables "Plan público"; the service maps `23514` to an inline error as defense in depth.

### 4. Read access by role
```
                       hidden plan readable?
admin of tenant        yes  (trainer-or-admin branch)
trainer of tenant      yes  (trainer-or-admin branch)  — UI catalog still filters it out
athlete member         no   (member branch now requires visible_atletas)
subscription holder    yes  (existing "already subscribed" branch)
non-member             no   (cannot be public)
```
Trainers keep RLS read because `reservas_reporte_view` is `security_invoker` and joins `planes`; blocking them would blank the plan name in `gestion-reservas` and its CSV. Hiding from the trainer catalog is done client-side in `usePlanesView` (`activo && visible_atletas`) — acceptable since trainers are staff and the requirement targets athletes.

The policy uses `get_trainer_or_admin_tenants_for_authenticated_user()` (confirm its output column name before writing the subquery) plus `get_member_tenants_for_authenticated_user()`; both already exclude `pendiente_activacion`.

### 5. Purchase gate in `can_subscribe_to_plan`
Add `and p.visible_atletas`. A forged self-service insert fails with `42501`, already mapped to `SuscripcionServiceError('plan_unavailable')`. Admin assignment (including an admin assigning to themself) passes through `suscripciones_insert_admin`, which is OR-ed and unchanged.

### 6. Client layering (page → component → hook → service → types)
- Pages: unchanged.
- Components: `PlanFormModal` swaps the checkbox for a `<select>` and calls `onChangeEstado`; `PlanesTable` renders the badge from `row.estado`; subscription modals render the label provided by their hooks.
- Hooks: `usePlanForm.setEstado` owns the state transition rules; `usePlanes` maps to table items and payloads; `usePlanesView` filters; `useCrearSuscripcion` / `useEditarSuscripcion` keep the `activo` filter and expose `visible_atletas`.
- Service: `planes.service.ts` adds the column to selects/writes and `.eq('visible_atletas', true)` to `getPlanesPublicos` / `getPlanesMiembro` (so admins/trainers browsing the catalog modal do not see hidden plans there either).
- Types: `planes.types.ts`.

## Risks / Trade-offs

- [Policy self-query breaks `INSERT … RETURNING` on `planes`] → Keep `planes_select_authenticated` over own columns; test creating a plan as admin after the migration.
- [A client query filters only by `activo` and leaks a hidden plan to athletes] → RLS is the gate; an athlete simply gets no row. Verified by SQL per role.
- [Plan switched to hidden while athletes hold pending self-service subscriptions] → Existing rows are untouched and stay readable via the subscription branch; only new self-service inserts are blocked.
- [Trainers can read hidden plans through the API] → Accepted; needed for reports.
- [Two columns can drift from the three UI states] → Single mapping helper; `inactivo` ignores `visible_atletas`.

## Migration Plan

1. Apply `20261005120000_planes_visible_atletas.sql` **locally only** (`supabase migration up` / `db reset`). Never push to the remote Supabase project as part of this change.
2. Backfill is implicit: `default true` keeps all existing plans visible.
3. Rollback: restore the previous `planes_select_authenticated`, `can_read_plan`, `can_subscribe_to_plan` definitions, drop the constraint and the column.

## Open Questions

- None blocking. If trainers must also be blocked at RLS level later, the reports view needs a definer-side plan-name lookup first.
