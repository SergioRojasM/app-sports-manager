## Why

The `planes` (membership plans) table exists in the database but has no management UI, preventing tenant administrators from defining the service offerings available to their athletes. This feature delivers full CRUD management for plans — including multi-discipline associations — closing the last gap in the organization's back-office configuration flow.

## What Changes

- **New route** `/portal/orgs/[tenant_id]/gestion-planes` accessible to `administrador` role only.
- **New database migration** (`20260301000200_planes_gestion.sql`) that evolves the existing `planes` table: adds `vigencia_meses`, drops `duracion_dias` (**BREAKING** column removal), adds `updated_at`, adds a `(tenant_id, nombre)` unique constraint, and creates the new `planes_disciplina` join table with full RLS.
- **New join table** `planes_disciplina` to model the many-to-many relationship between plans and disciplines.
- New TypeScript types for plans and the plan-discipline association.
- New Supabase service functions (`getPlanes`, `createPlan`, `updatePlan`, `deletePlan`).
- New custom hooks (`usePlanes`, `usePlanForm`) that orchestrate list management, form state, and mutations.
- New presentation components: `PlanesPage`, `PlanesHeaderFilters`, `PlanesTable`, `PlanFormModal`.
- **Navigation update** — add "Gestión de Planes" entry to the administrator role menu.
- **Docs update** — `projectspec/03-project-structure.md` updated to include the `planes/` feature slice.

## Capabilities

### New Capabilities

- `plan-management`: Full CRUD for tenant-scoped membership plans; covers the route, components, hooks, service layer, types, migration, and RLS policies. Includes multi-discipline association via `planes_disciplina` join table.

### Modified Capabilities

_(none — the change to `disciplines-management` is a data-model join addition; no existing spec-level requirement for disciplines changes)_

## Impact

**Database**
- `supabase/migrations/20260301000200_planes_gestion.sql` — ALTER `planes`, CREATE `planes_disciplina`, RLS policies.
- Existing rows in `planes` will have `duracion_dias` converted to `vigencia_meses` before the column is dropped.

**New files**
| Layer | Path |
|---|---|
| Route | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx` |
| Types | `src/types/portal/planes.types.ts` |
| Service | `src/services/supabase/portal/planes.service.ts` |
| Hook | `src/hooks/portal/planes/usePlanes.ts` |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` |
| Component | `src/components/portal/planes/PlanesPage.tsx` |
| Component | `src/components/portal/planes/PlanesHeaderFilters.tsx` |
| Component | `src/components/portal/planes/PlanesTable.tsx` |
| Component | `src/components/portal/planes/PlanFormModal.tsx` |
| Barrel | `src/components/portal/planes/index.ts` |
| Migration | `supabase/migrations/20260301000200_planes_gestion.sql` |

**Modified files**
| File | Change |
|---|---|
| `src/services/supabase/portal/index.ts` | Export `planes.service.ts` |
| `src/components/portal/RoleBasedMenu.tsx` (or nav constants) | Add "Gestión de Planes" nav entry |
| `projectspec/03-project-structure.md` | Document `planes/` slice |

**Dependencies**
- Reads from `disciplinas` table (existing) to populate the discipline multi-select in the plan form.
- Relies on `get_admin_tenants_for_authenticated_user()` SQL function (introduced in migration `20260224000200`) for RLS policies.
- No new npm dependencies required.

## Non-goals

- Athlete-facing plan display or enrollment flows.
- Payment processing or billing integration.
- Plan history / audit log.
- Bulk import/export of plans.
- Plan templates or cloning across tenants.

## Step-by-Step Implementation Plan

1. **Migration** — Create and apply `20260301000200_planes_gestion.sql`.
2. **Types** — Create `src/types/portal/planes.types.ts`.
3. **Service** — Create `planes.service.ts`; update barrel `index.ts`.
4. **Hooks** — Create `usePlanes.ts` and `usePlanForm.ts` in `src/hooks/portal/planes/`.
5. **Components** — Create the `src/components/portal/planes/` folder (`PlanesPage`, `PlanesHeaderFilters`, `PlanesTable`, `PlanFormModal`, `index.ts`).
6. **Route** — Create the page at `gestion-planes/page.tsx`.
7. **Navigation** — Add the route entry to the administrator menu.
8. **Docs** — Update `projectspec/03-project-structure.md`.
