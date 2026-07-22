# US-0085 — Interactive Google-Forms-style Form Builder (Refactor)

## ID
US-0085

## Name
Refactor Form Templates Module Into a Section-Based, Google-Forms-style Builder

## As a
Tenant administrator

## I Want
To build a form template interactively, adding it section by section (Título, Subtítulo, Texto, or Datos) with a live preview of each section as I configure it, in a dedicated full-page editor reached from the templates list — instead of filling out a generic "add field" side-modal — and to preview, edit, or delete any template from clear icon actions in the list

## So That
Creating a form feels as visual and low-friction as Google Forms: I can mix headings and instructional text with actual data-collection questions, see exactly how each section will render as I build it, and never have to think about internal/technical details like the machine-readable field key, which the system now computes for me silently

---

## Description

### Current State

[US-0084](./us0084-form-templates-management.md) shipped the first version of this module and it is fully implemented today:

- **Data model** (`supabase/migrations/20260721161036_formularios_plantillas.sql`): `public.formularios_plantillas` (one row per template: `nombre`, `descripcion`, `activo`) and `public.formulario_plantilla_esquema` (one row per field: `campo_etiqueta`, `campo_nombre`, `campo_tipo` — `fecha | texto_corto | texto_largo | numerico | imagen | lista` —, `campo_lista_valores`, `campo_obligatorio`, `campo_placeholder`, `orden`, `activo`). Every row in `formulario_plantilla_esquema` today represents one input question; there is no way to add a heading or plain instructional text between questions.
- **List page**: [gestion-formularios/page.tsx](../../src/app/portal/orgs/%5Btenant_id%5D/(administrador)/gestion-formularios/page.tsx) renders `FormulariosPage` → `FormulariosTable`. Each row has an expand chevron that opens an inline `FormularioCamposPanel` (a nested table of fields with "Editar"/"Eliminar" **text** buttons and an "Agregar campo" button that opens a right-side slide modal, `FormularioCampoFormModal`). The row itself also has "Editar" and "Eliminar" **text** buttons (not icons) — "Editar" opens `FormularioFormModal` in place (same page, no navigation), and there is **no "Previsualizar" action at all**.
- **Stray empty route**: [gestion-formularios/formulario/page.tsx](../../src/app/portal/orgs/%5Btenant_id%5D/(administrador)/gestion-formularios/formulario/page.tsx) exists as a 0-byte placeholder file at a **non-dynamic** `formulario/` segment. It is dead code — it doesn't match the `[formulario]` dynamic-route pattern this US requires and isn't linked from anywhere.
- **Field creation UX**: `FormularioCampoFormModal` shows a "Nombre interno" (`campo_nombre`) text input that the admin can see and manually override, alongside "Etiqueta", "Tipo de campo", conditional "Valores permitidos", "Orden", and "Obligatorio". There is no concept of section types (heading/subheading/text block) — every row is treated as a data field.
- **Breadcrumb**: [PortalBreadcrumb.tsx](../../src/components/portal/PortalBreadcrumb.tsx) has a `SLUG_LABELS` map that is missing an entry for `gestion-formularios` (falls back to the raw slug), and it replaces **every** UUID-shaped path segment with the current tenant's name (`UUID_RE.test(part)` → `tenantName`) — this is correct for `/portal/orgs/{tenant_id}/...` but will incorrectly relabel a future `/gestion-formularios/{plantilla_id}` segment as the tenant name instead of the template's name.

### Proposed Changes

This US refactors the module end-to-end around a single new concept: **a template is an ordered list of "secciones"**, each with a `seccion_tipo`:

