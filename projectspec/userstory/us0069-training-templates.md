# US-0069 — Training Templates (Plantillas de Entrenamiento)

## ID
US-0069

## Name
Save and Reuse Training Templates from the Training Creation Modal

## As a
Tenant administrator (`administrador`) or coach (`entrenador`) managing trainings in `gestion-entrenamientos`

## I Want
To save the configuration of a training I'm creating as a reusable template, and to browse and apply previously saved templates when creating a new training

## So That
I don't have to re-enter the same name, discipline, scenario, coach, capacity, meeting point, external form, visibility, categories and booking restrictions every time I create a similar training — only the scheduling (type/recurrence/dates) needs to be filled in again

---

## Description

### Current State

- Trainings are created/edited through `EntrenamientoFormModal` (`src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`), which renders:
  - `EntrenamientoWizard` — **Section 1 "Datos base"** (nombre, descripcion, disciplina_id, escenario_id, entrenador_id, duracion_minutos, cupo_maximo, punto_encuentro, formulario_externo, visibilidad) and **Section 2 "Tipo y programación"** (tipo, fecha_inicio/fecha_fin or fecha_hora_unico, dias_semana, repetir_cada_semanas, reglas horarias).
  - `EntrenamientoCategoriasSection` — optional per-discipline-level capacity allocation (`categoriasForm: { enabled, items: Record<nivel_id, cupos> }`).
  - `EntrenamientoRestriccionesSection` — booking restriction rows (`EntrenamientoRestriccionInput[]`) plus `reserva_antelacion_horas` / `cancelacion_antelacion_horas`.
- All of this state is managed by `useEntrenamientoForm` (`src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`) and orchestrated by `useEntrenamientos` (`src/hooks/portal/entrenamientos/useEntrenamientos.ts`).
- There is currently **no way to persist this configuration** for reuse. Every new training (even ones that repeat the same discipline/scenario/coach/restrictions setup with different dates) must be filled in from scratch.

### Proposed Changes

#### 1. Template content (what gets saved)

A template stores a JSON snapshot of everything in the form **except** the scheduling-related fields from Section 2 ("Tipo y programación" — type, dates, recurrence). Specifically:

**Included:**
- Section 1 "Datos base": `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`.
- Categories: `categoriasForm.enabled` and `categoriasForm.items` (as an array of `{ nivel_id, cupos_asignados }`).
- Restrictions: `reservaAntelacionHoras`, `cancelacionAntelacionHoras`, and the `restricciones` array (`EntrenamientoRestriccionInput[]`, without `entrenamiento_id`/`orden` re-derived on apply).

**Excluded (must be filled in again on use):**
- `tipo` (único/serie), `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, `reglas`.

The JSON shape is versioned (`version: 1`) to allow safe evolution later.

#### 2. "Guardar como plantilla" button

- Added to the footer of `EntrenamientoFormModal`, next to "Cancelar" / "Crear entrenamiento", **visible only when `mode === 'create'`**.
- Disabled while `isSubmitting`, and disabled if `disciplina_id` or `escenario_id` are empty (mirrors the minimum required fields for a usable template).
- Clicking it opens a small confirmation modal (`GuardarPlantillaModal`) asking for:
  - `nombre` (required, text input, max 150 chars) — the template's display name.
  - `descripcion` (optional, textarea) — free-text notes about when to use this template.
- On submit, the modal builds the JSON snapshot from current form state (per section 1 above) and calls the service to insert a new row in `entrenamiento_plantillas`. On success, shows a toast/success message and closes the sub-modal (the main training form stays open and untouched).
- If a template with the same `nombre` already exists for the tenant, the insert fails with a `duplicate_name`-style error surfaced inline in `GuardarPlantillaModal` ("Ya existe una plantilla con ese nombre.").

#### 3. "Ver plantillas" button

- Added to the header area of `EntrenamientoFormModal` (next to the title), **visible only when `mode === 'create'`**.
- Clicking it opens `PlantillasListModal`, a nested right-side/overlay modal listing all `entrenamiento_plantillas` rows for the current tenant:
  - Each row shows `nombre`, `descripcion` (truncated), and `updated_at` (formatted date).
  - Each row has two actions: **"Usar plantilla"** and **"Eliminar"** (delete asks for confirmation via `window.confirm`, consistent with existing delete flows in this feature).
  - Empty state: "Aún no has creado plantillas. Guarda la configuración de un entrenamiento como plantilla para reutilizarla."
  - Loading and error states follow the existing patterns (see `Loading state` / `ErrorMessage` conventions in `03-project-structure.md`).
- Clicking **"Usar plantilla"**:
  - Applies the template's `contenido` to the current form via `useEntrenamientoForm.applyPlantillaContenido(contenido)`:
    - Overwrites Section 1 fields (`nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`).
    - Replaces `categoriasForm` and `restricciones` / `reservaAntelacionHoras` / `cancelacionAntelacionHoras`.
    - **Leaves Section 2 fields untouched** (`tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, `reglas` keep their current values in the form).
  - Closes `PlantillasListModal` and returns focus to the main form.
  - Triggers the existing `checkDisciplinaHasNiveles` effect (already wired on `form.formValues.disciplina_id` changes in `useEntrenamientos`) so the categories section re-validates against the new discipline's levels.
  - Clears any existing `fieldErrors` for the overwritten fields.

