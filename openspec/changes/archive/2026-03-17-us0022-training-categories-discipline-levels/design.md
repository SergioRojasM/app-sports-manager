## Context

The app currently supports training sessions with a single shared capacity (`capacidad_maxima`). There is no concept of skill progression within a discipline, no per-level seat allocation, and no tooling to assign levels to athletes. Three separate screens are affected: Gestión de Disciplinas, Gestión de Entrenamientos, and Gestión Equipo. The change must be fully backward-compatible — existing trainings, reservations, and disciplines must continue working without modification.

Key constraints:
- All DB mutations through the **browser Supabase client** only (RLS-enforced). No server-side admin client used from UI code.
- Tech stack: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Supabase/PostgreSQL.
- Architecture: hexagonal + feature slices: types → services → hooks → components → pages.
- Role helpers already exist in DB: `get_admin_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()`.

---

## Goals / Non-Goals

**Goals:**
- Introduce a per-discipline, per-tenant ordered level catalogue (`nivel_disciplina`).
- Enable admins/coaches to assign a discipline level to an athlete (`usuario_nivel_disciplina`).
- Allow optional per-level capacity allocation on training series and instances (`entrenamiento_grupo_categorias`, `entrenamiento_categorias`).
- Enforce capacity validation: `SUM(cupos_asignados) ≤ capacidad_maxima` at form level.
- Propagate category changes across instances using the existing scope model (`single` / `future` / `series`) mirroring `bloquear_sync_grupo`.
- Add a nullable `entrenamiento_categoria_id` to `reservas` for forward-compatibility.
- Extend `entrenador` role access to the level-assignment modal in Gestión Equipo.

**Non-Goals:**
- Booking enforcement at reservation time (Phase 5, separate story).
- Drag-and-drop level reordering.
- Level history / audit log.
- Bulk athlete level assignment.
- Auto-category selection during booking (Phase 5).

---

## Decisions

### Decision 1 — Category sync pattern mirrors `bloquear_sync_grupo`

**Choice**: Reuse the existing `sincronizado_grupo` boolean column on `entrenamiento_categorias` (analogous to `bloquear_sync_grupo` on `entrenamientos`) to track whether an instance's categories are still in sync with the series definition.

**Rationale**: The scope propagation logic in `updateTrainingSeries` already handles `single` / `future` / `series` scopes and filters by `bloquear_sync_grupo = false` when applying bulk updates. The same pattern is applied to categories: when a single instance override occurs, its rows are marked `sincronizado_grupo = false`; bulk re-sync only touches rows where `sincronizado_grupo = true`.

**Alternative considered**: A separate `entrenamiento_categorias_override` table — rejected as over-engineering. A boolean flag per row is sufficient and consistent with the existing schema.

---

### Decision 2 — Category capacity validation is in-memory in the hook

**Choice**: `SUM(cupos_asignados) ≤ capacidad_maxima` is computed in `useEntrenamientoForm` using local state, not a DB-level constraint.

**Rationale**: The DB already enforces `cupos_asignados >= 0` via a CHECK constraint. The sum-vs-max validation is a UX-layer concern (live feedback as the user types). A DB constraint on the sum would require a trigger or deferred constraint and would produce opaque errors. Inline hook validation matches the existing field-validation pattern used by `useEntrenamientoForm` and `useDisciplineForm`.

**Alternative considered**: PostgreSQL trigger on INSERT/UPDATE of `entrenamiento_categorias` — rejected due to complexity and UX degradation (error only visible after submit).

---

### Decision 3 — `usuario_nivel_disciplina` uses UPSERT (no DELETE)

**Choice**: The service layer exposes only `upsert` for athlete level assignment. There is no delete endpoint for `usuario_nivel_disciplina`.

**Rationale**: Levels represent earned progression. Removing a level entirely is semantically different from changing it. Upsert on `(usuario_id, tenant_id, disciplina_id)` unique key satisfies both create and update in a single operation. This also avoids accidentally orphaning future category-access logic.

