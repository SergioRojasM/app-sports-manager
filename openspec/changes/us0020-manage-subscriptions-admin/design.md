## Context

The proposal `us0020-manage-subscriptions-admin` adds the first administrator-facing subscription management module to the portal. US-0019 (already deployed) introduced the athlete self-service flow which writes rows to `public.suscripciones` and `public.pagos`. As of today no RLS policies allow administrators to read or mutate those rows and no UI exposes them.

Current state relevant to this design:

- `public.suscripciones`: has `estado` constraint `('pendiente','activa','vencida','cancelada')` (updated by US-0019 migration `20260304140346`). Columns include `clases_plan`, `comentarios` added by the same migration.
- `public.pagos`: `estado` in `('pendiente','validado','rechazado')`, `validado_por uuid FK → usuarios`, `fecha_validacion timestamptz`.
- Existing RLS on `suscripciones`: `suscripciones_select_own` + `suscripciones_insert_own` — restricted to `atleta_id = auth.uid()`. No UPDATE policy for any role.
- Existing RLS on `pagos`: `pagos_insert_own` — restricted to linked `atleta_id`. No SELECT or UPDATE policy for admins.
- Admin helper used across the codebase: `public.get_admin_tenants_for_authenticated_user()` returns the set of `tenant_id` values where the current user holds the `administrador` role with `estado = 'activo'`.
- Feature slice pattern: `page → component → hook → service → types` per `projectspec/03-project-structure.md`. Existing reference slices: `gestion-equipo`, `planes`.

Stakeholders:
- Tenant administrators (end users performing validations).
- Athletes (their existing RLS must remain unchanged).
- Frontend team (new feature slice).
- Data/backend team (new migration).

## Goals / Non-Goals

**Goals:**
- Provide administrators with a full-page view of all `suscripciones` + their latest `pagos` for their tenant.
- Implement approve/reject actions for both payment and subscription status.
- Add admin-scoped RLS policies (SELECT + UPDATE) on `suscripciones` and `pagos` without disturbing athlete policies.
- Follow existing feature slice conventions so the module is consistent with `gestion-equipo` and `planes`.
- Ensure the module is unreachable by athletes and coaches through the `(administrador)` route group guard.

**Non-Goals:**
- Creating, editing, or deleting plans.
- Server-side pagination or filtering (client-side is sufficient for expected data volumes).
- Email/push notifications on approval or rejection.
- Bulk actions.
- Athlete-facing subscription history.

## Decisions

### 1) Single joined query — no N+1 per-row pagos fetch

**Decision:** `fetchSuscripcionesAdmin(tenantId)` issues **one** Supabase query that joins `suscripciones` ← `usuarios` (atleta), `planes`, and the latest `pagos` record per subscription using a nested select on `pagos(*)` + ordering by `created_at` desc, then the service mapper picks `pagos[0]`.

```
suscripciones
  .select(`
    *,
    atleta:usuarios!suscripciones_atleta_id_fkey(nombre, apellido, email),
    plan:planes!suscripciones_plan_id_fkey(nombre),
    pagos(id, monto, metodo_pago, comprobante_url, estado,
          validado_por, fecha_pago, fecha_validacion, created_at)
  `)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
```

The service mapper picks `pagos[0]` as the latest payment.

**Rationale:** Avoids N+1 round-trips; the existing index `idx_suscripciones_tenant_id` ensures DB-side performance is acceptable.

**Alternatives considered:**
- Separate `pagos` query per row: rejected due to N+1 overhead.
- Database view: acceptable but adds DDL complexity; a JS mapper is simpler and sufficient.

---

### 2) Stats derived client-side from the fetched array

**Decision:** `useGestionSuscripciones` computes `SuscripcionesAdminStats` via `useMemo` over the already-fetched `rows` array — no second DB round-trip.

**Rationale:** Keeps the fetch path to a single call; stats are a projection of the same data already in memory. Consistent with `gestion-equipo`'s `getEquipoStats` pattern.

**Alternatives considered:**
- Separate count queries: rejected as an extra round-trip for data already available.

---

### 3) Two separate mutation hooks: `useValidarPago` + `useValidarSuscripcion`

**Decision:** Separate hooks for payment validation and subscription validation, each owning its own loading/error state and calling its respective service function. Both accept an `onSuccess` callback that triggers `refresh()` in the parent hook.

