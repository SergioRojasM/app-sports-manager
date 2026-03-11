## Why

Training sessions currently have a single capacity pool (`capacidad_maxima`), with no way to partition seats by athlete skill level. Coaches managing mixed-ability groups have no enforcement mechanism to prevent overbooking a specific level, and the platform has no concept of per-discipline progression levels at all. This change introduces discipline levels, per-level seat allocations in training sessions, and the tooling for coaches/admins to assign levels to athletes — enabling structured, progression-based access control.

## What Changes

- **New**: A `nivel_disciplina` level catalogue per discipline per tenant (e.g. Básico, Intermedio, Avanzado), manageable from the Disciplines screen via a collapsible panel per row.
- **New**: A `usuario_nivel_disciplina` table that records the certified level of an athlete per discipline per tenant, assignable from the Team Management screen.
- **New**: `entrenamiento_grupo_categorias` and `entrenamiento_categorias` tables to store capacity allocations per level at both the series and instance level.
- **Modified**: Training series form gains an optional **Categorías** step (only shown when the selected discipline has levels). Users define `cupos_asignados` per level, with live validation against `capacidad_maxima`.
- **Modified**: `reservas` table gains a nullable `entrenamiento_categoria_id` column for backward-compatible linkage to a booked category (Phase 5 booking UX is a separate story).
- **Modified**: `DisciplinesTable` gains an expand toggle per row revealing `NivelesDisciplinaPanel`.
- **Modified**: `EquipoTable` / `EquipoPage` gain an "Asignar nivel" action that opens `AsignarNivelModal`; the `entrenador` role is extended access to this action.
- Scope propagation for category edits mirrors the existing `bloquear_sync_grupo` pattern (`single` / `future` / `series`).

## Capabilities

### New Capabilities

- `discipline-levels-management`: CRUD management of ordered levels per discipline per tenant, nested inside the Disciplines screen.
- `athlete-discipline-level-assignment`: Assigning (upsert) a certified discipline level to an athlete from the Team Management screen, accessible by `administrador` and `entrenador` roles.
- `training-session-categories`: Optional per-level seat allocation on training series and instances, with live capacity validation and scope-aware propagation on edits.

### Modified Capabilities

- `disciplines-management`: `DisciplinesTable` is extended with an expand toggle and inline `NivelesDisciplinaPanel`; `DisciplineWithNiveles` and `NivelDisciplinaCount` view models added to types.
- `team-management`: `EquipoTable` gains an "Asignar nivel" action column; `EquipoPage` wires `AsignarNivelModal`; `entrenador` role gains access to the page for level-assignment only.
- `training-management`: `EntrenamientoFormModal` gains a conditional categories step; `createTrainingSeries` and `updateTrainingSeries(scope)` handle group/instance category propagation; `TrainingGroup` and `TrainingInstance` types extended with optional `categorias` arrays.

## Impact

### Database
- 4 new tables: `nivel_disciplina`, `usuario_nivel_disciplina`, `entrenamiento_grupo_categorias`, `entrenamiento_categorias`
- 1 column added: `reservas.entrenamiento_categoria_id` (nullable, backward-compatible)
- RLS policies on all new tables (tenant-scoped, role-gated mutations)
- Indexes on all new FK columns
- Migration file: `supabase/migrations/<timestamp>_entrenamiento_categorias_niveles.sql`

### New files
```
src/types/portal/nivel-disciplina.types.ts
src/services/supabase/portal/nivel-disciplina.service.ts
src/hooks/portal/nivel-disciplina/useNivelesDisciplina.ts
src/components/portal/disciplines/NivelesDisciplinaPanel.tsx
src/components/portal/disciplines/NivelDisciplinaFormModal.tsx

src/types/portal/entrenamiento-categorias.types.ts
src/services/supabase/portal/entrenamiento-categorias.service.ts
src/hooks/portal/entrenamientos/useEntrenamientoCategorias.ts
src/components/portal/entrenamientos/EntrenamientoCategoriasSection.tsx

src/services/supabase/portal/usuario-nivel-disciplina.service.ts
src/hooks/portal/gestion-equipo/useUsuarioNivelDisciplina.ts
src/components/portal/gestion-equipo/AsignarNivelModal.tsx
```

### Modified files

| File | Change |
|------|--------|
| `src/types/portal/disciplines.types.ts` | Add `DisciplineWithNiveles`, `NivelDisciplinaCount` |
| `src/types/portal/equipo.types.ts` | Add `UsuarioNivelDisciplina`, `UsuarioNivelDisciplinaInput`, `AsignarNivelView` |
| `src/types/portal/entrenamientos.types.ts` | Add category types; extend `TrainingGroup` and `TrainingInstance` with optional `categorias` |
| `src/types/portal/reservas.types.ts` | Add nullable `entrenamiento_categoria_id?` and `categoria_nombre?` to `ReservaView` and `CreateReservaInput` |
| `src/services/supabase/portal/entrenamientos.service.ts` | `createTrainingSeries()` saves group categories + propagates to instances; `updateTrainingSeries(scope)` re-syncs categories |
| `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Wire `useEntrenamientoCategorias` for selected instance |
| `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Add `categorias` step state, validation, submit handling |
| `src/components/portal/disciplines/DisciplinesTable.tsx` | Add expand toggle per row + render `NivelesDisciplinaPanel` inline |
| `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | Add `EntrenamientoCategoriasSection` step conditionally |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Add "Asignar nivel" action button |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Wire `AsignarNivelModal` open/close + `useUsuarioNivelDisciplina` |
| `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx` | Extend `entrenador` role access if needed |

### Dependencies / systems
- Supabase (schema migration, RLS, browser client only — no admin client mutations from frontend)
- Existing role-check patterns in `reservas` RLS reused for `entrenador` access to `usuario_nivel_disciplina`
- `bloquear_sync_grupo` propagation pattern in `entrenamientos.service.ts` reused for category sync

## Non-goals

- **Phase 5 booking UX**: athletes selecting/being auto-assigned to a category at reservation time is out of scope for this story.
- **Drag-and-drop level reordering**: `orden` is managed via a numeric input field, not drag-and-drop.
- **Level history / audit log**: no tracking of previous level assignments beyond `updated_at`.
- **Level-based booking enforcement at reservation time**: the `entrenamiento_categoria_id` column is added for forward-compatibility but the booking restriction logic is deferred to the next story.
- **Bulk level assignment**: only individual athlete level assignment is supported.
