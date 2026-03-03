# User Story: Team Management Feature

## ID
US0017

## Title
Team Management – View and Filter Organization Members

## As a
Portal **Administrator** of an organization (tenant)

## I Want
A dedicated **Gestion Equipo** module inside the portal where I can see, search, and filter all members that belong to my organization.

## So That
I have a clear and centralized view of every person in my team, their status, contact information, and role within the organization.

---

## Description

Create a new feature module called **gestion-equipo** following the established feature-slice architecture. The module is **restricted to the `administrador` role** and must be registered in the role-based navigation menu.

When the administrator enters the module, the page shows:

1. **Statistical summary cards** at the top — total members count, active users count, and active trainers count.
2. **Quick-filter chips** to filter by member `estado` (Activo, Mora, Suspendido, Inactivo).
3. **A search bar** to filter by name, email, or phone.
4. **A data table** listing all members of the tenant with the following columns:
   - Full name (`nombre + apellido` concatenated)
   - `tipo_identificacion` + `numero_identificacion` *(requires a new migration to add both columns to `public.usuarios`)*
   - `telefono`
   - `email`
   - `estado` rendered as a colour-coded **badge** (same pattern as status badges in `reservas`)
   - Role within the tenant (resolved from `roles.nombre` via `miembros_tenant`)

The page is **read-only** in this story — no create/edit/delete actions are required.

---

## Database Context

### Relevant tables

| Table | Key columns |
|---|---|
| `public.usuarios` | `id`, `nombre`, `apellido`, `tipo_identificacion` (varchar 20), `numero_identificacion` (varchar 30), `email`, `telefono`, `foto_url`, `estado` (text, default `'activo'`), `activo` (bool), `created_at` |
| `public.miembros_tenant` | `id`, `tenant_id`, `usuario_id`, `rol_id`, `created_at` |
| `public.roles` | `id`, `nombre` |

### `estado` accepted values
`activo` · `mora` · `suspendido` · `inactivo`

*(Added by migration `20260303195145_add_estado_col_usuarios.sql`)*

### New migration required
Add `tipo_identificacion` and `numero_identificacion` columns to `public.usuarios`:

```sql
alter table public.usuarios add column tipo_identificacion varchar(20);
alter table public.usuarios add column numero_identificacion varchar(30);
```

Migration file naming convention: `20260303XXXXXX_add_identificacion_cols_usuarios.sql`.

---

## Expected Results

1. Navigating to `/portal/orgs/[tenant_id]/gestion-equipo` as an **administrador** renders the Gestion Equipo page.
2. Attempting to access the route as any other role results in a redirect (handled by the existing role-gate layout).
3. The page loads and displays all members of the tenant joined against `usuarios`.
4. Stat cards show correct live counts.
5. Quick-filter chips filter the table rows client-side by `estado`.
6. The search input filters rows client-side by full name, email, or phone (case-insensitive).
7. The `estado` column renders colour-coded badges:
   - `activo` → green
   - `mora` → yellow/amber
   - `suspendido` → orange
   - `inactivo` → slate/gray
8. The component gracefully handles loading and empty states consistent with other portal pages (e.g., `PlanesPage`).

---

## Files to Create / Modify

### New files (feature slice)

```text
src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx
src/components/portal/gestion-equipo/EquipoPage.tsx
src/components/portal/gestion-equipo/EquipoTable.tsx
src/components/portal/gestion-equipo/EquipoHeaderFilters.tsx
src/components/portal/gestion-equipo/EquipoStatsCards.tsx
src/components/portal/gestion-equipo/EquipoStatusBadge.tsx
src/hooks/portal/gestion-equipo/useEquipo.ts
src/services/supabase/portal/equipo.service.ts
src/types/portal/equipo.types.ts
supabase/migrations/YYYYMMDDXXXXXX_add_identificacion_cols_usuarios.sql
```

### Modified files

