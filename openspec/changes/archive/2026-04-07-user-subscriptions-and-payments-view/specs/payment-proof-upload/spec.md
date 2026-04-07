## MODIFIED Requirements

### Requirement: useSuscripcion accepts a file in its submit data and stores the proof path after pago creation
The `useSuscripcion` hook SHALL extend `SuscripcionSubmitData` to include `file: File | null`. On confirmation, if `file` is non-null, the hook SHALL:
1. Create the `suscripciones` record.
2. Create the `pagos` record (with `comprobante_path = null` initially).
3. Upload the proof file to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` via `storageService.uploadPaymentProof`.
4. Patch `pagos.comprobante_path` with the resolved storage path via `pagosService.updateComprobantePath`.
If `file` is null, steps 3 and 4 are skipped and `comprobante_path` remains `null`. The `comprobante_url` column no longer exists; `pagosService.updateComprobanteUrl` is replaced by `pagosService.updateComprobantePath(supabase, pagoId, path)`.

`storageService.uploadPaymentProof` SHALL accept an optional `options?: { upsert?: boolean }` parameter. When `upsert: true`, the storage upload SHALL replace an existing file at the same path. Callers that omit `options` retain the existing non-upsert behaviour.

#### Scenario: Payment proof upload completes and comprobante_path is set
- **WHEN** a `usuario` confirms a subscription with a valid proof file selected
- **THEN** the `pagos` row SHALL be created with `comprobante_path = null`
- **THEN** the file SHALL be uploaded to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}`
- **THEN** `pagos.comprobante_path` SHALL be patched to the storage path returned by `storageService.uploadPaymentProof`
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Subscription succeeds without proof file
- **WHEN** a `usuario` confirms a subscription without selecting a file
- **THEN** the `suscripciones` and `pagos` rows SHALL be created with `comprobante_path = null`
- **THEN** no upload call SHALL be made
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Upload fails after pago creation
- **WHEN** `storageService.uploadPaymentProof` throws an error
- **THEN** the `suscripciones` and `pagos` rows SHALL remain in the database
- **THEN** `pagos.comprobante_path` SHALL remain `null`
- **THEN** the modal SHALL display an inline warning that the file upload failed but the subscription was recorded

#### Scenario: Patch fails after successful upload
- **WHEN** the proof file uploads successfully but `pagosService.updateComprobantePath` fails
- **THEN** the subscription and payment records SHALL remain in the database
- **THEN** `pagos.comprobante_path` SHALL remain `null`
- **THEN** a non-blocking warning SHALL be shown to the user

#### Scenario: Re-upload replaces existing file in storage
- **WHEN** `uploadPaymentProof` is called with `options: { upsert: true }` and a file already exists at the target path
- **THEN** the existing file SHALL be replaced in storage
- **THEN** the function SHALL return the storage path without error

#### Scenario: Upload without upsert flag uses default non-upsert behaviour
- **WHEN** `uploadPaymentProof` is called without the `options` parameter
- **THEN** the upload SHALL behave identically to the previous implementation (no upsert)
