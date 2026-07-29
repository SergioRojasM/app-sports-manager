## Why

"Mis Reservas" (US-0074) only exists nested under a specific organization's tenant route (`/portal/orgs/[tenant_id]/(atleta)/mis-reservas`). An athlete who belongs to multiple organizations has to check each one separately, and an athlete who books a public training through the cross-tenant marketplace (US-0089/US-0094) — without holding any membership in the hosting organization — has **no page at all** where that booking is visible, since reaching the tenant-scoped route requires passing a membership/role gate. This mirrors the exact problem US-0093 already solved for subscriptions ("Mis Suscripciones"), and reservations need the same fix now.

## What Changes

- Move the athlete's personal reservation history from `/portal/orgs/[tenant_id]/(atleta)/mis-reservas` to a cross-tenant page at `/portal/(atleta)/mis-reservas`, scoped only by `atleta_id = auth.uid()` — no tenant selection required.
- **BREAKING**: `reservasService.getMisReservas` and `useMisReservas` drop the mandatory `tenantId` parameter; `tenantId` becomes an optional narrowing filter instead.
- Add an "Organización" filter (shown only when the athlete's reservations span more than one tenant) and an "Organización" column to the results table, mirroring the existing `MisSuscripcionesFilters` tenant-select pattern.
- Replace the tenant-scoped discipline filter (which called a membership-gated `disciplinesService.listDisciplinesByTenant(tenantId)`) with options derived from the athlete's own loaded reservation rows, so disciplines from organizations the athlete isn't a member of (e.g., a public training's host org) are no longer silently dropped from the filter.
- Extend `reservas_reporte_view` with a `tenant_nombre` column so the UI can label each row's organization without an extra query.
- **Fix a pre-existing RLS over-exposure** on `public.reservas`: the `reservas_select_authenticated` policy's public-training branch currently has no `atleta_id = auth.uid()` check, meaning any authenticated user can read *any other athlete's* reservation on a published public training. This is scoped to the caller's own booking. This fix is a prerequisite for safely relying on RLS (rather than the query) to make the new cross-tenant page correct.
- **Fix a second, broader over-exposure discovered while verifying the above**: `reservas_reporte_view` is owned by `postgres` (which has `BYPASSRLS`), and Postgres views check row-level security using the *view owner's* privileges by default — so the view silently bypassed all `reservas` RLS for every authenticated caller, regardless of tenant or query filters. Adding `security_invoker = true` to the view closes this at the source.
- The old tenant-scoped route becomes a redirect to `/portal/mis-reservas` (same pattern as the existing `mis-suscripciones-y-pagos` legacy redirect).
- The "Mis Reservas" nav entry moves from the tenant-scoped menu (`ROLE_TENANT_ITEMS.usuario`) to the cross-tenant portal-home menu, visible to every authenticated user regardless of per-tenant role — same rationale already documented for "Mis Suscripciones": a reservation is always self-scoped by `atleta_id`, and a public-training booker may hold no tenant membership at all.

## Capabilities

### New Capabilities
- `athlete-reservations-view`: cross-tenant page (`/portal/(atleta)/mis-reservas`) where an authenticated athlete views their own reservations across every organization plus public-training bookings, with date/attendance/discipline/organization filtering, pagination, CSV export, and empty/error states. Naming mirrors the existing `user-subscriptions-and-payments-view` capability, which this story follows as its direct precedent.

### Modified Capabilities
- `training-booking`: the "RLS enforcement on reservas" requirement's scenarios ("Atleta can only read own bookings", "Cross-tenant access is blocked") are updated to reflect the corrected policy — an athlete's own bookings are readable regardless of tenant membership when the training is public, while another athlete's booking on that same public training remains invisible to a non-member.
- `portal-role-navigation`: the tenant-scoped `mis-reservas` entry is removed from the `usuario` role's tenant menu; a cross-tenant "Mis Reservas" entry is added to the portal-home menu shown to all authenticated users, mirroring the existing `mis-suscripciones` entry.

## Impact

- **Database**: two migrations — (1) fix to `reservas_select_authenticated` policy, (2) `reservas_reporte_view` recreated with `tenant_nombre`. No new tables/columns on `reservas` itself.
- **Services**: `src/services/supabase/portal/reservas.service.ts` (`getMisReservas`).
- **Types**: `src/types/portal/reservas.types.ts` (`ReservaReportRow`, `MisReservasFilters`).
- **Hooks**: `src/hooks/portal/mis-reservas/useMisReservas.ts`.
- **Components**: `src/components/portal/mis-reservas/{MisReservasPage,MisReservasFiltersPanel,MisReservasTable}.tsx`.
- **Routing**: new `src/app/portal/(atleta)/mis-reservas/page.tsx`; `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` becomes a redirect.
- **Navigation**: `src/types/portal.types.ts` (`resolvePortalMenu`).
- **Docs**: `projectspec/03-project-structure.md` housekeeping update.
- **Unaffected**: `gestion-reservas` (staff-facing tenant management view) and its RLS branch; booking creation/cancellation flows.

## Non-goals

- No changes to booking creation, cancellation, or attendance management — this story is read-only (the athlete's history view).
- No new design/visual system — this reuses the existing `MisReservasPage`/`MisReservasTable` layout and the `MisSuscripcionesFilters` organization-select pattern already established in the codebase; no new mockups were requested or required for this relocation.
- No change to `gestion-reservas` (staff view) behavior, columns, or access.
- No change to how public trainings are published or how the marketplace booking flow itself works.

## Implementation Plan (page → component → hook → service → types)

1. **Database**: apply the RLS policy fix migration, then the `reservas_reporte_view` migration adding `tenant_nombre`.
2. **Types**: update `ReservaReportRow` (`tenant_nombre`) and `MisReservasFilters` (`tenantId` optional) in `reservas.types.ts`.
3. **Service**: update `getMisReservas` in `reservas.service.ts` to make the tenant filter conditional.
4. **Hook**: update `useMisReservas` to drop the required `tenantId` param, derive `disciplines`/`tenantOptions` from loaded rows, and add organization filter state.
5. **Components**: update `MisReservasFiltersPanel` (organization select, discipline options as strings), `MisReservasTable` (organization column), `MisReservasPage` (drop `tenantId` prop, updated copy).
6. **Page**: add the new cross-tenant page under `(atleta)/mis-reservas`; convert the old tenant-scoped page to a redirect.
7. **Navigation**: update `resolvePortalMenu` in `portal.types.ts`.
8. **Docs**: update `projectspec/03-project-structure.md`.
