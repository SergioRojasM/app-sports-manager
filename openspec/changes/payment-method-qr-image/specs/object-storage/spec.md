## ADDED Requirements

### Requirement: Payment method QR image storage path and upload
`storage.types.ts` SHALL export `buildMetodoPagoQrPath(tenantId, metodoId, ext)` returning `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{timestamp}.{ext}`. `storageService` SHALL expose `uploadMetodoPagoQr(supabase, tenantId, metodoId, file)` that uploads the file to that path in the `org-assets` bucket with `upsert: false` and returns `{ signedUrl, path }`, where `signedUrl` is created with `SIGNED_URL_TTL`. No new bucket and no new `storage.objects` policy SHALL be created: write access SHALL rely on the existing org-admin policies, and read access SHALL be through the signed URL. Objects previously uploaded for a method SHALL NOT be deleted when its image is replaced or removed.

#### Scenario: Administrator uploads a QR image
- **WHEN** an active administrator of the tenant calls `uploadMetodoPagoQr` with a JPEG, PNG or WebP file
- **THEN** the object SHALL be stored under `orgs/{tenantId}/metodos-pago/{metodoId}/` and the function SHALL return a signed URL and the object path

#### Scenario: Non-administrator upload is rejected
- **WHEN** a user who is not an active administrator of the tenant attempts to upload under `orgs/{tenantId}/metodos-pago/`
- **THEN** storage row-level security SHALL reject the upload and the function SHALL throw an error

#### Scenario: Replacing an image keeps the previous object
- **WHEN** a second image is uploaded for the same method
- **THEN** a new object with a different timestamped name SHALL be created and the previous object SHALL remain reachable through its signed URL

#### Scenario: Signed URL readable without membership
- **WHEN** an anonymous or non-member user requests the signed URL returned by the upload
- **THEN** the image SHALL be served
