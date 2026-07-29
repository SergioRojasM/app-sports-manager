## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/mis-reservas-crosstenant-home` off the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migrations (local only)

- [x] 2.1 Create `supabase/migrations/20260729190000_reservas_select_policy_scope_public_to_owner.sql` fixing `reservas_select_authenticated` so the public-training SELECT branch requires `atleta_id = auth.uid()`
- [x] 2.2 Create `supabase/migrations/20260729190100_reservas_reporte_view_add_tenant_nombre.sql` recreating `reservas_reporte_view` with a `tenant_nombre` column (LEFT JOIN `tenants`) — **also sets `security_invoker = true`**, see 2.7
- [x] 2.3 Apply both migrations to the **local** Supabase instance only (never push to the remote/hosted project as part of this change)
- [x] 2.4 Verify locally with two seeded athletes: athlete A cannot read athlete B's reservation on a shared public training via `reservas_reporte_view`
- [x] 2.5 Verify locally that tenant staff (`entrenador`/`administrador`) still see every reservation in their own tenant (including public-training bookings they host) via `gestion-reservas`
- [x] 2.6 Verify locally that a single unfiltered query by `atleta_id` (no `tenant_id` filter) returns reservations across every tenant the seeded athlete belongs to, plus any public-training booking made without membership
- [x] 2.7 **(discovered during 2.4)** `reservas_reporte_view` is owned by `postgres` (`BYPASSRLS`); Postgres views check RLS using the view owner's privileges by default, so the view silently bypassed `reservas` RLS entirely for every authenticated caller regardless of the policy fix in 2.1. Added `security_invoker = true` to the view (baked into migration 20260729190100) and re-verified: an unfiltered query as a non-staff athlete went from returning all 175 seeded rows to returning exactly their own row; a tenant admin still saw all 175 rows in their tenant. Documented in `design.md` and the source user story.

## 3. Types

- [x] 3.1 Add `tenant_nombre: string | null` to `ReservaReportRow` in `src/types/portal/reservas.types.ts`
- [x] 3.2 Make `tenantId` optional on `MisReservasFilters` in `src/types/portal/reservas.types.ts`

## 4. Service

- [x] 4.1 Update `getMisReservas` in `src/services/supabase/portal/reservas.service.ts` to apply `.eq('tenant_id', filters.tenantId)` only when `filters.tenantId` is provided, keeping `.eq('atleta_id', filters.atletaId)` unconditional

## 5. Hook

- [x] 5.1 Update `useMisReservas` in `src/hooks/portal/mis-reservas/useMisReservas.ts` to accept `(atletaId: string)` only — drop the `tenantId` parameter
- [x] 5.2 Remove the `disciplinesService.listDisciplinesByTenant` call; derive a `disciplines: string[]` list of unique, non-null `disciplina` values from the loaded rows
- [x] 5.3 Derive `tenantOptions: { id: string; nombre: string }[]` (unique `tenant_id`/`tenant_nombre` pairs) from the loaded rows
- [x] 5.4 Add `tenantId` filter state, wired into `filters`/`appliedFilters`, `applyFilters`, and `clearFilters`, passed through to `getMisReservas`
- [x] 5.5 Add "Organización" to the CSV export column mapping in `exportCsv`

## 6. Components