**Rationale:** Modal opening is per-action; keeping concerns separate makes each modal component simpler and independently testable. Mirrors the `useReservaForm` / `useEntrenamientoForm` split pattern already in the codebase.

**Alternatives considered:**
- Single `useValidarSuscripcion` hook that handles both payment and subscription: rejected because the two modals have different field sets and the subscription approval has additional business logic (back-fill of dates/classes).

---

### 4) Subscription approval business logic in the service layer

**Decision:** `ValidarSuscripcionModal` shows pre-computed default values that the admin can override before submitting. `updateSuscripcionEstado` in the service receives the final admin-confirmed values and issues a single PATCH:
- `estado = 'activa'`
- `fecha_inicio`: defaults to today if currently null; admin can change it in the modal.
- `fecha_fin`: auto-calculated as `fecha_inicio + vigencia_meses months` using `date-fns addMonths`; admin can override it in the modal before approving. (`duracion_dias` was dropped by migration `20260301000200` and replaced by `vigencia_meses`.)
- `clases_restantes = clases_plan` if currently null; admin can adjust it in the modal.

The hook pre-populates these fields when `openSuscripcionModal(row)` is called (using `row.plan` join data which includes `vigencia_meses`), exposes them as editable form state inside `useValidarSuscripcion`, and passes the final values to the service only on submit.

The join query in `fetchSuscripcionesAdmin` must include `planes(nombre, vigencia_meses, clases_incluidas)` to make back-fill calculation possible client-side.

**Rationale:** Auto-calculation reduces admin burden while allowing corrections for edge cases (e.g., pro-rated periods, trial extensions). `vigencia_meses` is the canonical plan duration field as of migration `20260301000200`. Business rules stay in the hook/service layer, not in components.

**Alternatives considered:**
- Supabase database function (RPC) for approval: considered for atomicity, deferred to future if race conditions become an issue.
- Admin sets all fields manually with no defaults: rejected as too error-prone for repeated operations.

---

### 5) Two validation modals as separate components, pre-populated by parent hook state

**Decision:** `ValidarPagoModal` and `ValidarSuscripcionModal` receive the selected `SuscripcionAdminRow` as a prop and call hook-provided `onApprove` / `onReject` callbacks. The parent hook (`useGestionSuscripciones`) manages `selectedRow` state and `modalType: 'pago' | 'suscripcion' | null`.

**Rationale:** Keeps modal components pure/presentational. The parent hook is the single source of truth for which row is selected and which modal is open.

**Alternatives considered:**
- Single combined modal with conditional sections: rejected for readability and because the approve/cancel logic is completely different between the two.

---

### 6) RLS strategy — extend admin SELECT/UPDATE without touching athlete policies

**Decision:** New migration `20260305000100_gestion_suscripciones_admin_rls.sql` adds:

```sql
-- suscripciones: admin select
create policy suscripciones_select_admin on public.suscripciones
  for select to authenticated
  using (tenant_id in (select get_admin_tenants_for_authenticated_user()));

-- suscripciones: admin update
create policy suscripciones_update_admin on public.suscripciones
  for update to authenticated
  using  (tenant_id in (select get_admin_tenants_for_authenticated_user()))
  with check (tenant_id in (select get_admin_tenants_for_authenticated_user()));

-- pagos: admin select
create policy pagos_select_admin on public.pagos
  for select to authenticated
  using (tenant_id in (select get_admin_tenants_for_authenticated_user()));

-- pagos: admin update
create policy pagos_update_admin on public.pagos
  for update to authenticated
  using  (tenant_id in (select get_admin_tenants_for_authenticated_user()))
  with check (tenant_id in (select get_admin_tenants_for_authenticated_user()));
```

`grant select, update on public.suscripciones, public.pagos to authenticated;` is included to ensure role-level privileges are granted before the RLS policies are evaluated.

Existing athlete policies (`suscripciones_select_own`, `pagos_insert_own`, etc.) are left untouched since Supabase evaluates multiple policies with `OR` logic.

**Rationale:** Reuses the established admin-tenant helper function, consistent with `disciplinas` and `escenarios` admin mutation policies.

**Alternatives considered:**
- Service Role key bypass: rejected — production mutations from authenticated clients must go through RLS.

---

