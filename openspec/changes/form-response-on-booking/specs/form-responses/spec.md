## ADDED Requirements

### Requirement: Formulario respuesta persisted atomically with its reservation
The system SHALL persist a submitted form answer set as one row in `public.formulario_respuestas` (`tenant_id`, `formulario_plantilla_id`, `atleta_id`, `entrenamiento_id`, `respuesta` jsonb keyed by `campo_nombre`, `campos_snapshot` jsonb keyed by `campo_nombre` capturing each active "datos" field's `{ etiqueta, tipo, orden }` at submission time) in the same database transaction that creates the `reservas` row it belongs to, via the `book_and_deduct_service_units` RPC. No code path SHALL insert a `formulario_respuestas` row without also creating its linked reservation in the same call.

#### Scenario: Response and reservation are created together
- **WHEN** `book_and_deduct_service_units` is called with a non-null `p_formulario_respuesta`
- **THEN** both the `formulario_respuestas` row and the `reservas` row are committed together, with `reservas.formulario_respuesta_id` pointing at the new response

#### Scenario: RPC failure leaves no orphan response
- **WHEN** any step inside `book_and_deduct_service_units` raises an exception after the `formulario_respuestas` insert (e.g., a service-unit deduction fails)
- **THEN** the entire transaction rolls back and no `formulario_respuestas` row persists

#### Scenario: No response requested — column stays null
- **WHEN** `book_and_deduct_service_units` is called with `p_formulario_respuesta = null` (the default)
- **THEN** no `formulario_respuestas` row is inserted and the created reservation's `formulario_respuesta_id` is `null`, identical to pre-existing behavior

### Requirement: Required "datos" fields are validated server-side before insert
Before inserting a `formulario_respuestas` row, `book_and_deduct_service_units` SHALL verify that every active section of the given template with `seccion_tipo = 'datos'` and `campo_obligatorio = true` has a non-empty value present in `p_formulario_respuesta`, keyed by that section's `campo_nombre`. If any required field is missing or blank, the function SHALL raise a `P0001` exception with message `FORMULARIO_CAMPOS_FALTANTES` and no rows SHALL be written.

#### Scenario: Missing required field rejected server-side
- **WHEN** `p_formulario_respuesta` omits a value (or has a blank/whitespace-only value) for a `datos` section with `campo_obligatorio = true` and `activo = true`
- **THEN** the function raises `FORMULARIO_CAMPOS_FALTANTES` and no `formulario_respuestas` or `reservas` row is inserted

#### Scenario: Inactive required field is not checked
- **WHEN** a `datos` section has `campo_obligatorio = true` but `activo = false`
- **THEN** its absence from `p_formulario_respuesta` does not trigger `FORMULARIO_CAMPOS_FALTANTES`

#### Scenario: Service layer surfaces a friendly error
- **WHEN** `reservasService.create()` receives the `FORMULARIO_CAMPOS_FALTANTES` Postgres error
- **THEN** it returns `{ ok: false, code: 'FORMULARIO_CAMPOS_FALTANTES', message: '...' }` instead of throwing a raw Postgres error, and the fill-out modal renders the message inline without closing

### Requirement: Direct writes to formulario_respuestas are rejected
`public.formulario_respuestas` SHALL have Row Level Security enabled with no `INSERT`, `UPDATE`, or `DELETE` policy granted to the `authenticated` role. The only way to write to this table SHALL be through the `SECURITY DEFINER` `book_and_deduct_service_units` function.

#### Scenario: Direct client insert is rejected
- **WHEN** an authenticated client (any role) attempts `insert into formulario_respuestas (...)` directly, bypassing the RPC
- **THEN** the operation is rejected by RLS with no matching policy

### Requirement: Read access to formulario_respuestas is scoped to the owner or tenant staff
`public.formulario_respuestas` SHALL allow `SELECT` to: the athlete who owns the row (`atleta_id = auth.uid()`), or any active tenant member with role `administrador` or `entrenador` for that row's `tenant_id`. All other authenticated users SHALL receive zero rows.

#### Scenario: Owner reads their own response
- **WHEN** the athlete who submitted a response queries `formulario_respuestas` for their own `atleta_id`
- **THEN** the row is returned

#### Scenario: Tenant staff reads any response in their tenant
- **WHEN** an administrador or entrenador of the response's tenant queries `formulario_respuestas`
- **THEN** the row is returned regardless of which athlete submitted it

#### Scenario: Unrelated user is denied
- **WHEN** an authenticated user who is neither the owning athlete nor tenant staff for that row queries `formulario_respuestas`
- **THEN** no row is returned

### Requirement: Imagen field values are uploaded to Storage before submission
When a `datos` section has `campo_tipo = 'imagen'`, selecting a file SHALL immediately upload it to the `org-assets` bucket at `orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/{campoNombre}-{timestamp}.{ext}` (where `atletaId` is always the booking athlete's own id, even when a staff member uploads on their behalf), and the resulting storage **path** (not a signed URL) SHALL be the value stored for that field in the `respuesta` JSON.

#### Scenario: Athlete uploads their own image field
- **WHEN** an atleta selects a file for an `imagen` field while filling out the form for themself
- **THEN** the file uploads to their own user folder and the field's value becomes the resulting storage path

#### Scenario: Staff uploads an image on an athlete's behalf
- **WHEN** an administrador or entrenador selects a file for an `imagen` field while booking on behalf of an athlete
- **THEN** the file uploads under that athlete's own user folder (not the staff member's), and the upload succeeds under the staff-upload storage policy

#### Scenario: Viewer resolves the stored path to a signed URL
- **WHEN** `FormularioRespuestaViewerModal` renders a submitted `imagen` field
- **THEN** it calls `storageService.getSignedUrl` on the stored path and displays the result as a thumbnail/link, never the raw path

### Requirement: Formulario plantilla deletion always succeeds; responses are preserved
`formulario_respuestas.formulario_plantilla_id` SHALL reference `formularios_plantillas(id)` with `on delete set null`. Deleting a template SHALL always succeed regardless of how many `formulario_respuestas` rows reference it — those rows are never deleted, updated, or blocked by the delete; only their `formulario_plantilla_id` is nulled out.

#### Scenario: Deleting a used template succeeds
- **WHEN** an admin deletes a `formularios_plantillas` row that has one or more `formulario_respuestas` rows referencing it
- **THEN** the delete succeeds (still cascades to `formulario_plantilla_esquema`, per US-0084), and every referencing `formulario_respuestas` row survives with `formulario_plantilla_id` set to `null`

#### Scenario: Deleting an unused template still works
- **WHEN** an admin deletes a `formularios_plantillas` row that has zero linked `formulario_respuestas`
- **THEN** the delete succeeds exactly as it did before this change

### Requirement: Response viewer renders answers from the submission-time snapshot, not the live template
`FormularioRespuestaViewerModal` SHALL render each answered field using `formulario_respuestas.campos_snapshot` (`etiqueta`, `tipo`, `orden` per `campo_nombre`) joined with `respuesta[campo_nombre]` for the value — it SHALL NOT fetch or depend on the template's current `formulario_plantilla_esquema` rows to render labels. This SHALL produce identical output whether the template still exists unchanged, has since been edited, or has been deleted entirely.

#### Scenario: All snapshotted fields render with their original labels
- **WHEN** the viewer opens for a response
- **THEN** each field in `campos_snapshot` renders its `etiqueta` next to `respuesta[campo_nombre]` (or "Sin respuesta" if absent/blank), ordered by `orden`

#### Scenario: Viewer works after the template is edited
- **WHEN** an admin renames a field's `campo_etiqueta` on the still-existing template after a response was submitted
- **THEN** the viewer continues to show the field's original label from `campos_snapshot`, unaffected by the rename

#### Scenario: Viewer works after the template is deleted
- **WHEN** the template referenced by a response is deleted (`formulario_plantilla_id` becomes `null`)
- **THEN** the viewer still renders every field correctly from `campos_snapshot`, showing a fallback name (e.g. "Formulario eliminado") in place of the template's live `nombre`
