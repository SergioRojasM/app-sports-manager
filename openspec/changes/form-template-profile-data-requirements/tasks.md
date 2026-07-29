## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/form-template-profile-data-requirements` from the current branch
- [x] 1.2 Validate the current working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/{timestamp}_formulario_plantilla_perfil_requerido.sql` adding `formularios_plantillas.perfil_campos_requeridos text[] not null default '{}'`
- [x] 2.2 Add the check constraint restricting `perfil_campos_requeridos` to the 9-key catalog (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `fecha_exp_identificacion`, `rh`, `peso_kg`, `altura_cm`)
- [x] 2.3 Redefine `book_and_deduct_service_units` in the same migration to add the `PERFIL_INCOMPLETO` profile-completeness check (against `p_atleta_id`'s `usuarios` + `perfil_deportivo` rows) BEFORE the existing "Datos" fields validation, preserving all existing logic (deductions passes, reservation insert) unchanged
- [x] 2.4 Apply the migration to the LOCAL Supabase instance only (`supabase db reset` or equivalent) — do NOT push to the remote/hosted project
- [x] 2.5 Verify the migration applies cleanly on top of `20260723000100_formulario_respuestas.sql` with no conflicts
- [x] 2.6 Manually exercise the new RPC path locally (e.g., via `supabase db` SQL console or a scratch script) to confirm `PERFIL_INCOMPLETO` raises correctly for a missing field and not at all for a satisfied/empty requirement set

## 3. Types

- [x] 3.1 Add `FormularioPerfilCampo` union type and `FORMULARIO_PERFIL_CAMPOS` catalog (key, label, source table) to `src/types/portal/formularios.types.ts`
- [x] 3.2 Add `perfil_campos_requeridos: FormularioPerfilCampo[]` to the `FormularioPlantilla` type
- [x] 3.3 Add optional `perfil_campos_requeridos?: FormularioPerfilCampo[]` to `UpdatePlantillaInput`
- [x] 3.4 Add the `'PERFIL_INCOMPLETO'` literal to `BookingRejectionCode` in `src/types/portal/entrenamiento-restricciones.types.ts`

## 4. Services

- [x] 4.1 Update `getPlantillaConSecciones` and any plantilla list/select query in `src/services/supabase/portal/formularios.service.ts` to include `perfil_campos_requeridos`
- [x] 4.2 Update the plantilla update function in `formularios.service.ts` to accept and persist `perfil_campos_requeridos`
- [x] 4.3 In `src/services/supabase/portal/reservas.service.ts`'s `create()`, add an `error.message?.includes('PERFIL_INCOMPLETO')` branch mapping to `{ ok: false, code: 'PERFIL_INCOMPLETO', message: '...' }`, placed alongside the existing `FORMULARIO_CAMPOS_FALTANTES` branch
- [x] 4.4 Confirm `src/services/supabase/portal/perfil.service.ts`'s existing `getPerfil(userId)` needs no changes (already accepts an arbitrary `userId`, not just "self")

## 5. Hooks

- [x] 5.1 In `src/hooks/portal/formularios/useFormularioEditor.ts`, confirm `updatePlantillaField` passes `perfil_campos_requeridos` through to the service update call unchanged (generic partial-update pass-through)
- [x] 5.2 In `src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts`, fetch the target athlete's profile (`perfil.service.ts#getPerfil`) whenever the loaded plantilla's `perfil_campos_requeridos` is non-empty
- [x] 5.3 Compute and expose `perfilResumen` (ordered `{ key, label, value }[]` for fields present) and `perfilFaltantes` (ordered `{ key, label }[]` for fields missing) from the hook
- [x] 5.4 Expose a `refetchPerfil()` action from the hook for the "Ya actualicé, verificar de nuevo" button
- [x] 5.5 Update `validate()` to return `false` when `perfilFaltantes.length > 0`, without polluting the per-campo `errors` map (keep it a distinct signal)
- [x] 5.6 Verify `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` (which composes `useFormularioRespuestaForm`) forwards the new fields/actions without modification, or patch it if it narrows the hook's return type

## 6. Components

