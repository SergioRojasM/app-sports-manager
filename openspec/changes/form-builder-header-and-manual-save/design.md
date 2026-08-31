## Context

The form template editor lives at `app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/[formulario]/page.tsx` → `FormularioEditorPage`. It currently reads/writes through `formulariosService` (`src/services/supabase/portal/formularios.service.ts`) against two tables: `formularios_plantillas` (template metadata) and `formulario_plantilla_esquema` (an ordered flat list of rows discriminated by `seccion_tipo` ∈ `{titulo, subtitulo, texto, datos}`). Every field/toggle change in the editor fires a Supabase write immediately (`useFormularioEditor.ts`), and there is no visual header — the editor is a bare "Nombre / Descripción" form above a flat list of section cards (`FormularioSeccionesBuilder` → `FormularioSeccionCard`).

The visual target is the `P43Yo` node in `projectspec/designs/pencil/grit-arena.pen`: a centered "Hero" header (logo, eyebrow, título, accent divider, subtítulo, badge pills) above numbered glass-card sections with two-column field grids and tile-based single-choice controls. Full structural detail is captured in US-0108 (`projectspec/userstory/us0108-form-builder-header-and-manual-save.md`).

This is a cross-cutting change: one migration, new enum values threaded through types/service/two hooks/nine components (admin builder side) plus three components on the live booking side (fill-out, viewer, export).

## Goals / Non-Goals

**Goals:**
- Ship the header, the two new field types (`checkbox`, `seleccion`), two-column layout, `seccion`/`separador` grouping, and mid-list insertion, all additive to the existing schema (no data loss for existing templates).
- Replace per-change auto-save with an in-memory draft + single "Guardar cambios" batched write, without introducing a new backend endpoint (stay within the existing client → Supabase service pattern).
- Keep the live booking fill-out form, response viewer, and CSV/Excel export in sync with the new field/section types.

**Non-Goals:**
- Editing the tenant logo from within the form editor (logo management stays on the existing "Gestión de organización" page).
- A generic drag-and-drop reordering UI — reordering keeps the existing up/down-arrow mechanism; only *insertion position* is new.
- A `parent_id`/nested-tree data model for sections — grouping stays positional (derived from `orden`), not a foreign-key hierarchy.
- Multi-select ("checkbox group") field type — only single boolean (`checkbox`) and single-choice (`seleccion`) are in scope; a future US can add multi-select if needed.
- Real-time collaborative editing / conflict resolution across concurrent editors of the same template (last-write-wins on save, same as today).
- Any change to `book_and_deduct_service_units` or other RPCs — required-field validation already works generically off `campo_nombre`/`campo_obligatorio`.

## Decisions

### 1. Positional grouping for `seccion` cards instead of a `parent_id` FK
**Decision**: A `seccion` row's "card" is derived at render time by scanning the ordered row list and treating every row after it (of any type) as inside that card, until the next `seccion` row.

**Why over the alternative** (adding `parent_seccion_id uuid references formulario_plantilla_esquema(id)`):
- The existing data model is already a flat, `orden`-sorted list with zero nesting; the reorder mechanism (`reorderSecciones`) simply rewrites every row's `orden` in one pass. A parent FK would require re-parenting logic on every insert/delete/reorder/drag, on-delete-of-parent handling (orphaned children), and a second source of truth that could drift from `orden`.
- Positional grouping needs no new relationship, degrades gracefully (a template with no `seccion` rows renders everything at root level, exactly like today), and is trivial to unit-test: given an ordered array, group-by "since last `seccion` row" is a single reduce.
- Trade-off accepted: sections cannot be reordered independently of their contents (moving a `seccion` row necessarily "carries" everything after it until the next `seccion` row) — this matches the mental model of a card in the visual reference and is what the User Story asked for ("dentro de la card poder adicionar campos").

### 2. `seleccion` reuses `campo_lista_valores`, not a new options table/column
**Decision**: `seleccion` stores its options the same way `lista` already does — a comma-separated string in `campo_lista_valores`.

**Why**: Both are "pick one of N fixed strings" — the only difference is the rendered control (dropdown vs. tiles). Introducing a normalized `formulario_plantilla_esquema_opciones` table would be more "correct" relationally but is unjustified complexity for a fixed, admin-authored, rarely-changed list of ≤10 short strings, and would require a second CRUD surface, a join in every read, and migration of existing `lista` semantics. The CHECK constraint is widened from `campo_tipo = 'lista'` to `campo_tipo in ('lista', 'seleccion')` to require the same non-empty value for both.

