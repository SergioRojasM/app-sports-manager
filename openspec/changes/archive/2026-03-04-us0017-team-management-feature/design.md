## Context

The portal already has five administrator feature slices (gestion-organizacion, gestion-escenarios, gestion-disciplinas, gestion-entrenamientos, gestion-planes). Each follows the same hexagonal architecture: `types → service → hook → components → route page`. Navigation entries are registered in `ROLE_TENANT_ITEMS` inside `src/types/portal.types.ts` (not in `RoleBasedMenu.tsx` directly).

The `public.usuarios` table currently holds `nombre`, `apellido`, `email`, `telefono`, `foto_url`, `estado`, and `activo`. Two new identification columns (`tipo_identificacion`, `numero_identificacion`) must be added via migration. A separate migration (`20260303195145`) already added `estado`.

The `estado` column accepts four values — `activo`, `mora`, `suspendido`, `inactivo` — and must be displayed as a colour-coded badge, consistent with how `ReservaStatusBadge` works in the `reservas` sub-feature.

## Goals / Non-Goals

**Goals:**
- Deliver a read-only administrator view listing all tenant members with stats, search, and status filtering.
- Adhere to the established feature-slice convention so the codebase remains consistent.
- Keep all filtering client-side (one fetch on mount) to avoid query complexity for typical tenant sizes.
- Gate the route under the existing `(administrador)` route group so no new auth logic is needed.

**Non-Goals:**
- Member CRUD (create / edit / delete) — deferred.
- Server-side pagination.
- Bulk actions, CSV export, or email/SMS from this view.
- Athlete performance metrics or training history.

## Decisions

### D1 — Layer order: types → service → hook → components → page

**Decision:** Follow the standard portal methodology top-down: define types first, then service, then hook, then components (leaf → composite), then route page.

**Rationale:** Every existing feature slice (planes, entrenamientos, disciplinas) uses this order. Deviating adds cognitive overhead and breaks code-review conventions.

---

### D2 — Single Supabase join query, client-side filtering

**Decision:** `equipo.service.ts` issues one query joining `miembros_tenant`, `usuarios`, and `roles` for the tenant. Filtering by `estado` and search term is done client-side inside `useEquipo.ts`.

**Rationale:** Tenant member lists are small (<500 rows for target organisations). A single fetch keeps the service simple and the hook testable without stub HTTP calls. Server-side filtering would add query params and inflate complexity with no observable performance benefit at this scale.

**Alternative considered:** Separate paginated endpoint with server-side filtering. Deferred — acceptable as a follow-up when tenants grow.

---

### D3 — Navigation entry in `ROLE_TENANT_ITEMS` (portal.types.ts)

**Decision:** Add `{ label: 'Equipo', path: 'gestion-equipo', icon: 'groups' }` to the `administrador` array in `ROLE_TENANT_ITEMS` inside `src/types/portal.types.ts`.

**Rationale:** `RoleBasedMenu.tsx` is a pure render component driven by the `menuItems` prop already resolved by `usePortalNavigation` → `resolvePortalMenu`. All route registration for roles is done in `ROLE_TENANT_ITEMS`. This was confirmed by how US0014 (planes) added its entry.

**Alternative considered:** Editing `RoleBasedMenu.tsx` directly — incorrect; that component is role-agnostic.

---

### D4 — `EquipoStats` derived from in-memory list, no extra DB call

**Decision:** `getEquipoStats(members: MiembroRow[]): EquipoStats` is a pure helper function that counts from the already-fetched array (`totalMiembros`, `totalActivos`, `entrenadoresActivos`).

**Rationale:** Avoids a second round trip and an aggregate query. Stats are always consistent with the displayed table rows. `entrenadoresActivos` is derived by checking `rol_nombre.toLowerCase() === 'entrenador' && estado === 'activo'`.

---

### D5 — `EquipoStatusBadge` as standalone leaf component

**Decision:** Implement a dedicated `EquipoStatusBadge.tsx` component (not reuse `ReservaStatusBadge`) with colour-coded Tailwind classes for the four `estado` values.

**Rationale:** `reservas` status values have different semantics (`pendiente`, `confirmada`, `cancelada`). Coupling the two domains would create a leaky abstraction. The badge is trivial to implement independently.

---

### D6 — RLS policy for admin SELECT on `miembros_tenant`

