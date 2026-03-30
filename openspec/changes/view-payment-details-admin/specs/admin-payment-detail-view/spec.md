## ADDED Requirements

### Requirement: Read-only payment detail modal for administrators
The system SHALL provide a `VerDetallePagoModal` component accessible from the admin subscription management table that displays all fields of the associated payment record and renders the comprobante (proof of payment) — without exposing any mutation actions. The modal SHALL be openable for any subscription row that has an associated payment (`pago !== null`), regardless of the payment's `estado`.

#### Scenario: Modal displays full payment information
- **WHEN** an administrator opens the payment detail modal for a subscription row
- **THEN** the modal SHALL display: monto (formatted as currency), método de pago (`metodo_pago_nombre` or `metodo_pago`, falling back to `'—'`), `PagoEstadoBadge` for `estado`, fecha de pago (formatted date or `'—'` when null), validado por (`validado_por_nombre` or `'—'`), and fecha de validación (formatted date or `'—'` when null)

#### Scenario: Modal renders inline image preview for image comprobantes
- **WHEN** the payment has a `comprobante_path` matching `.jpg`, `.jpeg`, `.png`, or `.webp`
- **THEN** the modal SHALL render an `<img>` element with the signed URL (max height 208 px), wrapped in an `<a>` that opens the full-size image in a new browser tab

#### Scenario: Modal renders PDF indicator and link for PDF comprobantes
- **WHEN** the payment has a `comprobante_path` matching `.pdf`
- **THEN** the modal SHALL render a PDF icon with the filename and a "Ver comprobante" link opening the file in a new tab

#### Scenario: Modal shows no-comprobante message when path is absent
- **WHEN** the payment has `comprobante_path = null` or empty
- **THEN** the modal SHALL display the message "No se ha subido comprobante para este pago." in place of the comprobante section

#### Scenario: Loading spinner shown while signed URL is generating
- **WHEN** `useComprobanteViewer` is fetching the signed URL
- **THEN** the modal SHALL render a spinner in the comprobante section; other payment fields SHALL already be visible

#### Scenario: Non-blocking error shown when signed URL fails
- **WHEN** `useComprobanteViewer` returns an error
- **THEN** the modal SHALL display a subtle error message within the comprobante section; the payment details section SHALL remain fully visible

#### Scenario: Modal has no mutating actions
- **WHEN** the administrator opens the payment detail modal
- **THEN** the modal SHALL render only a "Cerrar" button and SHALL NOT expose any approve, reject, or update actions

#### Scenario: Escape key closes the modal
- **WHEN** the administrator presses the `Escape` key while the modal is open
- **THEN** the modal SHALL close without modifying any data

#### Scenario: Backdrop click closes the modal
- **WHEN** the administrator clicks outside the modal panel (on the backdrop overlay)
- **THEN** the modal SHALL close without modifying any data

#### Scenario: Signed URL expires after 5 minutes
- **WHEN** the `useComprobanteViewer` hook requests a signed URL
- **THEN** the URL SHALL be generated with a TTL of 300 seconds (5 minutes); expired links are not auto-refreshed — the admin must close and re-open the modal
