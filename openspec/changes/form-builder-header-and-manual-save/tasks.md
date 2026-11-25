## 1. Setup

- [x] 1.1 Create a new branch `feat/form-builder-header-and-manual-save` from the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/{timestamp}_formulario_plantilla_header_y_campos_avanzados.sql` widening `formulario_plantilla_esquema_seccion_tipo_ck` to add `encabezado_sobretitulo`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_badges`, `seccion`, `separador`
- [x] 2.2 In the same migration, widen `formulario_plantilla_esquema_campo_tipo_ck` to add `checkbox`, `seleccion`
- [x] 2.3 Widen `formulario_plantilla_esquema_lista_valores_ck` so `campo_lista_valores` is required for both `lista` and `seleccion`
- [x] 2.4 Add column `columna_ancho varchar(10) not null default 'completo'` + CHECK (`completo`/`mitad`, only `mitad` when `seccion_tipo = 'datos'`)
- [x] 2.5 Add nullable column `seccion_subtitulo text`
- [x] 2.6 Update `formulario_plantilla_esquema_seccion_descripcion_ck` to require non-empty text for `titulo`, `subtitulo`, `texto`, `seccion`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_sobretitulo`; allow null for `datos`, `separador`, `encabezado_badges`
- [x] 2.7 Update `formulario_plantilla_esquema_datos_campos_ck` so `encabezado_badges` is allowed to use `campo_lista_valores` while keeping `campo_etiqueta`/`campo_nombre`/`campo_tipo` null, and every other non-`datos` type keeps all four columns null
- [x] 2.8 Add `formulario_plantilla_esquema_badges_ck` capping `encabezado_badges`' `campo_lista_valores` to at most 5 comma-separated items
- [x] 2.9 Apply the migration to the **local** Supabase instance only (never push to the remote/hosted project as part of this change) and verify it applies cleanly against the current local schema
- [x] 2.10 Manually verify existing (pre-migration) template rows still satisfy every updated constraint (no backfill required for existing data to keep working)

## 3. Types

- [x] 3.1 Extend `FormularioSeccionTipo` / `FORMULARIO_SECCION_TIPOS` / `FORMULARIO_SECCION_TIPO_LABELS` in `src/types/portal/formularios.types.ts` with the 6 new values; add a `HEADER_SECCION_TIPOS` constant listing the 4 fixed header types (excluded from the manual "Tipo de sección" picker)
- [x] 3.2 Extend `FormularioTipoCampo` / `FORMULARIO_TIPOS_CAMPO` / `FORMULARIO_TIPO_CAMPO_LABELS` with `checkbox` and `seleccion`
- [x] 3.3 Add `columna_ancho: 'completo' | 'mitad'` and `seccion_subtitulo: string | null` to `FormularioSeccion`, `CreateSeccionInput`, `UpdateSeccionInput`, `FormularioSeccionFormValues`
- [x] 3.4 Add types needed for the draft-based editor state (`FormularioPlantillaDraft`, or equivalent) if not naturally covered by existing types

## 4. Service Layer

- [x] 4.1 Update `formulariosService.createPlantilla` (`src/services/supabase/portal/formularios.service.ts`) to insert the 4 default header rows (`orden` 0–3) immediately after creating the `formularios_plantillas` row; ensure a failure on the header insert does not roll back the already-created plantilla row (surface a non-blocking warning instead)
- [x] 4.2 Add `formulariosService.saveEsquemaBatch(plantillaId, { toCreate, toUpdate, toDeleteIds, orderedIds })` implementing the sequenced create → update → delete → reorder persistence described in design.md
- [x] 4.3 Decide and implement the pre-existing-templates header backfill approach — **decision: lazy-on-save**. `useFormularioEditor.load()` detects a template with no `encabezado_*` rows and seeds them as local (unsaved) draft rows via the shared `defaultHeaderSecciones()` helper; they persist to the DB the next time the admin clicks "Guardar cambios" via the normal `saveEsquemaBatch` create path. No one-time data migration was needed.

## 5. Hooks

- [x] 5.1 Add `useTenantLogo(tenantId)` hook (`src/hooks/portal/tenant/useTenantLogo.ts`), mirroring `useTenantName`'s lightweight pattern, selecting `nombre, logo_url` from `tenants`
- [x] 5.2 Rewrite `useFormularioEditor` (`src/hooks/portal/formularios/useFormularioEditor.ts`) around a draft model: `plantillaDraft`, `seccionesDraft`, `deletedPersistedIds`, `isDirty`, `saving`, `saveError`, `saveAll()`; remove all per-change Supabase calls from `updatePlantillaField`/`addSeccion`/`saveSeccion`/`deleteSeccion`/`reorderSecciones`
- [x] 5.3 Add support for inserting a draft row at an arbitrary position in `addSeccion` (optional insert-position argument), shifting subsequent rows' local order
- [x] 5.4 `computeCampoNombre` stays a pure local computation run at local-commit time (when a section card's "Listo" is clicked), now checked against the full in-memory draft array (including not-yet-persisted rows) instead of only persisted ones — superseding the original plan to defer it to `saveAll()`, since the network-race retry logic it used to need no longer applies once there is only one save operation. Documented here as a deliberate deviation from `design.md`'s wording.
- [x] 5.5 Update `useFormularioSeccionForm` (`src/hooks/portal/formularios/useFormularioSeccionForm.ts`) validation: `seleccion` requires `campo_lista_valores` (same rule as `lista`); `seccion` requires a non-empty título (`seccion_descripcion`); add `columna_ancho`/`seccion_subtitulo` to form state

## 6. Components — Header

- [x] 6.1 Build `FormularioBadgeChipInput` (`src/components/portal/formularios/FormularioBadgeChipInput.tsx`) — add/remove chip editor, capped at 5, with inline feedback when the cap is reached
- [x] 6.2 Build `FormularioHeaderEditor` (`src/components/portal/formularios/FormularioHeaderEditor.tsx`) — renders tenant logo/name (via `useTenantLogo`) + inline-editable eyebrow/título/accent-divider/subtítulo + `FormularioBadgeChipInput`, styled per the `P43Yo` Hero block; supports a read-only mode for reuse in `FormularioPreviewModal`
- [x] 6.3 Ensure header text edits and badge add/remove write only to the local draft (no network calls) — wired through `useFormularioEditor.updateHeaderSeccion`, a pure local-state mutator

## 7. Components — Section Builder (Admin Side)

- [x] 7.1 Update `FormularioSeccionContent` (`src/components/portal/formularios/FormularioSeccionContent.tsx`) to add a `separador` → `<hr>` branch
- [x] 7.2 Update `FormularioCampoPreviewInput` (`src/components/portal/formularios/FormularioCampoPreviewInput.tsx`) to add disabled previews for `checkbox` (checkbox + label) and `seleccion` (tile/button group)
- [x] 7.3 Update `FormularioTipoCampoBadge` (`src/components/portal/formularios/FormularioTipoCampoBadge.tsx`) with label/icon mapping for `checkbox` and `seleccion`
- [x] 7.4 Update `FormularioSeccionCard` (`src/components/portal/formularios/FormularioSeccionCard.tsx`): "Tipo de sección" dropdown uses `FORMULARIO_SECCION_TIPOS` minus `HEADER_SECCION_TIPOS`; add `columna_ancho` toggle (datos only); add `seccion_subtitulo` input (seccion only); `seleccion` reuses the existing `campo_lista_valores` textarea shown for `lista`; remove server-side "Guardando..." state (the "Listo" button is now a synchronous local commit)
- [x] 7.5 Update `FormularioSeccionesBuilder` (`src/components/portal/formularios/FormularioSeccionesBuilder.tsx`): group rows into `seccion` cards by scanning schema order (positional grouping, no parent FK); render two-column (`mitad`) pairs side by side; add hover "+" insert-here affordances between rows (and above the first row); wire `onSaveSeccion`/`onDeleteSeccion`/`onReorder` to the now-synchronous local-draft mutators from `useFormularioEditor`. Grouping/pairing logic extracted to shared `src/lib/portal/formulario-secciones-grouping.ts`, reused by the preview and (task 8.2) the live booking form.
- [x] 7.6 Update `FormularioPreviewModal` (`src/components/portal/formularios/FormularioPreviewModal.tsx`) to mount `FormularioHeaderEditor` in read-only mode above the sections, applying the same card-grouping/column-pairing/divider rendering as the builder (via the new shared `FormularioSeccionesGrouped` component). Required a new `tenantId` prop — updated all 5 call sites (`FormulariosPage`, `FormularioEditorPage`, `PublicTrainingCard`, `ReservasPanel`, `EntrenamientoDetalleModal` — the last needed a new `tenantId` prop threaded from `EntrenamientosPage`).
- [x] 7.7 Update `FormularioEditorPage` (`src/components/portal/formularios/FormularioEditorPage.tsx`): mount `FormularioHeaderEditor` at the top; switch nombre/descripción/activo/perfil-checkbox inputs to write to the draft instead of firing `updatePlantillaField` on blur/change; add a sticky "Guardar cambios" button (disabled while `!isDirty` or saving) + "Cambios sin guardar" indicator wired to `saveAll()`; add a `beforeunload` listener guarding unsaved changes

## 8. Components — Live Booking Side

- [x] 8.1 Update the per-`campo_tipo` field renderer used by `FormularioRespuestaModal` (`src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx`) to add a live `checkbox` input (writes `"true"`/`"false"`) and a `seleccion` tile-button group (writes the selected option string). Also fixed `useFormularioRespuestaForm` to filter out the 4 header rows (they were about to leak into the fill-out list) and to correctly flag a required-but-unchecked checkbox (`"false"`) as missing, since the generic non-empty-string check would have accepted it.
- [x] 8.2 Update the same fill-out rendering path to apply `seccion` card grouping, `separador` dividers, and `columna_ancho` two-column pairing consistent with the builder/preview, reusing the shared `buildFormularioRenderPlan` from `src/lib/portal/formulario-secciones-grouping.ts`
- [x] 8.3 Update `FormularioRespuestaViewerModal` (`src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx`) to render checkbox answers as "Sí"/"No" and `seleccion` answers as plain text
- [x] 8.4 Update the "Descargar Respuestas Formulario" Excel export formatting (`ReservasPanel.handleExportFormularioRespuestas`) to apply the same checkbox/`seleccion` formatting

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` entries for every new/modified file in this change (new components/hooks, updated service/hook descriptions)

