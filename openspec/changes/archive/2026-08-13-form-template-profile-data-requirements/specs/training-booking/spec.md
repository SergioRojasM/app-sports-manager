## ADDED Requirements

### Requirement: PERFIL_INCOMPLETO rejection code in BookingResult
The `book_and_deduct_service_units` RPC SHALL validate the attached form template's `perfil_campos_requeridos` (when `p_formulario_plantilla_id` is provided and the referenced template has a non-empty `perfil_campos_requeridos`) against the target athlete's (`p_atleta_id`) profile (`public.usuarios` + `public.perfil_deportivo`) BEFORE inserting any `formulario_respuestas` or `reservas` row. If one or more requested fields are missing, the RPC SHALL raise a Postgres `P0001` exception with message `'PERFIL_INCOMPLETO'` and a `detail` listing the missing field keys, and no row SHALL be written. The `BookingRejectionCode` type in `entrenamiento-restricciones.types.ts` SHALL include the literal `'PERFIL_INCOMPLETO'`, and the `create()` function in `reservas.service.ts` SHALL map this RPC error to `{ ok: false, code: 'PERFIL_INCOMPLETO', message: <human-readable string> }`, mirroring the existing `FORMULARIO_CAMPOS_FALTANTES` mapping.

#### Scenario: Booking blocked when the target athlete's profile is missing a requested field
- **WHEN** a booking is submitted for a training whose attached template requests one or more profile fields, and the target athlete's profile is missing at least one of them
- **THEN** the RPC raises `PERFIL_INCOMPLETO`, no `reservas` or `formulario_respuestas` row is created, and the service returns `{ ok: false, code: 'PERFIL_INCOMPLETO', message: ... }`

#### Scenario: Booking allowed when the profile satisfies all requested fields
- **WHEN** a booking is submitted for a training whose attached template requests profile fields, and the target athlete's profile has all of them
- **THEN** the RPC does not raise `PERFIL_INCOMPLETO` and processing continues to the existing "Datos" validation and reservation insert

#### Scenario: Check is skipped when the template requests no profile fields
- **WHEN** a booking is submitted for a training whose attached template has an empty `perfil_campos_requeridos` (the default for every template)
- **THEN** the profile-completeness check is not evaluated and behavior is unchanged from before this feature

#### Scenario: Check does not apply to bookings without an internal template
- **WHEN** a booking is submitted for a training with no `formulario_id` (no attached internal template, e.g., `formulario_externo` or no formulario at all)
- **THEN** the profile-completeness check is not evaluated

#### Scenario: Server-side check is a backstop even if the client-side gate is bypassed
- **WHEN** the RPC is invoked directly (bypassing the client-side `useFormularioRespuestaForm` completeness gate) with a `p_formulario_plantilla_id` whose requested fields are not satisfied by `p_atleta_id`'s profile
- **THEN** the RPC still raises `PERFIL_INCOMPLETO` and rejects the write, regardless of what the client attempted to validate beforehand
