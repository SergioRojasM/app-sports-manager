# US-0098 — Separate Member vs. Non-Member Subscriptions into Tabs in Admin View

## ID
US-0098

## Name
Split the admin subscription management view into "Miembros" / "No miembros" tabs with a membership indicator column

## As a
Tenant administrator (`administrador` role)

## I Want
To see subscriptions and subscription requests separated into two tabs — one for requests made by current tenant members, one for requests made by non-members — and to see a column that identifies whether each subscription's requester is a member or not

## So That
I can quickly tell apart membership-driven subscription activity (existing team members buying/renewing plans) from public-plan purchases by outsiders (US-0093), which today are mixed together in a single table and are hard to visually distinguish

---

## Description

### Current State

- [GestionSuscripcionesPage.tsx](src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx) renders a single flat table (`SuscripcionesTable`) with every subscription for the tenant, regardless of whether the `atleta_id` who requested it is currently a member of the tenant (`miembros_tenant`) or not.
- Since US-0093 (public plans), non-members can subscribe to a tenant's `es_publico = true` plans without ever holding a `miembros_tenant` row. `suscripciones.atleta_id` and `suscripciones.tenant_id` are the only link back to the requester — there is no flag today distinguishing member vs. non-member requesters.
- [gestion-suscripciones.service.ts](src/services/supabase/portal/gestion-suscripciones.service.ts) `fetchSuscripcionesAdmin(tenantId)` returns every `suscripciones` row for the tenant joined with athlete/plan/pago/servicios data, with no membership information.
- [useGestionSuscripciones.ts](src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts) filters/paginates/computes stats over that single flat list (search term, `suscripcionFilter`, `pagoFilter`).
- The equivalent split already exists for team management: [EquipoPage.tsx](src/components/portal/gestion-equipo/EquipoPage.tsx) renders an `Equipo` / `Solicitudes` / `Bloqueados` tab bar (`nav` with buttons, active-tab styling, and a pending-count badge on the "Solicitudes" tab). This story reuses that same tab-bar pattern.

### Data Model Finding (DB review)

- `public.suscripciones` (`20260221000100_migracion_inicial_bd.sql`, extended by `20260304140346_suscripciones_planes_feature.sql`) has `tenant_id` and `atleta_id` (both FKs), but **no FK or column referencing `miembros_tenant`**.
- `public.miembros_tenant` (`20260221000100_migracion_inicial_bd.sql`, `unique(tenant_id, usuario_id)`) is the single source of truth for membership: a row exists ⇔ the user is a member of that tenant, regardless of its `estado` (`activo | mora | suspendido | inactivo` — added in `20260320000100_miembros_tenant_estado.sql`). Removing a member **deletes** the row (`equipo.service.ts`, `eliminarDelEquipo` — confirmed hard delete, not a soft-deactivate), so row-existence is always the correct, real-time membership check — no separate "removed" state to special-case.
- `miembros_tenant_select_authenticated` RLS policy (`20260221000100_migracion_inicial_bd.sql`) is `for select to authenticated using (true)` — any authenticated user (including the admin) can already read `miembros_tenant` rows for any tenant. **No RLS change is required** to determine membership from the client.
- There is no direct FK between `suscripciones` and `miembros_tenant` (both reference `usuarios` independently), so PostgREST cannot embed membership via a nested select — it must be resolved with a second query and merged in the service layer.
- **Conclusion: no database migration is needed.** Membership ("is the subscription's `atleta_id` currently a member of `tenant_id`?") is computed at read time in `gestion-suscripciones.service.ts` by fetching `miembros_tenant.usuario_id` for the tenant once and checking set membership per row. This keeps the flag always current (e.g., an athlete removed from the team after subscribing correctly shows as "No miembro" from that point on) instead of freezing a stale value.

### Proposed Changes

**Types**
- Add `es_miembro: boolean` to `SuscripcionAdminRow` ([gestion-suscripciones.types.ts](src/types/portal/gestion-suscripciones.types.ts)).
- Add a `SuscripcionTab = 'miembros' | 'no_miembros'` union type.

