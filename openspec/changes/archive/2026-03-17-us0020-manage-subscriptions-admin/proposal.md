## Why

US-0019 gave athletes a self-service flow to subscribe to plans and register payments, but left no administrator-facing interface to review, filter, or validate those requests. Administrators currently have no way to approve subscriptions or confirm payments, making the subscription workflow incomplete.

## What Changes

- New admin-only module `gestion-suscripciones` added under the `(administrador)` route group.
- New Supabase migration granting admins SELECT + UPDATE RLS policies on `public.suscripciones` and `public.pagos` (scoped to their tenant).
- Stats cards surface three KPIs: active subscriptions, pending subscriptions, subscriptions with a pending payment.
- Table lists all tenant subscriptions joined with athlete info, plan info, and the latest payment record per subscription.
- Free-text search + quick-filter chips for subscription status and payment status (client-side, no extra round-trips).
- "Validate Payment" and "Validate Subscription" action buttons per row open a detail modal with approve/reject controls.
- On approval, the service layer writes the correct state transitions and back-fills missing date/class fields.
- `RoleBasedMenu` updated to include `gestion-suscripciones` exclusively under the administrator role.

## Capabilities

### New Capabilities

- `subscription-management`: End-to-end admin module for viewing, filtering, and validating tenant subscriptions and their linked payments. Covers DB policies, route page, components (table + stats cards + header filters + two validation modals + status badges), hooks, service, and types.

### Modified Capabilities

- `portal-role-navigation`: The administrator navigation menu gains a new entry for `gestion-suscripciones`. This is a spec-level change because the set of role-visible routes is a guarded requirement.

## Non-goals

- Athlete-facing subscription history or payment history views — those belong to a future user-profile story.
- Bulk approve/reject actions — out of scope for this iteration.
- Push or email notifications triggered by approval / rejection.
- Pagination or server-side filtering — the module targets organizations with up to a few hundred subscriptions; client-side filtering is sufficient.
- Creating, editing, or deleting plans — already covered by `plan-management`.

## Files to Create / Modify

### New files

```
supabase/migrations/20260305000100_gestion_suscripciones_admin_rls.sql

src/app/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones/page.tsx

src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx
src/components/portal/gestion-suscripciones/SuscripcionesStatsCards.tsx
src/components/portal/gestion-suscripciones/SuscripcionesHeaderFilters.tsx
src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx
src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx
src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx
src/components/portal/gestion-suscripciones/SuscripcionEstadoBadge.tsx
src/components/portal/gestion-suscripciones/PagoEstadoBadge.tsx
src/components/portal/gestion-suscripciones/index.ts

src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts
src/hooks/portal/gestion-suscripciones/useValidarPago.ts
src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts

src/services/supabase/portal/gestion-suscripciones.service.ts

src/types/portal/gestion-suscripciones.types.ts
```

### Modified files

```
src/components/portal/RoleBasedMenu.tsx        — add gestion-suscripciones nav entry (administrador only)
projectspec/03-project-structure.md            — document new feature slice
```

## Implementation Plan

1. **DB** — Write and apply migration `20260305000100_gestion_suscripciones_admin_rls.sql` with admin SELECT + UPDATE policies on `suscripciones` and `pagos`.
2. **Types** — Define `SuscripcionAdminRow`, `PagoAdminRow`, `SuscripcionesAdminStats`, and status enum types in `gestion-suscripciones.types.ts`.
3. **Service** — Implement `fetchSuscripcionesAdmin(tenantId)` (single join query: suscripciones ← usuarios, planes, pagos), `updateSuscripcionEstado(...)`, and `updatePagoEstado(...)` in `gestion-suscripciones.service.ts`.
4. **Hooks** — Build `useGestionSuscripciones` (fetch, client-side filter/search, stats derivation), `useValidarPago`, and `useValidarSuscripcion`.
5. **Components** — Implement in order:
   - `SuscripcionEstadoBadge` + `PagoEstadoBadge` (pure display)
   - `SuscripcionesStatsCards` (derived from hook data)
   - `SuscripcionesHeaderFilters` (search input + status chips)
   - `SuscripcionesTable` (rows + action buttons)
   - `ValidarPagoModal` + `ValidarSuscripcionModal` (detail + approve/reject)
   - `GestionSuscripcionesPage` (assembles all sub-components)
6. **Route** — Create `(administrador)/gestion-suscripciones/page.tsx` that renders `GestionSuscripcionesPage` with `tenantId`.
7. **Navigation** — Update `RoleBasedMenu.tsx` to add the new entry under `administrador`.
8. **Docs** — Update `projectspec/03-project-structure.md` to reflect the new slice.

## Impact

- **Supabase DB**: New RLS policies on `suscripciones` and `pagos` for admin role. No schema changes.
- **Portal routing**: New page added under `(administrador)` — no changes to existing routes.
- **Navigation**: `RoleBasedMenu` change is additive; no existing menu items affected.
- **Existing services**: `suscripciones.service.ts` and `pagos.service.ts` (athlete-facing) are unaffected; the new service is a separate file.
- **Dependencies**: No new npm packages required.