## 10. Verification & Handoff

- [x] 10.1 Manual test (real browser, Playwright against the local dev server + local Supabase): created a template, confirmed the default header + 4 seeded rows via direct DB query; edited header título/subtítulo/badges, toggled "Plantilla activa" twice, added a `seccion` card, a `checkbox` field, a `seleccion` field, and two `mitad`-width fields — confirmed via network-request interception that **zero** requests to `formularios_plantillas`/`formulario_plantilla_esquema` fired during any of this editing. **Found and fixed a real bug in the process**: `seccion_tipo` was left at its original `varchar(20)` width, which is too short for `encabezado_sobretitulo` (22 chars) — every template creation was silently failing to seed its header. Migration now widens the column to `varchar(30)` before adding the new constraint values. Mid-list insertion and the checkbox-required-if-invalid-card-stays-open behavior were also exercised.
- [x] 10.2 Manual test: clicked "Guardar cambios" — confirmed via network interception it fires exactly the expected batched calls (PATCH plantilla + POST new sections), confirmed via direct DB query that `checkbox`/`seleccion`/`columna_ancho: 'mitad'` rows persisted with the exact values entered, confirmed the "Cambios sin guardar" indicator clears and the button disables after a successful save, and confirmed on page reload everything renders identically (header, tile-based Selección, side-by-side Mitad fields).
- [ ] 10.3 **Not interactively tested** (would require simulating a mid-save network failure in the browser). Verified by code review: `saveAll()`'s catch block only sets `saveError` and never clears `secciones`/`plantillaDraft`/`unsavedIds`/`deletedPersistedIds`, so the draft is preserved on failure.
- [ ] 10.4 **Not interactively tested** (native `beforeunload` browser dialogs are not reliably scriptable via Playwright automation). Verified by code review: the listener is registered whenever `isDirty` and calls `e.preventDefault()` / sets `e.returnValue`, matching the standard pattern.
- [ ] 10.5 **Not interactively tested** — would require creating a training (entrenamiento) attached to this template and going through the full booking flow, which needs additional seed data (discipline, scenario) beyond this session's scope. Verified by code review: `FormularioRespuestaModal`'s checkbox/seleccion inputs and `useFormularioRespuestaForm.validate()`'s checkbox-specific required check (added this session) were traced through carefully; the checkbox/seleccion visual rendering was confirmed correct in the builder/preview (same shared code path).
- [ ] 10.6 **Not interactively tested** — depends on 10.5's booking flow existing first. Code review only (see task 8.3/8.4 notes).
- [x] 10.7 Manual test: opened a pre-existing seeded template ("SWIMFEST - AGUAS ABIERTAS", 18 legacy rows using only `titulo`/`subtitulo`/`texto`/`datos`, no header) as the same admin session — confirmed the lazy header backfill renders a Hero header immediately (with "Cambios sin guardar" active), saved, and confirmed via DB query that all 18 original rows remained byte-for-byte intact at `orden` 4–21 with the 4 new header rows correctly prepended at `orden` 0–3.
- [x] 10.8 `npx tsc --noEmit` — 0 errors, whole repo. `eslint` on every file touched this change — 0 new errors (one pre-existing `react-hooks/set-state-in-effect` pattern in the new `useTenantLogo.ts` mirrors the identical, already-present pattern in `useTenantName.ts` — left as-is, consistent with the established convention, not a regression). No test suite exists in this repository (no `test` script in `package.json`, no `*.test.*`/`*.spec.*` files) — nothing to run.
- [ ] 10.9 Commit message and PR description drafted and handed to the user — not committed (commits are only made when the user explicitly asks).