**Decision:** Add a Supabase RLS policy `miembros_tenant_select_admin` using the existing `get_admin_tenants_for_authenticated_user()` function, bundled in the same migration as the `tipo_identificacion` / `numero_identificacion` columns. If a sufficient policy already exists, skip.

**Rationale:** The browser Supabase client runs queries as the authenticated user. Without an explicit SELECT policy, the query returns 0 rows (RLS default deny). The `get_admin_tenants_for_authenticated_user()` helper already encodes the admin membership check correctly.

**Alternative considered:** Using a server action / server client with service role key — rejected because it bypasses RLS and introduces a trust boundary inconsistency with the rest of the portal.

---

### D7 — Data flow architecture

```
(administrador)/gestion-equipo/page.tsx   [Delivery – thin, passes tenantId]
        ↓
EquipoPage.tsx                            [Presentation – orchestrates sub-components]
        ↓
useEquipo(tenantId)                       [Application – state, filtering, pagination, stats]
        ↓
equipo.service.ts → Supabase              [Infrastructure – one join query]
        ↓
equipo.types.ts                           [Domain – MiembroRow, MiembroTableItem, EquipoStats]
```

---

### D8 — Client-side pagination with selectable page size

**Decision:** `useEquipo` manages `currentPage` (1-based) and `pageSize` (default `20`, options `20 | 50 | 100`). The hook derives `paginatedMembers` by slicing `filteredMembers` after applying search + status filters. `EquipoTable` receives only the current page slice. `EquipoPage` renders a pagination bar below the table exposing page navigation and a page-size selector.

**Rationale:** All filtering is already client-side; adding a slice step is zero extra complexity. Selectable page size (20/50/100) gives admins with larger teams flexibility without requiring a server-side implementation.

**State managed in hook:**
```typescript
currentPage: number          // reset to 1 on filter/search change
pageSize: 20 | 50 | 100
totalFiltered: number        // derived: filteredMembers.length
totalPages: number           // derived: Math.ceil(totalFiltered / pageSize)
setCurrentPage(n: number)
setPageSize(n: 20 | 50 | 100)
```

---

### D9 — `tipo_identificacion` constrained to fixed enum values

**Decision:** `tipo_identificacion` is constrained via a DB check constraint to `('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro')`. The TypeScript type mirrors this as a union. Stored as `varchar(20)` to allow future additions via migration.

**Rationale:** Free-text was an open question — product owner confirmed fixed values. Enforcing at DB level prevents dirty data even before the edit UI is built.

**Type:**
```typescript
export type TipoIdentificacion = 'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro';
```

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| RLS policy already exists but is too permissive | Check existing policies in migrations before creating; document if skipped |
| Member list grows beyond 500 rows | Client-side pagination already in place; server-side filtering deferred to a follow-up story |
| `tipo_identificacion` receives out-of-enum values from old data | DB check constraint added in migration; existing `null` rows are allowed (nullable column) |
| `estado` values not enforced by DB check constraint | Check constraint added in this same migration |

## Migration Plan

1. Create `supabase/migrations/YYYYMMDDXXXXXX_add_identificacion_cols_usuarios.sql`:
   ```sql
   alter table public.usuarios
     add column tipo_identificacion varchar(20),
     add column numero_identificacion varchar(30);

   alter table public.usuarios
     add constraint usuarios_tipo_identificacion_ck
    check (tipo_identificacion in ('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'));

   alter table public.usuarios
     add constraint usuarios_estado_ck
       check (estado in ('activo', 'mora', 'suspendido', 'inactivo'));

   -- RLS: admin can SELECT all members of their tenants
   drop policy if exists miembros_tenant_select_admin on public.miembros_tenant;
   create policy miembros_tenant_select_admin on public.miembros_tenant
     for select to authenticated
     using (
       tenant_id in (
         select id from public.get_admin_tenants_for_authenticated_user()
       )
     );
   ```
2. Apply locally: `npx supabase db diff -f add_identificacion_cols_usuarios` then `npx supabase migration up`.
3. **Rollback**: `alter table public.usuarios drop constraint usuarios_tipo_identificacion_ck; alter table public.usuarios drop constraint usuarios_estado_ck; alter table public.usuarios drop column tipo_identificacion; alter table public.usuarios drop column numero_identificacion; drop policy if exists miembros_tenant_select_admin on public.miembros_tenant;`

## Open Questions

_(all resolved — no outstanding questions)_
