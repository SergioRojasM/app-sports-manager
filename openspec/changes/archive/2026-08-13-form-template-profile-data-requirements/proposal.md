## Why

Admins building form templates (`formularios_plantillas`) currently have no way to reuse data the athlete already has in their profile (`usuarios` + `perfil_deportivo`) — every template that needs a phone number, ID, birth date, weight, etc. has to redefine it as a new "Datos" section, forcing athletes to retype information the platform already has. Worse, nothing checks that the athlete's profile is actually complete for whatever a template needs, so bookings can go through with missing athlete data the organizer expected to have.

## What Changes

- Add a fixed catalog of 9 requestable profile fields (from `usuarios` and `perfil_deportivo`) that an admin can select per form template via checkboxes, instead of re-declaring them as custom "Datos" sections.
- Add a `perfil_campos_requeridos` column on `formularios_plantillas` storing the selected keys, with a DB check constraint restricting values to the fixed catalog.
- In the template editor (`FormularioEditorPage`), add an auto-saving checkbox grid ("Datos de perfil requeridos") next to the existing "Plantilla activa" toggle.
- In the template preview (`FormularioPreviewModal`), show a read-only chip list of the requested profile fields when any are configured.
- In the fill-out flow (`FormularioRespuestaModal` / `useFormularioRespuestaForm`, shared by both the tenant-scoped booking panel and the cross-tenant marketplace booking flow):
  - Fetch the target athlete's profile when the attached template requests fields.
  - Render a small read-only summary strip of the requested fields' current values when the profile is complete.
  - Render a warning panel naming the missing fields, with a link to `/portal/perfil` and a re-check action, when the profile is incomplete — and disable "Guardar y reservar" until resolved.
- Extend the `book_and_deduct_service_units` RPC to re-validate profile completeness server-side, raising a new `PERFIL_INCOMPLETO` error (mirrors the existing `FORMULARIO_CAMPOS_FALTANTES` pattern) so a bypassed client-side check can't produce a booking with missing athlete data.
- Add `'PERFIL_INCOMPLETO'` to the `BookingRejectionCode` union and map the new RPC error to it in `reservas.service.ts`.

## Capabilities

### New Capabilities
- `form-template-profile-requirements`: Admin-side configuration of which profile fields a form template requests, and the corresponding fill-out-time summary display + profile-completeness gate before booking submission.

### Modified Capabilities
- `training-booking`: `book_and_deduct_service_units` gains a server-side profile-completeness check; `BookingRejectionCode` gains the `PERFIL_INCOMPLETO` literal, and the booking service/UI must handle it like other rejection codes.

## Impact

- **Database**: new migration adding `formularios_plantillas.perfil_campos_requeridos` (text[] + check constraint) and redefining `book_and_deduct_service_units`. No RLS changes — `usuarios`/`perfil_deportivo` already have permissive `select ... using (true)` policies, so the RPC (security definer) and any authenticated client can already read the fields needed for the gate/summary.
- **Types**: `formularios.types.ts` (new `FormularioPerfilCampo` catalog, `FormularioPlantilla`/`UpdatePlantillaInput` extended), `entrenamiento-restricciones.types.ts` (`BookingRejectionCode` extended).
- **Services**: `formularios.service.ts` (select/update the new column), `reservas.service.ts` (map new RPC error).
- **Hooks**: `useFormularioEditor.ts` (pass-through), `useFormularioRespuestaForm.ts` (profile fetch + completeness computation).
- **Components**: `FormularioEditorPage.tsx` (checkbox grid), `FormularioPreviewModal.tsx` (chip list), `FormularioRespuestaModal.tsx` (summary/warning panel + submit gating).
- **No changes** to `formulario_plantilla_esquema` or `formulario_respuestas` — this feature is orthogonal to custom "Datos" sections. `formulario_externo` (external link) trainings are unaffected since only internal plantillas carry `perfil_campos_requeridos`.
- Both booking surfaces that share `FormularioRespuestaModal`/`useFormularioRespuestaForm` — the tenant-scoped `ReservasPanel` and the cross-tenant `PublicTrainingReservaModal` marketplace flow — inherit the behavior from the shared hook/component.

## Non-goals

- No changes to `formulario_plantilla_esquema` "Datos" sections, their types, or their validation.
- No new UI for editing the athlete's profile inline from the fill-out modal — the gate only links out to the existing `/portal/perfil` page.
- No support for arbitrary/custom profile fields — the catalog is fixed to the 9 keys listed in the design; extending the catalog is out of scope.
- No change to `formulario_externo` (external link) handling — profile requirements only apply to internal (`formulario_id`) plantillas.
- No automatic redirect/navigation away from the booking flow when the profile is incomplete — the user stays on the fill-out modal and is given a link + manual re-check action.