#### 4. Edge cases

- Applying a template whose `disciplina_id`, `escenario_id`, `entrenador_id`, or `servicio_*_id` references no longer exist (deleted catalog entries) must not crash the form: the corresponding `<select>` will simply show no matching option (falls back to the empty/placeholder option), and the user must reselect a valid value before submitting (existing required-field validation in `useEntrenamientoForm.validate` already covers `disciplina_id` / `escenario_id`).
- Applying a template when `categoriasForm.items` references a `nivel_id` that no longer exists for the new discipline: `EntrenamientoCategoriasSection` already only renders `activeNiveles`, so stale `nivel_id` entries in `items` are simply not displayed/used (they are dropped from the payload on submit since `categoriasPayload` filters by `cupos > 0` over `activeNiveles`-driven UI — no extra handling needed beyond what exists today for `categoriasForm.items`... but to be safe, `applyPlantillaContenido` should only keep `items` entries; stale entries that don't match any active nivel are harmless because they're never rendered or summed against `activeNiveles`).
- Templates are tenant-scoped: a template created in one tenant is never visible in another tenant (enforced by RLS + service query filter on `tenant_id`).

---

## Database Changes

### New table: `public.entrenamiento_plantillas`

```sql
create table if not exists public.entrenamiento_plantillas (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(150)  not null,
  descripcion text,
  contenido   jsonb         not null,
  created_by  uuid,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint entrenamiento_plantillas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint entrenamiento_plantillas_created_by_fkey
    foreign key (created_by) references public.usuarios(id) on delete set null,
  constraint entrenamiento_plantillas_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_entrenamiento_plantillas_tenant_id
  on public.entrenamiento_plantillas (tenant_id);
```

**Naming note:** the requirement names the table `entrenamiento_plantilla` (singular). To follow this project's existing convention for multi-row training tables (`entrenamientos`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `servicios`...), this US uses the plural `entrenamiento_plantillas`. Flag this with the requester if the singular name is a hard requirement.

**JSON vs. normalized columns:** JSONB is the right choice for `contenido` here because:
- The payload mixes a flat record (Section 1 fields) with two variable-length collections (`categorias.items[]`, `restricciones.items[]`) whose shapes already exist as `EntrenamientoCategoriaInput[]` / `EntrenamientoRestriccionInput[]` TypeScript types — normalizing them into template-specific junction tables would duplicate those types and require extra migrations/CRUD for no query-side benefit (templates are never queried/filtered by their internal fields, only listed by `tenant_id` + `nombre`).
- A `version` key inside `contenido` lets the application evolve the snapshot shape without further migrations.

### RLS Policies

```sql
alter table public.entrenamiento_plantillas enable row level security;

grant select, insert, update, delete on table public.entrenamiento_plantillas to authenticated;

-- SELECT: any authenticated member of the tenant
create policy entrenamiento_plantillas_select_authenticated on public.entrenamiento_plantillas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = entrenamiento_plantillas.tenant_id
        and mt.usuario_id = auth.uid()
    )
  );

-- INSERT: trainer or admin (same roles allowed to create trainings, US-0049)
create policy entrenamiento_plantillas_insert_trainer_admin on public.entrenamiento_plantillas
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- UPDATE: trainer or admin
create policy entrenamiento_plantillas_update_trainer_admin on public.entrenamiento_plantillas
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- DELETE: trainer or admin
create policy entrenamiento_plantillas_delete_trainer_admin on public.entrenamiento_plantillas
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- updated_at maintenance (reuses existing helper, see 20260610000100_servicios_plan_tipos_servicios.sql)
create trigger entrenamiento_plantillas_set_updated_at
  before update on public.entrenamiento_plantillas
  for each row execute function public.set_updated_at();
```

Migration file: `supabase/migrations/20260614000100_entrenamiento_plantillas.sql`.

---

## API / Server Actions

All access goes through a new service: `src/services/supabase/portal/entrenamiento-plantillas.service.ts`.