**Service**
- `fetchSuscripcionesAdmin(tenantId)` additionally queries `miembros_tenant` (`select usuario_id where tenant_id = tenantId`) and builds a `Set<string>` of member `usuario_id`s.
- `mapRawRow` takes that set and sets `es_miembro: memberIds.has(row.atleta_id)` on each mapped `SuscripcionAdminRow`.
- Both queries can run in parallel (`Promise.all`) since neither depends on the other's result.

**Hook**
- `useGestionSuscripciones` gains an `activeTab: SuscripcionTab` option (owned/controlled by the page, passed in — mirrors how `tenantId` is passed today).
- Rows are filtered by `r.es_miembro === (activeTab === 'miembros')` **before** the existing search/suscripcionFilter/pagoFilter chain, so tab, chips, and search compose (AND logic, consistent with existing filter composition).
- `stats` (activas/pendientes/pagoPendiente cards) are computed from the tab-filtered set only (not further reduced by search/chips — same as current behavior which computes `stats` from the full `rows`, just now tab-scoped).
- Add a `tabCounts: { miembros: number; noMiembros: number }` derived value (from the full unfiltered `rows`) for the tab-bar count badges.
- Reset `currentPage` to `1` when `activeTab` changes (in addition to the existing reset on search/chip changes).

**UI**
- `GestionSuscripcionesPage` renders a tab bar above the stats cards, styled like `EquipoPage`'s `nav` (two buttons: "Miembros" / "No miembros"), each showing a count badge from `tabCounts` (same badge style as the "Solicitudes" pending-count badge in `EquipoPage`).
- Stats cards, header filters, table, and pagination all re-render against the active tab's data; no separate copies of these components are needed — they're already row-count/data driven.
- `SuscripcionesTable` gains a new column ("Tipo") rendering a small badge — "Miembro" (turquoise/emerald) or "No miembro" (slate/neutral) — via a new `SuscripcionTipoBadge` component mirroring the existing `SuscripcionEstadoBadge`/`PagoEstadoBadge` pattern. Shown in both tabs (explicitly requested) even though the tab already segregates rows, so the distinction stays visible if the table is scanned, exported, or screenshotted independently of the tab context.
- Empty state text is tab-aware: "No hay suscripciones de miembros para esta organización." / "No hay suscripciones de no miembros para esta organización."

---

## Database Changes

None. See "Data Model Finding" above — membership is derived at read time from the existing `miembros_tenant` table; no new columns, tables, indexes, or RLS policies are required.

---

## API / Server Actions

No new API routes or RPCs. One existing service function is modified.

