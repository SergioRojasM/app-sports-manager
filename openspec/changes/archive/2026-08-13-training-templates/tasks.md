## 1. Branch Setup

- [x] 1.1 Create branch `feat/training-templates` from the current base branch
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260614000100_entrenamiento_plantillas.sql`
- [x] 2.2 Create table `public.entrenamiento_plantillas` with columns `id uuid primary key default gen_random_uuid()`, `tenant_id uuid not null references tenants(id) on delete cascade`, `nombre varchar(150) not null`, `descripcion text`, `contenido jsonb not null`, `created_by uuid references usuarios(id) on delete set null`, `created_at timestamptz not null default timezone('utc', now())`, `updated_at timestamptz not null default timezone('utc', now())`
- [x] 2.3 Add unique constraint `entrenamiento_plantillas_tenant_nombre_uk` on `(tenant_id, nombre)`
- [x] 2.4 Add index `idx_entrenamiento_plantillas_tenant_id` on `(tenant_id)`
- [x] 2.5 Enable RLS on `entrenamiento_plantillas`; `grant select, insert, update, delete on table public.entrenamiento_plantillas to authenticated`
- [x] 2.6 Add SELECT policy `entrenamiento_plantillas_select_authenticated`: any authenticated member of `tenant_id` (via `miembros_tenant`)
- [x] 2.7 Add INSERT policy `entrenamiento_plantillas_insert_trainer_admin`: `tenant_id` in `get_trainer_or_admin_tenants_for_authenticated_user()`
- [x] 2.8 Add UPDATE policy `entrenamiento_plantillas_update_trainer_admin`: same trainer-or-admin check on `using` and `with check`
- [x] 2.9 Add DELETE policy `entrenamiento_plantillas_delete_trainer_admin`: same trainer-or-admin check
- [x] 2.10 Create trigger `entrenamiento_plantillas_set_updated_at` `before update` executing `public.set_updated_at()`
- [x] 2.11 Apply migration locally (`npx supabase db reset` or `npx supabase migration up`) — do NOT push to remote

## 3. Types

- [x] 3.1 Create `src/types/portal/entrenamiento-plantillas.types.ts` with `EntrenamientoPlantilla` (`id, tenant_id, nombre, descripcion, contenido, created_by, created_at, updated_at`)
- [x] 3.2 Add versioned `EntrenamientoPlantillaContenido` type (`version: 1`, Section 1 fields, `categorias: { enabled, items: { nivel_id, cupos_asignados }[] }`, `restricciones: { reserva_antelacion_horas, cancelacion_antelacion_horas, items: EntrenamientoRestriccionInput[] }`)
- [x] 3.3 Add `CreateEntrenamientoPlantillaInput` (`{ tenantId, nombre, descripcion, contenido }`)
- [x] 3.4 Add `EntrenamientoPlantillaServiceError` class extending `Error` with `code: 'duplicate_name' | 'forbidden' | 'unknown'`
- [x] 3.5 Optionally re-export the new types from `src/types/portal/entrenamientos.types.ts` for import ergonomics

## 4. Service Layer

- [x] 4.1 Create `src/services/supabase/portal/entrenamiento-plantillas.service.ts`
- [x] 4.2 Implement `list(tenantId: string): Promise<EntrenamientoPlantilla[]>` — select all columns where `tenant_id = tenantId`, order by `updated_at desc`
- [x] 4.3 Implement `create(input: CreateEntrenamientoPlantillaInput): Promise<EntrenamientoPlantilla>` — resolve `created_by` via `supabase.auth.getUser()`, insert row, map Postgres `23505` → `EntrenamientoPlantillaServiceError('duplicate_name', 'Ya existe una plantilla con ese nombre.')` and `42501` → `EntrenamientoPlantillaServiceError('forbidden', 'No tienes permisos para crear plantillas en esta organización.')`
- [x] 4.4 Implement `delete(tenantId: string, id: string): Promise<void>` — delete row scoped by `id` and `tenant_id`

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/entrenamientos/useEntrenamientoPlantillas.ts`: state for `plantillas`, `isLoading`, `error`, `isListModalOpen`, `isSaveModalOpen`, `isSaving`, `saveError`
- [x] 5.2 Implement `loadPlantillas(tenantId)`, `createPlantilla(input)`, `deletePlantilla(tenantId, id)` calling the new service, updating local list state on success
- [x] 5.3 Implement `openListModal`/`closeListModal` and `openSaveModal`/`closeSaveModal` handlers
- [x] 5.4 Extend `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` with `buildPlantillaContenido(): EntrenamientoPlantillaContenido`, mapping `formValues` (Section 1 fields only), `categoriasForm`, `restricciones`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras` into the versioned shape
- [x] 5.5 Extend `useEntrenamientoForm.ts` with `applyPlantillaContenido(contenido: EntrenamientoPlantillaContenido): void`, overwriting Section 1 fields via `updateField`, replacing `categoriasForm` and `restricciones`/`reservaAntelacionHoras`/`cancelacionAntelacionHoras`, clearing `fieldErrors` for the overwritten fields, and leaving Section 2 fields untouched
- [x] 5.6 Update `src/hooks/portal/entrenamientos/useEntrenamientos.ts`: instantiate `useEntrenamientoPlantillas`, expose `guardarPlantilla(nombre, descripcion)` (builds contenido + calls `createPlantilla`), `aplicarPlantilla(contenido)` (calls `applyPlantillaContenido` + closes list modal + re-triggers `checkDisciplinaHasNiveles`), `eliminarPlantilla(id)`, and the modal open/close state/handlers, passing them through to `EntrenamientoFormModal`

## 6. Components

- [x] 6.1 Create `src/components/portal/entrenamientos/GuardarPlantillaModal.tsx`: dialog with `nombre` (required, max 150) and `descripcion` (optional textarea) fields, Cancelar/Guardar buttons, inline error display for `duplicate_name`/`forbidden`, `role="dialog" aria-modal="true"`, Escape-to-close
- [x] 6.2 Create `src/components/portal/entrenamientos/PlantillasListModal.tsx`: dialog listing templates (`nombre`, truncated `descripcion`, formatted `updated_at`), "Usar plantilla"/"Eliminar" actions per row, empty-state message, `Loading`/`ErrorMessage` states, `role="dialog" aria-modal="true"`, Escape-to-close
- [x] 6.3 Update `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`: add "Ver plantillas" button (header, `aria-label="Ver plantillas guardadas"`, `mode === 'create'` only) opening `PlantillasListModal`
- [x] 6.4 Update `EntrenamientoFormModal.tsx`: add "Guardar como plantilla" button (footer, `aria-label="Guardar configuración como plantilla"`, `mode === 'create'` only, disabled while `isSubmitting` or when `disciplina_id`/`escenario_id` empty) opening `GuardarPlantillaModal`
- [x] 6.5 Render `GuardarPlantillaModal` and `PlantillasListModal` as nested modals within `EntrenamientoFormModal`, wired to the handlers/state from `useEntrenamientos`
- [x] 6.6 Wire "Usar plantilla" in `PlantillasListModal` to call `aplicarPlantilla(template.contenido)` and "Eliminar" to call `eliminarPlantilla(id)` after a `window.confirm` prompt

## 7. Validation and Testing

- [x] 7.1 Verify migration applied cleanly locally: confirm `entrenamiento_plantillas` table, indexes, RLS policies, and trigger exist
- [x] 7.2 Test: fill Section 1 + categories + restrictions, click "Guardar como plantilla", save with a `nombre` → row created with correct `contenido` (no Section 2 fields)
- [x] 7.3 Test: save a second template with the same `nombre` in the same tenant → inline "Ya existe una plantilla con ese nombre." error, no duplicate row
- [x] 7.4 Test: "Ver plantillas" with zero templates shows the empty-state message
- [x] 7.5 Test: "Ver plantillas" with templates shows them ordered by `updated_at desc` with correct `nombre`/`descripcion`/date
- [x] 7.6 Test: "Usar plantilla" populates Section 1, categories, and restrictions, leaves Section 2 fields untouched, closes the list modal, and re-evaluates `activeNiveles` for the applied `disciplina_id`
- [x] 7.7 Test: apply a template referencing a deleted `disciplina_id`/`escenario_id`/`entrenador_id`/`servicio_*_id`/`nivel_id` → no crash, affected `<select>`s show placeholder, submission blocked by existing required-field validation until corrected
- [x] 7.8 Test: "Eliminar" with confirmation removes the row from `entrenamiento_plantillas` and the list; cancelling leaves it unchanged
- [x] 7.9 Test cross-tenant isolation: a user in tenant A cannot see, apply, or delete tenant B's templates (verified via RLS)
- [x] 7.10 Test role restriction: a `usuario`-role account cannot insert/update/delete `entrenamiento_plantillas` rows (RLS rejects with `42501`)
- [x] 7.11 Test: both buttons are absent when `EntrenamientoFormModal` is opened in `mode === 'edit'`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` feature-slice listing for `entrenamientos`: add `entrenamiento-plantillas.types.ts`, `entrenamiento-plantillas.service.ts`, `useEntrenamientoPlantillas.ts`, `GuardarPlantillaModal.tsx`, `PlantillasListModal.tsx`, and note the new hook methods on `useEntrenamientoForm.ts`

## 9. Commit and PR

- [x] 9.1 Stage all changes and create commit with message: `feat: add training templates (US-0069)` — summarize the new table, service, hooks, and modal UI in the commit body
- [x] 9.2 Write PR description: title `feat: Training templates (US-0069)`, body covering motivation (reuse training configuration without re-entering it), the new `entrenamiento_plantillas` table and RLS model, the "Ver plantillas"/"Guardar como plantilla" UI, and a testing checklist
