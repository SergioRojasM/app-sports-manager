# Capability: payment-proof-upload (delta)

## MODIFIED Requirements

### Requirement: useSuscripcion accepts a file in its submit data and stores the proof path after pago creation
The `useSuscripcion` hook SHALL extend `SuscripcionSubmitData` to include `file: File | null`. On confirmation, if `file` is non-null, the hook SHALL:
1. Create the `suscripciones` record.
2. Create the `pagos` record (with `comprobante_path = null` initially).
3. Upload the proof file to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` via `storageService.uploadPaymentProof`.
4. Patch `pagos.comprobante_path` with the resolved storage path via `pagosService.updateComprobantePath`.
If `file` is null, steps 3 and 4 are skipped and `comprobante_path` remains `null`. The `comprobante_url` column no longer exists; `pagosService.updateComprobanteUrl` is replaced by `pagosService.updateComprobantePath(supabase, pagoId, path)`.

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

## REMOVED Requirements

### Requirement: pagos.comprobante_url is patched after upload
**Reason**: `comprobante_url` is dropped from the `pagos` table. Storage path (`comprobante_path`) is now the single source of truth; signed URLs are generated on-demand at view time.
**Migration**: No data migration required — no production data exists. All code that previously wrote to `comprobante_url` or called `pagosService.updateComprobanteUrl` SHALL be updated to write `comprobante_path` via `pagosService.updateComprobantePath`.