| File | Change |
|---|---|
| `src/components/portal/RoleBasedMenu.tsx` | Add **Gestión Equipo** menu item scoped to `administrador` role |
| `src/app/portal/orgs/[tenant_id]/(administrador)/` | Register new route (page.tsx created above) |
| `projectspec/03-project-structure.md` | Add `gestion-equipo` to the feature slices reference |

---

## Implementation Steps

### Step 1 – Database migration
Create migration file `supabase/migrations/YYYYMMDDXXXXXX_add_identificacion_cols_usuarios.sql`:

```sql
alter table public.usuarios add column tipo_identificacion varchar(20);
alter table public.usuarios add column numero_identificacion varchar(30);
```

Apply locally: `npx supabase db diff -f add_identificacion_cols_usuarios` then `npx supabase migration up`.

---

### Step 2 – Types (`src/types/portal/equipo.types.ts`)

```typescript
export type MiembroEstado = 'activo' | 'mora' | 'suspendido' | 'inactivo';

export type MiembroRow = {
  // usuarios fields
  usuario_id: string;
  nombre: string | null;
  apellido: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  telefono: string | null;
  email: string;
  foto_url: string | null;
  estado: MiembroEstado;
  // miembros_tenant / roles
  miembro_id: string;
  rol_nombre: string;
};

export type MiembroTableItem = MiembroRow & {
  fullName: string;           // `${nombre} ${apellido}`.trim()
  estadoLabel: string;        // human-readable estado
};

export type EquipoStats = {
  totalMiembros: number;
  totalActivos: number;
  entrenadoresActivos: number;
};

export class EquipoServiceError extends Error {
  constructor(
    public readonly code: 'forbidden' | 'unknown',
    message: string,
  ) {
    super(message);
    this.name = 'EquipoServiceError';
  }
}
```

---

### Step 3 – Service (`src/services/supabase/portal/equipo.service.ts`)

Query pattern (Supabase client):

```typescript
const { data, error } = await supabase
  .from('miembros_tenant')
  .select(`
    id,
    usuario_id,
    roles!inner ( nombre ),
    usuarios!inner (
      nombre,
      apellido,
      tipo_identificacion,
      numero_identificacion,
      telefono,
      email,
      foto_url,
      estado
    )
  `)
  .eq('tenant_id', tenantId);
```

Map the raw rows to `MiembroRow[]`. Expose:
- `getEquipo(tenantId: string): Promise<MiembroRow[]>`
- `getEquipoStats(members: MiembroRow[]): EquipoStats` (pure helper — no extra DB call)

---

### Step 4 – Hook (`src/hooks/portal/gestion-equipo/useEquipo.ts`)

Responsibilities:
- Call `equipo.service.ts` on mount.
- Manage `loading`, `error`, `members` state.
- Derive `filteredMembers` by applying `searchTerm` (name/email/phone) and `estadoFilter` (`MiembroEstado | 'all'`).
- Derive `stats: EquipoStats` from the raw member list.
- Expose `setSearchTerm`, `setEstadoFilter`, `refresh`.

No mutations needed for this story.

---

### Step 5 – Components

#### `EquipoStatusBadge.tsx`
Props: `estado: MiembroEstado`. Renders a colour-coded `<span>` badge. Colour map:

| Estado | Tailwind classes |
|---|---|
| `activo` | `bg-emerald-900/30 text-emerald-300 border-emerald-400/30` |
| `mora` | `bg-amber-900/30 text-amber-300 border-amber-400/30` |
| `suspendido` | `bg-orange-900/30 text-orange-300 border-orange-400/30` |
| `inactivo` | `bg-slate-800/50 text-slate-400 border-slate-600/30` |

#### `EquipoStatsCards.tsx`
Props: `stats: EquipoStats`. Renders three glass-style stat cards:
- **Total Miembros** → `stats.totalMiembros`
- **Usuarios Activos** → `stats.totalActivos`
- **Entrenadores Activos** → `stats.entrenadoresActivos`

Follow the visual style used in the portal (dark glass look, `border-portal-border`).