- [x] 6.1 Update `MisReservasFiltersPanel` (`src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx`): change the `disciplines` prop to `string[]`; add an "Organización" `<select>` (mirroring `MisSuscripcionesFilters.tsx`'s tenant select) rendered only when `tenantOptions.length > 1`
- [x] 6.2 Update `MisReservasTable` (`src/components/portal/mis-reservas/MisReservasTable.tsx`): add an "Organización" column rendering `tenant_nombre`
- [x] 6.3 Update `MisReservasPage` (`src/components/portal/mis-reservas/MisReservasPage.tsx`): drop the `tenantId` prop, accept `atletaId` only, update the tenant-specific empty-state copy to a cross-tenant message, pass the new organization filter props through

## 7. Pages / Routing

- [x] 7.1 Create `src/app/portal/(atleta)/mis-reservas/page.tsx` — auth check, calls `MisReservasPage` with `atletaId` only (mirror `src/app/portal/(atleta)/mis-suscripciones/page.tsx`)
- [x] 7.2 Replace the contents of `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` with a redirect to `/portal/mis-reservas` (mirror `mis-suscripciones-y-pagos/page.tsx`)

## 8. Navigation

- [x] 8.1 In `src/types/portal.types.ts`, remove the `{ label: 'Mis Reservas', path: 'mis-reservas', icon: 'event_available' }` entry from `ROLE_TENANT_ITEMS.usuario`
- [x] 8.2 Add a `MIS_RESERVAS_MENU_ITEM` constant and include it in the `!tenantId` branch of `resolvePortalMenu`, positioned after `MIS_SUSCRIPCIONES_MENU_ITEM`

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md`: move the `mis-reservas` feature-slice entries (page, component, hook) to reflect the new cross-tenant location under `(atleta)/mis-reservas`, and note the legacy tenant-scoped route now redirects

## 10. Manual Verification

Driven with Playwright against the local dev server + local Supabase, using seeded test accounts with a password set via the local Supabase admin API (`nomember@gmail.com` — non-member public-training booker; `paulacs0196@gmail.com` — Wolfpack `usuario` member). Screenshots captured for each step.

- [ ] 10.1 Manual test: multi-org athlete sees reservations from all their organizations, with a working "Organización" filter — **not verifiable in this local environment**: seed data only has `reservas` rows in a single tenant (Wolfpack), so no seeded athlete has cross-tenant bookings to exercise the multi-org dropdown against. The dropdown's visibility logic (`tenantOptions.length > 1`) and derivation were verified by code review and the single-org case (10.2) confirms it correctly stays hidden. Recommend a follow-up manual pass once multi-tenant booking data exists.
- [x] 10.2 Manual test: single-org athlete does not see the "Organización" filter — confirmed for both test accounts (all their reservations are in Wolfpack); filters panel renders without the dropdown
- [x] 10.3 Manual test: non-member public-training booker sees their booking on `/portal/mis-reservas` — confirmed: `nomember@gmail.com` (no `miembros_tenant` row in Wolfpack) sees their SWIMFEST reservation with "Wolfpack" in the Organización column
- [ ] 10.4 Manual test: athlete with zero reservations sees the new cross-tenant empty state — **not exercised**: no zero-reservation seeded athlete was tested; empty-state copy change was verified by code review only
- [x] 10.5 Manual test: CSV export includes the "Organización" column — confirmed: clicking "Exportar CSV" triggers a download (`mis-reservas-2026-07-29.csv`) with no console errors; column mapping verified by code review
- [x] 10.6 Manual test: old URL `/portal/orgs/{tenant_id}/mis-reservas` redirects to `/portal/mis-reservas` — confirmed for a tenant member (`paulacs0196@gmail.com`); for a non-member the tenant-access guard in `AtletaLayout` correctly intercepts first (expected, pre-existing behavior, not a regression)
- [x] 10.7 Manual test: date-range presets, 60-day custom-range validation, attendance filter, and pagination behave identically to the previous tenant-scoped page — confirmed present and rendering correctly via screenshot (filters panel unchanged apart from the discipline/organization option sourcing); not exhaustively re-clicked through every preset since the underlying logic is untouched by this change

Also confirmed via screenshot: the "Mis Reservas" entry now appears once in the portal-home dropdown menu (after "Mis Suscripciones"), and no longer appears in the tenant-scoped `usuario` menu.

## 11. Finalize

- [x] 11.1 Run typecheck, lint, and tests; fix any failures (do not run a build) — `tsc --noEmit` clean, `eslint` clean on all changed files; no test suite exists in this repo (no test runner configured in `package.json`)
- [x] 11.2 Write the commit message and pull request description summarizing the RLS fix and the cross-tenant page move
