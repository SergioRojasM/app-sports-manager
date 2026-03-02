## Context

The application follows a **feature-slice / hexagonal architecture** pattern (Delivery → Presentation → Application → Infrastructure → Domain). Four prior features (`scenarios`, `disciplines`, `entrenamientos`, `tenant`) establish the template this change must conform to.

**Current state:** The `planes` table was created in the initial migration (`20260221000100`) but has never had a management UI. The column `duracion_dias` must be replaced with `vigencia_meses`. No `updated_at` column exists yet. There is no join table linking plans to disciplines.

**Constraints:**
- All data access must go through RLS; no `service_role` bypass.
- TypeScript strict mode — no `any`.
- No new npm dependencies allowed.
- All Supabase calls from the browser client (not server actions).
- Admin-only mutations enforced by `get_admin_tenants_for_authenticated_user()` SQL function.

---

## Goals / Non-Goals

**Goals:**
- Deliver full CRUD management for tenant-scoped membership plans.
- Model the many-to-many plan ↔ discipline relationship via a new `planes_disciplina` join table.
- Evolve the `planes` table safely (non-destructive migration with backfill before column drop).
- Match the established feature-slice pattern exactly (page → component → hook → service → types).
- Surface plans in the administrator role navigation.

**Non-Goals:**
- Athlete-facing plan browsing or enrollment.
- Payment processing or billing.
- Plan history / audit log.
- Bulk import/export.
- Plan templates or cross-tenant cloning.

---

## Decisions

### D1 — Feature-slice naming: `planes`

**Decision:** Use `planes` as the feature-slice name (matching the Spanish naming convention already in use: `scenarios → escenarios`, `disciplines → disciplinas`, `entrenamientos`).

**Rationale:** Keeps parity with the Spanish data model while reflecting how the feature will be surfaced in file paths (`components/portal/planes/`, `hooks/portal/planes/`, `planes.service.ts`).

**Alternatives considered:** Using `plans` (English) — rejected for inconsistency with the rest of the codebase.

---

### D2 — Component: `PlanesPage` mirrors `DisciplinesPage`

**Decision:** `PlanesPage` is a client component that consumes `usePlanes` and composes `PlanesHeaderFilters`, `PlanesTable`, and `PlanFormModal`. It does not fetch data itself.

**Rationale:** Direct replication of `DisciplinesPage` → `DisciplinesTable` + `DisciplineFormModal` pattern. Keeps pages thin (just wiring props) and all state in the hook.

---

### D3 — Hook split: `usePlanes` + `usePlanForm`

**Decision:** Split hook responsibility — `usePlanes` owns list state, modal open/close, delete, and delegates form state to `usePlanForm`. The page only imports `usePlanes`.

**Rationale:** Mirrors the `useDisciplines` / `useDisciplineForm` split already in place. Keeps each hook under ~150 lines, testable in isolation.

```
usePlanes
 ├── state: planes[], filteredPlanes[], loading, error, searchTerm
 ├── state: modalOpen, modalMode, selectedPlan
 ├── delegates form state → usePlanForm
 └── methods: openCreateModal(), openEditModal(plan), closeModal(),
              deletePlan(planId), refresh(), setSearchTerm()

usePlanForm
 ├── state: formValues, fieldErrors, submitError, successMessage, isSubmitting
 └── methods: updateField(), submit(), reset()
```

---

### D4 — Service: single `getPlanes` query with nested join

**Decision:** `getPlanes` fetches `planes` with a nested Supabase select on `planes_disciplina(disciplina_id)` in a single round-trip.

```ts
supabase
  .from('planes')
  .select('*, planes_disciplina(disciplina_id)')
  .eq('tenant_id', tenantId)
  .order('nombre')
```

**Rationale:** Avoids N+1 fetching. Supabase's PostgREST supports nested resource selects; the join is one SQL query. Discipline names are resolved client-side once by cross-referencing the full `disciplinas` list (already loaded by `usePlanes`).

**Alternatives considered:**  
- Two separate queries (planes + join) merged in JS — rejected, more round-trips.  
- A database view — rejected, adds migration complexity for a simple join.

---

### D5 — `updatePlan` uses delete-and-reinsert for discipline associations

**Decision:** On plan update, delete all existing `planes_disciplina` rows for the plan, then insert the new set. This is done inside the service function (two Supabase calls).

**Rationale:** Simplest correct approach given no partial-update guarantee on many-to-many sets. Cascade delete on `plan_id` handles cleanup automatically. Supabase does not support upsert on composite unique constraints without awkward conflict resolution.

**Risk:** Tiny window where a plan has no disciplines between the delete and insert. Mitigated by running both calls sequentially within the same async function; no distributed transaction needed at this scale.

---

### D6 — Discipline multi-select rendered as checkboxes inside the modal

**Decision:** The `disciplinaIds` field in `PlanFormModal` renders the tenant's active disciplines as a list of checkboxes (not a dropdown or tag-picker component).

