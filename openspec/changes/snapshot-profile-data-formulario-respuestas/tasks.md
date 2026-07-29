## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/snapshot-profile-data-formulario-respuestas` from the current branch
- [x] 1.2 Validate the current working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Check whether the US-0095 migration (`..._formulario_plantilla_perfil_requerido.sql`) is already merged/applied; decide whether to fold this change into that file or create a new migration layered on top, per design.md Decision #4 — **US-0095 is already merged into `develop`** (commit `f688233`), so this change creates a new migration file layered on top
- [x] 2.2 Add `formulario_respuestas.perfil_snapshot jsonb not null default '{}'::jsonb`
- [x] 2.3 Redefine `book_and_deduct_service_units` to build `v_perfil_snapshot` from the already-fetched `v_usuario`/`v_deportivo` records immediately after the existing profile-completeness check succeeds, and pass it into the existing `insert into formulario_respuestas (...)` statement — re-read the CURRENT migration content first; do not paste design.md's SQL without verifying it matches — new file: `supabase/migrations/20260729184000_formulario_respuestas_perfil_snapshot.sql`
- [x] 2.4 Apply the migration to the LOCAL Supabase instance only (`supabase db reset` or equivalent) — do NOT push to the remote/hosted project
- [x] 2.5 Verify the migration applies cleanly with no conflicts
- [x] 2.6 Manually exercise the RPC locally to confirm: a booking with requested profile fields (telefono+rh) produces `{"telefono": "3134523559", "rh": "A+"}`; a booking with none produces `'{}'`; editing the athlete's profile afterward does NOT retroactively change the already-persisted row's `perfil_snapshot`

## 3. Types

- [x] 3.1 Add `perfil_snapshot: Partial<Record<FormularioPerfilCampo, string>>` to `FormularioRespuesta` in `src/types/portal/formularios.types.ts`

## 4. Services

- [x] 4.1 Add `perfil_snapshot` to the explicit select column list in `getRespuestasByEntrenamiento` (`src/services/supabase/portal/formularios.service.ts`)
- [x] 4.2 Add `perfil_snapshot` to that function's mapped return object
- [x] 4.3 Confirm `getRespuestaById` needs no changes (already `select('*')`)

## 5. Components

- [x] 5.1 Add an optional `perfilCampos: { key: string; label: string; value: string }[]` prop to `FormularioRespuestaViewerModal.tsx`, rendered as a "Datos de perfil" section above the existing "Datos" answers list; render nothing when the array is empty
- [x] 5.2 In `ReservasPanel.tsx`'s `handleOpenRespuestaViewer`, build this list from the fetched response's `perfil_snapshot`, resolving each key's label via `FORMULARIO_PERFIL_CAMPOS`, in catalog order
- [x] 5.3 In `ReservasPanel.tsx`'s `handleExportFormularioRespuestas`, compute the union of `perfil_snapshot` keys across all fetched responses (mirroring the existing `campos_snapshot` union logic), map to catalog labels, and insert as Excel columns after the fixed identity columns (`Atleta`, `Apellido`, `Email`, `Fecha de respuesta`) and before the dynamic "Datos" columns
- [x] 5.4 Ensure a response missing a given profile key renders a blank export cell, not an error

## 6. Verification

- [x] 6.1 Manually verify: book a training with a template requesting profile fields → "Ver respuesta" shows the "Datos de perfil" section with correct labels/values — **live-browser-verified** (Playwright): booked Paula (telefono+RH requested) against training "Serie de entrenamiento" (23/03/2026), admin opened "Ver reservas" → "Ver respuesta" → saw "Datos de perfil" section with "Teléfono: 3134523559" and "RH: A+"
- [x] 6.2 Manually verify: after that booking, edit the athlete's profile → re-open "Ver respuesta" for the SAME historical booking → values shown are unchanged (still the original, pre-edit values) — **live-verified**: updated Paula's `telefono` to `9999999999` in DB, re-opened the same "Ver respuesta" modal, still showed the original `3134523559` (confirmed both via DB query and the rendered UI text)
- [x] 6.3 Manually verify: "Descargar Respuestas Formulario" for that training includes the profile columns in the correct position, with correct values — **live-verified**: downloaded the real .xlsx via Playwright, parsed with `exceljs` — header row exactly `Atleta, Apellido, Email, Fecha de respuesta, Teléfono, RH` with correct data row
- [x] 6.4 Manually verify: a training whose template requests no profile fields shows no regression in either the viewer or the export (no extra section, no extra columns) — verified via direct RPC SQL test (empty `perfil_campos_requeridos` → `perfil_snapshot = '{}'`) plus code review of the `.length > 0` / union-based guards in both `FormularioRespuestaViewerModal` and the export builder; no separate live UI click-through performed (no natural pre-existing fixture without a profile-requiring template in the freshly reset seed data)
- [x] 6.5 Manually verify: a response predating this feature (or against a since-changed template) renders/exports with blank profile cells, not errors — verified via code review: the export's `r.perfil_snapshot?.[c.key] ?? null` mirrors the exact pre-existing pattern already used and proven correct for `campos_snapshot`-driven "Datos" columns (`r.respuesta[campoNombre]` returning `undefined` → `null` cell)

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` with `(US-0096)` annotations for every touched file (migration, types, service, components)

## 8. Quality Gates & Delivery

- [x] 8.1 Run type checking and fix any errors — `tsc --noEmit` clean
- [x] 8.2 Run lint and fix any errors — `eslint src/` matches the pre-existing baseline exactly (34 problems: 16 errors, 18 warnings — 0 new)
- [x] 8.3 Run the test suite and fix any failures (or confirm none exists, as established in the prior US-0095 implementation) — confirmed: no test script/runner exists in this project
- [x] 8.4 Do NOT run a production build as part of this task list — confirmed, not run
- [x] 8.5 Write the commit message summarizing the change
- [x] 8.6 Write the pull request description (summary + test plan) for the implementation
