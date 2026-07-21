## Context

The admin route `gestion-formularios` is an empty placeholder. This change introduces a two-table structured schema (template + ordered field definitions) rather than reusing the existing `entrenamiento_plantillas` JSONB-blob pattern, because downstream consumers (a future US) need to query, validate, and render individual fields by type — a JSONB blob would push that structure-parsing responsibility into application code instead of the database.

Three existing patterns in the codebase are directly reused rather than reinvented:
- **RLS shape**: `servicios` / `plan_tipos_servicios` (`supabase/migrations/20260610000100_servicios_plan_tipos_servicios.sql`) — catalog-style `SELECT using (true)`, admin-only writes via `get_admin_tenants_for_authenticated_user()`.
- **UI shape**: `disciplinas` / `nivel_disciplina` (`DisciplinesPage` + `NivelesDisciplinaPanel` + `useNivelesDisciplina`) — parent list, each row expands into a panel managing ordered child rows.
- **Service-layer error mapping**: `serviciosService` / `ServicioServiceError` — Postgres error codes (`23505`, `23503`, `42501`) mapped to Spanish user-facing messages.

No new design/mockup artifact (Figma/Pencil/sketch) is produced for this change: the proposal explicitly reuses the `gestion-servicios` and `gestion-disciplinas` layouts field-for-field, so there is no new visual pattern to design — this is a deliberate scope decision, not an oversight.

## Goals / Non-Goals

**Goals:**
- Let a tenant admin define named form templates and, within each, an ordered list of typed field definitions (fecha, texto_corto, texto_largo, numerico, imagen, lista).
- Enforce structural validity at the database layer (field-type enum, conditional list-values requirement, snake_case key format, per-template key uniqueness) so no downstream consumer has to re-validate malformed templates.
- Keep templates and fields readable by any authenticated tenant member (future consumer US will need to read templates from non-admin roles), while restricting writes to tenant admins.

**Non-Goals:**
- Rendering a fillable form from a template, or storing submitted answers (`formulario_respuestas` — future US).
- Attaching a template to `entrenamientos` / `entrenamientos_grupo` (future US).
- Drag-and-drop reordering (a numeric `orden` field with move-up/down controls is sufficient for v1).
- Versioning templates or fields (editing a field in place is acceptable since no submissions exist yet).

## Decisions

**1. Two tables, not one JSONB column.**
`formularios_plantillas` (metadata) + `formulario_plantilla_esquema` (one row per field), instead of a single table with a JSONB `contenido` column (as `entrenamiento_plantillas` does).
*Alternative considered*: reuse the JSONB-blob shape for consistency with `entrenamiento_plantillas`. Rejected because the requirement explicitly asks for individually queryable field metadata (`campo_tipo` drives UI rendering choice later), and a relational shape lets the DB enforce per-field constraints (type enum, conditional list-values) that a JSONB blob cannot express declaratively.

**2. `campo_nombre` is a slug, not the row `id`.**
The field's row `id` (uuid) remains the actual FK anchor for any future answers table. `campo_nombre` is a separate, human-readable `snake_case` key (`check (campo_nombre ~ '^[a-z][a-z0-9_]*$')`), unique per template, intended as the JSON property name when a filled form's answers are eventually persisted (e.g. `{"peso_kg": 72}`).
*Alternative considered*: use the field's uuid as the JSON key directly (simpler, zero risk of collision). Rejected for developer/admin ergonomics — uuid-keyed JSON is unreadable in exports, CSVs, and ad hoc DB queries, and the uniqueness risk is already fully mitigated by the DB unique constraint on `(formulario_plantilla_id, campo_nombre)`.
*UX consequence*: the create-mode field modal auto-slugifies `campo_nombre` from `campo_etiqueta` as the admin types, stopping once the admin manually edits `campo_nombre`; edit mode never auto-changes it. The DB constraint is the enforcement source of truth, not the client-side slugify.

