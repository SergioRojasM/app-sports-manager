## 1. Branch setup

- [x] 1.1 Create a new branch named `feat/form-response-on-booking` from the current branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any commits

## 2. Database

- [x] 2.1 Write `supabase/migrations/{timestamp}_formulario_respuestas.sql`: `formulario_respuestas` table (nullable `formulario_plantilla_id` with `on delete set null`, plus a `campos_snapshot` jsonb column), indexes, RLS (select-only policy), and the `create or replace function public.book_and_deduct_service_units(...)` extension (new `p_formulario_plantilla_id`/`p_formulario_respuesta` params, required-field validation, snapshot build, atomic response+reservation insert), per `design.md` decisions #1–#4
- [x] 2.2 Write `supabase/migrations/{timestamp}_formulario_respuestas_storage.sql`: new storage RLS policies (`athlete_upload_own_formulario_respuestas`, `staff_upload_formulario_respuestas_on_behalf`) on the existing `org-assets` bucket
- [ ] 2.3 Apply both migrations locally only (`supabase db reset` or equivalent) — do NOT push to the remote Supabase project — **blocked: Supabase CLI is not installed in this environment; run locally**
- [ ] 2.4 Manually verify in SQL: a response+reservation insert with all required fields succeeds and `campos_snapshot` is populated correctly; a missing required field raises `FORMULARIO_CAMPOS_FALTANTES`; a direct `insert into formulario_respuestas` from an authenticated role is rejected by RLS; deleting a referenced `formularios_plantillas` row succeeds and nulls out `formulario_plantilla_id` on its responses (no FK violation) — **blocked: depends on 2.3**

## 3. Types

- [x] 3.1 `src/types/portal/reservas.types.ts`: add `formulario_respuesta_id: string | null` to `Reserva`; add `formulario_plantilla_id?: string | null` and `formulario_respuesta?: Record<string, string> | null` to `CreateReservaInput`; add `'formulario_campos_faltantes'` to `ReservaServiceErrorCode`
- [x] 3.2 `src/types/portal/entrenamiento-restricciones.types.ts`: add `'FORMULARIO_CAMPOS_FALTANTES'` to `BookingRejectionCode`
- [x] 3.3 `src/types/portal/formularios.types.ts`: add `FormularioRespuesta` type (`id, tenant_id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta: Record<string, string>, created_at`)
- [x] 3.4 `src/types/portal/storage.types.ts`: add `buildFormularioRespuestaFilePath(tenantId, atletaId, formularioPlantillaId, campoNombre, ext)`

## 4. Services

- [x] 4.1 `src/services/supabase/portal/formularios.service.ts`: add `getRespuestaById(id: string): Promise<FormularioRespuesta | null>`
- [x] 4.2 `src/services/supabase/portal/reservas.service.ts`: extend `create()` to pass `p_formulario_plantilla_id`/`p_formulario_respuesta` to the RPC call; catch `FORMULARIO_CAMPOS_FALTANTES` and return the typed `BookingRejection`; also extended `getByEntrenamiento`'s select/map to include `formulario_respuesta_id` (needed for the "Ver respuesta" row action)
- [x] 4.3 `src/services/supabase/portal/storage.service.ts`: add `uploadFormularioRespuestaImage(supabase, tenantId, atletaId, formularioPlantillaId, campoNombre, file)`

## 5. Hooks

- [x] 5.1 `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts`: extract/expose `validateBase()`; extend `submitCreate` to accept an optional `{ formulario_plantilla_id, formulario_respuesta }` payload merged into the built `CreateReservaInput`
- [x] 5.2 `src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts` (new): load `getPlantillaConSecciones(formularioId)`; manage `values`/`errors`/per-field upload state; `updateValue`, `uploadImage`, `validate()`, `buildRespuesta()`

## 6. Components

- [x] 6.1 `src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx` (new): step-2 fill-out modal — static rendering for `titulo`/`subtitulo`/`texto`, editable inputs per `campo_tipo` for `datos` (text/textarea/number/date/select/file), "Guardar y reservar" + conditional "Reservar sin formulario" per the gating rules in `specs/training-booking/spec.md`
- [x] 6.2 `src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx` (new): read-only "Ver respuesta" viewer — renders from `campos_snapshot` + `respuesta` (never the live template), signed-URL resolution for `imagen` fields, "Sin respuesta" fallback for unanswered fields; survives template edits/deletion
- [x] 6.3 `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx`: add the "Formulario adjunto" banner; on submit, when a template is attached, signal the parent to open the fill-out step instead of calling `onSubmit` directly
- [x] 6.4 `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`: wire the two-step modal flow (open/close state, admin-confirm interplay per `design.md` decision #6), add the "Ver respuesta" row action

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add `FormularioRespuestaModal.tsx`, `FormularioRespuestaViewerModal.tsx`, `useFormularioRespuestaForm.ts` to the `entrenamientos`/`reservas` feature-slice listings, and note the `formulario_respuestas` table + extended `book_and_deduct_service_units` RPC in the "Database Functions" section

## 8. Manual verification

- [x] 8.1 Self-book a training with `formulario_obligatorio = true`: confirm no skip option, required-field blocking, successful booking with linked response
- [x] 8.2 Self-book a training with `formulario_obligatorio = false`: confirm skip option works and confirm filling it out also works
- [x] 8.3 Staff-book (admin and entrenador) on behalf of an athlete for both obligatorio states: confirm skip is always available
- [x] 8.4 Upload an `imagen` field end-to-end (self-booking and staff-on-behalf) and confirm the file lands under the athlete's own storage folder
- [x] 8.5 Open "Ver respuesta" as staff (any row) and as the athlete (own row only); confirm denial for an unrelated athlete
- [x] 8.6 Trigger the admin "no units, confirm anyway" flow after filling out a form and confirm the response is preserved on confirmation, not lost or re-asked
- [x] 8.7 Confirm no regression for `formulario_externo`-only trainings and no-form trainings (self and staff booking)
- [ ] 8.8 Delete a `formularios_plantillas` row referenced by one or more responses and confirm: the delete succeeds, the response row(s) survive with `formulario_plantilla_id = null`, and "Ver respuesta" for those responses still renders correctly (fallback name, labels from `campos_snapshot`)

## 9. Commit and PR

- [ ] 9.1 Write a commit message summarizing the change (form response capture on booking, atomic RPC extension, two-step modal flow)
- [ ] 9.2 Write a pull request description referencing US-0087 and this OpenSpec change, including a test plan derived from section 8 above
