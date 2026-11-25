# US-0108 — Form Template Builder: Visual Header, New Field Types & Manual Save

## ID
US-0108

## Name
Redesign the form template editor with an editable visual header, checkbox/single-select field types, two-column field layout, section cards, dividers, mid-list field insertion, and explicit save

## As a
Tenant administrator (`administrador` role) building registration form templates

## I Want
- The form template preview/editor to render an aesthetic, editable header by default (company logo, título, subtítulo, eyebrow, and up to 5 badges), matching the visual reference `Node ID: P43Yo` in `projectspec/designs/pencil/grit-arena.pen`
- New "Datos" field types: **Checkbox** (boolean) and **Selección** (single-choice buttons)
- The option to lay out fields in two columns
- New non-data section kinds: **Sección** (creates a bordered card that groups the fields added inside it) and **Separador** (draws a horizontal divider)
- The ability to insert a new field/section between two existing rows, not only at the end of the list
- All edits to stay in memory as a draft and only be written to the database when I press an explicit "Guardar cambios" button

## So That
Admins can build registration forms that look as polished as the rest of the product's public-facing pages, model richer question types (yes/no, single choice) without abusing free-text/lista fields, organize long forms into visually distinct cards, and edit a template without generating a database write on every keystroke or field toggle.

---

## Description

### Current State

