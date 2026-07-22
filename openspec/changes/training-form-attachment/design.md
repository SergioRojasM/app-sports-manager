## Context

`entrenamientos` and `entrenamientos_grupo` already carry a plain `formulario_externo varchar(500)` column (migration `20260313000100_add_formulario_externo_entrenamientos.sql`), wired end-to-end through `entrenamientos.service.ts`, `useEntrenamientoForm.ts`/`useEntrenamientos.ts`, `EntrenamientoWizard.tsx`, `EntrenamientoDetalleModal.tsx`, `EntrenamientosList.tsx`, and `ReservasPanel.tsx`. Separately, US-0084/US-0085 shipped a fully independent structured form-template module (`formularios_plantillas` + `formulario_plantilla_esquema`, `formulariosService`, `src/components/portal/formularios/*`) with no relation to trainings at all.

This change is the first to connect the two: a training gets exactly one optional form (external URL or internal template), optionally required to book. The `useEntrenamientoForm`/`useEntrenamientos` hook pair already manages several "extra" pieces of form state beyond the core `TrainingWizardValues` object (`categoriasForm`, `restricciones`, `reservaAntelacionHoras`) that get composed into the final create/update payload inside `submitForm`. The design below follows that established shape rather than introducing a new one.

## Goals / Non-Goals

**Goals:**
- Let a training optionally require either an external URL (`formulario_externo`, reused) or an internal `formularios_plantillas` reference (`formulario_id`, new) — never both — plus an independent `formulario_obligatorio` flag.
- Reuse every existing US-0084/US-0085 building block as-is: `formulariosService.getPlantillasByTenant`/`getPlantillaConSecciones`, `FormularioPreviewModal`.
- Generalize the three existing `formulario_externo`-only display sites (detail modal, list card, booking panel) to also cover the internal case, without regressing the external case.
- Preserve `formulario_tipo`/`formulario_obligatorio` (not `formulario_id`) when a training is saved as a reusable template, so re-applying a template never silently drags along a stale/foreign template reference.

