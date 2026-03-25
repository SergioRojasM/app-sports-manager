# Capability: payment-proof-upload

## Purpose
Defines the payment proof (comprobante) upload flow for subscription requests: the `SuscripcionModal` file-handling behaviour, the `useSuscripcion` hook's upload integration, and the validation rules enforced on the comprobante file input.

## Requirements

### Requirement: SuscripcionModal passes the selected File object through onConfirm
`SuscripcionModal` SHALL expose the selected `File` object (not just the filename) through its `onConfirm` callback. The callback signature SHALL be extended to carry `file: File | null` alongside the existing `comentarios` and `metodo_pago_id` fields. When no file is selected, `file` SHALL be `null`.

#### Scenario: onConfirm carries File object when a file is selected
- **WHEN** an athlete selects a payment proof file and clicks "Confirmar"
- **THEN** `onConfirm` SHALL be called with `{ comentarios, metodo_pago_id, file: <File> }`

#### Scenario: onConfirm carries null file when no file is selected
- **WHEN** an athlete clicks "Confirmar" without selecting any proof file
- **THEN** `onConfirm` SHALL be called with `{ comentarios, metodo_pago_id, file: null }`

---

### Requirement: useSuscripcion accepts a file in its submit data and uploads the proof after pago creation
The `useSuscripcion` hook SHALL extend `SuscripcionSubmitData` to include `file: File | null`. On confirmation, if `file` is non-null, the hook SHALL:
1. Create the `suscripciones` record.
2. Create the `pagos` record (with `comprobante_url = null` initially).
3. Upload the proof file to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` via `storageService.uploadPaymentProof`.
4. Patch `pagos.comprobante_url` with the resolved signed URL via `pagosService.updateComprobanteUrl`.
If `file` is null, steps 3 and 4 are skipped and `comprobante_url` remains `null`.

#### Scenario: Payment proof upload completes and comprobante_url is set
- **WHEN** a `usuario` confirms a subscription with a valid proof file selected
- **THEN** the `pagos` row SHALL be created with `comprobante_url = null`
- **THEN** the file SHALL be uploaded to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}`
- **THEN** `pagos.comprobante_url` SHALL be patched to the returned signed URL
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Subscription succeeds without proof file
- **WHEN** a `usuario` confirms a subscription without selecting a file
- **THEN** the `suscripciones` and `pagos` rows SHALL be created with `comprobante_url = null`
- **THEN** no upload call SHALL be made
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Upload fails after pago creation
- **WHEN** `storageService.uploadPaymentProof` throws an error
- **THEN** the `suscripciones` and `pagos` rows SHALL remain in the database
- **THEN** `pagos.comprobante_url` SHALL remain `null`
- **THEN** the modal SHALL display an inline warning that the file upload failed but the subscription was recorded

#### Scenario: Patch fails after successful upload
- **WHEN** the proof file uploads successfully but `pagosService.updateComprobanteUrl` fails
- **THEN** the subscription and payment records SHALL remain in the database
- **THEN** `pagos.comprobante_url` SHALL remain `null`
- **THEN** a non-blocking warning SHALL be shown to the user

---

### Requirement: Payment proof file validation is enforced in the modal
`SuscripcionModal` SHALL enforce MIME type validation for the comprobante file input. Accepted types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Files exceeding 5 MiB SHALL be rejected. Invalid selections SHALL display an inline error and SHALL NOT set the file in state.

#### Scenario: Valid file selected
- **WHEN** the athlete selects a JPEG, PNG, WebP, or PDF file of 5 MiB or less
- **THEN** the filename SHALL be displayed and no error SHALL be shown

#### Scenario: File with unsupported MIME type selected
- **WHEN** the athlete selects a file with a MIME type not in the allowed list
- **THEN** an inline error SHALL be shown: _"Solo se permiten imágenes (JPEG, PNG, WebP) o PDF."_
- **THEN** the file SHALL NOT be stored in state

#### Scenario: File exceeding 5 MiB selected
- **WHEN** the athlete selects a file larger than 5 MiB
- **THEN** an inline error SHALL be shown: _"El archivo no puede superar 5 MB."_
- **THEN** the file SHALL NOT be stored in state