**3. Catalog-style RLS (`using (true)` for SELECT), matching `servicios`.**
*Alternative considered*: membership-scoped SELECT (`exists (select 1 from miembros_tenant …)`), matching `entrenamiento_plantillas`. Rejected in favor of consistency with the more directly analogous sibling admin-catalog table (`servicios`), which sits in the same "(administrador)" menu group and was built for the same "configure once, consumed elsewhere later" purpose. Both patterns already coexist in the schema; this is a judgment call, called out here for visibility in case product wants tenant-only visibility instead.

**4. Hard delete with cascade, no soft-delete/archival for templates or fields in v1.**
Deleting a template cascades to its fields (`on delete cascade`). Since no consumer (training attachment, submitted answers) exists yet in this change's scope, there is no orphaned-reference risk. `activo` flags exist on both tables to let admins deactivate without deleting, which is the primary "soft" lifecycle mechanism needed pre-attachment.
*Risk*: once the future "attach to training" US ships, deleting a template referenced by a training will need a new guard (FK `on delete restrict` or an application-level check) — flagged as an open question below, not solved here.

**5. Reuse `get_admin_tenants_for_authenticated_user()` and `set_updated_at()` as-is.**
No new SQL functions. Confirm the exact origin migration of `set_updated_at()` before referencing it (used by `servicios`, `entrenamiento_plantillas`; likely defined in an early scenario migration) — this is a "verify, don't guess" step during implementation, not a design decision.

**Methodology**: implementation proceeds page → component → hook → service → types is the *reading* convention for this doc's file listing, but build order in tasks.md follows the dependency-safe order: migration → types → service → hooks → components → page → menu wiring (a component cannot compile against a hook that doesn't exist yet).

## Risks / Trade-offs

- **[Risk]** Catalog-style `SELECT using (true)` on `formularios_plantillas`/`formulario_plantilla_esquema` means any authenticated user (any tenant) can read any tenant's form templates via direct API calls, not just their own tenant's. → **Mitigation**: this exactly matches the existing `servicios` precedent already shipped in production; if this is unacceptable for form templates specifically (e.g. templates contain sensitive field labels), swap to the `entrenamiento_plantillas` membership-check policy before merging — flagged explicitly for reviewer sign-off in the PR description.
- **[Risk]** `campo_nombre` uniqueness is per-template, not global — if a future consumer flattens multiple templates' answers into one JSON object, keys could collide across templates. → **Mitigation**: out of scope for this change (single-template rendering only); the future "attach to training" US should namespace by template if this becomes relevant.
- **[Risk]** No FK guard yet prevents deleting a template that a future training/answer record depends on. → **Mitigation**: explicitly deferred; the future attachment US must add either `on delete restrict` or an application-level "in use" check before allowing template deletion.
- **[Trade-off]** No drag-and-drop reordering in v1 (numeric `orden` input + move up/down buttons instead). Slightly less polished UX, but matches the codebase's current lack of any drag-and-drop dependency (avoids introducing a new library for one feature).

## Migration Plan

1. Add `supabase/migrations/{timestamp}_formularios_plantillas.sql` (tables, indexes, RLS, triggers — see proposal/US for full SQL).
2. Apply and verify **locally only** via the local Supabase CLI workflow (`supabase db reset` or `supabase migration up` against the local stack) — do **not** push to the remote/hosted Supabase project as part of this change.
3. Manually verify RLS in the local Supabase Studio: as an `administrador`, CRUD succeeds on both tables; as `usuario`/`entrenador`, writes are rejected (`42501`) but reads still succeed.
4. No data backfill needed — both tables are net-new with no existing rows to migrate.
5. **Rollback**: `drop table if exists public.formulario_plantilla_esquema; drop table if exists public.formularios_plantillas;` (child before parent) plus dropping the two triggers and policy sets — safe since no other object references these tables yet.

## Open Questions

- Should `formularios_plantillas`/`formulario_plantilla_esquema` SELECT be tenant-membership-scoped instead of open to all authenticated users? (Decision 3 above defaults to open, matching `servicios`; needs explicit product sign-off if stricter scoping is actually desired.)
- When the future "attach template to training" US lands, should template deletion be blocked (`on delete restrict`) or should it cascade-orphan past submissions? Not answered here — out of scope for this change, but the chosen FK behavior in this migration (`on delete cascade` from plantilla → esquema) may need revisiting then.