**Alternative considered**: Separate `insert` / `update` / `delete` — rejected; UPSERT is simpler and safer for this use case.

---

### Decision 4 — `NivelesDisciplinaPanel` is collapsible within `DisciplinesTable` row

**Choice**: Each discipline row in `DisciplinesTable` gains an expand/collapse chevron toggle that renders `NivelesDisciplinaPanel` inline below the row (not a modal or drawer).

**Rationale**: Levels are tightly scoped to a specific discipline and are managed infrequently. An inline panel avoids modal stacking (there is already `DisciplineFormModal` and `NivelDisciplinaFormModal` in scope). Panel data is fetched lazily on first expand and cached in component state (no polling).

**Alternative considered**: Separate page/route per discipline — rejected; too much navigation overhead for a simple list of 2–5 items.

---

### Decision 5 — RLS for `usuario_nivel_disciplina` and `nivel_disciplina` mutations reuses `get_trainer_or_admin_tenants_for_authenticated_user()`

**Choice**: Mutation policies on `nivel_disciplina` restrict to `administrador` only (via `get_admin_tenants_for_authenticated_user()`). Mutation policies on `usuario_nivel_disciplina` allow both `administrador` and `entrenador` (via `get_trainer_or_admin_tenants_for_authenticated_user()`).

**Rationale**: The function `get_trainer_or_admin_tenants_for_authenticated_user()` already exists in the DB (created in `20260302000200_reservas_rls_policies.sql`) and follows the established pattern. Reusing it avoids schema duplication. Level catalogue management (`nivel_disciplina`) is an admin-only concern; athlete level assignment (`usuario_nivel_disciplina`) is appropriate for coaches too.

**Alternative considered**: Inline `exists(select 1 from miembros_tenant ...)` in each policy — rejected; existing helper functions are cleaner and already tested.

---

### Decision 6 — `asignado_por` populated server-side via `auth.uid()` in service layer

**Choice**: The `asignado_por` column in `usuario_nivel_disciplina` is set to `auth.uid()` by the service, never trusted from client input.

**Rationale**: Prevents impersonation. The browser client's `auth.uid()` is verified by Supabase JWT. This mirrors the `atleta_id = auth.uid()` enforcement in `reservas` RLS.

---

### Decision 7 — Training categories step is conditional on discipline having active levels

**Choice**: `EntrenamientoCategoriasSection` and its supporting step in `useEntrenamientoForm` are rendered/activated only when `disciplina_id` is set and the selected discipline has `nivel_disciplina` rows with `activo = true` for the tenant.

**Rationale**: Disciplines without levels should have zero UI change (backward compatibility). The check is done in the hook by querying `nivel_disciplina` after `disciplina_id` is selected; result is cached for the life of the modal.

---

## Architecture Diagram