- **File**: `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Function**: `fetchSuscripcionesAdmin(tenantId: string): Promise<SuscripcionAdminRow[]>`
  - **Change**: internally also runs `supabase.from('miembros_tenant').select('usuario_id').eq('tenant_id', tenantId)` (in parallel with the existing `suscripciones` query via `Promise.all`), builds `new Set(memberRows.map(r => r.usuario_id))`, and passes it into `mapRawRow` to populate `es_miembro`.
  - **Input**: unchanged (`tenantId: string`).
  - **Return**: unchanged shape, `SuscripcionAdminRow[]`, now with `es_miembro` populated on every row.
  - **Auth / RLS**: relies on existing `suscripciones_select_admin` and `miembros_tenant_select_authenticated` policies — both already permit this read for an authenticated admin. No RLS changes.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Type | `src/types/portal/gestion-suscripciones.types.ts` | Add `es_miembro: boolean` to `SuscripcionAdminRow`; add `SuscripcionTab` union type |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | `fetchSuscripcionesAdmin` fetches `miembros_tenant.usuario_id` set for the tenant and sets `es_miembro` per row in `mapRawRow` |
| Hook | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Accept `activeTab` option; filter rows by membership before existing filters; compute `tabCounts`; reset page on tab change |
| Component | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Add tab bar (Miembros / No miembros) with count badges; own `activeTab` state; tab-aware empty-state copy |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | Add "Tipo" column rendering `SuscripcionTipoBadge` per row |
| Component (new) | `src/components/portal/gestion-suscripciones/SuscripcionTipoBadge.tsx` | Small badge: "Miembro" / "No miembro", styled like `SuscripcionEstadoBadge` |
| Barrel | `src/components/portal/gestion-suscripciones/index.ts` | Export `SuscripcionTipoBadge` |

---

## Acceptance Criteria

1. `Gestión de Suscripciones` (`/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones`) shows a tab bar with two tabs: "Miembros" and "No miembros", styled consistently with the `Equipo` / `Solicitudes` / `Bloqueados` tab bar in `EquipoPage`.
2. Each tab button shows a count badge with the total number of subscriptions in that category (independent of any active search term or status chip).
3. The "Miembros" tab shows only subscriptions whose `atleta_id` currently has a `miembros_tenant` row for the tenant; the "No miembros" tab shows only subscriptions whose `atleta_id` does not.
4. The table's new "Tipo" column shows a "Miembro" or "No miembro" badge on every row, matching the row's actual membership status.
5. Search, "Suscripción" status chips, and "Pago" status chips continue to work and compose (AND) with the active tab's membership filter.
6. The stats cards (Activas / Pendientes / Pago pendiente) reflect only the rows in the currently active tab.
7. Switching tabs resets pagination to page 1; changing search/chips within a tab also still resets to page 1 (existing behavior, unaffected).
8. All existing row actions (Ver pago, Validar pago, Validar/Cancelar suscripción, Editar, Eliminar, Ver servicios) and their modals continue to work unchanged in both tabs.
9. "Nueva suscripción" (admin-created subscription) keeps working from either tab; a newly created subscription appears under the correct tab based on the target athlete's current membership.
10. Each tab has its own empty state message ("No hay suscripciones de miembros…" / "No hay suscripciones de no miembros…") shown when that tab's filtered list is empty, distinct from the loading and error states (unchanged).
11. An athlete who subscribed while a member and was later removed from the team (`miembros_tenant` row deleted) now shows under "No miembros" with a "No miembro" badge — membership reflects current state, not state at subscription time.
12. No console errors or additional failed requests; the extra `miembros_tenant` query runs once per page load (not once per row).

---

## Implementation Steps

- [ ] Add `es_miembro` and `SuscripcionTab` to `gestion-suscripciones.types.ts`
- [ ] Update `fetchSuscripcionesAdmin` to fetch tenant member `usuario_id`s in parallel and populate `es_miembro`
- [ ] Add `activeTab` handling, membership filtering, and `tabCounts` to `useGestionSuscripciones`
- [ ] Create `SuscripcionTipoBadge` component and export it from the feature's `index.ts`
- [ ] Add the "Tipo" column to `SuscripcionesTable`
- [ ] Add the tab bar and tab-aware empty states to `GestionSuscripcionesPage`
- [ ] Verify RLS: confirm no policy changes needed (read-only, existing policies already permit both queries)
- [ ] Test manually: member subscription shows under "Miembros"; public-plan non-member subscription (US-0093) shows under "No miembros"; removing a member moves their existing subscriptions to "No miembros"; search/chips/pagination work per tab; empty states render correctly per tab
- [ ] Update `projectspec/03-project-structure.md` with the new component/hook/type notes

---

## Non-Functional Requirements

- **Security**: Read-only feature; relies entirely on existing RLS policies (`suscripciones_select_admin`, `miembros_tenant_select_authenticated`). No new write paths, no new policies.
- **Performance**: One additional lightweight query (`miembros_tenant.usuario_id` for the tenant) per page load, executed in parallel with the existing subscriptions query — not per-row. Membership lookup against the `Set` is O(1) per row.
- **Accessibility**: Tab bar buttons should be reachable via keyboard (native `<button>` elements, as in `EquipoPage`) and should expose `aria-selected`/`role="tab"` semantics on the tab bar (`role="tablist"`) so screen readers announce the active tab — an improvement over the existing `EquipoPage` tab bar, which can be aligned in the same pass if convenient but is not blocking.
- **Error handling**: Unchanged — existing inline error banner with "Reintentar" button in `GestionSuscripcionesPage` covers failures from either query (surfaced via the existing `GestionSuscripcionesServiceError` mapping).
