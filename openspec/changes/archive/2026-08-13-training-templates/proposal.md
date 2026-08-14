## Why

Administrators and coaches recreate the same training configuration (discipline, scenario, coach, capacity, meeting point, visibility, categories, and booking restrictions) from scratch every time they create a similar training, only the schedule actually differs. US-0069 lets them save that configuration as a reusable template and apply it the next time they open the training creation modal, cutting out repetitive data entry.

## What Changes

- Add a new tenant-scoped table `entrenamiento_plantillas` (`id`, `tenant_id`, `nombre`, `descripcion`, `contenido` jsonb, `created_by`, `created_at`, `updated_at`) with a unique `(tenant_id, nombre)` constraint, an index on `tenant_id`, RLS policies (select: tenant members; insert/update/delete: trainer or admin via `get_trainer_or_admin_tenants_for_authenticated_user()`), and an `updated_at` trigger reusing `set_updated_at()`.
- Add `entrenamiento-plantillas.types.ts` defining `EntrenamientoPlantilla`, the versioned `EntrenamientoPlantillaContenido` snapshot shape, `CreateEntrenamientoPlantillaInput`, and `EntrenamientoPlantillaServiceError`.
- Add `entrenamiento-plantillas.service.ts` with `list`, `create`, `delete`, mapping Postgres `23505` → `duplicate_name` and `42501` → `forbidden`.
- Add `useEntrenamientoPlantillas` hook (list state, loading/error, create/delete actions, modal open/close state for the new sub-modals).
- Extend `useEntrenamientoForm` with `buildPlantillaContenido()` (serializes Section 1 "Datos base" + categories + restrictions/antelación into the versioned snapshot, excluding all Section 2 "Tipo y programación" scheduling fields) and `applyPlantillaContenido(contenido)` (overwrites the same fields from a loaded template without touching scheduling fields).
- Wire the new hook and handlers (`guardarPlantilla`, `aplicarPlantilla`, `eliminarPlantilla`) through `useEntrenamientos` and into `EntrenamientoFormModal`.
- Add `GuardarPlantillaModal` (nombre + descripcion form, inline duplicate-name error) and `PlantillasListModal` (list of templates with "Usar plantilla"/"Eliminar" actions, empty/loading/error states).
- Add a "Ver plantillas" button to the header and a "Guardar como plantilla" button to the footer of `EntrenamientoFormModal`, both visible only in `mode === 'create'`.

## Non-goals

- Editing an existing template's content in place (only create/list/delete are supported; updating a template means deleting and re-saving).
- Sharing templates across tenants.
- Applying a template while editing an existing training (`mode === 'edit'`) — the new buttons are create-mode only.
- Normalizing template content into relational tables — `contenido` stays a versioned JSONB snapshot (see rationale in US-0069).
- Removing or renaming the deprecated `plan_id`/`disciplina_id` columns on restriction tables — out of scope for this change.

## Capabilities

### New Capabilities
- `training-templates`: Persisting, listing, applying, and deleting reusable training configuration templates (`entrenamiento_plantillas` table, service, hooks, and the "Ver plantillas" / "Guardar como plantilla" UI in `EntrenamientoFormModal`).

### Modified Capabilities
(none — this change is purely additive; no existing spec requirements change)

## Impact

- **Database**: 1 new table (`entrenamiento_plantillas`), RLS policies, `updated_at` trigger; migration `supabase/migrations/20260614000100_entrenamiento_plantillas.sql`.
- **Types**: new `src/types/portal/entrenamiento-plantillas.types.ts`.
- **Services**: new `src/services/supabase/portal/entrenamiento-plantillas.service.ts`.
- **Hooks**: new `src/hooks/portal/entrenamientos/useEntrenamientoPlantillas.ts`; `useEntrenamientoForm.ts` and `useEntrenamientos.ts` extended (additive).
- **Components**: new `GuardarPlantillaModal.tsx` and `PlantillasListModal.tsx`; `EntrenamientoFormModal.tsx` gains two new buttons and two nested modals (additive, create-mode only).
- **No changes** to pages, layouts, auth flows, or other features' specs.
