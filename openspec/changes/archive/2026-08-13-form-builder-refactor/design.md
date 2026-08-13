## Context

`form-templates-management` (US-0084) already ships `formularios_plantillas` + `formulario_plantilla_esquema`, an admin list page (`FormulariosPage`/`FormulariosTable`), and side-modal CRUD for both templates and fields (`FormularioFormModal`, `FormularioCamposPanel` + `FormularioCampoFormModal`), all Supabase-RLS-gated to tenant admins. That implementation treats every `formulario_plantilla_esquema` row as an input question. US-0085 asks for a richer authoring experience: sections that can be a heading/subtitle/paragraph OR a data question, built section-by-section in a dedicated page rather than modals, with the internal field key hidden entirely. This design covers how to extend the existing schema and component tree without breaking the parts of the module that already work (list, create, delete, RLS).

## Goals / Non-Goals

**Goals:**
- Introduce a `seccion_tipo` discriminator on `formulario_plantilla_esquema` so a template can mix display-only content with data questions, while keeping the existing `formulario_plantilla_esquema` table (no new table, no data migration script needed).
- Move template editing from modals into a dedicated `[formulario]/page.tsx` route with a Google-Forms-style, auto-saving section builder.
- Remove `campo_nombre` from the admin's field of view entirely by computing it client-side.
- Give the list page icon-based Previsualizar/Editar/Eliminar actions.

**Non-Goals:**
- Building the athlete/coach-facing "fill out this form" experience (still deferred).
- Attaching templates to trainings.
- Drag-and-drop reordering (up/down arrow buttons, already the existing pattern, are kept).
- Renaming the underlying database table/columns beyond what's needed for the new discriminator (`campo_tipo`'s six data-type values are untouched).

## Decisions

**1. Extend `formulario_plantilla_esquema` in place, via ALTER TABLE, instead of a new table.**
A "sección" and a "campo" are the same row shape with a type discriminator — modeling them as one table with conditional (partial) requiredness, enforced by `check` constraints, avoids a join and keeps `orden` naturally shared across all section types in a single sequence. Alternative considered: a separate `formulario_plantilla_secciones` table with a nullable FK to a `formulario_plantilla_campos` detail table for `datos` rows (classic type/subtype modeling). Rejected — it adds a join for every read and a second insert per `datos` section for no real benefit at this data volume (tenant-scoped catalog rows, expected in the tens).

**2. `campo_nombre` computed client-side, not via a DB trigger.**
Slugification happens in the `useFormularioEditor` hook before calling `createSeccion`, with a local collision check against already-loaded sibling sections, and a single retry-with-suffix if the DB still rejects it via `23505` (e.g. a concurrent admin editing the same template). Alternative considered: a Postgres trigger/function that derives `campo_nombre` from `campo_etiqueta` server-side. Rejected — the existing `check (campo_nombre ~ '^[a-z][a-z0-9_]*$')` and `unique (formulario_plantilla_id, campo_nombre)` constraints already make the DB the source of truth for *validity*; a generation trigger would duplicate slugify logic in two languages (SQL + TS) for a low-concurrency admin-only catalog table where a client-side compute-then-insert-then-retry-once is simpler to reason about and test.

**3. One `formulario_plantilla_esquema` row is "uncommitted" until its first successful collapse.**
A new section card exists only in React state (not yet in the DB) until the admin collapses it without validation errors, at which point the hook calls `createSeccion`. This matches the "close the section to save it" requirement and avoids writing incomplete/junk rows for sections the admin adds and immediately discards. Re-opening and re-collapsing an already-persisted card calls `updateSeccion` instead. The hook distinguishes the two cases by whether the card has an `id` yet (client-generated temp key vs. a real DB uuid).

**4. Service/hook/type renaming from "Campo" to "Seccion".**
Since a row can now be a heading, keeping `campo_*` naming on the outer CRUD surface (`createCampo`, `FormularioCampo`, etc.) is misleading. Renamed to `Seccion`-prefixed names throughout the service/hook/type layer; the inner `campo_tipo`/`campo_etiqueta`/`campo_lista_valores`/`campo_obligatorio`/`campo_placeholder`/`campo_nombre` column names stay as-is (they still describe the "datos" sub-shape and renaming DB columns adds migration risk for no behavioral benefit).

**5. Breadcrumb: label only the first UUID path segment with the tenant name.**
`PortalBreadcrumb.tsx` currently maps *every* UUID-shaped segment to `tenantName`. Since this change introduces a second UUID segment in the URL (`gestion-formularios/{plantilla_id}`), the breadcrumb logic is updated to only apply `tenantName` to the segment immediately following `orgs`, and any later UUID segment is resolved via a new small `useFormularioPlantillaName` hook (mirrors `useTenantName`). This is scoped narrowly to "first UUID vs. later UUID" rather than building a generic per-route resolver registry, since this is the only nested-UUID route in the app today.

## Risks / Trade-offs

- **[Risk] Existing `formulario_plantilla_esquema` rows in a shared/staging DB predate `seccion_tipo`.** → Mitigation: the new column is added with `not null default 'datos'`, which Postgres backfills for every existing row in the same statement; those rows already satisfy the new `datos`-branch check constraints because they were created under the old datos-only model, so no separate `UPDATE` or manual backfill step is needed.
- **[Risk] Client-computed `campo_nombre` could still collide under concurrent edits by two admins on the same template.** → Mitigation: the DB unique constraint remains authoritative; on a `23505` the hook retries once with an incremented numeric suffix before surfacing a friendly error, matching the existing `FormularioServiceError` mapping pattern.
- **[Risk] Removing the inline `FormularioCamposPanel` list-row expansion is a UX regression if the dedicated editor page ever fails to load.** → Mitigation: the editor page reuses the same `getPlantillaConSecciones` read path (RLS-open to any authenticated user) already proven by the list page's `camposCount` aggregate query; no new failure surface is introduced.
- **[Trade-off] Auto-save on collapse (no explicit "Guardar" button per section) means a validation error blocks collapsing rather than allowing a "save draft".** Accepted per the User Story's explicit requirement ("al cerrar la seccion que guarde los cambios") — the card simply stays expanded with an inline error until it's valid.

## Migration Plan

1. Apply the new migration locally only (`supabase db reset` / local `supabase migration up` — never pushed to the remote/staging Supabase project as part of this change, per project convention) and confirm existing seed rows remain valid under the new constraints.
2. Ship type/service/hook renames and new components together in one PR — this module has no external consumers yet (the "attach to training" consumer US hasn't shipped), so there is no cross-module compatibility window to manage.
3. Rollback: drop the three new check constraints and the two new columns (`seccion_tipo`, `seccion_descripcion`) in a follow-up migration if needed; no destructive change to pre-existing `datos` data since old columns are untouched in content, only nullability.