| `seccion_tipo` | Purpose | Data captured |
|---|---|---|
| `titulo` (Título) | Large heading, purely visual | `seccion_descripcion` only |
| `subtitulo` (Subtítulo) | Smaller heading, purely visual | `seccion_descripcion` only |
| `texto` (Texto) | Instructional/explanatory paragraph, purely visual | `seccion_descripcion` only |
| `datos` (Datos) | An actual question that collects data (today's "campo") | Everything `formulario_plantilla_esquema` already captures (`campo_etiqueta`, `campo_tipo`, `campo_lista_valores`, `campo_obligatorio`, `campo_placeholder`) **except** `campo_nombre`, which is computed automatically and never shown |

#### 1. Data model
Extend `public.formulario_plantilla_esquema` (do not touch the already-applied `20260721161036_formularios_plantillas.sql`; add a new migration) with `seccion_tipo` and `seccion_descripcion`, and relax `campo_etiqueta` / `campo_nombre` / `campo_tipo` to nullable, enforced conditionally via check constraints (see **Database Changes**). `formularios_plantillas` is unchanged.

#### 2. List page (`gestion-formularios/page.tsx` → `FormulariosPage` / `FormulariosTable`)
- Replace the "Editar"/"Eliminar" text buttons with **icon buttons** (`edit`, `delete`, both `material-symbols-outlined`, matching the icon-button style already used in the header's "Nueva plantilla" button and the campos panel's move-up/down controls).
- Add a third icon action, **"Previsualizar"** (`visibility`), which lazily loads that template's full sections (`getPlantillaConSecciones`) and opens a new read-only `FormularioPreviewModal` rendering the sections exactly as an end user will eventually see them (no submit control — filling out a form is still out of scope, per US-0084).
- Remove the inline expand-chevron/`FormularioCamposPanel` row — editing a template's sections now always happens on the dedicated editor page (item 3). The "Campos" column becomes "Secciones" and keeps showing the count.
- "Editar" navigates to `gestion-formularios/{plantilla.id}` (no more in-place modal for editing an existing template).
- "Nueva plantilla" keeps using `FormularioFormModal`, but simplified to **create-only** (asks for `nombre` + optional `descripcion`); on success it closes and immediately navigates (`router.push`) to the new template's editor page so the admin lands straight into the section builder — this is the "more interactive creation" requirement (item 3 of the request).

#### 3. New dedicated editor page — `gestion-formularios/[formulario]/page.tsx`
A server component reading `tenant_id` and `formulario` (the plantilla `id`) from `params`, rendering `<FormularioEditorPage tenantId={tenantId} plantillaId={formulario} />`. Delete the stray `gestion-formularios/formulario/page.tsx` placeholder — this route replaces it.

`FormularioEditorPage`:
- Header: a "← Volver a Formularios" link back to the list, plus **inline-editable** `nombre` (text input), `descripcion` (textarea), and `activo` (toggle) for the template itself — each auto-saves on blur/change via `updatePlantilla` (no separate "save" button for the header).
- A "Vista previa" button opens the same `FormularioPreviewModal` used from the list, using the sections already loaded in page state (no extra fetch).
- Below the header, `FormularioSeccionesBuilder`: the ordered list of `FormularioSeccionCard`s, each collapsible, followed by a button pinned at the bottom of the section list, **"+ Añadir sección de formulario"**.

`FormularioSeccionCard` — the Google-Forms-style building block, two modes:
- **Collapsed (read) mode**: renders per `seccion_tipo` — `titulo` as a large heading, `subtitulo` as a smaller heading, `texto` as a paragraph, `datos` as a disabled preview of the real input control for that `campo_tipo` (text input, textarea, date picker, number input, file/image picker, or select — labeled with `campo_etiqueta` and a required-marker when `campo_obligatorio`). A small toolbar (visible on hover/focus) offers edit (pencil), move up/down (arrows, reusing the existing reorder pattern from `FormularioCamposPanel`), and delete (trash, with inline confirm) icons.
- **Expanded (edit) mode**: opened by clicking the card or its edit icon; a new section added via "+ Añadir sección de formulario" starts directly in this mode. The **first** control is always the `seccion_tipo` selector (Título / Subtítulo / Texto / Datos); the rest of the form re-renders live underneath as the selection changes:
  - `titulo` / `subtitulo` / `texto` → a single required "Descripción" textarea (`seccion_descripcion`).
  - `datos` → `campo_etiqueta` (required), `campo_tipo` (required select, existing 6 options), `campo_lista_valores` (conditional textarea, required only when `campo_tipo = 'lista'`), `campo_placeholder` (optional), `campo_obligatorio` (checkbox). **`campo_nombre` is never rendered** — it is computed automatically (see below) and is not part of this form.
  - A "Listo" (check icon) control collapses the card back to read mode **and persists the change** (`createSeccion` if this card hadn't been saved yet, `updateSeccion` otherwise) — this is the "on close, save" requirement. If validation fails (empty required descripción, missing `campo_etiqueta`/`campo_tipo`, or an empty `campo_lista_valores` when required), the card stays expanded and shows an inline error instead of collapsing.
  - A newly added, never-collapsed card that gets deleted or whose containing page is left is simply discarded (nothing is written until the first successful collapse).

#### 4. `campo_nombre` becomes fully automatic
For `seccion_tipo = 'datos'` sections, `campo_nombre` is computed client-side by slugifying `campo_etiqueta` (lowercase, accents/diacritics stripped, non-alphanumeric → `_`, collapsed repeats, leading digits prefixed) at save time, with a numeric suffix (`_2`, `_3`, …) appended if that slug already exists among the template's current sections. The DB's `unique (formulario_plantilla_id, campo_nombre)` constraint and `check (campo_nombre ~ '^[a-z][a-z0-9_]*$')` remain the source of truth: if a `23505` still slips through (race with another admin editing concurrently), the service retries once with an incremented suffix before surfacing a friendly error.

#### 5. Breadcrumb fix
`PortalBreadcrumb.tsx`'s `SLUG_LABELS` gets a `'gestion-formularios': 'Formularios'` entry. Its UUID-segment handling is extended so that only the **first** UUID segment in the path (the tenant id, immediately after `orgs`) is labeled with `tenantName`; any later UUID segment (the plantilla id under `gestion-formularios/{id}`) is labeled using that template's `nombre`, fetched via a new lightweight hook `useFormularioPlantillaName(plantillaId)` (mirrors the existing `useTenantName` hook), falling back to `'…'` while loading.

#### Out of Scope (unchanged from US-0084)
- Any screen where an athlete/coach fills out a form generated from a template (the preview modal is read-only/disabled controls, not a working form).
- Attaching a template to `entrenamientos` / `entrenamientos_grupo`.
- Storing submitted answers.

---

## Database Changes

New migration file: `supabase/migrations/{timestamp}_formulario_esquema_secciones.sql`

```sql
-- =============================================
-- Migration: Form Template Sections (seccion_tipo)
-- US-0085: Interactive Google-Forms-style Form Builder
-- =============================================

-- 1. New columns
alter table public.formulario_plantilla_esquema
  add column if not exists seccion_tipo varchar(20) not null default 'datos',
  add column if not exists seccion_descripcion text;

-- 2. Relax the columns that only make sense for seccion_tipo = 'datos'
alter table public.formulario_plantilla_esquema
  alter column campo_etiqueta drop not null,
  alter column campo_nombre drop not null,
  alter column campo_tipo drop not null;

-- 3. Constrain seccion_tipo to the known set
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_tipo_ck
    check (seccion_tipo in ('titulo', 'subtitulo', 'texto', 'datos'));

-- 4. Display-only sections require seccion_descripcion; 'datos' sections don't use it
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_descripcion_ck
    check (
      (seccion_tipo in ('titulo', 'subtitulo', 'texto')
        and seccion_descripcion is not null
        and length(trim(seccion_descripcion)) > 0)
      or (seccion_tipo = 'datos' and seccion_descripcion is null)
    );

-- 5. 'datos' sections require the field-definition columns; display-only sections must leave them null
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_datos_campos_ck
    check (
      (seccion_tipo = 'datos'
        and campo_etiqueta is not null
        and campo_nombre is not null
        and campo_tipo is not null)
      or (seccion_tipo <> 'datos'
        and campo_etiqueta is null
        and campo_nombre is null
        and campo_tipo is null
        and campo_lista_valores is null)
    );
```

**Notes**:
- No backfill `update` is needed: `add column ... not null default 'datos'` back-fills every pre-existing row to `'datos'`, and those rows already satisfy `formulario_plantilla_esquema_datos_campos_ck` because they already have non-null `campo_etiqueta`/`campo_nombre`/`campo_tipo` (they were created under the old, `datos`-only model).
- The pre-existing `formulario_plantilla_esquema_campo_nombre_format_ck` and `formulario_plantilla_esquema_lista_valores_ck` constraints from `20260721161036_formularios_plantillas.sql` are left untouched — a `NULL` `campo_nombre`/`campo_tipo` trivially satisfies them (Postgres treats a `NULL` check expression as passing), so display-only sections are unaffected.
- The existing `unique (formulario_plantilla_id, campo_nombre)` constraint is untouched — Postgres treats each `NULL` as distinct, so multiple `titulo`/`subtitulo`/`texto` rows (all with `campo_nombre = null`) coexist without violating it.
- RLS policies, grants, and triggers from the original migration apply unchanged (they operate at row level, not per-column) — no RLS changes needed in this migration.

---

## API / Server Actions

**File**: `src/services/supabase/portal/formularios.service.ts` (existing file, extended/renamed)

| Function | Params | Returns | Notes |
|---|---|---|---|
| `getPlantillasByTenant` | `tenantId: string` | `FormularioPlantillaListItem[]` | Unchanged; `camposCount` becomes `seccionesCount` in the returned shape |
| `getPlantillaConSecciones` *(renamed from `getPlantillaConCampos`)* | `plantillaId: string` | `FormularioPlantillaConSecciones` | Plantilla + its `secciones` ordered by `orden` |
| `createPlantilla` | `input: CreatePlantillaInput` | `FormularioPlantilla` | Unchanged |
| `updatePlantilla` | `id: string, input: UpdatePlantillaInput` | `FormularioPlantilla` | Unchanged; now also called from the editor page header auto-save |
| `deletePlantilla` | `id: string` | `void` | Unchanged; still cascades to `formulario_plantilla_esquema` |
| `getSeccionesByPlantilla` *(renamed from `getCamposByPlantilla`)* | `plantillaId: string` | `FormularioSeccion[]` | Ordered by `orden` |
| `createSeccion` *(renamed from `createCampo`)* | `input: CreateSeccionInput` | `FormularioSeccion` | `input` now carries `seccion_tipo` + `seccion_descripcion`; `campo_etiqueta`/`campo_nombre`/`campo_tipo`/`campo_lista_valores`/`campo_placeholder` become optional, required only when `seccion_tipo === 'datos'`. `campo_nombre` is computed by the caller (hook layer, see below) before this function is invoked — the service does not slugify |
| `updateSeccion` *(renamed from `updateCampo`)* | `id: string, input: UpdateSeccionInput` | `FormularioSeccion` | Same conditional-field handling as `createSeccion` |
| `deleteSeccion` *(renamed from `deleteCampo`)* | `id: string` | `void` | Unchanged behavior |
| `reorderSecciones` *(renamed from `reorderCampos`)* | `plantillaId: string, orderedIds: string[]` | `void` | Unchanged behavior |

Auth / RLS: unchanged from US-0084 — reads open to any authenticated user, writes rejected by RLS unless the caller is an admin of the template's tenant.

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Migration | `supabase/migrations/{timestamp}_formulario_esquema_secciones.sql` | New — `seccion_tipo`, `seccion_descripcion`, relaxed nullability, new check constraints (see SQL above) |
| Types | `src/types/portal/formularios.types.ts` | Add `FormularioSeccionTipo` union + `FORMULARIO_SECCION_TIPOS` + `FORMULARIO_SECCION_TIPO_LABELS`; rename `FormularioCampo` → `FormularioSeccion` (add `seccion_tipo`, `seccion_descripcion`); rename `FormularioPlantillaConCampos` → `FormularioPlantillaConSecciones` (`campos` → `secciones`); rename `FormularioPlantillaListItem.camposCount` → `seccionesCount`; rename `CreateCampoInput`/`UpdateCampoInput` → `CreateSeccionInput`/`UpdateSeccionInput` with the new optional/conditional fields; rename `FormularioCampoFormValues`/`FormularioCampoFormField`/`FormularioCampoFieldErrors` → `FormularioSeccionFormValues`/`FormularioSeccionFormField`/`FormularioSeccionFieldErrors` (drop `campo_nombre` from the form-values shape entirely) |
| Service | `src/services/supabase/portal/formularios.service.ts` | Rename functions per API table above; update `mapFormularioError` if new constraint names need friendly messages (e.g. map `formulario_plantilla_esquema_seccion_descripcion_ck` / `_datos_campos_ck` `23514` violations to a generic "Completa los datos requeridos para esta sección." fallback) |
| Util | `src/lib/slugify.ts` | New — `slugify(value: string): string` (lowercase, strip diacritics, non-alphanumeric → `_`, collapse repeats, trim leading digits/underscores) shared by the section-name auto-computation |
| Hook | `src/hooks/portal/formularios/useFormularios.ts` | Simplify: drop `editingPlantilla`/edit-modal branch (list "Editar" now navigates instead); keep create + delete flows; `openCreateModal`/`closeModal` remain for the create-only modal |
| Hook | `src/hooks/portal/formularios/useFormularioEditor.ts` | New — replaces `useFormularioEsquema.ts`; loads `getPlantillaConSecciones(plantillaId)` once, exposes plantilla header fields with auto-save (`updatePlantilla`), and `secciones` + `addSeccion`/`updateSeccionAt`/`deleteSeccion`/`reorderSecciones`, each computing `campo_nombre` via `slugify` for `datos` sections before calling the service |
| Hook | `src/hooks/portal/formularios/useFormularioSeccionForm.ts` | New — replaces `useFormularioCampoForm.ts`; controlled state for one section card's edit mode; validation branches by `seccion_tipo`; no `campo_nombre` field |
| Hook | `src/hooks/portal/formularios/useFormularioPlantillaName.ts` | New — mirrors `useTenantName`; fetches a plantilla's `nombre` by id for the breadcrumb |
| Component | `src/components/portal/formularios/FormulariosTable.tsx` | Replace text Editar/Eliminar with icon buttons (`edit`/`delete`); add icon "Previsualizar" (`visibility`); remove expand-chevron column and inline `FormularioCamposPanel` usage; "Editar" navigates via `next/navigation` `useRouter().push` to `gestion-formularios/{id}`; "Campos" column header → "Secciones" |
| Component | `src/components/portal/formularios/FormulariosPage.tsx` | After successful create in `FormularioFormModal`, `router.push` to the new plantilla's editor page instead of just closing the modal; wire the new "Previsualizar" icon to `FormularioPreviewModal` (lazy-loads via `getPlantillaConSecciones`) |
| Component | `src/components/portal/formularios/FormularioFormModal.tsx` | Simplify to create-only (`nombre` + `descripcion`); drop `mode`/`editingPlantilla`/`activo` props |
| Component | `src/components/portal/formularios/FormularioEditorPage.tsx` | New — dedicated editor: header (inline-editable nombre/descripcion/activo, auto-save), "Vista previa" button, back link, renders `FormularioSeccionesBuilder` |
| Component | `src/components/portal/formularios/FormularioSeccionesBuilder.tsx` | New — ordered list of `FormularioSeccionCard` + pinned "+ Añadir sección de formulario" button |
| Component | `src/components/portal/formularios/FormularioSeccionCard.tsx` | New — collapsed/expanded section card described above; replaces `FormularioCamposPanel.tsx` + `FormularioCampoFormModal.tsx` (both deleted) |
| Component | `src/components/portal/formularios/FormularioPreviewModal.tsx` | New — read-only render of all `secciones` in order (headings/text as static content, `datos` as disabled input previews), reachable from the list and from the editor page |
| Component | `src/components/portal/formularios/FormularioTipoCampoBadge.tsx` | Unchanged — still badges `campo_tipo` for `datos` sections, reused inside `FormularioSeccionCard` |
| Component | `src/components/portal/formularios/FormularioCamposPanel.tsx` | **Delete** — superseded by `FormularioEditorPage` + `FormularioSeccionesBuilder` |
| Component | `src/components/portal/formularios/FormularioCampoFormModal.tsx` | **Delete** — superseded by `FormularioSeccionCard`'s inline edit mode |
| Component | `src/components/portal/formularios/index.ts` | Update barrel exports for the additions/removals above |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/[formulario]/page.tsx` | New — `export default async function` reading `tenant_id` and `formulario` from `params`, rendering `<FormularioEditorPage tenantId={tenantId} plantillaId={formulario} />` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/formulario/page.tsx` | **Delete** — stray empty placeholder superseded by the `[formulario]` dynamic route above |
| Breadcrumb | `src/components/portal/PortalBreadcrumb.tsx` | Add `'gestion-formularios': 'Formularios'` to `SLUG_LABELS`; only label the **first** UUID path segment with `tenantName`, label any subsequent UUID segment with the plantilla's `nombre` via `useFormularioPlantillaName` |

---

## Acceptance Criteria

1. The templates list (`/portal/orgs/{tenant_id}/gestion-formularios`) shows three icon actions per row — "Previsualizar" (`visibility`), "Editar" (`edit`), "Eliminar" (`delete`) — with accessible `aria-label`s including the template name; no text-labeled Editar/Eliminar buttons remain.
2. Clicking "Previsualizar" opens a read-only modal rendering that template's sections in order (headings/text as static content, data questions as disabled input previews matching their `campo_tipo`), without navigating away from the list and without any way to submit/save answers.
3. Clicking "Editar" navigates to `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}` (the new dynamic route) instead of opening an in-place modal.
4. Clicking "Nueva plantilla" opens a create-only modal asking for `nombre` (required) and `descripcion` (optional); on success, the admin is redirected straight to that new template's editor page with zero sections and the "+ Añadir sección de formulario" button visible.
5. On the editor page, the template's `nombre`, `descripcion`, and `activo` are editable inline in the header and persist automatically (no explicit "save" click) via `updatePlantilla`.
6. Clicking "+ Añadir sección de formulario" appends a new section card in expanded/edit mode at the end of the list, with the `seccion_tipo` selector defaulted to the first option and the type-specific sub-fields already rendered underneath.
7. Changing the `seccion_tipo` selector while a card is expanded immediately swaps the rendered sub-fields (no page reload, no data loss of already-typed values for fields that remain relevant).
8. For `seccion_tipo` of Título, Subtítulo, or Texto, the expanded card shows exactly one required field, "Descripción" (`seccion_descripcion`); submitting it empty keeps the card expanded and shows an inline error.
9. For `seccion_tipo` = Datos, the expanded card shows `campo_etiqueta` (required), `campo_tipo` (required select of the 6 existing types), `campo_lista_valores` (only shown and required when `campo_tipo = 'lista'`), `campo_placeholder` (optional), and `campo_obligatorio` (checkbox) — and **never** shows a "Nombre interno" / `campo_nombre` field anywhere in the UI.
10. Collapsing a section (via its "Listo"/check control) that passes validation persists it immediately: a never-before-saved card calls `createSeccion`/inserts a new row; a previously-saved card calls `updateSeccion` on its existing row. No separate top-level "Guardar" button is required to persist section changes.
11. For a newly-added `datos` section, `campo_nombre` is computed automatically by slugifying `campo_etiqueta` at the moment of the first successful collapse (lowercase, accents stripped, non-alphanumerics → `_`); if the resulting slug collides with another section already in the same template, a numeric suffix (`_2`, `_3`, …) is appended until it's unique, without any visible field or admin interaction.
12. Reordering sections via move-up/move-down icons on a collapsed card persists the new `orden` values immediately (same behavior as the current campos panel) and survives a page reload.
13. Deleting a section (via its trash icon, with inline confirm) removes only that row and updates the visible list; deleting a template still cascades and removes all of its sections.
14. Discarding a newly-added, never-collapsed section card (deleting it, or navigating away before its first successful collapse) results in no database write for that card.
15. The migration `{timestamp}_formulario_esquema_secciones.sql` applies cleanly on top of `20260721161036_formularios_plantillas.sql` (verified via a local `supabase db reset` or equivalent); every pre-existing `formulario_plantilla_esquema` row ends up with `seccion_tipo = 'datos'` and continues to satisfy all constraints, old and new.
16. Attempting to insert a `titulo`/`subtitulo`/`texto` row with a non-null `campo_etiqueta`/`campo_nombre`/`campo_tipo`, or with a null/blank `seccion_descripcion`, is rejected by the new check constraints; attempting to insert a `datos` row with a null `campo_etiqueta`/`campo_nombre`/`campo_tipo` is likewise rejected.
17. The breadcrumb on `/portal/orgs/{tenant_id}/gestion-formularios` reads "… › Formularios" (not the raw slug); the breadcrumb on `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}` shows the tenant's name for the org segment and the **template's own `nombre`** for the trailing segment (not the tenant's name repeated).
18. A non-admin (usuario/entrenador) navigating directly to either `gestion-formularios` or `gestion-formularios/{plantilla_id}` is redirected by the existing `(administrador)/layout.tsx` guard.
19. All create/update/delete attempts on sections or templates by a non-admin still fail at the RLS layer (unchanged policies) and surface as a friendly message, not a raw error.
20. The stray file `gestion-formularios/formulario/page.tsx` no longer exists in the repository after this change.
21. No existing menu item, route, or admin page regresses — verified by loading `gestion-servicios`, `gestion-disciplinas`, and `gestion-escenarios` after the change.

---

## Implementation Steps

- [ ] Write and apply the new migration (`seccion_tipo`, `seccion_descripcion`, relaxed nullability, new check constraints); run `supabase db reset` (or equivalent local workflow) to verify it applies cleanly on top of `20260721161036_formularios_plantillas.sql` and that pre-existing rows remain valid
- [ ] Add `src/lib/slugify.ts` with a small unit-testable `slugify()` helper
- [ ] Update `src/types/portal/formularios.types.ts`: add `FormularioSeccionTipo` + labels, rename types per the Files table
- [ ] Update `src/services/supabase/portal/formularios.service.ts`: rename functions, extend `create/updateSeccion` for conditional fields, extend `mapFormularioError`
- [ ] Simplify `useFormularios.ts` (drop edit-modal branch); add `useFormularioEditor.ts`, `useFormularioSeccionForm.ts`, `useFormularioPlantillaName.ts`; delete `useFormularioEsquema.ts` and `useFormularioCampoForm.ts`
- [ ] Update `FormulariosTable.tsx` (icon actions, remove inline panel, navigate on edit) and `FormulariosPage.tsx` (redirect-after-create, wire preview modal)
- [ ] Simplify `FormularioFormModal.tsx` to create-only
- [ ] Build `FormularioEditorPage.tsx`, `FormularioSeccionesBuilder.tsx`, `FormularioSeccionCard.tsx`, `FormularioPreviewModal.tsx`; delete `FormularioCamposPanel.tsx` and `FormularioCampoFormModal.tsx`; update the barrel `index.ts`
- [ ] Add `gestion-formularios/[formulario]/page.tsx`; delete the stray `gestion-formularios/formulario/page.tsx`
- [ ] Update `PortalBreadcrumb.tsx` (`SLUG_LABELS` entry + first-UUID-only tenant-name rule + plantilla-name lookup for later UUID segments)
- [ ] Test manually: create a template → redirected into an empty editor; add one of each section type; collapse-to-save each; verify live preview via "Vista previa" and from the list's "Previsualizar"; reorder and delete sections; verify `campo_nombre` collision suffixing by giving two `datos` sections the same label; verify breadcrumb on both routes; verify non-admin redirect and RLS-denied writes
- [ ] Confirm no regressions in sibling admin pages (`gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`)

---

## Non-Functional Requirements

- **Security**: All writes still enforced server-side via the unchanged RLS policies (admin-only per tenant). New check constraints (`seccion_tipo`, `seccion_descripcion`, `datos_campos`) enforce data integrity at the DB level regardless of client-side validation bugs. Both routes remain behind the `(administrador)` layout guard.
- **Performance**: No new indexes needed — same `formulario_plantilla_id` index already covers the editor page's single per-template query (`getPlantillaConSecciones`). Auto-save on header fields should debounce (e.g. on blur, not on every keystroke) to avoid excessive `updatePlantilla` calls.
- **Accessibility**: Icon-only actions (Previsualizar/Editar/Eliminar, section toolbar icons) all carry descriptive `aria-label`s. The section card's expand/collapse must be operable via keyboard (Enter/Space on the edit icon, Escape does not discard unsaved-but-valid input — only an explicit delete does). The `seccion_tipo` selector change must be announced/reachable via keyboard the same way `campo_tipo` already is in the current `FormularioCampoFormModal`.
- **Error handling**: Inline, field-level validation errors within each section card (mirroring the current modal's pattern) plus the existing `FormularioServiceError` mapping, extended for the new check-constraint violation (`23514`) case with a friendly fallback message.
