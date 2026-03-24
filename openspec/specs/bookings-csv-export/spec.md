# Capability: bookings-csv-export

## Purpose
Allows administrators and coaches to export a CSV report of all bookings for a specific training session, including booking details, athlete profile information, attendance records, and validation data. The export is read-only and triggered from the ReservasPanel.

## Requirements

### Requirement: Export button is visible only to authorized roles
The system SHALL render a "Descargar CSV" button in the `ReservasPanel` header exclusively when the current user's role is `administrador` or `entrenador`. The button SHALL NOT be rendered for the `atleta` role or when `role` is `null`.

#### Scenario: Admin sees the export button
- **WHEN** the `ReservasPanel` opens and the user's role is `administrador`
- **THEN** a "Descargar CSV" button is displayed in the panel header

#### Scenario: Coach sees the export button
- **WHEN** the `ReservasPanel` opens and the user's role is `entrenador`
- **THEN** a "Descargar CSV" button is displayed in the panel header

#### Scenario: Athlete does not see the export button
- **WHEN** the `ReservasPanel` opens and the user's role is `atleta`
- **THEN** no "Descargar CSV" button is rendered in the panel header

---

### Requirement: CSV data is retrieved via the reservas_reporte_view DB view
The system SHALL query the `reservas_reporte_view` PostgreSQL view, filtered by `tenant_id` and `entrenamiento_id`, to retrieve all data needed for the CSV export. The view SHALL expose a flat column set covering booking, athlete profile, training metadata, attendance, and level data. The query SHALL include all booking states (`pendiente`, `confirmada`, `cancelada`, `completada`).

#### Scenario: View returns rows for a training with bookings
- **WHEN** `getReservasReport(tenantId, entrenamientoId)` is called for a training that has bookings
- **THEN** the function returns an array of `ReservaReportRow` objects with one item per booking, ordered by `created_at` ascending

#### Scenario: View returns empty array for a training with no bookings
- **WHEN** `getReservasReport(tenantId, entrenamientoId)` is called for a training with no bookings
- **THEN** the function returns an empty array

#### Scenario: View is scoped to the caller's tenant
- **WHEN** `getReservasReport` is called with a `tenantId` that does not match the authenticated user's tenant
- **THEN** the query returns no rows (enforced by `tenant_id` equality filter and underlying table RLS)

---

### Requirement: Generated CSV contains all required columns in the correct order
The system SHALL produce a CSV file where the first row is the header row containing exactly the following column names in order: `entrenamiento_nombre`, `entrenamiento_fecha`, `disciplina`, `escenario`, `nivel_disciplina`, `reserva_id`, `reserva_estado`, `fecha_reserva`, `fecha_cancelacion`, `notas_reserva`, `atleta_nombre`, `atleta_apellido`, `atleta_email`, `atleta_telefono`, `tipo_identificacion`, `numero_identificacion`, `asistio`, `fecha_asistencia`, `observaciones_asistencia`, `validado_por_email`. Each subsequent row SHALL correspond to one booking.

#### Scenario: CSV header row matches defined columns
- **WHEN** the CSV export is triggered for any training
- **THEN** the first line of the downloaded file contains exactly the 20 column headers listed above, comma-separated

#### Scenario: Date fields are formatted as YYYY-MM-DD HH:mm
- **WHEN** a booking row has a non-null `entrenamiento_fecha` or `fecha_reserva` value
- **THEN** those fields are formatted as `YYYY-MM-DD HH:mm` in the CSV row

#### Scenario: Nullable fields are empty strings when null
- **WHEN** a booking row has null values for optional fields (e.g., `notas_reserva`, `nivel_disciplina`)
- **THEN** those fields appear as empty (no value between the surrounding commas)

---

### Requirement: Attendance columns reflect presence and value of the attendance record
The system SHALL map the `asistio` boolean from the `asistencias` record to a human-readable string. If no `asistencias` record exists for a booking (LEFT JOIN returns NULL), the `asistio` column SHALL display `"Sin registrar"`.

#### Scenario: Booking has an attendance record marked as attended
- **WHEN** the booking's attendance record has `asistio = true`
- **THEN** the `asistio` CSV column contains `Sí`

#### Scenario: Booking has an attendance record marked as not attended
- **WHEN** the booking's attendance record has `asistio = false`
- **THEN** the `asistio` CSV column contains `No`

#### Scenario: Booking has no attendance record
- **WHEN** no `asistencias` record exists for the booking
- **THEN** the `asistio` CSV column contains `Sin registrar`, and `fecha_asistencia` and `observaciones_asistencia` are empty

---

### Requirement: CSV content is RFC 4180 compliant
The system SHALL escape all CSV field values per RFC 4180: any field containing commas, double-quotes, or newline characters SHALL be wrapped in double-quotes, and any double-quote character within the field value SHALL be escaped by doubling it (`""`). The file SHALL be encoded as UTF-8 with a BOM (`\uFEFF`) prefix so it opens correctly in Microsoft Excel.

#### Scenario: Field containing a comma is quoted
- **WHEN** a field value contains a comma (e.g., a training name like `"Fútbol, avanzado"`)
- **THEN** the CSV field is wrapped in double-quotes: `"Fútbol, avanzado"`

#### Scenario: Field containing a double-quote is escaped
- **WHEN** a field value contains a double-quote character
- **THEN** the quote is doubled and the field is wrapped: `"He said ""hello"""`

#### Scenario: File opens correctly in Microsoft Excel with diacritics
- **WHEN** the CSV file is opened in Microsoft Excel
- **THEN** Spanish characters (accents, ñ, ü) render correctly due to the UTF-8 BOM prefix

---

### Requirement: CSV filename follows the defined pattern
The system SHALL name the downloaded file `reservas_{slug}_{YYYY-MM-DD}.csv`, where `slug` is the training's `nombre` lowercased with spaces replaced by underscores, and the date is the `YYYY-MM-DD` portion of `fecha_hora`.

#### Scenario: Filename derived from training name and date
- **WHEN** the export is triggered for a training named `"Natación Libre"` with `fecha_hora = "2026-03-20T09:00:00"`
- **THEN** the downloaded filename is `reservas_natación_libre_2026-03-20.csv`

---

### Requirement: Export button shows loading state during export and re-enables on completion
The system SHALL disable the "Descargar CSV" button and show a loading indicator while the export is in progress. Once the export completes (successfully or with an error), the button SHALL return to its normal enabled state.

#### Scenario: Button is disabled while exporting
- **WHEN** the user clicks "Descargar CSV" and the export is in progress
- **THEN** the button is disabled and shows a loading indicator

#### Scenario: Button re-enables after successful export
- **WHEN** the CSV file has been generated and the browser download triggered
- **THEN** the button returns to its normal enabled state

#### Scenario: Button re-enables after export error
- **WHEN** the service call fails during export
- **THEN** the button returns to its normal enabled state

---

### Requirement: Export error displays an alert and does not alter data
The system SHALL catch any error thrown by `getReservasReport` and display it via `window.alert`. The export operation is read-only and SHALL NOT modify any database records under any circumstances.

#### Scenario: Service error shows alert message
- **WHEN** `getReservasReport` throws or returns an error
- **THEN** `window.alert` is called with the error message and no file download is triggered

#### Scenario: Empty bookings produces a header-only CSV without error
- **WHEN** the training has no bookings
- **THEN** the downloaded file contains only the header row and no data rows, without throwing an error
