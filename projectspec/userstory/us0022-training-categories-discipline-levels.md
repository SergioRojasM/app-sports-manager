# User Story: Training Categories with Discipline Levels

## ID
US0022

## Title
Training Categories with Per-Discipline Levels — Subdivide Training Capacity by Level and Restrict Booking Access

## As a
Portal **Administrator** or **Coach (Entrenador)** of an organization (tenant)

## I Want
To define hierarchical **levels** for each discipline (e.g., Básico, Intermedio, Avanzado), assign those levels to athletes, and subdivide training session capacity into **categories** tied to those levels — so that each category has its own seat allocation and only athletes with the required level (or above) can register.

## So That
Training sessions are better organized by skill level, athletes are automatically guided to the correct category, coaches can manage heterogeneous groups without overbooking a specific level, and the platform enforces progression-based access control.

---

## Description

This story spans **four implementation phases** that must be delivered together for the feature to be coherent. Phase 5 (booking UX changes) is intentionally excluded and will be covered in a separate story.

### Phase 1 — Database Schema

Four new tables and one column addition to support the full feature:

#### `nivel_disciplina` — Level catalogue per discipline per tenant

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` DEFAULT `gen_random_uuid()` PRIMARY KEY | |
| `tenant_id` | `uuid` NOT NULL FK → `public.tenants(id)` ON DELETE CASCADE | |
| `disciplina_id` | `uuid` NOT NULL FK → `public.disciplinas(id)` ON DELETE CASCADE | |
| `nombre` | `varchar(50)` NOT NULL | E.g. "Básico", "Intermedio", "Avanzado" |
| `orden` | `integer` NOT NULL | Ascending hierarchy (1 = lowest). Used for minimum-level enforcement. |
| `activo` | `boolean` NOT NULL DEFAULT `true` | |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

Constraints:
- `UNIQUE (tenant_id, disciplina_id, nombre)` — no duplicate names per discipline per tenant
- `UNIQUE (tenant_id, disciplina_id, orden)` — no duplicate order values per discipline per tenant
- CHECK `orden > 0`

#### `usuario_nivel_disciplina` — Certified level of an athlete per discipline per tenant

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` DEFAULT `gen_random_uuid()` PRIMARY KEY | |
| `usuario_id` | `uuid` NOT NULL FK → `public.usuarios(id)` ON DELETE CASCADE | |
| `tenant_id` | `uuid` NOT NULL FK → `public.tenants(id)` ON DELETE CASCADE | |
| `disciplina_id` | `uuid` NOT NULL FK → `public.disciplinas(id)` ON DELETE CASCADE | |
| `nivel_id` | `uuid` NOT NULL FK → `public.nivel_disciplina(id)` ON DELETE RESTRICT | RESTRICT prevents orphaned levels |
| `asignado_por` | `uuid` NOT NULL FK → `public.usuarios(id)` | Who assigned this level |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

Constraint:
- `UNIQUE (usuario_id, tenant_id, disciplina_id)` — one active level per user per discipline per tenant

#### `entrenamiento_grupo_categorias` — Default category/level allocations for a training series

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` DEFAULT `gen_random_uuid()` PRIMARY KEY | |
| `grupo_id` | `uuid` NOT NULL FK → `public.entrenamientos_grupo(id)` ON DELETE CASCADE | |
| `nivel_id` | `uuid` NOT NULL FK → `public.nivel_disciplina(id)` ON DELETE RESTRICT | |
| `cupos_asignados` | `integer` NOT NULL CHECK `cupos_asignados >= 0` | |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

Constraint:
- `UNIQUE (grupo_id, nivel_id)`

#### `entrenamiento_categorias` — Effective category/level allocations per training instance

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` DEFAULT `gen_random_uuid()` PRIMARY KEY | |
| `entrenamiento_id` | `uuid` NOT NULL FK → `public.entrenamientos(id)` ON DELETE CASCADE | |
| `nivel_id` | `uuid` NOT NULL FK → `public.nivel_disciplina(id)` ON DELETE RESTRICT | |
| `cupos_asignados` | `integer` NOT NULL CHECK `cupos_asignados >= 0` | |
| `sincronizado_grupo` | `boolean` NOT NULL DEFAULT `true` | `false` when overridden manually at instance level |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

Constraint:
- `UNIQUE (entrenamiento_id, nivel_id)`