```
Types Layer
  nivel-disciplina.types.ts
  entrenamiento-categorias.types.ts
  (extend) disciplines.types.ts, equipo.types.ts, entrenamientos.types.ts, reservas.types.ts

Service Layer
  nivel-disciplina.service.ts          ← CRUD for nivel_disciplina
  usuario-nivel-disciplina.service.ts  ← upsert for usuario_nivel_disciplina
  entrenamiento-categorias.service.ts  ← create/sync/delete for entrenamiento_categorias
  (extend) entrenamientos.service.ts   ← createTrainingSeries / updateTrainingSeries w/ categories

Hook Layer
  useNivelesDisciplina.ts              ← list + CRUD state for NivelesDisciplinaPanel
  useUsuarioNivelDisciplina.ts         ← fetch + upsert athlete level
  useEntrenamientoCategorias.ts        ← fetch categories for selected instance
  (extend) useEntrenamientoForm.ts     ← categorias step state + validation
  (extend) useEntrenamientos.ts        ← wire useEntrenamientoCategorias

Component Layer
  disciplines/
    NivelesDisciplinaPanel.tsx         ← collapsible panel per discipline row
    NivelDisciplinaFormModal.tsx        ← create/edit level modal
    (extend) DisciplinesTable.tsx      ← expand toggle
  entrenamientos/
    EntrenamientoCategoriasSection.tsx  ← capacity-per-level inputs with live totals
    (extend) EntrenamientoFormModal.tsx ← conditional categories step
  gestion-equipo/
    AsignarNivelModal.tsx              ← per-discipline level assignment
    (extend) EquipoTable.tsx           ← "Asignar nivel" action button
    (extend) EquipoPage.tsx            ← modal wire-up
```

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Deleting a `nivel_disciplina` row that is referenced by `usuario_nivel_disciplina` or `entrenamiento_categorias` | `ON DELETE RESTRICT` FK prevents silent deletion at DB level. Service catches FK error (`code 23503`) and surfaces a user-friendly message in `NivelesDisciplinaPanel`. |
| `SUM(cupos_asignados) > capacidad_maxima` saved to DB if validation bypassed on client | Add a DB-level CHECK or trigger as a backstop in a follow-up migration if needed. For now, hook-level validation is the primary guard. |
| `sincronizado_grupo = true` instances might be unexpectedly re-synced on series edit if coach edits categories for a different scope than intended | Scope selection UI is explicit (same pattern as existing training edit scope modal). No implicit re-sync on save. |
| `entrenador` role gaining page-level access to `gestion-equipo` route may expose other UI sections | Route-level role guard stays unchanged. Only the "Asignar nivel" button is shown for `entrenador`; all other mutating actions in `EquipoTable` remain gated to `administrador`. |
| `entrenamiento_categoria_id` on `reservas` — nullable FK with `ON DELETE SET NULL` | Existing reservas and all current booking flows remain valid. No booking logic reads this column until Phase 5. |

---

## Migration Plan

**Migration file**: `supabase/migrations/20260311000100_entrenamiento_categorias_niveles.sql`

### Forward steps

1. Create `nivel_disciplina` table with constraints and RLS.
2. Create `usuario_nivel_disciplina` table with constraints and RLS.
3. Create `entrenamiento_grupo_categorias` table with constraints and RLS.
4. Create `entrenamiento_categorias` table with constraints and RLS.
5. `ALTER TABLE public.reservas ADD COLUMN entrenamiento_categoria_id uuid REFERENCES public.entrenamiento_categorias(id) ON DELETE SET NULL;`
6. Create all indexes.
7. Grant DML to `authenticated` on new tables.

### Rollback

- Drop the new column from `reservas` (safe since it's nullable with no data).
- Drop new tables in reverse dependency order: `entrenamiento_categorias`, `entrenamiento_grupo_categorias`, `usuario_nivel_disciplina`, `nivel_disciplina`.
- No data loss to existing tables if rollback is applied before any production data is written to new tables.

### Zero-downtime consideration

- All schema changes are additive (new tables + nullable column). Existing application code continues working during migration.
- Deploy migration before deploying new frontend code.

---

## Open Questions

- **Q1**: Should `entrenador` role be able to *create* or *delete* `nivel_disciplina` rows, or only to *assign* levels to athletes? Current design: level catalogue management is `administrador` only; only athlete assignment is `entrenador`. Confirm with stakeholder before implementing RLS migration.
- **Q2**: When a `nivel_disciplina` row is deactivated (`activo = false`), should existing `entrenamiento_categorias` rows referencing it be hidden or still shown? Current approach: inactive levels are filtered out when loading the categories step form, but existing persisted rows are retained.
- **Q3**: `AsignarNivelModal` shows all disciplines with levels — if a tenant has 10+ disciplines each with 5 levels, the modal may become unwieldy. Should we paginate or filter by discipline? Likely acceptable for MVP; revisit if needed.
