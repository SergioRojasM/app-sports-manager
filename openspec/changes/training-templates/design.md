## Context

Trainings are created/edited through `EntrenamientoFormModal` (`src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`), backed by `useEntrenamientoForm` (form state) and orchestrated by `useEntrenamientos` (`src/hooks/portal/entrenamientos/useEntrenamientos.ts`). The form is split into:

- **Section 1 "Datos base"** (`EntrenamientoWizard`, step 1): `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`.
- **Section 2 "Tipo y programación"** (`EntrenamientoWizard`, step 2): `tipo` (único/serie), `fecha_inicio`/`fecha_fin`/`fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, `reglas` (recurrence rule rows).
- `EntrenamientoCategoriasSection`: `categoriasForm: { enabled, items: Record<nivel_id, cupos> }`, shown conditionally when the selected discipline has active `nivel_disciplina` rows.
- `EntrenamientoRestriccionesSection`: `restricciones: EntrenamientoRestriccionInput[]`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras`.

There is currently no persistence for this configuration — every training, even repeats of the same setup with different dates, is filled in from scratch. US-0069 introduces "templates": a saved snapshot of everything except the scheduling fields in Section 2, which the user re-enters every time (since recurrence/dates are inherently per-occurrence).

## Goals / Non-Goals

**Goals:**
- Persist a reusable snapshot of Section 1 + categories + restrictions per tenant, scoped by RLS to trainer/admin writes and tenant-member reads.
- Let the user save the current form as a named template ("Guardar como plantilla") and browse/apply/delete saved templates ("Ver plantillas") without leaving or reloading `EntrenamientoFormModal`.
- Keep the snapshot shape close to existing TS types (`TrainingWizardValues` subset, `EntrenamientoCategoriaInput[]`, `EntrenamientoRestriccionInput[]`) so building/applying it is a thin mapping, not a new domain model.
- Follow the existing feature-slice conventions (`types` → `service` → `hook` → `component`) and error-mapping pattern (`23505` → `duplicate_name`, `42501` → `forbidden`) already used by `entrenamientos.service.ts` and `servicios.service.ts`.

**Non-Goals:**
- In-place template editing (delete + re-save covers the "update" case).
- Cross-tenant template sharing or global/system templates.
- Normalizing `contenido` into relational tables (see Decisions below).
- Any change to Section 2 scheduling logic, recurrence rules, or series sync.

## Decisions

### 1. `contenido` is a single versioned JSONB column, not normalized tables
The snapshot mixes a flat record (Section 1 fields) with two variable-length collections (`categorias.items[]`, `restricciones[]`) whose shapes already exist as `EntrenamientoCategoriaInput[]` / `EntrenamientoRestriccionInput[]` TS types. Normalizing into `entrenamiento_plantilla_categorias` / `entrenamiento_plantilla_restricciones` junction tables would duplicate those types and require extra migrations/CRUD with no query benefit — templates are only ever listed by `tenant_id` (and matched by `nombre` for the uniqueness check), never filtered by their internal fields.

A top-level `version: 1` key in `contenido` lets the snapshot shape evolve later (e.g. adding a new Section 1 field) by having `applyPlantillaContenido` branch on `version` without a migration.

**Alternative considered**: separate tables per nested collection — rejected for the duplication/maintenance cost with no read-path benefit.

### 2. Table name `entrenamiento_plantillas` (plural), not the literally-requested `entrenamiento_plantilla`
Every existing multi-row training-related table in this project is plural (`entrenamientos`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `servicios`). Pluralizing keeps the new table consistent with `03-project-structure.md` naming conventions. This is called out explicitly in US-0069 for the requester to confirm; absent a veto, the implementation proceeds with the plural name.