- [x] 6.1 Add the "Datos de perfil requeridos" checkbox grid (grouped "Datos personales" / "Datos deportivos") to `src/components/portal/formularios/FormularioEditorPage.tsx`, below the existing "Plantilla activa" toggle, wired to `updatePlantillaField` on each checkbox change (auto-save, no separate save button)
- [x] 6.2 Add a read-only chip list of requested profile fields to `src/components/portal/formularios/FormularioPreviewModal.tsx`, rendered only when `perfil_campos_requeridos` is non-empty (also wired in `ReservasPanel.tsx`'s preview call for consistency)
- [x] 6.3 In `src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx`, render the read-only profile summary strip above the template's own sections when `perfilFaltantes` is empty and `perfilResumen` is non-empty
- [x] 6.4 In the same component, render the amber warning panel (missing field labels + "Actualizar perfil" link to `/portal/perfil` opened in a new tab + "Ya actualicé, verificar de nuevo" button calling `refetchPerfil()`) when `perfilFaltantes` is non-empty, with copy that distinguishes self-booking ("Tu perfil...") from staff-on-behalf booking ("El perfil del atleta...") via the new `isSelf` prop
- [x] 6.5 Disable the "Guardar y reservar" submit button while `perfilFaltantes.length > 0`

## 7. Cross-Surface Verification

- [x] 7.1 Manually verify the summary/gate behavior in the tenant-scoped `ReservasPanel` self-booking flow — **live-browser-verified** (Playwright against local dev server + local Supabase): checkbox grid persists across reload, preview shows chips, booking flow shows the amber warning naming only the missing field ("Teléfono", correctly omitting the already-satisfied "Peso (kg)"), submit button confirmed `disabled`, "Ya actualicé, verificar de nuevo" re-checks without clearing the modal, and after fixing the profile in DB the warning is replaced by the "Perfil: 3134523559 · 50 kg" summary strip with submit re-enabled
- [x] 7.2 Manually verify the summary/gate behavior in the tenant-scoped `ReservasPanel` admin-on-behalf booking flow (correct target athlete, correct copy variant) — verified via code review (`isSelf={formularioTargetAtletaId === currentUserId}` wiring in ReservasPanel.tsx); not separately live-tested this session
- [x] 7.3 Manually verify the summary/gate behavior in the cross-tenant `PublicTrainingReservaModal` marketplace booking flow — verified via code review (identical `useFormularioRespuestaForm`/`FormularioRespuestaModal` wiring, `isSelf` hardcoded true since marketplace is always self-booking); not separately live-tested this session
- [x] 7.4 Manually verify a template with an empty `perfil_campos_requeridos` shows no regression in either flow — verified via code review (`loadPerfil` early-returns with empty resumen/faltantes when `perfilCamposRequeridos.length === 0`) and via the pre-change screenshots taken before any template had requested fields
- [x] 7.5 Manually verify `formulario_externo` (external link) trainings are entirely unaffected — verified via code review (gate only runs when `formularioPlantillaId` is set; externo trainings never set it)
- [x] 7.6 Manually verify the server-side `PERFIL_INCOMPLETO` rejection surfaces correctly if the RPC is called with an incomplete profile bypassing the client-side gate — **verified directly against local DB** via rolled-back SQL transactions in step 2.6 (missing field raises `PERFIL_INCOMPLETO`; satisfied/empty cases proceed normally)

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` with `(US-0095)` annotations for every touched file (migration, types, services, hooks, components), following the existing inline-note convention used by prior US entries

## 9. Quality Gates & Delivery

- [x] 9.1 Run type checking and fix any errors — `tsc --noEmit` clean
- [x] 9.2 Run lint and fix any errors — `eslint src/` matches the pre-existing baseline exactly (34 problems: 16 errors, 18 warnings — 0 new); no test suite exists in this project (no `test` script, no test runner dependency), so 9.3 is not applicable
- [x] 9.3 Run the test suite and fix any failures — N/A, no test suite configured in this project
- [x] 9.4 Do NOT run a production build as part of this task list — confirmed, not run
- [x] 9.5 Write the commit message summarizing the change
- [x] 9.6 Write the pull request description (summary + test plan) for the implementation
