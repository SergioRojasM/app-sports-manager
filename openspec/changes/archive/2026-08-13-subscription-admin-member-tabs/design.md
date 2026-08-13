## Context

`gestion-suscripciones` is a single-tenant admin page (`components/portal/gestion-suscripciones/`) built on the standard page → component → hook → service → types stack. Today `fetchSuscripcionesAdmin(tenantId)` returns every `suscripciones` row for the tenant with no signal of whether the requester (`atleta_id`) currently holds a `miembros_tenant` row for that tenant. Since US-0093 (public plans), non-members can legitimately hold subscriptions, so the flat list mixes two populations administrators need to treat differently.

`suscripciones` and `miembros_tenant` have no FK between them (both reference `usuarios` independently), so membership cannot be resolved via a PostgREST embed — it has to be resolved with a second query and merged client-side in the service layer.

The equivalent split already ships for team management: `EquipoPage.tsx` renders a local `activeTab` state with a `nav`/button tab bar and a count badge on the "Solicitudes" tab. This design reuses that pattern rather than inventing a new one.

## Goals / Non-Goals

**Goals:**
- Let an administrator view member-only and non-member-only subscriptions as separate tabs, each with correct pagination, stats, search, and status-chip filtering.
- Make membership status visible per row via a badge, independent of which tab is active.
- Keep membership always current (derived at read time), not frozen at subscription-creation time.
- Make no database schema or RLS changes.

**Non-Goals:**
- Changing how membership itself is defined, stored, or removed (`miembros_tenant` semantics untouched).
- Changing any subscription mutation flow (create/edit/validate/delete) or its RLS.
- Server-side/DB-side filtering or pagination — the page already loads the full tenant subscription list into memory and filters client-side; this change keeps that model and adds one more client-side filter dimension.
- A generic "tabs" abstraction reusable elsewhere — this only reuses `EquipoPage`'s markup pattern, not a shared component (matching how `EquipoPage`, `PlanesPage`, etc. each implement their own tab bar today).

## Decisions

**1. Compute `es_miembro` at read time via a second query, not a stored column.**
`miembros_tenant` rows are hard-deleted on removal (`equipo.service.ts` `eliminarDelEquipo`), so existence of a row is always the authoritative, current membership signal. Storing `es_miembro` on `suscripciones` at insert time would go stale the moment a member is removed from the team, which is exactly the case the story calls out (US-0098 AC #11: a removed member's existing subscription must show as "No miembro"). Alternative considered: a DB view joining `suscripciones` and `miembros_tenant` — rejected as unnecessary complexity for a single admin page; the existing service already does all joining/shaping in TypeScript.

**2. Fetch membership as a single tenant-scoped query, not one per row.**
`gestionSuscripcionesService.fetchSuscripcionesAdmin(tenantId)` runs `supabase.from('miembros_tenant').select('usuario_id').eq('tenant_id', tenantId)` in parallel (`Promise.all`) with the existing subscriptions query, then builds a `Set<string>` for O(1) membership checks while mapping rows. This keeps the page at 2 queries total (vs. today's 1), regardless of subscription count.

**3. Tab state lives in `useGestionSuscripciones`, not as a second hook.**
Unlike `EquipoPage` (which composes three independent hooks — `useEquipo`, `useSolicitudesAdmin`, `useBloqueados` — because each tab fetches different data), all subscription data already comes from one `fetchSuscripcionesAdmin` call. Splitting membership is a pure client-side filter over the same row set, so `activeTab` is added as a parameter to the existing hook rather than introducing a second data-fetching hook. `GestionSuscripcionesPage` owns the `activeTab` `useState` (mirroring `EquipoPage`) and passes it into the hook call.

**4. Tab-scoped stats, tenant-wide tab counts.**
The three stats cards (Activas/Pendientes/Pago pendiente) are computed from the tab-filtered row set — an admin viewing "No miembros" sees stats for non-members only, matching the mental model of "this tab is its own view." The tab-bar count badges, by contrast, are computed from the *full* unfiltered row set (not narrowed by search/chips) so an admin always sees the true total per category, consistent with how `EquipoPage`'s "Solicitudes" badge shows the true pending count regardless of any other tab's filter state.

**5. Membership badge shown in both tabs, not just as the tab-differentiator.**
Explicitly required by the story: the "Tipo" column stays visible in both tabs so the distinction survives scanning, screenshots, or (future) exports of the table in isolation from the tab context. This is a small amount of visual redundancy accepted for that reason.

## Risks / Trade-offs

- **[Risk]** An extra `miembros_tenant` query on every page load / refresh adds latency. → **Mitigation**: it's a single indexed lookup (`tenant_id` — already indexed via `idx_miembros_tenant_tenant_id`) run in parallel with the existing query, not sequentially; cost is negligible relative to the existing multi-join `suscripciones` query.
- **[Risk]** Tab-scoped stats could confuse an admin expecting tenant-wide totals. → **Mitigation**: matches the existing mental model established by `EquipoPage`/`SolicitudesTab`, where each tab's cards reflect only that tab's data; the tab-bar count badges still give a tenant-wide-per-category number at a glance.
- **[Trade-off]** Client-side membership filtering means the full subscription list (all tabs) is always fetched even though only one tab is shown at a time — acceptable since the page already loads the full tenant list today (no pagination at the query level) and tenant subscription volumes are small enough for this pattern to already be in production use.

## Migration Plan

No database migration. Deploy is a standard frontend/service release:
1. Ship type + service + hook + component changes together (no independent rollout ordering needed — all in the same feature slice, no other consumers of `SuscripcionAdminRow`/`fetchSuscripcionesAdmin` outside this page).
2. No local Supabase migration to run (`supabase db reset`/`migration up` not needed for this change).
3. Rollback is a plain revert of the frontend commit — no data or schema to unwind.
