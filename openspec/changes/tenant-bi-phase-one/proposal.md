## Why

Tenant administrators currently reconcile payments, bookings, attendance, subscriptions, and membership status across separate operational screens. This prevents timely decisions about revenue, capacity, and athlete coverage. Phase One introduces a secure, tenant-scoped analytics surface using the existing transactional data and the visual hierarchy of the Operations Dashboard reference node `zfVKC`.

## What Changes

- Add an administrator-only Analytics route at `/portal/orgs/[tenant_id]/analitica` and an `Analítica` navigation item.
- Add a protected BI read layer: private `bi` facts for payments, bookings, and attendance, plus one administrator-authorized RPC that returns the dashboard dataset.
- Deliver four client-side views sharing one filtered response: `Resumen` (default), `Ingresos`, `Operación`, and `Equipo`.
- Add an `America/Bogota` date-range filter with presets and custom dates; refresh dashboard data once for each applied range and preserve the current filter while switching tabs.
- Present revenue, operations, and team metrics with dense operational dashboard layout patterns based on `zfVKC`: page header and period filter, KPI row, structured content panels, readable tables, and responsive empty/error states.
- Protect sensitive data by returning only aggregate metrics and approved athlete display-name rankings/drill-downs; no contact, identity, profile, form-response, or proof-of-payment data is included.
- Define validated payments as recognized revenue, non-cancelled bookings as capacity consumption, and current active memberships as the team-health source of truth.

## Capabilities

### New Capabilities

- `tenant-business-intelligence`: Provides administrator-only, tenant-scoped revenue, operations, and team dashboards with a protected aggregate data contract, `America/Bogota` date filtering, and accessible dashboard-tab navigation.

### Modified Capabilities

- `portal-role-navigation`: Adds the administrator-only `Analítica` route entry to the tenant navigation menu.

## Impact

- **Database:** New private `bi` schema, three fact views, protected `get_tenant_bi_dashboard` RPC, and supporting read indexes. Existing transactional tables and RLS policies remain unchanged.
- **Frontend:** New administrator route, analytics components, hook, types, Supabase portal service, and menu item.
- **Security:** Dashboard access is independently enforced by a `SECURITY DEFINER` RPC that verifies administrator membership for the requested tenant; direct browser access to `bi` views is not granted.
- **Design reference:** `projectspec/designs/pencil/grit-arena-v2.pen`, node `zfVKC` (Operations Dashboard), guides the dark dashboard shell, dense KPI layout, date control placement, and operational panels. No new design-system dependency is added.
- **Non-goals:** This change does not add profitability/cost analytics, marketplace visit conversion, historical membership snapshots, currency configuration, budget targets, direct payment-to-training attribution, browser-timezone reporting, or materialized BI refresh jobs.

## Files to Create or Modify

- `supabase/migrations/20260921130000_tenant_bi_phase_one.sql`
- `src/types/portal/analitica.types.ts`
- `src/services/supabase/portal/analitica.service.ts`
- `src/services/supabase/portal/index.ts`
- `src/hooks/portal/analitica/useAnalitica.ts`
- `src/components/portal/analitica/AnaliticaPage.tsx`
- `src/components/portal/analitica/AnaliticaDateRangeFilter.tsx`
- `src/components/portal/analitica/AnaliticaTabs.tsx`
- `src/components/portal/analitica/AnaliticaKpiCard.tsx`
- `src/components/portal/analitica/IngresosDashboard.tsx`
- `src/components/portal/analitica/OperacionDashboard.tsx`
- `src/components/portal/analitica/EquipoDashboard.tsx`
- `src/components/portal/analitica/index.ts`
- `src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx`
- `src/types/portal.types.ts`
- `projectspec/03-project-structure.md`
- `projectspec/bi_proposal/propuesta_tableros_control_bi.md`

## Implementation Plan

1. Add the private BI fact views, protected aggregate RPC, authorization guard, validation, and indexes in one migration.
2. Define typed dashboard contracts and create the RLS-aware portal service that calls only the aggregate RPC.
3. Build the shared date-filtering hook and the reusable analytics UI slice, following the `zfVKC` dashboard hierarchy.
4. Add the administrator page and menu entry; connect `Resumen`, `Ingresos`, `Operación`, and `Equipo` tabs to one shared response.
5. Verify tenant isolation, role access, metric reconciliation, empty/error states, keyboard navigation, linting, and type checking.