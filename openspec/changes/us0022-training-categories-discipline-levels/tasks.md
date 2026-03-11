## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0022-training-categories-discipline-levels` from `develop`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before making any changes

---

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260311000100_entrenamiento_categorias_niveles.sql`
- [x] 2.2 Add `CREATE TABLE public.nivel_disciplina` with columns `id`, `tenant_id` (FK → `tenants` CASCADE), `disciplina_id` (FK → `disciplinas` CASCADE), `nombre varchar(50)`, `orden integer`, `activo boolean DEFAULT true`, `created_at timestamptz DEFAULT now()`
- [x] 2.3 Add UNIQUE constraints `(tenant_id, disciplina_id, nombre)` and `(tenant_id, disciplina_id, orden)` and CHECK `orden > 0` to `nivel_disciplina`
- [x] 2.4 Add `CREATE TABLE public.usuario_nivel_disciplina` with columns `id`, `usuario_id` (FK → `usuarios` CASCADE), `tenant_id` (FK → `tenants` CASCADE), `disciplina_id` (FK → `disciplinas` CASCADE), `nivel_id` (FK → `nivel_disciplina` ON DELETE RESTRICT), `asignado_por` (FK → `usuarios`), `created_at`, `updated_at`
- [x] 2.5 Add UNIQUE constraint `(usuario_id, tenant_id, disciplina_id)` to `usuario_nivel_disciplina`
- [x] 2.6 Add `CREATE TABLE public.entrenamiento_grupo_categorias` with columns `id`, `grupo_id` (FK → `entrenamientos_grupo` CASCADE), `nivel_id` (FK → `nivel_disciplina` ON DELETE RESTRICT), `cupos_asignados integer CHECK >= 0`, `created_at`; UNIQUE `(grupo_id, nivel_id)`
- [x] 2.7 Add `CREATE TABLE public.entrenamiento_categorias` with columns `id`, `entrenamiento_id` (FK → `entrenamientos` CASCADE), `nivel_id` (FK → `nivel_disciplina` ON DELETE RESTRICT), `cupos_asignados integer CHECK >= 0`, `sincronizado_grupo boolean NOT NULL DEFAULT true`, `created_at`; UNIQUE `(entrenamiento_id, nivel_id)`
- [x] 2.8 Add `ALTER TABLE public.reservas ADD COLUMN entrenamiento_categoria_id uuid REFERENCES public.entrenamiento_categorias(id) ON DELETE SET NULL`
- [x] 2.9 Add all indexes: `(tenant_id, disciplina_id)` on `nivel_disciplina`; `(usuario_id, tenant_id)` and `nivel_id` on `usuario_nivel_disciplina`; `grupo_id` on `entrenamiento_grupo_categorias`; `entrenamiento_id` on `entrenamiento_categorias`; `entrenamiento_categoria_id` on `reservas`
- [x] 2.10 Grant DML (`select, insert, update, delete`) to `authenticated` on all 4 new tables
- [x] 2.11 Add RLS policies on `nivel_disciplina`: SELECT for authenticated tenant members; INSERT/UPDATE/DELETE restricted to `get_admin_tenants_for_authenticated_user()`
- [x] 2.12 Add RLS policies on `usuario_nivel_disciplina`: SELECT for authenticated tenant members; INSERT/UPDATE restricted to `get_trainer_or_admin_tenants_for_authenticated_user()`; no DELETE policy
- [x] 2.13 Add RLS policies on `entrenamiento_grupo_categorias` and `entrenamiento_categorias`: SELECT for authenticated tenant members; INSERT/UPDATE/DELETE restricted to `get_trainer_or_admin_tenants_for_authenticated_user()` (via join through parent table's `tenant_id`)
- [x] 2.14 Apply migration locally with `npx supabase db reset` or `npx supabase migration up` and verify all tables, constraints, and policies are created

---

## 3. Types Layer

- [x] 3.1 Create `src/types/portal/nivel-disciplina.types.ts` — define `NivelDisciplina`, `NivelDisciplinaInput` (create/edit form), `NivelDisciplinaServiceError` if needed
- [x] 3.2 Create `src/types/portal/entrenamiento-categorias.types.ts` — define `EntrenamientoGrupoCategoria`, `EntrenamientoCategoria`, `EntrenamientoCategoriaInput`, `EntrenamientoCategoriaConCapacidad` (view model with nivel nombre + orden)
- [x] 3.3 Extend `src/types/portal/disciplines.types.ts` — add `DisciplineWithNiveles` (extends `Discipline` with `niveles: NivelDisciplina[]`) and `NivelDisciplinaCount` view model
- [x] 3.4 Extend `src/types/portal/entrenamientos.types.ts` — add `EntrenamientoGrupoCategoria`, `EntrenamientoCategoria` imports/re-exports; extend `TrainingGroup` with optional `categorias?: EntrenamientoGrupoCategoria[]`; extend `TrainingInstance` with optional `categorias?: EntrenamientoCategoria[]`; add `CategoriasFormState` type for form step state
- [x] 3.5 Extend `src/types/portal/equipo.types.ts` — add `UsuarioNivelDisciplina`, `UsuarioNivelDisciplinaInput`, `AsignarNivelView` (view model combining discipline name, level options, current selection)
- [x] 3.6 Extend `src/types/portal/reservas.types.ts` — add optional `entrenamiento_categoria_id?: string | null` and `categoria_nombre?: string | null` to `ReservaView` and `CreateReservaInput`

---

## 4. Service Layer

- [x] 4.1 Create `src/services/supabase/portal/nivel-disciplina.service.ts` — implement `getNivelesDisciplina(tenantId, disciplinaId)`, `createNivelDisciplina(input)`, `updateNivelDisciplina(id, input)`, `deleteNivelDisciplina(id)` with FK-conflict error mapping (code `23503` → user-friendly "nivel en uso" message)
- [x] 4.2 Create `src/services/supabase/portal/usuario-nivel-disciplina.service.ts` — implement `getUsuarioNivelesDisciplina(usuarioId, tenantId)`, `upsertUsuarioNivelDisciplina(input)` — set `asignado_por` from `auth.uid()` in the service, never from input
- [x] 4.3 Create `src/services/supabase/portal/entrenamiento-categorias.service.ts` — implement `getEntrenamientoCategorias(entrenamientoId)`, `getGrupoCategorias(grupoId)`, `upsertGrupoCategorias(grupoId, categorias[])`, `upsertInstanceCategorias(entrenamientoId, categorias[], sincronizadoGrupo)`, `deleteGrupoCategorias(grupoId)`, `deleteInstanceCategorias(entrenamientoId)`
- [x] 4.4 Extend `src/services/supabase/portal/entrenamientos.service.ts` — update `createTrainingSeries()` to accept optional `categorias` in input, insert `entrenamiento_grupo_categorias` after group creation, and insert `entrenamiento_categorias` for each generated instance with `sincronizado_grupo = true`
- [x] 4.5 Extend `src/services/supabase/portal/entrenamientos.service.ts` — update `updateTrainingSeries(scope)` to re-sync `entrenamiento_categorias` rows according to scope: `single` sets `sincronizado_grupo = false` on overridden instance; `future`/`series` deletes and re-inserts rows on eligible instances (`sincronizado_grupo = true`)

---

## 5. Hook Layer

- [ ] 5.1 Create `src/hooks/portal/nivel-disciplina/useNivelesDisciplina.ts` — manage `niveles` list, `loading`, `error`, and expose `createNivel`, `updateNivel`, `deleteNivel` actions; accepts `(tenantId, disciplinaId)`; fetches lazily (called by consumer on demand)
- [ ] 5.2 Create `src/hooks/portal/gestion-equipo/useUsuarioNivelDisciplina.ts` — fetch `getUsuarioNivelesDisciplina` on mount, expose `asignarNivel(input)` action, `loading`, `error`, `successMessage`
- [ ] 5.3 Create `src/hooks/portal/entrenamientos/useEntrenamientoCategorias.ts` — fetch `getEntrenamientoCategorias(entrenamientoId)` reactively, expose `categorias`, `loading`, `error`
- [ ] 5.4 Extend `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` — add `categoriasEnabled` toggle state, `categoriasForm` (map of `nivel_id → cupos_asignados`), computed `totalAsignado`, `cuposSinCategoria`, validation `sumExceedsMax` and `allZeroWhenEnabled`; wire `checkDisciplinaHasNiveles(disciplinaId, tenantId)` call that toggles step visibility; pass categorias to `createTrainingSeries` / `updateTrainingSeries` calls
- [ ] 5.5 Extend `src/hooks/portal/entrenamientos/useEntrenamientos.ts` — wire `useEntrenamientoCategorias` for the selected `entrenamientoId`; expose `instanciaCategorias` alongside existing instance data

---

## 6. Component Layer — New Components

- [ ] 6.1 Create `src/components/portal/disciplines/NivelDisciplinaFormModal.tsx` — right-side modal (create/edit mode) with fields `nombre` (text, required, max 50), `orden` (number, required, >0), `activo` (checkbox); inline field-level validation; submit/cancel with loading state
- [ ] 6.2 Create `src/components/portal/disciplines/NivelesDisciplinaPanel.tsx` — collapsible panel rendered below a discipline row; table with columns `orden`, `nombre`, `activo`, actions (edit/delete); loading, empty, and error states; "Agregar nivel" button; delete confirmation; FK-blocked delete error message using `useNivelesDisciplina`
- [ ] 6.3 Create `src/components/portal/entrenamientos/EntrenamientoCategoriasSection.tsx` — renders the categories step: "¿Usar categorías?" toggle; when enabled, shows one number input per active `nivel_disciplina` row (sorted by `orden ASC`) labelled with `nombre`; summary row showing "Total asignado", "Cupos sin categoría", and inline validation error when sum exceeds `capacidad_maxima`
- [ ] 6.4 Create `src/components/portal/gestion-equipo/AsignarNivelModal.tsx` — modal for assigning levels; shows a dropdown per discipline (filtered to disciplines with active levels); pre-selects current level; uses `useUsuarioNivelDisciplina`; inline error; success toast on submit

---

## 7. Component Layer — Modified Components

- [ ] 7.1 Modify `src/components/portal/disciplines/DisciplinesTable.tsx` — add an expand/collapse chevron icon button to each row; manage `expandedDisciplinaId` state; render `NivelesDisciplinaPanel` below the expanded row passing `tenantId` and `disciplinaId`; verify existing edit/delete/toggle actions are unaffected
- [ ] 7.2 Modify `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` — wire `EntrenamientoCategoriasSection` after the discipline field; pass `disciplinaId` and `tenantId` to the section; conditionally render based on `useEntrenamientoForm.disciplinaHasNiveles`
- [ ] 7.3 Modify `src/components/portal/gestion-equipo/EquipoTable.tsx` — add "Asignar nivel" icon button (`military_tech` or equivalent) to each row's action column; wire `onAsignarNivel(usuarioId)` callback prop; verify all existing action buttons are unaffected
- [ ] 7.4 Modify `src/components/portal/gestion-equipo/EquipoPage.tsx` — add `asignarNivelTarget: string | null` state; pass `onAsignarNivel` to `EquipoTable`; render `AsignarNivelModal` when `asignarNivelTarget` is set; reset state on modal close

---

## 8. Page Layer

- [ ] 8.1 Review `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx` — confirm `tenantId` is forwarded correctly to `EquipoPage`; no route-level changes needed if `administrador` route-group gate already handles access; verify `entrenador` access notes in spec are addressed at RLS layer only
- [ ] 8.2 Review `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx` — confirm no changes needed (modifications are component-level only)

---

## 9. Documentation

- [ ] 9.1 Update `projectspec/03-project-structure.md` — add `NivelesDisciplinaPanel.tsx`, `NivelDisciplinaFormModal.tsx` under `disciplines/` slice; add `EntrenamientoCategoriasSection.tsx` under `entrenamientos/` slice; add `AsignarNivelModal.tsx` under `gestion-equipo/` slice
- [ ] 9.2 Update `projectspec/03-project-structure.md` — add `nivel-disciplina.types.ts`, `entrenamiento-categorias.types.ts` under `types/portal/`
- [ ] 9.3 Update `projectspec/03-project-structure.md` — add `nivel-disciplina.service.ts`, `usuario-nivel-disciplina.service.ts`, `entrenamiento-categorias.service.ts` under `services/supabase/portal/`
- [ ] 9.4 Update `projectspec/03-project-structure.md` — add `useNivelesDisciplina.ts` under `hooks/portal/nivel-disciplina/`; add `useUsuarioNivelDisciplina.ts` under `hooks/portal/gestion-equipo/`; add `useEntrenamientoCategorias.ts` under `hooks/portal/entrenamientos/`

---

## 10. Commit and Pull Request

- [ ] 10.1 Stage all changes and create a commit with message:
  ```
  feat(us0022): training categories with discipline levels

  - Add nivel_disciplina, usuario_nivel_disciplina, entrenamiento_grupo_categorias,
    entrenamiento_categorias tables with RLS and indexes
  - Add entrenamiento_categoria_id nullable FK to reservas (Phase 5 ready)
  - Implement NivelesDisciplinaPanel + NivelDisciplinaFormModal inside DisciplinesTable
  - Implement EntrenamientoCategoriasSection with capacity validation and sync propagation
  - Implement AsignarNivelModal + Asignar nivel action in EquipoTable/EquipoPage
  - Extend TrainingGroup, TrainingInstance, equipo, and reservas types
  ```
- [ ] 10.2 Push branch and open Pull Request with description:
  ```
  ## US-0022 — Training Categories with Discipline Levels

  ### Changes
  - Database: 4 new tables (nivel_disciplina, usuario_nivel_disciplina,
    entrenamiento_grupo_categorias, entrenamiento_categorias) + nullable FK on reservas
  - Disciplines screen: collapsible levels panel per discipline row (admin only)
  - Training form: optional per-level capacity step when discipline has active levels
  - Team screen: "Asignar nivel" action for admin/coach to assign athlete levels

  ### Backward Compatibility
  - reservas.entrenamiento_categoria_id is NULLABLE — no existing booking flows affected
  - Training form categories step hidden for disciplines without levels — no UX change
  - DisciplinesTable expand toggle is additive — existing actions unaffected

  ### Testing Notes
  - Create levels for a discipline → verify panel CRUD and delete blocking
  - Create a training series with categories → verify group + instance rows created
  - Edit series categories with each scope → verify sync propagation
  - Assign a level to an athlete → verify upsert behavior and pre-population on re-open

  Closes #US-0022
  ```