### 3. Header pieces are rows in `formulario_plantilla_esquema`, not columns on `formularios_plantillas`
**Decision**: The four header pieces (`encabezado_sobretitulo`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_badges`) are `seccion_tipo` values on the existing schema table, auto-created at `orden` 0–3, rather than new columns (`header_titulo`, `header_subtitulo`, …) on `formularios_plantillas`.

**Why**: This was an explicit instruction in the source User Story, and it keeps a single unified ordered-content model — the editor, preview, and fill-out form already know how to load/render/edit "a row with a `seccion_tipo`"; adding four bespoke columns to `formularios_plantillas` would mean a second, parallel editing code path (separate load, separate save, separate optimistic-update logic) instead of reusing the section CRUD/draft machinery this change is already building. The trade-off is that these 4 rows are "special" (not deletable/reorderable/addable through the generic section list) and the builder UI must exclude `HEADER_SECCION_TIPOS` from the manual "Añadir sección" type picker and from the up/down reorder controls.

### 4. Draft/batched-save state lives in the hook, not in a form library or global store
**Decision**: `useFormularioEditor` is rewritten to hold `plantillaDraft`, `seccionesDraft`, and `deletedPersistedIds` as local `useState`, with `isDirty` derived by comparing against a `lastSavedSnapshot` ref, and `saveAll()` sequencing the create/update/delete/reorder Supabase calls.

**Why over introducing a form/state library** (e.g. React Hook Form, Zustand): the project has no existing dependency on either for this kind of multi-entity draft state (grep of `hooks/portal/**` shows every feature — plans, servicios, entrenamientos — manages CRUD/draft state with plain `useState`/`useCallback` in a feature hook, e.g. `usePlanForm.ts`, `useEntrenamientoForm.ts`). Matching that convention keeps this change reviewable and consistent, and the state shape here (one metadata object + one ordered array + one id-set) doesn't need more machinery than `useState` provides.

**Trade-off**: `saveAll()` performs several sequential `await`s (update plantilla → create new sections → update changed sections → delete removed sections → reorder) rather than a single atomic RPC/transaction. A failure partway leaves the database in a partially-saved state (e.g. new sections created but reorder not yet applied) while the *local draft* is preserved so the admin can retry. This is an accepted trade-off (see Risks) rather than introducing a new Postgres function for a low-traffic admin authoring flow.

### 5. `columna_ancho` and `seccion_subtitulo` as new nullable/defaulted columns, additive constraints
**Decision**: `columna_ancho varchar(10) not null default 'completo'` and `seccion_subtitulo text` (nullable) are added via `alter table … add column if not exists`, and every existing CHECK constraint that needs widening is `drop constraint if exists` + re-`add constraint` with the superset of allowed values — never a destructive rewrite of existing rows.

**Why**: Existing templates (rows only using `titulo`/`subtitulo`/`texto`/`datos`) must continue to load and save unchanged after this migration ships (US-0108 AC #15). Additive-only DDL guarantees that.

## Risks / Trade-offs

- **[Risk] `saveAll()` is not atomic** — a mid-sequence failure (e.g. network drop after sections are created but before the reorder call) can leave `orden` values or a subset of edits partially applied server-side, even though the local draft looks "still dirty" and shows a retryable error. → **Mitigation**: reload (`load()`) is only called on *full* success; on failure the admin's next "Guardar cambios" retries the *entire* draft against the (possibly partially-updated) server state — since `saveAll()` is expressed as idempotent upserts by row id plus a final full reorder pass, retrying converges to the correct end state rather than double-applying changes. This is documented as an accepted limitation, not silently ignored.
- **[Risk] Positional section-grouping is ambiguous if two admins edit concurrently** — since grouping has no explicit parent id, a race where one admin reorders while another inserts could produce a surprising card boundary. → **Mitigation**: this is the existing concurrency posture of the whole editor (last-write-wins, no realtime sync) — same as today's flat-list reordering; not a regression introduced by this change.
- **[Risk] Widened CHECK constraints increase constraint-evaluation surface on every write** — more `case`-like branches per insert/update. → **Mitigation**: negligible at this table's write volume (admin-authored templates, not a hot path); no index or query-plan impact since these are row-level CHECKs, not lookups.
- **[Trade-off] Existing templates show no header until backfilled** — templates created before this ships have no `encabezado_*` rows. → **Mitigation**: per US-0108 AC #15, pick one of (a) lazy backfill on next save, or (b) a one-time data migration inserting default header rows for every existing template — decided at implementation time in `tasks.md`/PR description; either is additive and low-risk.

## Migration Plan

1. Apply the new migration **locally only** (`supabase db reset` / local Supabase, per project convention — never push directly to the remote/hosted project from this change).
2. Ship types/service/hook/component changes behind normal PR review; no feature flag needed since the schema change is additive and the UI change (draft/manual-save) is a full replacement of the existing editor screen, not a dual-path rollout.
3. No rollback beyond a standard revert PR is anticipated — the migration only widens constraints and adds nullable/defaulted columns, so reverting the migration (dropping the added columns/constraints) is safe as long as no template has yet used the new `seccion_tipo`/`campo_tipo` values in production.

## Open Questions

- Backfill strategy for pre-existing templates' headers (lazy-on-save vs. one-time migration) — left as an implementation-time decision, to be recorded in the PR description per US-0108 AC #15.
- Whether the bottom "Añadir sección" fallback button should support "insert before a chosen row" for keyboard/screen-reader users who can't use the hover "+" affordance, or remain append-only — flagged in US-0108's Non-Functional Requirements as "if feasible"; not blocking for the first implementation pass.
