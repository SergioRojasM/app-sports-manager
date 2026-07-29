## ADDED Requirements

### Requirement: Requested profile values are snapshotted on submission
The `book_and_deduct_service_units` RPC SHALL persist a `perfil_snapshot` jsonb value on the created `formulario_respuestas` row, containing `{ [campo_key]: value }` for every profile field key present in the attached template's `perfil_campos_requeridos` at the moment the profile-completeness check succeeds. Values SHALL be captured from the SAME `usuarios`/`perfil_deportivo` records already read for that completeness check — no additional read of profile data SHALL occur. When the template has no requested profile fields, `perfil_snapshot` SHALL be `'{}'::jsonb`.

#### Scenario: Snapshot captures exactly the requested fields
- **WHEN** a booking is submitted for a training whose attached template requests `telefono` and `peso_kg`, and the athlete's profile satisfies both
- **THEN** the created `formulario_respuestas` row's `perfil_snapshot` contains exactly the keys `telefono` and `peso_kg` with the athlete's values at that moment

#### Scenario: Empty snapshot when no profile fields are requested
- **WHEN** a booking is submitted for a training whose attached template has an empty `perfil_campos_requeridos` (the default)
- **THEN** the created `formulario_respuestas` row's `perfil_snapshot` is `'{}'::jsonb`

#### Scenario: Snapshot is immutable after a later profile edit
- **WHEN** an athlete edits their profile (e.g., changes `telefono`) after a `formulario_respuestas` row already exists with `telefono` snapshotted
- **THEN** the existing row's `perfil_snapshot.telefono` continues to reflect the ORIGINAL value captured at submission time, unaffected by the later edit

#### Scenario: No direct write path bypasses the snapshot
- **WHEN** any code path attempts to insert or update `formulario_respuestas.perfil_snapshot` directly as an authenticated client (not via the RPC)
- **THEN** the write is rejected by RLS, since `formulario_respuestas` has no `insert`/`update` policy for `authenticated` — the RPC (`security definer`) remains the only write path

### Requirement: Response viewer displays snapshotted profile data
`FormularioRespuestaViewerModal` SHALL render a "Datos de perfil" section, positioned above the existing "Datos" answers list, showing each key in the response's `perfil_snapshot` resolved to its label via the `FORMULARIO_PERFIL_CAMPOS` catalog and its frozen value. When `perfil_snapshot` is empty, this section SHALL NOT be rendered.

#### Scenario: Viewer shows the profile section for a snapshotted response
- **WHEN** staff open "Ver respuesta" for a response whose `perfil_snapshot` is non-empty
- **THEN** a "Datos de perfil" section appears above the "Datos" answers, listing each snapshotted key's catalog label and frozen value

#### Scenario: Viewer omits the section for a response with no snapshot
- **WHEN** staff open "Ver respuesta" for a response whose `perfil_snapshot` is `'{}'` (submitted before this feature, or against a template with no profile requirements)
- **THEN** no "Datos de perfil" section is rendered — the viewer behaves exactly as it did before this feature

### Requirement: Excel export includes snapshotted profile columns
The "Descargar Respuestas Formulario" export SHALL include one column per unique profile key present across the union of all fetched responses' `perfil_snapshot` for the training, ordered by the `FORMULARIO_PERFIL_CAMPOS` catalog order and labeled with the catalog's label, positioned after the fixed identity columns (`Atleta`, `Apellido`, `Email`, `Fecha de respuesta`) and before the dynamic "Datos" columns.

#### Scenario: Export includes profile columns when at least one response has a snapshot
- **WHEN** an admin exports "Descargar Respuestas Formulario" for a training with at least one response whose `perfil_snapshot` is non-empty
- **THEN** the exported file includes one column per unique requested profile key across all responses, positioned after the fixed identity columns and before the dynamic "Datos" columns

#### Scenario: Missing snapshot value renders as a blank cell
- **WHEN** a given response in the export lacks a particular profile key (that template requirement was absent from its snapshot, or it predates this feature)
- **THEN** the corresponding cell for that response is blank rather than an error or placeholder text

#### Scenario: No profile columns when no response has a snapshot
- **WHEN** every response for the training has an empty `perfil_snapshot`
- **THEN** the export contains no profile columns — output is unchanged from before this feature