#### ALTER `reservas` — Add optional link to the booked category

```sql
ALTER TABLE public.reservas
  ADD COLUMN entrenamiento_categoria_id uuid
    REFERENCES public.entrenamiento_categorias(id)
    ON DELETE SET NULL;
```

Nullable — backward-compatible. Existing reservas remain valid without a category.

#### RLS Policies

All new tables follow the same tenant-scoped pattern already established:

- **`nivel_disciplina`**: SELECT for any authenticated tenant member; INSERT / UPDATE / DELETE restricted to `administrador` and `entrenador` roles only.
- **`usuario_nivel_disciplina`**: SELECT for authenticated tenant members; INSERT / UPDATE restricted to `administrador` and `entrenador`; no DELETE (use UPDATE to change level).
- **`entrenamiento_grupo_categorias`** / **`entrenamiento_categorias`**: SELECT for authenticated tenant members; mutate restricted to `administrador` and `entrenador`.

#### Indexes

```sql
CREATE INDEX ON public.nivel_disciplina (tenant_id, disciplina_id);
CREATE INDEX ON public.usuario_nivel_disciplina (usuario_id, tenant_id);
CREATE INDEX ON public.usuario_nivel_disciplina (nivel_id);
CREATE INDEX ON public.entrenamiento_grupo_categorias (grupo_id);
CREATE INDEX ON public.entrenamiento_categorias (entrenamiento_id);
CREATE INDEX ON public.reservas (entrenamiento_categoria_id);
```

Migration file: `supabase/migrations/YYYYMMDDXXXXXX_entrenamiento_categorias_niveles.sql`

---

### Phase 2 — Discipline Levels Management (inside Disciplines screen)

Extend the existing **Gestión de Disciplinas** feature to allow admins to manage the level catalogue for each discipline.

#### UX / Interaction

- Each row in `DisciplinesTable` gains an **"expand" toggle** (chevron icon button) that reveals a collapsible `NivelesDisciplinaPanel` below the row.
- The panel displays the ordered level list (by `orden` ASC) with columns: `orden`, `nombre`, `activo`, actions (edit / delete).
- An **"+ Agregar nivel"** button inside the panel opens `NivelDisciplinaFormModal`.
- Editing a level opens the same modal pre-populated.
- Deleting requires confirmation and is blocked (with an error message) if any `usuario_nivel_disciplina` or `entrenamiento_categorias` rows reference this level.
- Reordering is handled via `orden` field (integer input in the form), not drag-and-drop.
- The panel is only visible to `administrador` role (same gate as the rest of the Disciplines page).

#### Form Fields — `NivelDisciplinaFormModal`

| Field | Type | Rules |
|-------|------|-------|
| `nombre` | Text input | Required, max 50 chars, unique within discipline+tenant |
| `orden` | Number input | Required, integer > 0, unique within discipline+tenant |
| `activo` | Checkbox toggle | Default `true` |

Validation errors display inline per field, same pattern as `DisciplineFormModal`.

---

### Phase 3 — Training Categories in the Training Series Form

Extend the existing training series wizard (`EntrenamientoFormModal`) with an optional **Categorías** step.

#### UX / Interaction

- The step appears **only when the selected `disciplina_id` has at least one active level** defined for the tenant (`nivel_disciplina` > 0 rows for that discipline+tenant).
- A **"¿Usar categorías?"** toggle switch controls whether categories are enabled on this series.
- When enabled, the section lists all active levels for the discipline (sorted by `orden` ASC) and shows a number input per level for `cupos_asignados`.
- A live summary row at the bottom shows:
  - **Total asignado**: `SUM(cupos_asignados)` across all categories
  - **Cupos sin categoría**: `capacidad_maxima - SUM(cupos_asignados)` (can be ≥ 0)
  - **Validación**: if `SUM(cupos_asignados) > capacidad_maxima` → block submit with error

- Categories defined on the series are stored in `entrenamiento_grupo_categorias` and propagated to **all generated instances** in `entrenamiento_categorias` with `sincronizado_grupo = true`.

#### Series Edit Scope Propagation

When the training series is edited (categories changed):
- Scope **"Solo este"** (`single`): update only the selected instance's `entrenamiento_categorias`; mark `sincronizado_grupo = false` for overridden rows.
- Scope **"Este y futuros"** (`future`): re-sync `entrenamiento_categorias` for all future instances where `sincronizado_grupo = true`, and update `entrenamiento_grupo_categorias`.
- Scope **"Toda la serie"** (`series`): re-sync all instances with `sincronizado_grupo = true`.