### 7) Navigation: add entry to `ROLE_TENANT_ITEMS.administrador` in `portal.types.ts`

**Decision:** Admin menu items are declared in the `ROLE_TENANT_ITEMS` constant inside `src/types/portal.types.ts`. Adding `gestion-suscripciones` means appending one entry to the `administrador` array:

```ts
{ label: 'Suscripciones', path: 'gestion-suscripciones', icon: 'subscriptions' }
```

`RoleBasedMenu` is a pure renderer that receives the resolved items; no changes to that component are needed.

**Rationale:** `ROLE_TENANT_ITEMS` is the single source of truth for role-scoped tenant navigation, confirmed by grepping the codebase. The `resolvePortalMenu` function already maps these entries to full `href` values at runtime.

**Alternatives considered:**
- Editing `RoleBasedMenu.tsx` directly: rejected — the component has no knowledge of routes, only renders what it receives.

## Architecture Diagram

```
User (Admin)
    │
    ▼
app/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones/page.tsx
    │  (role guard enforced by (administrador) layout)
    ▼
components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx
    ├── SuscripcionesStatsCards          ← derived from hook.stats
    ├── SuscripcionesHeaderFilters       ← search + status chips
    ├── SuscripcionesTable               ← rows + action buttons
    │       ├── SuscripcionEstadoBadge
    │       └── PagoEstadoBadge
    ├── ValidarPagoModal                 ← opened by hook.openPagoModal(row)
    └── ValidarSuscripcionModal          ← opened by hook.openSuscripcionModal(row)
    │
    ▼
hooks/portal/gestion-suscripciones/
    ├── useGestionSuscripciones          ← fetch, filter, search, stats, modal state
    ├── useValidarPago                   ← approve/reject payment
    └── useValidarSuscripcion            ← approve/cancel subscription
    │
    ▼
services/supabase/portal/gestion-suscripciones.service.ts
    ├── fetchSuscripcionesAdmin(tenantId) → SuscripcionAdminRow[]
    ├── updatePagoEstado(id, estado, validadoPor) → void
    └── updateSuscripcionEstado(id, action, row) → void
    │
    ▼
Supabase: public.suscripciones + public.pagos + public.usuarios + public.planes
```

## Risks / Trade-offs

- **[Risk] Multiple RLS policies evaluated with OR** — an admin is also an authenticated user, so `suscripciones_select_own` (athlete policy) would let an admin see their own athlete subscriptions while `suscripciones_select_admin` lets them see all tenant subscriptions. This is the expected behavior and not a regression. → Mitigation: Document this in code comments.
- **[Risk] `pagos[0]` assumption** — the service picks the first pago returned; if an athlete registers multiple payment attempts the oldest in the result set might be shown if Supabase pagination order is not guaranteed. → Mitigation: Explicitly add `.order('created_at', { foreignTable: 'pagos', ascending: false })` to the nested select so the latest payment is always first.
- **[Trade-off] Client-side filter** — works well for ≤500 subscriptions. Organizations with heavy subscription volumes will see performance degradation. Accepted as a non-goal for this iteration; server-side pagination can be added later.
- **[Risk] Back-fill of `fecha_fin` requires plan `vigencia_meses`** — `duracion_dias` was dropped by migration `20260301000200`; `vigencia_meses` is the canonical field. → Mitigation: Include `planes(nombre, vigencia_meses, clases_incluidas)` in the join query; use `date-fns addMonths` for the calculation. Admin can override the computed value in the modal before confirming.

## Migration Plan

1. Write `20260305000100_gestion_suscripciones_admin_rls.sql`.
2. Run `supabase db push` locally and verify with test admin + athlete sessions.
3. Confirm athlete RLS policies (`suscripciones_select_own`) still only return own rows.
4. Deploy migration to staging before any feature code ships (migration is backward-compatible — additive only).

**Rollback:** Drop the four new policies. No data schema changes to reverse.

## Open Questions

*All questions resolved.*

- ~~**Where exactly are the admin menu items defined?**~~ → `ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`. Add one entry there; no other file needs to change.
- ~~**Should `fecha_fin` use `duracion_dias` or `vigencia_meses`?**~~ → `vigencia_meses` (`duracion_dias` was dropped in migration `20260301000200`). Auto-calculated as `fecha_inicio + vigencia_meses months`; admin can override in the approval modal.