### 3. RLS model mirrors US-0049 (trainer-or-admin writes, tenant-member reads)
`EntrenamientoFormModal` — and therefore both new buttons — is reachable by both `administrador` and `entrenador` roles in `(shared)/gestion-entrenamientos`. Reusing `get_trainer_or_admin_tenants_for_authenticated_user()` (already introduced in `20260330000200_entrenamientos_rls_allow_trainer.sql`) for INSERT/UPDATE/DELETE keeps the permission model identical to the trainings the templates describe. SELECT is open to any tenant member (consistent with `entrenamientos`/`servicios` read policies) since seeing a template name/description isn't sensitive.

### 4. `buildPlantillaContenido` / `applyPlantillaContenido` live in `useEntrenamientoForm`, not a new standalone module
These two functions are pure transforms over the exact state `useEntrenamientoForm` already owns (`formValues`, `categoriasForm`, `restricciones`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras`). Placing them as hook methods avoids exporting internal state shapes to a separate utility and keeps the "apply" path able to call the hook's own setters directly (so `applyPlantillaContenido` can reuse `updateField`/`toggleCategorias`/`updateCategoriasCupos`/replace-`restricciones` instead of duplicating state-shape knowledge).

### 5. New nested modals (`GuardarPlantillaModal`, `PlantillasListModal`) instead of inline panels
`EntrenamientoFormModal` is already a large multi-step wizard; adding inline save/list UI would clutter the footer/header. Both new modals follow the existing nested-dialog pattern (`role="dialog" aria-modal="true"`, Escape-to-close) already used elsewhere in this feature, and are only mounted when `mode === 'create'`.

### 6. `useEntrenamientoPlantillas` owns list/loading/error/modal-open state; `useEntrenamientos` wires it through
Consistent with how `useEntrenamientos` already composes `useEntrenamientoForm` and other sub-hooks — each concern gets its own hook, composed at the orchestration layer, and exposed as flat handlers (`guardarPlantilla`, `aplicarPlantilla`, `eliminarPlantilla`) to `EntrenamientoFormModal` so the component stays presentation-only.

## Risks / Trade-offs

- **[Risk] Stale IDs in `contenido`** (a template references a `disciplina_id`, `escenario_id`, `entrenador_id`, `nivel_id`, or `servicio_*_id` that was later deleted) → **Mitigation**: `applyPlantillaContenido` writes the raw IDs into form state as-is; existing `<select>` rendering simply shows no matching option for an unknown ID, and existing required-field validation (`disciplina_id`/`escenario_id`) blocks submission until the user picks a valid value. `EntrenamientoCategoriasSection` already only renders `activeNiveles`, so stale `nivel_id` entries in `categoriasForm.items` are inert. No extra validation code is needed.
- **[Risk] Duplicate template names within a tenant** → **Mitigation**: `unique (tenant_id, nombre)` constraint + `23505` mapped to a `duplicate_name` error shown inline in `GuardarPlantillaModal`.
- **[Risk] JSONB schema drift over time** → **Mitigation**: `version` key in `contenido`; `applyPlantillaContenido` can branch on it if the shape changes in a future US.
- **[Trade-off] No template editing UI** → acceptable per Non-Goals; delete + re-save is a two-click workaround and keeps the first iteration small.

## Migration Plan

- New migration `supabase/migrations/20260614000100_entrenamiento_plantillas.sql` creates the table, index, RLS policies, and `updated_at` trigger (reusing `public.set_updated_at()` from `20260610000100_servicios_plan_tipos_servicios.sql`). Purely additive — no existing tables/columns are altered, so no backfill or data migration is needed.
- Apply locally only (`supabase migration up` / local Supabase instance) for development and verification; do not push to the remote Supabase project as part of this change.
- Rollback: drop the new table/policies/trigger via a follow-up migration if needed — no other tables reference `entrenamiento_plantillas`, so rollback has no cascading impact.

## Open Questions

- Confirm with the requester whether the plural table name `entrenamiento_plantillas` is acceptable, or whether the literal singular `entrenamiento_plantilla` from the original request is a hard requirement (flagged in US-0069).