The sync logic must mirror the existing `bloquear_sync_grupo` pattern used by `entrenamientos.service.ts` for other field propagation.

#### Validation Rules

- `SUM(cupos_asignados)` for all categories of a series/instance ≤ `capacidad_maxima` of the series/instance.
- At least one category must have `cupos_asignados > 0` if categories are enabled.
- A category cannot be removed from the series if any active reserva references it (the service must guard this).

---

### Phase 4 — Assign Discipline Level to Athlete (in Team Management screen)

Extend the existing **Gestión Equipo** screen (`EquipoPage`) to allow admins and coaches to assign a discipline level to any member.

#### UX / Interaction

- Each row in `EquipoTable` gains a new **"Asignar nivel"** icon button (e.g., `military_tech` Material Icon) in the actions column.
- Clicking opens `AsignarNivelModal` for that user.
- The modal displays all **disciplines** that have at least one `nivel_disciplina` defined for the tenant, as a list or tab set.
- For each discipline, a **dropdown** shows all available active levels sorted by `orden`.
- The current assigned level (if any) is pre-selected as the default value.
- Submitting calls `upsert` on `usuario_nivel_disciplina` — it creates the row if absent or updates `nivel_id` if already present.
- Success shows an inline confirmation toast; error message is shown inside the modal.
- The `Gestión Equipo` route must be extended to also allow the `entrenador` role to open this modal (read-only table + assign-level action only; no other mutations).

#### Access Control

- `administrador`: full create/update on `usuario_nivel_disciplina`
- `entrenador`: create/update on `usuario_nivel_disciplina` only (not other equipo mutations)
- `atleta` / others: no access to this modal

---

## Database Context

### Affected existing tables

| Table | Change |
|-------|--------|
| `public.reservas` | ADD COLUMN `entrenamiento_categoria_id uuid NULLABLE FK → entrenamiento_categorias(id) ON DELETE SET NULL` |
| `public.entrenamientos_grupo` | Read join to `entrenamiento_grupo_categorias` |
| `public.entrenamientos` | Read join to `entrenamiento_categorias` |
| `public.disciplinas` | Foreign key source for `nivel_disciplina` |
| `public.usuarios` | Foreign key source for `usuario_nivel_disciplina` |

### New tables summary

| Table | Purpose |
|-------|---------|
| `nivel_disciplina` | Level catalogue per discipline per tenant |
| `usuario_nivel_disciplina` | Athlete's certified level per discipline per tenant |
| `entrenamiento_grupo_categorias` | Default category allocations for a training series |
| `entrenamiento_categorias` | Effective category allocations per training instance |

---

## Expected Results

1. **Admin creates levels** for discipline "Natación": Básico (orden 1), Intermedio (orden 2), Avanzado (orden 3) via the expandable panel in Disciplinas. The levels appear ordered and are editable/deletable.
2. **Admin assigns level** "Intermedio" to athlete "Juan García" for discipline "Natación" via the Gestión Equipo → "Asignar nivel" action. Re-opening the modal shows "Intermedio" pre-selected.
3. **Admin creates a training series** for "Natación Martes" with `capacidad_maxima = 20` and enables categories: Básico = 5, Intermedio = 8, Avanzado = 2 (sum = 15; 5 free slots without category). Form shows "Cupos sin categoría: 5" and allows submission.
4. Attempting to set categories summing to 21 on a series with `capacidad_maxima = 20` blocks form submission with a clear validation message.
5. The generated training instances include `entrenamiento_categorias` rows matching the series definition with `sincronizado_grupo = true`.
6. Editing the series categories with scope "Este y futuros" only updates instances from today onward that have `sincronizado_grupo = true`.
7. **Coach can access** the Gestión Equipo page and open "Asignar nivel" for a member, but cannot edit other member data.
8. Attempting to delete a level that has active `usuario_nivel_disciplina` references returns a clear error message in the UI.
9. All new DB tables have correct RLS: a user from tenant A cannot read or mutate data belonging to tenant B.
10. A discipline with no levels defined shows no categories step in the training form.

---

## Files to Create / Modify

### New files