**Non-Goals:**
- No screen where a form is actually filled out or submitted (still deferred, per US-0084's original scope note).
- No enforcement of `formulario_obligatorio` at booking time (nothing to gate on yet — the "Reservar" button is unaffected).
- No DB-level cross-tenant guarantee that `formulario_id` belongs to the same tenant as the training (enforced only by the UI picker, matching the existing precedent for `disciplina_id`/`escenario_id`/`entrenador_id`).
- No change to the `formularios_plantillas` module's own schema, RLS, service, or components.

## Decisions

### 1. Single-column FK for `formulario_id`, not a tenant-composite FK
**Decision**: `formulario_id uuid references formularios_plantillas(id) on delete set null` — a plain single-column FK, matching `disciplina_id`/`escenario_id`/`entrenador_id` on the same tables.
**Alternative considered**: a composite `(tenant_id, formulario_id) references formularios_plantillas(tenant_id, id)`, mirroring `entrenamientos_entrenamiento_grupo_fkey`'s `(tenant_id, entrenamiento_grupo_id)` pattern, for a hard DB-level guarantee that the referenced template belongs to the same tenant.
**Why rejected**: Postgres multi-column `ON DELETE SET NULL` nulls **every** referencing column in the FK, including `tenant_id` — which is `NOT NULL` on both tables. The moment an admin hard-deletes a `formularios_plantillas` row still referenced by a training, the delete would fail with a not-null violation instead of gracefully detaching. A single-column FK avoids this entirely; tenant scoping is enforced purely at the UI layer (the picker only ever lists `getPlantillasByTenant(tenantId)` results). Flagged as a trade-off, same as the existing columns it mirrors.

### 2. Mutual exclusivity and "obligatorio requires a form" enforced via CHECK constraints, not application logic alone
**Decision**: two `check` constraints per table — `not (formulario_id is not null and formulario_externo is not null)` and `formulario_obligatorio = false or formulario_id is not null or formulario_externo is not null`.
**Why**: the client already prevents both invalid states (see Decision 3), but the DB constraint is the actual source of truth — consistent with how US-0084/US-0085 treat their own check constraints (`campo_lista_valores`, `seccion_descripcion`) as the enforcement layer beneath client-side validation.

### 3. New parallel `formularioForm` state slice, not new fields on `TrainingWizardValues`
**Decision**: introduce a standalone `formularioForm: { tipo: TrainingFormularioTipo; formulario_id: string; obligatorio: boolean }` state object inside `useEntrenamientoForm.ts`, with its own setters, composed into the submit payload inside `useEntrenamientos.ts`'s `submitForm` — exactly like the existing `categoriasForm`/`restricciones` slices. `formulario_externo` stays where it already is, inside `TrainingWizardValues`.
**Alternative considered**: add `formulario_tipo`, `formulario_id`, `formulario_obligatorio` directly as new keys on `TrainingWizardValues`.
**Why rejected**: `TrainingWizardValues`'s generic `updateField(field, value: string)` only accepts strings and relies on a structural-typing loophole (computed-key object spread bypasses per-field type checking) to stay compilable. Adding a real `boolean` field (`formulario_obligatorio`) through that path would type-check but silently store the wrong runtime type. The codebase already avoids this exact problem for `categoriasForm.enabled` (a boolean) by keeping it in a separate, purpose-built state object with a dedicated setter — this change follows that precedent instead of fighting the generic path.

### 4. Training templates persist `formulario_tipo` + `formulario_obligatorio`, never `formulario_id`
**Decision**: `EntrenamientoPlantillaContenido` gains `formulario_tipo` and `formulario_obligatorio` (both optional/defaulted for backward compatibility with pre-existing saved templates), but `formulario_id` is never written to or read from the snapshot.
**Why**: explicit product requirement — a training template is meant to be reusable across many future trainings; baking in one specific `formularios_plantillas` id would silently resurrect a possibly-stale or cross-context template selection every time the template is applied. Applying a template whose `formulario_tipo === 'interno'` pre-selects the "Interno" toggle but leaves the picker unselected, forcing an explicit re-selection — the existing "internal requires a selection" validation (Decision 3's `formularioForm` slice) naturally blocks a silent submit without one.
**Backward compatibility**: pre-existing `contenido` blobs (saved before this change) lack both new fields. On read, default `formulario_tipo` to `'externo'` if `formulario_externo` is non-empty, else `'ninguno'`; default `formulario_obligatorio` to `false`. No `version` bump needed since both fields are additive and defensively defaulted.

### 5. Reuse the existing FK-embed select, not a second query, for the internal template's display name
**Decision**: extend the existing `entrenamientos`/`entrenamientos_grupo` `select(...)` strings in `entrenamientos.service.ts` with a PostgREST embed: `formulario_id, formulario_obligatorio, formulario_plantilla:formularios_plantillas(nombre)`.
**Why**: `formularios_plantillas` already has an open `using (true)` SELECT RLS policy (any authenticated user, per US-0084), so the embed works regardless of the viewer's role, and it adds zero extra round-trips to the list/detail/booking queries that already fetch trainings.

### 6. New `EntrenamientoFormularioSection.tsx`, not an inline block inside `EntrenamientoWizard.tsx`
**Decision**: extract the whole a→e flow (enable toggle → external/internal toggle → URL input or template picker → obligatorio checkbox) into its own component, styled identically to `EntrenamientoCategoriasSection.tsx`, rendered inside `EntrenamientoFormModal.tsx` alongside the existing category/restriction sections. The old single-field "Formulario externo" input is removed from `EntrenamientoWizard.tsx`'s "1. Datos base" section.
**Why**: matches the modal's existing composition pattern (wizard for core fields + separate collapsible sections for `categorias`/`restricciones`) rather than growing the wizard's fixed numbered sections with conditional multi-step UI that doesn't fit the "1. / 2." layout. No new visual design is required — the toggle/checkbox/select styling is a direct reuse of `EntrenamientoCategoriasSection`'s existing markup.

## Risks / Trade-offs

- **[Risk]** A `formulario_id` can point to a template belonging to a different tenant if the FK alone is trusted (no DB-level tenant check, per Decision 1). → **Mitigation**: the picker only ever offers `getPlantillasByTenant(tenantId)` results; this mirrors the exact same accepted risk already present for `disciplina_id`/`escenario_id`/`entrenador_id` on these tables, so it introduces no new class of exposure.
- **[Risk]** Deleting a `formularios_plantillas` row that's attached to live trainings silently detaches it (`on delete set null`) with no warning to the admin at delete time. → **Mitigation**: this matches the already-accepted `entrenador_id` behavior; a future enhancement could add a "used by N trainings" count to the delete confirmation in `gestion-formularios`, but that's out of scope here.
- **[Risk]** `formulario_obligatorio` is stored and displayed but not enforced, which could read as "broken" to an admin who expects the booking flow to actually require the form. → **Mitigation**: the detail/list/booking UI explicitly labels it as informational ("Obligatorio" badge/note), and the User Story explicitly defers enforcement to a future "fill out form" US, consistent with US-0084/US-0085's own scope boundaries.
- **[Risk]** Backward-compatibility defaulting logic (Decision 4) for pre-existing `entrenamiento_plantillas.contenido` rows is client-side only (no migration touches that JSONB column) — a bug in the defaulting code would only surface when an old template is applied, not at migration time. → **Mitigation**: covered explicitly in the spec's acceptance scenarios (applying a pre-US template).

## Migration Plan

1. Write and apply `supabase/migrations/20260722010000_entrenamientos_formulario_plantilla.sql` locally only (`supabase db reset` or equivalent) — **never pushed to the remote Supabase project as part of this change**, per project convention; remote apply happens through the team's existing deployment process.
2. Verify the migration applies cleanly on top of `20260721223051_formulario_esquema_secciones.sql` and that all pre-existing rows (`formulario_id = null`, `formulario_obligatorio = false` by default) remain valid against the new check constraints.
3. Ship the two new columns as fully backward-compatible additive changes — no backfill needed, no existing behavior changes for trainings that don't use them.
4. Rollback strategy: since both columns are nullable/defaulted and no existing column is altered, rollback is a straightforward `drop column` migration if ever needed; no data migration to reverse.

## Open Questions

- None outstanding — the User Story (US-0086) resolved the ambiguous points (composite vs. single-column FK, where `formulario_id` lives during template save/apply, and the out-of-scope boundary on enforcing `formulario_obligatorio`) that would otherwise need a decision here.