**Rationale:** No existing multi-select `<ui>` component in the codebase. Checkboxes require no new dependency and match the design reference in the user story. Accessibility is straightforward (`<label>` + `<input type="checkbox">`).

**Alternatives considered:** React-Select or similar library — rejected (new dependency). Native `<select multiple>` — rejected (poor UX and inconsistent with design).

---

### D7 — Right-side slide-over modal, reusing `DisciplineFormModal` pattern

**Decision:** `PlanFormModal` reuses the same overlay + drawer pattern as `DisciplineFormModal` (fixed right panel, backdrop click to close, Escape key, focus trap).

**Rationale:** Consistency. The user story explicitly requires the same right-modal pattern as `gestion-escenarios`.

---

### D8 — Navigation: add entry to `RoleBasedMenu`

**Decision:** Add the "Gestión de Planes" nav entry in `RoleBasedMenu.tsx` under the `administrador` role section. Also update `src/lib/constants.ts` if a `NAV_ROUTES` map exists.

**Rationale:** All feature routes are registered in `RoleBasedMenu`; this keeps navigation configuration centralized.

---

### D9 — Migration strategy: evolve, not recreate

**Decision:** The migration ALTERs the existing `planes` table rather than dropping and recreating.

Sequence:
1. `ADD COLUMN vigencia_meses integer`
2. Backfill from `duracion_dias` (`ceil(duracion_dias / 30)`, min 1)
3. `ALTER COLUMN vigencia_meses SET NOT NULL`
4. `DROP COLUMN duracion_dias`
5. `ADD COLUMN updated_at`
6. Add unique constraint `(tenant_id, nombre)`
7. Create `planes_disciplina` table
8. Add RLS policies

**Rationale:** Preserves existing data. The backfill step ensures no null values before applying `NOT NULL`. Rollback is not provided (destructive column drop); the team accepts this given it is a development-stage database.

---

## Architecture Diagram

```
Delivery Layer
  app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx
       │  params → tenantId
       ▼
Presentation Layer
  components/portal/planes/
    PlanesPage.tsx          ← client component, wires hook → UI
      ├── PlanesHeaderFilters.tsx  (search + "New Plan" button)
      ├── PlanesTable.tsx          (rows + edit/delete actions)
      └── PlanFormModal.tsx        (create/edit slide-over)
       │
       │  usePlanes(tenantId)
       ▼
Application Layer
  hooks/portal/planes/
    usePlanes.ts      ← list state, modal control, delete
    usePlanForm.ts    ← form state, validation, submit
       │
       │  planes.service.*
       ▼
Infrastructure Layer
  services/supabase/portal/planes.service.ts
    getPlanes(supabase, tenantId)
    createPlan(supabase, input)
    updatePlan(supabase, input)
    deletePlan(supabase, tenantId, planId)
       │
       │  Supabase PostgREST (RLS enforced)
       ▼
Database
  planes          (evolved: + vigencia_meses, + updated_at, - duracion_dias)
  planes_disciplina (new join table)
  disciplinas     (read-only reference)
```

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `DROP COLUMN duracion_dias` loses data if backfill has a bug | Validate backfill in a dev environment before applying to staging; review row counts before/after. |
| Tiny gap between delete and reinsert of `planes_disciplina` | Acceptable at current scale; no concurrent user is likely to query a specific plan's disciplines in that window. |
| Discipline multi-select can grow large (many disciplines) | Add a search/filter input inside the modal if discipline count exceeds ~20 (deferred, not in this feature). |
| `planes_tenant_nombre_uk` unique constraint may conflict with existing duplicate names | Backfill query should check for duplicates before applying constraint; if found, unique names must be resolved manually. |
| Navigation entry missed in role guard | `(administrador)` route group layout already gates access; nav entry is cosmetic only — no security risk if omitted. |

---

## Migration Plan

1. Create `supabase/migrations/20260301000200_planes_gestion.sql` with the full migration script from the user story.
2. Apply locally: `supabase db reset` or `supabase migration up`.
3. Verify: confirm `planes` has `vigencia_meses` and `updated_at`; confirm `planes_disciplina` table exists.
4. Apply to staging before merging.

**Rollback:** Drop `planes_disciplina`, drop added columns, re-add `duracion_dias` manually. Not scripted due to dev-stage constraints.

---

## Open Questions

- **Q1:** Should `deletePlan` hard-delete or soft-delete (set `activo = false`)? The user story mentions both options. **Recommendation:** Hard-delete with a confirmation step; the cascade on `planes_disciplina` handles cleanup. Soft-delete adds UI complexity without clear benefit at this stage.
- **Q2:** Should the `planes` list show inactive plans by default, or filter them out? **Recommendation:** Show all plans (active + inactive) in the admin view, with a status badge column — matches the disciplines pattern.