```text
supabase/migrations/YYYYMMDDXXXXXX_entrenamiento_categorias_niveles.sql

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
| `src/types/portal/disciplines.types.ts` | Add `DisciplineWithNiveles`, `NivelDisciplinaCount` view model |
| `src/types/portal/equipo.types.ts` | Add `UsuarioNivelDisciplina`, `UsuarioNivelDisciplinaInput`, `AsignarNivelView` types |
| `src/types/portal/entrenamientos.types.ts` | Add `EntrenamientoGrupoCategoria`, `EntrenamientoCategoria`, `EntrenamientoCategoriaConCapacidad`; extend `TrainingGroup` and `TrainingInstance` with optional `categorias` arrays |
| `src/services/supabase/portal/entrenamientos.service.ts` | `createTrainingSeries()` saves group categories + propagates to instances; `updateTrainingSeries(scope)` re-syncs categories respecting scope |
| `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Wire `useEntrenamientoCategorias` for selected instance |
| `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Add `categorias` step state, validation, and submit handling |
| `src/components/portal/disciplines/DisciplinesTable.tsx` | Add expand toggle per row + render `NivelesDisciplinaPanel` inline |
| `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | Add `EntrenamientoCategoriasSection` step conditionally when discipline has levels |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Add "Asignar nivel" action column with icon button |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Wire `AsignarNivelModal` open/close state + `useUsuarioNivelDisciplina` hook |
| `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx` | (if needed) extend to pass `tenantId` |
| `src/types/portal/reservas.types.ts` | Add `entrenamiento_categoria_id?` and `categoria_nombre?` to `ReservaView` and `CreateReservaInput` (backward compatible — nullable, Phase 5 will use these) |

---

## Non-Functional Requirements

### Security
- All Supabase mutations use the **browser client** (RLS-enforced). No admin client used from the frontend.
- `asignado_por` is always populated server-side from `auth.uid()` via RLS or set in the service layer — never trusting client-provided values.
- Coach (`entrenador`) access to `usuario_nivel_disciplina` mutations must be verified via the existing role-check pattern used by `reservas` RLS policies.
- `ON DELETE RESTRICT` on `nivel_id` FK in `usuario_nivel_disciplina` and `entrenamiento_categorias` prevents silent orphan data.

### Performance
- All new FK columns are indexed.
- `nivel_disciplina` list is fetched once per discipline expand and cached in component state; no polling.
- Category capacity summary (`SUM(cupos_asignados)` vs `capacidad_maxima`) is computed in-memory in the hook, not via a separate DB query.

### Backward Compatibility
- `entrenamiento_categoria_id` on `reservas` is `NULLABLE` — all existing reservas and service calls continue to work without changes.
- Training form displays the categories step **only** when the discipline has levels; existing trainings for disciplines without levels are unaffected.
- `DisciplinesTable` expand toggle is additive; existing behaviour (create/edit/toggle active) is unchanged.

### Code Style & Architecture
- Follow the existing **hexagonal / feature-slice** pattern: page → component → hook → service → supabase.
- All new service functions throw typed `ServiceError` instances with `code` and `message`, consistent with `DisciplineServiceError`, `ReservaServiceError`, etc.
- All new types are co-located in `src/types/portal/` following the naming convention `*.types.ts`.
- No inline Supabase client calls inside components — always delegate to services through hooks.
- New components follow the existing Tailwind `glass-card` styling, dark theme, and Material Symbols Outlined icon set.

---

## Completion Checklist

- [ ] Migration applied locally (`supabase db push`) and verified with `supabase status`.
- [ ] RLS policies tested: user from tenant A cannot access tenant B data.
- [ ] Levels CRUD in Disciplines screen: create, edit, delete (with guard for referenced levels).
- [ ] Training form shows categories step only for disciplines that have levels.
- [ ] Categories sum validation blocks form submission when exceeding `capacidad_maxima`.
- [ ] Series category propagation verified for all three scopes (single / future / all).
- [ ] Coach can open "Asignar nivel" modal and save a level; change persisted in DB.
- [ ] `usuario_nivel_disciplina` upsert correctly creates or updates the existing record.
- [ ] `reservas.entrenamiento_categoria_id` column exists and is nullable (Phase 5 compatibility).
- [ ] All loading and empty states handled in new components.
- [ ] No TypeScript errors (`tsc --noEmit` passes).
- [ ] No ESLint errors (`next lint` passes).