### `entrenamientoPlantillasService.list(tenantId: string): Promise<EntrenamientoPlantilla[]>`
- Queries `entrenamiento_plantillas` where `tenant_id = tenantId`, ordered by `updated_at desc`.
- Returns `id, tenant_id, nombre, descripcion, contenido, created_at, updated_at, created_by`.
- Auth/RLS: relies on `entrenamiento_plantillas_select_authenticated` (any tenant member).

### `entrenamientoPlantillasService.create(input: CreateEntrenamientoPlantillaInput): Promise<EntrenamientoPlantilla>`
- Input: `{ tenantId: string; nombre: string; descripcion: string | null; contenido: EntrenamientoPlantillaContenido }`.
- Inserts a row with `created_by = auth.uid()` (resolved client-side via `supabase.auth.getUser()`, same pattern as other create flows in this feature).
- On unique violation (Postgres `23505`), throws `EntrenamientoPlantillaServiceError('duplicate_name', 'Ya existe una plantilla con ese nombre.')`.
- On RLS/permission error (`42501`), throws `EntrenamientoPlantillaServiceError('forbidden', 'No tienes permisos para crear plantillas en esta organización.')`.
- Auth/RLS: `entrenamiento_plantillas_insert_trainer_admin` (trainer or admin).

### `entrenamientoPlantillasService.delete(tenantId: string, id: string): Promise<void>`
- Deletes the row by `id` scoped to `tenant_id`.
- Auth/RLS: `entrenamiento_plantillas_delete_trainer_admin` (trainer or admin).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260614000100_entrenamiento_plantillas.sql` | New `entrenamiento_plantillas` table, indexes, RLS policies, `updated_at` trigger |
| Types | `src/types/portal/entrenamiento-plantillas.types.ts` | New: `EntrenamientoPlantilla`, `EntrenamientoPlantillaContenido`, `CreateEntrenamientoPlantillaInput`, `EntrenamientoPlantillaServiceError` (+ error code union) |
| Service | `src/services/supabase/portal/entrenamiento-plantillas.service.ts` | New: `list`, `create`, `delete` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientoPlantillas.ts` | New: loads/list state, `loadPlantillas`, `createPlantilla`, `deletePlantilla`, open/close state for `PlantillasListModal` and `GuardarPlantillaModal` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Add `buildPlantillaContenido(): EntrenamientoPlantillaContenido` and `applyPlantillaContenido(contenido: EntrenamientoPlantillaContenido): void` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Wire `useEntrenamientoPlantillas`; expose `guardarPlantilla`, `aplicarPlantilla`, `eliminarPlantilla`, modal open/close handlers; pass through to `EntrenamientoFormModal` |
| Component | `src/components/portal/entrenamientos/GuardarPlantillaModal.tsx` | New: small modal with `nombre` + `descripcion` inputs, submit/cancel |
| Component | `src/components/portal/entrenamientos/PlantillasListModal.tsx` | New: list of templates with "Usar plantilla" / "Eliminar" actions, empty/loading/error states |
| Component | `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | Add "Ver plantillas" button (header, create-mode only), "Guardar como plantilla" button (footer, create-mode only), render the two new nested modals |
| Types | `src/types/portal/entrenamientos.types.ts` | No structural change required; re-export `EntrenamientoPlantilla*` types if convenient for import ergonomics |

---

## Acceptance Criteria

1. As an admin or coach with `gestion-entrenamientos` access, opening "Crear entrenamiento" shows a new **"Ver plantillas"** button in the modal header and a new **"Guardar como plantilla"** button in the footer; neither button appears when editing an existing training (`mode === 'edit'`).
2. Filling in Section 1 (Datos base), optionally enabling categories with cupos, and optionally adding restriction rows + antelación hours, then clicking **"Guardar como plantilla"** opens a sub-modal requiring a `nombre` (and optional `descripcion`); submitting it creates a row in `entrenamiento_plantillas` with `tenant_id` set to the current tenant and `contenido` containing exactly: `nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, duracion_minutos, cupo_maximo, visibilidad, categorias, restricciones, reserva_antelacion_horas, cancelacion_antelacion_horas`.
3. The saved `contenido` does **not** contain `tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, or `reglas`.
4. Attempting to save a second template with the same `nombre` in the same tenant shows the inline error "Ya existe una plantilla con ese nombre." and does not create a duplicate row.
5. Clicking **"Ver plantillas"** opens a list of all templates for the current tenant (ordered by most recently updated), each showing `nombre`, `descripcion`, and last-updated date.
6. If no templates exist, the list shows the empty-state message instead of an empty table/list.
7. Clicking **"Usar plantilla"** on a template:
   - Populates `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad` in the open form with the template's values.
   - Populates the categories section (`categoriasForm.enabled` + `items`) and the restrictions section (`restricciones`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras`) with the template's values.
   - Does **not** change the current values of `tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, or `reglas`.
   - Closes the templates list and returns to the main "Crear entrenamiento" form.
8. After applying a template whose discipline has levels (`nivel_disciplina`), the categories section re-evaluates `disciplinaHasNiveles` / `activeNiveles` for the newly-applied `disciplina_id`.
9. Clicking **"Eliminar"** on a template asks for confirmation (`window.confirm`); confirming removes the row from `entrenamiento_plantillas` and from the visible list; cancelling leaves it unchanged.
10. A user from Tenant A cannot see, use, or delete templates created in Tenant B (verified via RLS: querying `entrenamiento_plantillas` cross-tenant returns zero rows; direct insert/delete with another tenant's `tenant_id` is rejected).
11. A user with role `usuario` (athlete) — who has no access to `gestion-entrenamientos` admin actions — cannot insert/update/delete rows in `entrenamiento_plantillas` (RLS rejects), though they are not exposed to this UI at all since the page itself is role-gated.
12. Saving or applying a template never triggers a full page reload; all operations use the existing hook/service/component flow (`Component → Hook → Service → Supabase`).

---

## Implementation Steps

- [ ] Create migration `20260614000100_entrenamiento_plantillas.sql` (table, indexes, RLS policies, `updated_at` trigger) and apply locally (`supabase migration up` / local Supabase)
- [ ] Add `src/types/portal/entrenamiento-plantillas.types.ts` with `EntrenamientoPlantilla`, `EntrenamientoPlantillaContenido` (versioned), `CreateEntrenamientoPlantillaInput`, `EntrenamientoPlantillaServiceError`
- [ ] Add `src/services/supabase/portal/entrenamiento-plantillas.service.ts` with `list`, `create`, `delete`, mapping Postgres errors (`23505` → `duplicate_name`, `42501` → `forbidden`)
- [ ] Add `src/hooks/portal/entrenamientos/useEntrenamientoPlantillas.ts` (list state, loading/error, create/delete actions, modal open state)
- [ ] Extend `useEntrenamientoForm.ts` with `buildPlantillaContenido()` and `applyPlantillaContenido(contenido)`
- [ ] Wire everything in `useEntrenamientos.ts` (expose new handlers/state to the modal)
- [ ] Build `GuardarPlantillaModal.tsx` (nombre + descripcion form, duplicate-name error display)
- [ ] Build `PlantillasListModal.tsx` (list, empty/loading/error states, "Usar plantilla" / "Eliminar" actions)
- [ ] Update `EntrenamientoFormModal.tsx`: header "Ver plantillas" button + footer "Guardar como plantilla" button (create-mode only), render nested modals
- [ ] Verify RLS policies in Supabase Studio / local instance (cross-tenant isolation, trainer/admin write access, athlete denied)
- [ ] Manual test: create template → close modal → reopen "Crear entrenamiento" → "Ver plantillas" → "Usar plantilla" → confirm Section 1/categories/restrictions populate and Section 2 stays empty/default → fill in Section 2 → create training successfully
- [ ] Manual test: duplicate template name error, delete template, empty-state rendering
- [ ] Update `projectspec/03-project-structure.md` feature slice listing for `entrenamientos` (new files) once implemented

---

## Non-Functional Requirements

- **Security**:
  - RLS enforced on `entrenamiento_plantillas` for `select` (tenant members), `insert`/`update`/`delete` (trainer or admin via `get_trainer_or_admin_tenants_for_authenticated_user()`).
  - No direct Supabase calls from components — all access via `entrenamientoPlantillasService`.
  - `contenido` is opaque JSON written by the client; on apply, all IDs (`disciplina_id`, `escenario_id`, `entrenador_id`, `servicio_*_id`, `nivel_id`) must be re-validated against current catalogs by the existing form validation and `<select>` rendering (stale IDs simply don't match any option).
- **Performance**:
  - `entrenamiento_plantillas` is expected to hold a small number of rows per tenant (tens, not thousands); a simple `tenant_id` index is sufficient — no pagination required for the initial version.
- **Accessibility**:
  - `GuardarPlantillaModal` and `PlantillasListModal` follow the same `role="dialog" aria-modal="true"` and Escape-to-close conventions as `EntrenamientoFormModal`.
  - Buttons have descriptive `aria-label`s ("Ver plantillas guardadas", "Guardar configuración como plantilla").
- **Error handling**:
  - Duplicate name and forbidden errors surface inline in `GuardarPlantillaModal` (not as a toast), consistent with `submitError` rendering in `EntrenamientoFormModal`.
  - List/delete errors in `PlantillasListModal` use the existing `Loading` / `ErrorMessage` / empty-state pattern described in `03-project-structure.md`.
