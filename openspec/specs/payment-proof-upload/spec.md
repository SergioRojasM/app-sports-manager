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

### Requirement: useSuscripcion accepts a file in its submit data and stores the proof path after pago creation
The `useSuscripcion` hook SHALL keep `file: File | null` in `SuscripcionSubmitData`. On confirmation the hook SHALL:
1. Use a payment id generated in the browser with `crypto.randomUUID()`, kept for as long as the modal stays open so a retry reuses it.
2. If `file` is non-null, upload it to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` via `storageService.uploadPaymentProof` with `{ upsert: true }`.
3. Call `suscripcionesService.comprarSuscripcion` with the payment id and the uploaded path, so the `pagos` row is created with `comprobante_path` already set.

If `file` is null, step 2 is skipped and `comprobante_path` is `null`. A failed upload SHALL NOT block the purchase: the hook SHALL continue with `comprobante_path = null`. The hook SHALL NOT call `pagosService.updateComprobantePath` during a purchase; that function remains for uploads made later from "Mis suscripciones".

`storageService.uploadPaymentProof` SHALL accept an optional `options?: { upsert?: boolean }` parameter. When `upsert: true`, the storage upload SHALL replace an existing file at the same path. Callers that omit `options` retain the existing non-upsert behaviour.

#### Scenario: Payment proof is uploaded before the purchase
- **WHEN** a `usuario` confirms a subscription with a valid proof file selected
- **THEN** the file SHALL be uploaded to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` before the RPC is called
- **THEN** the `pagos` row SHALL be created with that `id` and with `comprobante_path` equal to the uploaded path
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Subscription succeeds without proof file
- **WHEN** a `usuario` confirms a subscription without selecting a file
- **THEN** the `suscripciones` and `pagos` rows SHALL be created with `comprobante_path = null`
- **THEN** no upload call SHALL be made
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Upload fails before the purchase
- **WHEN** `storageService.uploadPaymentProof` throws an error
- **THEN** the purchase SHALL still be sent with `comprobante_path = null`
- **THEN** the `suscripciones` and `pagos` rows SHALL be created and the modal SHALL close with the success message

#### Scenario: Purchase rejected after a successful upload
- **WHEN** the proof file uploads successfully but the RPC rejects the purchase
- **THEN** no subscription or payment record SHALL exist
- **THEN** the modal SHALL remain open with the inline error

#### Scenario: Retry reuses the payment id
- **WHEN** the user retries a failed purchase in the same open modal
- **THEN** the same payment id SHALL be used and the proof SHALL overwrite the previously uploaded file

#### Scenario: Re-upload replaces existing file in storage
- **WHEN** `uploadPaymentProof` is called with `options: { upsert: true }` and a file already exists at the target path
- **THEN** the existing file SHALL be replaced in storage
- **THEN** the function SHALL return the storage path without error

#### Scenario: Upload without upsert flag uses default non-upsert behaviour
- **WHEN** `uploadPaymentProof` is called without the `options` parameter
- **THEN** the upload SHALL behave identically to the previous implementation (no upsert)

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