- `formularios_plantillas` stores template metadata (`nombre`, `descripcion`, `activo`, `perfil_campos_requeridos`).
- `formulario_plantilla_esquema` stores an ordered, **flat** list of rows discriminated by `seccion_tipo` (`titulo` | `subtitulo` | `texto` | `datos`). `datos` rows carry `campo_etiqueta`, `campo_nombre`, `campo_tipo` (`fecha` | `texto_corto` | `texto_largo` | `numerico` | `imagen` | `lista`), `campo_lista_valores`, `campo_obligatorio`, `campo_placeholder`.
- `FormularioEditorPage` (`src/components/portal/formularios/FormularioEditorPage.tsx`) auto-saves on every change: the `nombre`/`descripcion` inputs call `updatePlantillaField` on blur, the "Plantilla activa" checkbox and "Datos de perfil requeridos" checkboxes call `updatePlantillaField` on every click, and each `FormularioSeccionCard` calls `formulariosService.createSeccion`/`updateSeccion` as soon as its "Listo" button is pressed. There is no draft state and no explicit save action — `useFormularioEditor` (`src/hooks/portal/formularios/useFormularioEditor.ts`) issues one Supabase write per field/section change.
- There is no template header — the editor page is a plain "Nombre / Descripción" form; no logo, título, subtítulo, eyebrow, or badges are rendered anywhere (the design reference `P43Yo` shows all of this in a "Hero" block above the form body).
- Sections render as a flat vertical list (`FormularioSeccionesBuilder`); there is no card grouping and no way to lay two fields side by side.
- New fields can only be appended at the end of the list (`FormularioSeccionesBuilder`'s "Añadir sección de formulario" button always appends; reordering only supports moving a row up/down one position at a time via `onMoveUp`/`onMoveDown`).

### Design Reference (`P43Yo` — `projectspec/designs/pencil/grit-arena.pen`)

Read via the pencil MCP tool. Key structure to replicate:

- **Hero block** (`Hero` frame): centered column with, in order —
  1. `Hero Logo Row`: 28×28 rounded-square icon tile (accent-cyan fill) + wordmark text (e.g. "GRIT ARENA", 13px, bold, letter-spaced) — maps to the tenant's logo (`tenants.logo_url`) + tenant name, not editable text (logo/name come from the org, not from form content).
  2. `Eyebrow Row`: two-part line — a muted label + an accent-colored label (e.g. "WOLFPACK ·" + "FICHA DE INSCRIPCIÓN"), 12px, bold, letter-spaced, uppercase.
  3. `Hero Title Wrap`: large two-line centered title (44px, bold) — the second line rendered in accent color.
  4. `Accent Line`: a short (64px) gradient horizontal rule, cyan fading to transparent at both ends, centered under the title.
  5. `Hero Subtitle`: centered, muted, 15px.
  6. `Hero Badges Row`: up to a handful of pill badges, each with a small leading icon + label (13px, semibold), bordered, rounded (`cornerRadius: 10`).
- **Body**: `Header Row` (breadcrumb-style "Volver" left + "Activa" status pill / "Editar plantilla" button right), then a `Profile Fields Row` (chips listing requested profile fields — this already exists as the "Datos de perfil solicitados" preview, keep it), then numbered **Section cards** (`Section N …`): each is a rounded, bordered, translucent card (`cornerRadius: 16`, `fill: $glass-fill`) containing a `Section Head` (28×28 accent-cyan numbered badge + título 19px bold + subtítulo 12.5px muted) followed by fields.
- **Field rows**: label row (11.5px uppercase muted label + red `*` when required) above a bordered input box (`Field Box`, `cornerRadius: 8`). Two-column pairs are literal sibling frames inside a `Grid Row` frame with `gap: 16`, each sized to roughly half the card's content width (`390.5` of `797`) — this is the layout reference for the new "two columns" field option.
- **Single-choice reference** (`Level Tiles Row`): 3 equal-width tiles (`fill_container`, `gap: 12`), each a bordered rounded card with a bold label + small muted description; the selected tile is highlighted with an accent-cyan border/fill/text — this is the visual reference for the new **Selección** field type (rendered as tiles/buttons, not a native radio group).
- **Upload field** (`Upload Field`/`Upload Box`): unchanged, already exists as `campo_tipo = 'imagen'`.

Take this as the aesthetic and structural target; exact pixel values do not need to be copied 1:1, but the composition (centered hero, numbered glass cards, pill badges, tile-based single choice) must be recognizable.

### Proposed Changes

#### 1. Editable header (created by default, per template)

- When a new `formularios_plantillas` row is created, the system automatically inserts 4 header rows into `formulario_plantilla_esquema` at `orden` 0–3, using the new `seccion_tipo` values below (see [Database Changes](#database-changes)):
  - `encabezado_sobretitulo` (eyebrow) — default text, e.g. `"INSCRIPCIÓN"`.
  - `encabezado_titulo` (hero title) — defaults to the template's `nombre`.
  - `encabezado_subtitulo` (hero subtitle) — defaults to the template's `descripcion`, or empty.
  - `encabezado_badges` (badges row) — starts empty (no badges); admin can add up to 5, comma-separated.
- The company logo is **not** stored on the template — it is read live from `tenants.logo_url` (+ `tenants.nombre` as the wordmark fallback when there's no logo) and rendered read-only in the header (editing the logo happens on the existing "Gestión de organización" page, out of scope here).
- These 4 header rows are rendered and edited through a dedicated `FormularioHeaderEditor` component, visually matching the Hero block, **not** through the generic section list (`FormularioSeccionesBuilder`) — they are not addable/removable/reorderable by the admin; only their text content (and the badges list) is editable inline. Clicking directly on the título/subtítulo/eyebrow text (or a small pencil affordance) turns it into an inline text input; badges are edited as a chip-input list (add/remove chips, max 5, blocked past the 5th with inline feedback).
- The eyebrow's two-tone rendering (muted prefix + accent suffix) is *not* modeled as two DB fields — store the full eyebrow string in `seccion_descripcion` and split/style it client-side is out of scope; instead render the whole `encabezado_sobretitulo` value in the accent color (simplify from the two-tone reference to a single accent-colored line). Document this simplification in the section's implementation notes.

#### 2. New "Datos" field types

- Add `checkbox` (boolean) — renders as a single checkbox + label; stored in `respuesta`/preview as the string `"true"`/`"false"`. `campo_obligatorio = true` on a checkbox means it must be checked (`"true"`) to submit, matching how other required fields already fail validation on empty/falsy value in `useFormularioRespuestaForm.validate()`.
- Add `seleccion` (single choice) — renders as a row of selectable tiles/buttons (reusing the `Level Tiles Row` visual pattern: bordered rounded tiles, `gap: 12`, selected tile gets accent border + fill + text color), backed by the **same** `campo_lista_valores` comma-separated options column already used by `lista`. The stored value is the selected option's exact string, same convention as `lista`.
- `FORMULARIO_TIPOS_CAMPO` grows to `['fecha','texto_corto','texto_largo','numerico','imagen','lista','checkbox','seleccion']`.

#### 3. Two-column layout

- `datos` rows gain a `columna_ancho` toggle: **Completo** (default, spans the full card width) or **Mitad** (half width). Two consecutive `mitad` rows within the same card/root group render side by side in a `Grid Row`-style flex pair (`gap: 16`); an unpaired trailing `mitad` row (odd count) renders alone at half width rather than blocking on a pair.
- `columna_ancho` only applies to `datos` rows; every other `seccion_tipo` is forced to `completo` (enforced by a CHECK constraint and by the UI simply not offering the toggle for non-`datos` types).

#### 4. New section kinds: `seccion` and `separador`

- `seccion` — creates a titled card (número badge auto-computed from its position among `seccion` rows + título + optional subtítulo, matching `Section Head` in the reference). All rows that follow it (of any type) belong visually inside that card **until the next `seccion` row or the end of the list** — this is a positional/order-derived grouping, **not** a `parent_id` foreign key: rendering walks the ordered row list and opens/closes a card wrapper whenever it encounters a `seccion` row. Rows before the first `seccion` row (other than the 4 fixed header rows) render at the root level, ungrouped.
- `separador` — renders a plain horizontal rule wherever it falls in the order (inside the current open card, or at root level if none is open). No text content.
- `FORMULARIO_SECCION_TIPOS` (the set offered in the manual "Tipo de sección" dropdown) becomes `['titulo','subtitulo','texto','datos','seccion','separador']` — the 4 `encabezado_*` types are **not** selectable from this dropdown; they only exist as the fixed, auto-created header rows.

#### 5. Insert a field/section mid-list

- `FormularioSeccionesBuilder` gets a thin hover-revealed "+" affordance between every two adjacent rows (and at the very top, before the first row) in addition to the existing bottom "Añadir sección de formulario" button. Clicking it opens a new draft row for editing at that exact position; on confirm, all rows from that position onward shift their `orden` by one locally (no network write — see manual-save below).

#### 6. Manual save (no more per-change writes)

- `useFormularioEditor` is reworked to hold an in-memory **draft**: `plantillaDraft` (nombre/descripcion/activo/perfil_campos_requeridos), `seccionesDraft` (the working, possibly-reordered/edited array, including not-yet-created rows), and a `deletedPersistedIds` set (rows the admin removed that already exist in the DB).
- Every mutating action (`updatePlantillaField`, `addSeccion`, `updateSeccion`/section-card "Listo", `deleteSeccion`, `reorderSecciones`, `moveSeccion`) updates only this local draft — **zero** Supabase calls.
- `isDirty` is derived by comparing the draft against the last-loaded/last-saved snapshot.
- A new `saveAll()` action performs the actual persistence in one user action:
  1. If the plantilla fields changed, call `formulariosService.updatePlantilla`.
  2. For `seccionesDraft`, in order: `formulariosService.createSeccion` for draft-only rows (computing `campo_nombre` collision-safe slugs at this point, same logic `useFormularioEditor.computeCampoNombre` already has — this logic moves from per-card-save time to save-all time), `formulariosService.updateSeccion` for persisted rows whose fields changed.
  3. `formulariosService.deleteSeccion` for every id in `deletedPersistedIds`.
  4. `formulariosService.reorderSecciones` with the final ordered id list, to persist `orden` for every row in one pass.
  5. On full success: reload the plantilla (`load()`) to resync canonical state from the DB and clear dirty/draft state.
  6. On failure at any step: **do not** discard the local draft — surface a save error and let the admin retry `saveAll()` without losing edits.
- `FormularioEditorPage` adds a sticky "Guardar cambios" primary button (disabled while `!isDirty` or while saving; shows a spinner/label while saving) plus a small "Cambios sin guardar" indicator next to it when `isDirty`. A `beforeunload` listener warns the admin before leaving the page with unsaved changes.
- `FormularioSeccionCard`'s "Listo" button no longer calls a Supabase-backed `onSave` — it validates and merges the section's field values into the parent's draft synchronously, then collapses. Its own `isSubmitting`/server-side `submitError` states go away (validation errors stay, since those are still relevant); any save failures are now reported once, at the `saveAll()` level.

---

## Database Changes

New migration: `supabase/migrations/{timestamp}_formulario_plantilla_header_y_campos_avanzados.sql`

```sql
-- 1. Expand seccion_tipo: header pieces + section card + divider.
--    'encabezado_sobretitulo' (22 chars) no longer fits the original varchar(20) — widen first.
alter table public.formulario_plantilla_esquema
  alter column seccion_tipo type varchar(30);

alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_seccion_tipo_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_tipo_ck
    check (seccion_tipo in (
      'titulo', 'subtitulo', 'texto', 'datos',
      'encabezado_sobretitulo', 'encabezado_titulo', 'encabezado_subtitulo', 'encabezado_badges',
      'seccion', 'separador'
    ));

-- 2. Expand campo_tipo: checkbox (boolean) + seleccion (single choice)
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_campo_tipo_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_campo_tipo_ck
    check (campo_tipo in ('fecha', 'texto_corto', 'texto_largo', 'numerico', 'imagen', 'lista', 'checkbox', 'seleccion'));

-- 3. campo_lista_valores is now required for BOTH 'lista' and 'seleccion' campo_tipo
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_lista_valores_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_lista_valores_ck
    check (
      (campo_tipo in ('lista', 'seleccion') and campo_lista_valores is not null and length(trim(campo_lista_valores)) > 0)
      or (campo_tipo is null or campo_tipo not in ('lista', 'seleccion'))
    );

-- 4. New column: two-column layout toggle (datos rows only)
alter table public.formulario_plantilla_esquema
  add column if not exists columna_ancho varchar(10) not null default 'completo';

alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_columna_ancho_ck
    check (
      columna_ancho in ('completo', 'mitad')
      and (columna_ancho = 'completo' or seccion_tipo = 'datos')
    );

-- 5. New column: optional subtitle for 'seccion' cards (Section Head's subtítulo)
alter table public.formulario_plantilla_esquema
  add column if not exists seccion_subtitulo text;

-- 6. seccion_descripcion is required text content for every "text-bearing" seccion_tipo,
--    including the new header pieces and 'seccion' (used as its card título);
--    'datos', 'separador' and 'encabezado_badges' don't use it.
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_seccion_descripcion_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_descripcion_ck
    check (
      (seccion_tipo in ('titulo', 'subtitulo', 'texto', 'seccion',
                         'encabezado_titulo', 'encabezado_subtitulo', 'encabezado_sobretitulo')
        and seccion_descripcion is not null and length(trim(seccion_descripcion)) > 0)
      or (seccion_tipo in ('datos', 'separador', 'encabezado_badges'))
    );

-- 7. 'datos' still requires campo_etiqueta/campo_nombre/campo_tipo; 'encabezado_badges' is the
--    one non-'datos' type allowed to use campo_lista_valores (badge list); every other
--    non-'datos' type keeps all campo_* columns null.
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_datos_campos_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_datos_campos_ck
    check (
      (seccion_tipo = 'datos'
        and campo_etiqueta is not null and campo_nombre is not null and campo_tipo is not null)
      or (seccion_tipo = 'encabezado_badges'
        and campo_etiqueta is null and campo_nombre is null and campo_tipo is null)
      or (seccion_tipo not in ('datos', 'encabezado_badges')
        and campo_etiqueta is null and campo_nombre is null and campo_tipo is null and campo_lista_valores is null)
    );

-- 8. Badges: reuse campo_lista_valores as a comma-separated badge label list, max 5 items
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_badges_ck
    check (
      seccion_tipo <> 'encabezado_badges'
      or (
        campo_lista_valores is not null
        and length(trim(campo_lista_valores)) > 0
        and array_length(string_to_array(campo_lista_valores, ','), 1) <= 5
      )
    );
```

No changes to `formularios_plantillas`, no RLS changes (new columns on `formulario_plantilla_esquema` are covered by the existing row-level, tenant-scoped `select_authenticated` / `insert|update|delete_admin_only` policies from `20260721161036_formularios_plantillas.sql`), no changes to `book_and_deduct_service_units` (the required-field check already works generically off `campo_nombre`/`campo_obligatorio` regardless of `campo_tipo`).

---

## API / Server Actions

No new API routes/RPCs. All changes are client-side Supabase calls through the existing `formulariosService`, plus one new read:

- **File**: `src/services/supabase/portal/formularios.service.ts`
  - `createPlantilla(input)` — after inserting the `formularios_plantillas` row, also insert the 4 default header rows (`encabezado_sobretitulo`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_badges`, `orden` 0–3) into `formulario_plantilla_esquema` in the same call. If the header insert fails, the plantilla row still exists — surface a non-blocking warning rather than rolling back (a missing header can be added later from the editor).
  - `saveEsquemaBatch(plantillaId, { toCreate, toUpdate, toDeleteIds, orderedIds })` — new function used by `saveAll()`; wraps the create/update/delete/reorder sequence described in [Proposed Changes §6](#6-manual-save-no-more-per-change-writes) so `useFormularioEditor` doesn't orchestrate raw Supabase calls directly.

- **File**: `src/hooks/portal/tenant/useTenantLogo.ts` (new)
  - `useTenantLogo(tenantId: string): { nombre: string; logoUrl: string | null } | null` — mirrors `useTenantName`'s lightweight pattern; selects `nombre, logo_url` from `tenants` for the header's logo/wordmark. Read-only, no auth/RLS changes needed (already `select`-able per existing tenant policies).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_formulario_plantilla_header_y_campos_avanzados.sql` | New `seccion_tipo`/`campo_tipo` values, `columna_ancho`, `seccion_subtitulo`, updated CHECK constraints (see DB Changes) |
| Types | `src/types/portal/formularios.types.ts` | Extend `FormularioSeccionTipo`, `FORMULARIO_SECCION_TIPOS`, `FORMULARIO_SECCION_TIPO_LABELS`; extend `FormularioTipoCampo`, `FORMULARIO_TIPOS_CAMPO`, `FORMULARIO_TIPO_CAMPO_LABELS`; add `columna_ancho: 'completo' \| 'mitad'` and `seccion_subtitulo: string \| null` to `FormularioSeccion`, `CreateSeccionInput`, `UpdateSeccionInput`, `FormularioSeccionFormValues`; add a `HEADER_SECCION_TIPOS` const listing the 4 fixed header types (excluded from the manual "Tipo de sección" dropdown) |
| Service | `src/services/supabase/portal/formularios.service.ts` | `createPlantilla` auto-inserts the 4 default header rows; add `saveEsquemaBatch` for the manual-save flow |
| Hook | `src/hooks/portal/formularios/useFormularioEditor.ts` | Rework into draft-based state: `plantillaDraft`, `seccionesDraft`, `deletedPersistedIds`, `isDirty`, `saveAll()`, `saving`, `saveError`; `addSeccion` accepts an optional insert position; all per-change Supabase calls removed |
| Hook | `src/hooks/portal/formularios/useFormularioSeccionForm.ts` | Add `columna_ancho`, `seccion_subtitulo` fields; validation for `seleccion` requiring `campo_lista_valores` (same rule as `lista`); validation for `seccion` requiring a título (`seccion_descripcion`) |
| Hook | `src/hooks/portal/tenant/useTenantLogo.ts` | New — fetch `{ nombre, logo_url }` for the header's logo/wordmark |
| Component | `src/components/portal/formularios/FormularioHeaderEditor.tsx` | New — renders/edits the 4 header rows + tenant logo, styled per `P43Yo`'s Hero block (eyebrow, título, subtítulo, accent line, badge chip editor with 5-item cap) |
| Component | `src/components/portal/formularios/FormularioBadgeChipInput.tsx` | New — small chip-list editor (add/remove, max 5) backing `encabezado_badges`, reused by header editor |
| Component | `src/components/portal/formularios/FormularioSeccionesBuilder.tsx` | Groups rows into `seccion` cards (positional grouping per §4); renders `separador` as an `<hr>`; adds hover "+" insert-here affordances between rows; `onSaveSeccion`/`onDeleteSeccion`/`onReorder` become synchronous local-draft mutators (no `Promise`/network) |
| Component | `src/components/portal/formularios/FormularioSeccionCard.tsx` | "Tipo de sección" dropdown uses the non-header subset; add `columna_ancho` toggle (datos only); add `seccion_subtitulo` input (seccion only); `seleccion` reuses the `campo_lista_valores` textarea already shown for `lista`; "Listo" no longer shows a "Guardando..." server state |
| Component | `src/components/portal/formularios/FormularioSeccionContent.tsx` | Render `seccion` as a card header (numbered badge + título + subtítulo) is handled by the builder's grouping wrapper, not this per-row renderer; add `separador` → `<hr>` branch |
| Component | `src/components/portal/formularios/FormularioCampoPreviewInput.tsx` | Add disabled `checkbox` preview (checkbox + label) and `seleccion` preview (tile/button group, reusing the same visual pattern as the fill-out form) |
| Component | `src/components/portal/formularios/FormularioTipoCampoBadge.tsx` | Add badge label/icon mapping for `checkbox` and `seleccion` |
| Component | `src/components/portal/formularios/FormularioPreviewModal.tsx` | Renders `FormularioHeaderEditor` (read-only mode) above the sections, and groups `seccion` cards the same way the builder does |
| Component | `src/components/portal/formularios/FormularioEditorPage.tsx` | Mount `FormularioHeaderEditor` at the top; add sticky "Guardar cambios" button + "Cambios sin guardar" indicator wired to `saveAll()`/`isDirty`/`saving`/`saveError`; `nombre`/`descripcion`/`activo`/perfil-campos checkboxes now write to the draft (`updatePlantillaField`) instead of firing a Supabase call on blur/change; add `beforeunload` guard while `isDirty` |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx` (or its shared per-`campo_tipo` renderer) | Add live `checkbox` input (writes `"true"`/`"false"`) and `seleccion` tile-button group (writes the selected option string); render `seccion` cards + `separador` + two-column pairing for the fill-out view, consistent with the builder/preview |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx` | Render checkbox answers as "Sí"/"No" and `seleccion` answers as plain text (same as `lista` today) |

---

## Acceptance Criteria

1. Creating a new form template via `FormulariosPage`'s create modal automatically creates 4 header rows (`encabezado_sobretitulo`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_badges`) at `orden` 0–3, prefilled with sensible defaults, in addition to the `formularios_plantillas` row.
2. Opening the editor for that template shows a Hero-style header at the top: tenant logo (or name-only wordmark when no logo is set) + eyebrow + título + accent divider + subtítulo + badge chips, visually consistent with `P43Yo`.
3. Editing the título, subtítulo, eyebrow, or badges in the header editor updates only the in-memory draft — no network request fires until "Guardar cambios" is pressed. Adding a 6th badge is blocked with inline feedback; removing a badge and re-adding fewer than 5 works.
4. Adding a "Datos" section with type **Checkbox** shows only a required-toggle (no lista-valores textarea, no placeholder needed) and previews as a disabled checkbox + the field's label.
5. Adding a "Datos" section with type **Selección** requires at least one comma-separated value in "Valores permitidos" (same validation as **Lista**) and previews as a row of tile buttons matching the reference's `Level Tiles Row` styling.
6. Setting a "Datos" field's column width to **Mitad** and adding a second **Mitad** field right after it renders both side by side in the sections builder, the preview modal, and the live fill-out form; a lone trailing **Mitad** field (odd count) renders alone at half width without blocking on a pair.
7. Adding a **Sección** row creates a numbered, bordered card (número auto-computed from its position among `seccion` rows in the list); every row added after it (until the next `seccion` row) renders visually inside that card in the builder, the preview modal, and the live fill-out form.
8. Adding a **Separador** row renders a horizontal divider at that exact position (inside the enclosing card if one is open, otherwise at the root level).
9. Hovering between any two existing rows (or above the first row) reveals a "+" affordance; clicking it opens a new draft row for editing at exactly that position, and confirming it inserts the row there (verified by its resulting order) without requiring the admin to manually reorder afterward.
10. No `formulario_plantilla_esquema` or `formularios_plantillas` write occurs while editing header text, adding/removing/reordering/editing sections, or toggling "Plantilla activa"/perfil checkboxes — confirmed via network inspection — until "Guardar cambios" is clicked.
11. The "Guardar cambios" button is disabled when there are no unsaved changes, shows a saving state while `saveAll()` runs, and becomes disabled again (with the "Cambios sin guardar" indicator cleared) after a successful save.
12. Attempting to navigate away (browser tab close/refresh) with unsaved changes triggers the browser's native "leave site" confirmation.
13. If `saveAll()` fails partway (e.g. a network error), the in-memory draft is preserved (nothing reverts to the last-saved state) and the admin can retry "Guardar cambios" without re-entering any data.
14. After a successful save, reloading the editor page shows all header edits, new/edited/deleted/reordered sections, and column-width/section/separator changes exactly as configured, confirming persistence.
15. Existing templates created before this change (with only `titulo`/`subtitulo`/`texto`/`datos` rows and no header rows) continue to load and render correctly in the editor and preview — they simply show no header block until the admin's next save backfills one (or, per implementation choice documented in the PR, a one-time backfill inserts default header rows for pre-existing templates — pick one approach and note it in the PR description).
16. Submitting a booking form (`FormularioRespuestaModal`) with a required Checkbox unchecked, or a required Selección with nothing chosen, blocks submission the same way any other required field does today.
17. `FormularioRespuestaViewerModal` and the "Descargar Respuestas Formulario" Excel export render checkbox answers as "Sí"/"No" (not raw `"true"`/`"false"`) and `seleccion` answers as plain text.

---

## Implementation Steps

- [ ] Write and apply the migration (new `seccion_tipo`/`campo_tipo` values, `columna_ancho`, `seccion_subtitulo`, updated CHECK constraints)
- [ ] Update `formularios.types.ts` (new enums, `HEADER_SECCION_TIPOS`, new fields on `FormularioSeccion`/input/form-value types)
- [ ] Update `formulariosService.createPlantilla` to auto-insert the 4 header rows; add `saveEsquemaBatch`
- [ ] Add `useTenantLogo` hook
- [ ] Rework `useFormularioEditor` into the draft/`saveAll()` model
- [ ] Update `useFormularioSeccionForm` validation for `seleccion`, `seccion`, `columna_ancho`
- [ ] Build `FormularioHeaderEditor` + `FormularioBadgeChipInput`
- [ ] Update `FormularioSeccionesBuilder` for card grouping, separators, mid-list insertion, synchronous local mutators
- [ ] Update `FormularioSeccionCard` (dropdown subset, `columna_ancho` toggle, `seccion_subtitulo` input, `seleccion` reusing lista-valores UI)
- [ ] Update `FormularioSeccionContent`, `FormularioCampoPreviewInput`, `FormularioTipoCampoBadge` for `checkbox`/`seleccion`/`separador`
- [ ] Update `FormularioPreviewModal` to mount the header editor (read-only) and card grouping
- [ ] Update `FormularioEditorPage`: mount header editor, wire "Guardar cambios"/dirty indicator/`beforeunload`, switch metadata inputs to draft-only
- [ ] Update `FormularioRespuestaModal`'s per-`campo_tipo` renderer for live `checkbox`/`seleccion` input and card/separator/column layout
- [ ] Update `FormularioRespuestaViewerModal` + Excel export formatting for checkbox/`seleccion` answers
- [ ] Decide and implement the pre-existing-templates header backfill approach (lazy-on-save vs. one-time migration backfill) and document the choice
- [ ] Manual test: create a template, build a header, add checkbox/seleccion/two-column/seccion/separador content, insert a field mid-list, confirm no network writes until save, save, reload, verify persistence; fill out and submit a booking with the new field types; verify the response viewer/export formatting
- [ ] Update `projectspec/03-project-structure.md` entries for the touched files

---

## Non-Functional Requirements

- **Security**: No RLS changes required — all new columns live on `formulario_plantilla_esquema`, already gated by tenant-scoped admin policies. Client-side validation (required badges cap, required-value checks for `seleccion`/`lista`) is a UX aid only; the DB CHECK constraints in this US are the actual enforcement boundary.
- **Performance**: `saveAll()` batches all pending create/update/delete/reorder calls into one user action instead of one round trip per keystroke/toggle — a net reduction in write volume versus today's auto-save behavior. No new indexes needed (no new filterable/joined columns).
- **Accessibility**: Header título/subtítulo/eyebrow inline-edit affordances must be reachable and operable by keyboard (not hover-only); the badge chip input's add/remove controls need `aria-label`s; the "+"-insert-here affordances between rows must not be the *only* way to insert a field for keyboard/screen-reader users — keep the existing bottom "Añadir sección" button as the accessible fallback (it can accept an optional "insert before" target instead of always appending, if feasible, or simply remain an append-only fallback).
- **Error handling**: Save failures surface as a single, retryable error banner at the `saveAll()` level (not per-field); the in-memory draft is never discarded on failure. Section-level validation errors (missing título, missing lista/seleccion values, etc.) block collapsing that card locally, before they ever reach `saveAll()`.