#### `EquipoHeaderFilters.tsx`
Props: `searchTerm`, `onSearchChange`, `estadoFilter`, `onEstadoFilterChange`.
- Text input for search (placeholder: *"Buscar por nombre, email o teléfono…"*).
- Row of quick-filter chips: **Todos · Activo · Mora · Suspendido · Inactivo**. Active chip uses an accent border/bg to indicate selection.

#### `EquipoTable.tsx`
Props: `rows: MiembroTableItem[]`.
Table columns (in order):

| Column header | Source |
|---|---|
| Nombre | `item.fullName` |
| Tipo ID | `item.tipo_identificacion ?? '—'` |
| N° Identificación | `item.numero_identificacion ?? '—'` |
| Teléfono | `item.telefono ?? '—'` |
| Correo | `item.email` |
| Estado | `<EquipoStatusBadge estado={item.estado} />` |
| Perfil | `item.rol_nombre` |

Follow the visual style of `PlanesTable` (dark table, `border-portal-border`, hover row highlight).

#### `EquipoPage.tsx`
Top-level composition component — mirrors `PlanesPage.tsx` structure:
- Renders loading / error / empty states.
- Composes `EquipoStatsCards` → `EquipoHeaderFilters` → `EquipoTable`.

---

### Step 6 – Route (`src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx`)

```typescript
import { EquipoPage } from '@/components/portal/gestion-equipo/EquipoPage';

export default function GestionEquipoPage({ params }: { params: { tenant_id: string } }) {
  return <EquipoPage tenantId={params.tenant_id} />;
}
```

Access is already protected by the `(administrador)` route-group layout.

---

### Step 7 – Navigation (`RoleBasedMenu.tsx`)

Add an entry for **Gestión Equipo** with route `gestion-equipo` scoped to the `administrador` role. Follow the same pattern as the existing *Gestión Planes* menu item.

---

### Step 8 – RLS (Supabase)

Verify (or create) a SELECT policy on `public.miembros_tenant` and `public.usuarios` that allows an authenticated user who is an `administrador` of the tenant to read all member records for that tenant.

Suggested policy on `miembros_tenant`:

```sql
create policy miembros_tenant_select_admin on public.miembros_tenant
  for select to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );
```

If a similar policy already exists from prior migrations, skip this step and document accordingly.

---

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | Route group `(administrador)` layout enforces role gate via `miembros_tenant` check; no extra client-side role check needed, but the service query must use the authenticated Supabase client so RLS applies |
| **Performance** | Member list is fetched once on mount. Client-side filtering avoids additional round-trips. If the list exceeds 500 rows, consider server-side pagination in a follow-up story |
| **Type safety** | No `any` types. All Supabase results explicitly typed or mapped through a row-type interface |
| **Accessibility** | Table must include `<thead>` with `scope="col"` headers. Badges must include an `aria-label` attribute |
| **Consistency** | Reuse existing Tailwind design tokens and CSS classes (glass, portal-border, etc.) from other portal feature slices |

---

## Definition of Done

- [ ] Migration file for `tipo_identificacion` and `numero_identificacion` columns created and applied.
- [ ] `equipo.types.ts` created with all types defined.
- [ ] `equipo.service.ts` created and correctly queries `miembros_tenant ▶ usuarios + roles`.
- [ ] `useEquipo.ts` hook created; handles loading, error, filtering, and stats derivation.
- [ ] All five components created (`EquipoPage`, `EquipoTable`, `EquipoHeaderFilters`, `EquipoStatsCards`, `EquipoStatusBadge`).
- [ ] Route page created under `(administrador)/gestion-equipo/page.tsx`.
- [ ] `RoleBasedMenu.tsx` updated with the new navigation entry.
- [ ] RLS policy verified or created for `miembros_tenant` admin SELECT.
- [ ] Page renders correctly for an administrator and is inaccessible to other roles.
- [ ] `projectspec/03-project-structure.md` updated to reflect new feature slice.
