## Why

The admin subscription management view (`gestion-suscripciones`) shows every tenant subscription in a single flat table. Since US-0093 introduced public plans purchasable by non-members, that list now mixes subscriptions requested by current tenant members with subscriptions requested by outsiders who hold no `miembros_tenant` row, and there is no way to tell them apart. Administrators need to separate these two populations to act on them correctly (e.g. member renewals vs. outside sign-ups).

## What Changes

- Add a tab bar to the admin subscription management page with two tabs — "Miembros" and "No miembros" — mirroring the existing `Equipo` / `Solicitudes` / `Bloqueados` tab-bar pattern in `EquipoPage`. Each tab shows a count badge.
- Scope the subscription table, stats cards, search, and status-chip filters to the active tab; switching tabs resets pagination to page 1.
- Add a "Tipo" column to `SuscripcionesTable` rendering a "Miembro" / "No miembro" badge (new `SuscripcionTipoBadge` component) on every row, visible in both tabs.
- Compute membership (`es_miembro`) at read time in `gestion-suscripciones.service.ts` by fetching the tenant's `miembros_tenant.usuario_id` set alongside the existing subscriptions query and checking each row's `atleta_id` against it — no persisted/snapshotted flag, so membership always reflects current state (an athlete removed from the team after subscribing shows as "No miembro").
- Extend `SuscripcionAdminRow` with `es_miembro: boolean` and add a `SuscripcionTab` type; extend `useGestionSuscripciones` with tab-aware filtering and a `tabCounts` value.

No breaking changes; no database migration.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `subscription-management`: the admin subscription list requirement gains a membership tab split (Miembros / No miembros) with per-tab counts, a per-row membership badge column, and tab-scoped stats/filters/pagination. The underlying data-fetch requirement gains a membership lookup against `miembros_tenant`.

## Impact

- **Types**: `src/types/portal/gestion-suscripciones.types.ts` — new `es_miembro` field, new `SuscripcionTab` type.
- **Service**: `src/services/supabase/portal/gestion-suscripciones.service.ts` — `fetchSuscripcionesAdmin` issues one additional read-only query against `miembros_tenant` (existing `miembros_tenant_select_authenticated` RLS policy, no policy change).
- **Hook**: `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` — accepts `activeTab`, filters/stats/tabCounts.
- **Components**: `GestionSuscripcionesPage.tsx` (tab bar, tab-aware empty states), `SuscripcionesTable.tsx` (new column), new `SuscripcionTipoBadge.tsx`.
- **Database**: none — no migration, no RLS change (membership already readable by any authenticated user via the pre-existing open `miembros_tenant_select_authenticated` policy).
- **Design reference**: reuses the already-implemented `EquipoPage` tab-bar pattern and the existing `SuscripcionEstadoBadge`/`PagoEstadoBadge` visual style for the new badge — no new visual design/sketch needed.

## Non-goals

- No change to how subscriptions are created, edited, validated, or deleted — all existing row actions and modals (`ValidarPagoModal`, `ValidarSuscripcionModal`, `EditarSuscripcionModal`, `EliminarSuscripcionModal`, `VerDetallePagoModal`, `VerServiciosModal`, `CrearSuscripcionModal`) are unchanged.
- No change to `miembros_tenant` schema, RLS policies, or membership semantics (row existence already means "member", regardless of `estado`).
- No cross-tenant behavior change — the view remains scoped to a single `tenant_id` as today.
- No change to the athlete-facing "Mis Suscripciones" view or any other subscription surface — this is admin-only.
- Does not address CSV/export of subscriptions (not currently offered on this page) — out of scope.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Type | `src/types/portal/gestion-suscripciones.types.ts` | Add `es_miembro: boolean` to `SuscripcionAdminRow`; add `SuscripcionTab` union type |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | `fetchSuscripcionesAdmin` fetches `miembros_tenant.usuario_id` set for the tenant (parallel query) and sets `es_miembro` per row |
| Hook | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Accept `activeTab` option; filter rows by membership before existing filters; compute `tabCounts`; reset page on tab change |
| Component | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Add tab bar (Miembros / No miembros) with count badges; own `activeTab` state; tab-aware empty-state copy |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | Add "Tipo" column rendering `SuscripcionTipoBadge` per row |
| Component (new) | `src/components/portal/gestion-suscripciones/SuscripcionTipoBadge.tsx` | Small badge: "Miembro" / "No miembro" |
| Barrel | `src/components/portal/gestion-suscripciones/index.ts` | Export `SuscripcionTipoBadge` |

## Step-by-Step Implementation Plan

1. **Types** — add `es_miembro` and `SuscripcionTab` to `gestion-suscripciones.types.ts`.
2. **Service** — update `fetchSuscripcionesAdmin` to run the `miembros_tenant` lookup in parallel (`Promise.all`) with the existing subscriptions query and populate `es_miembro` in `mapRawRow`.
3. **Hook** — thread `activeTab` through `useGestionSuscripciones`, filter by membership ahead of existing search/chip filters, derive `tabCounts` from the full row set, and reset `currentPage` on tab change.
4. **Component (page → component → hook → service → types order per convention, UI wiring last)** — build `SuscripcionTipoBadge`, wire the "Tipo" column into `SuscripcionesTable`, then add the tab bar and tab-aware empty states to `GestionSuscripcionesPage`.
5. **Manual verification** — member subscription appears under "Miembros"; a US-0093 public-plan non-member subscription appears under "No miembros"; removing a member moves their existing subscriptions to "No miembros"; search/chips/pagination behave per-tab; empty states render correctly per tab.
