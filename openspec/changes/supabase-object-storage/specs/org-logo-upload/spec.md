## ADDED Requirements

### Requirement: Edit organization form displays a logo file-upload input
The organization edit form (at `gestion-organizacion/editar`) SHALL replace the `logo_url` free-text URL input with a file-upload input. If a `logo_url` is already set, the form SHALL render a preview of the current logo above the input. The input SHALL accept only `image/jpeg`, `image/png`, and `image/webp` files. Selecting a valid file SHALL display a preview of the new image. Selecting an invalid file SHALL show an inline error and NOT update the form state.

#### Scenario: Admin sees current logo preview when logo_url is set
- **WHEN** an authenticated administrator opens the edit organization form and `tenants.logo_url` is non-null
- **THEN** the form SHALL render an `<img>` preview of the current logo above the upload input

#### Scenario: Admin sees empty upload field when no logo is set
- **WHEN** an authenticated administrator opens the edit organization form and `tenants.logo_url` is null
- **THEN** no logo preview SHALL be rendered and the upload field SHALL be present and empty

#### Scenario: Admin selects a valid image file
- **WHEN** an administrator selects a JPEG, PNG, or WebP file of 2 MiB or less via the logo upload input
- **THEN** a preview of the selected image SHALL appear and no error SHALL be shown

#### Scenario: Admin selects a file exceeding 2 MiB
- **WHEN** an administrator selects a file larger than 2 MiB
- **THEN** the form SHALL display an inline error _"El archivo no puede superar 2 MB"_ and SHALL NOT accept the file

#### Scenario: Admin selects an invalid MIME type
- **WHEN** an administrator selects a file with a MIME type other than JPEG, PNG, or WebP (e.g. PDF, GIF)
- **THEN** the form SHALL display an inline error _"Solo se permiten imágenes JPEG, PNG o WebP"_ and SHALL NOT accept the file

---

### Requirement: useOrgLogoUpload hook manages logo file selection state and upload
The system SHALL provide a `useOrgLogoUpload` hook at `src/hooks/portal/tenant/useOrgLogoUpload.ts`. The hook SHALL manage file selection state, perform client-side MIME and size validation, and call `storageService.uploadOrgLogo` on demand. It SHALL expose `uploading`, `error`, `selectedFile`, `handleFileSelect`, and `upload` in its return value.

#### Scenario: Hook validates MIME type on file selection
- **WHEN** `handleFileSelect` is called with an unsupported MIME type
- **THEN** the hook SHALL set `error` to the MIME validation message and SHALL NOT set `selectedFile`

#### Scenario: Hook validates file size on file selection
- **WHEN** `handleFileSelect` is called with a file exceeding 2 MiB
- **THEN** the hook SHALL set `error` to the size validation message and SHALL NOT set `selectedFile`

#### Scenario: Hook uploads valid file and returns signed URL
- **WHEN** `upload()` is called with a valid `selectedFile` set
- **THEN** the hook SHALL call `storageService.uploadOrgLogo`, set `uploading = true` during the call, and resolve the returned signed URL

#### Scenario: Hook exposes uploading state during upload
- **WHEN** an upload is in progress
- **THEN** `uploading` SHALL be `true` and `error` SHALL be `null`

---

### Requirement: Logo upload is triggered on form submission
When the edit organization form is submitted and a new logo file has been selected, the system SHALL upload the file via `useOrgLogoUpload.upload()` before calling `tenantService.updateTenant`. The `logo_url` field in the form payload SHALL be set to the resolved signed URL. If no new file was selected, the existing `logo_url` value SHALL be passed unchanged.

#### Scenario: Logo is uploaded and URL persisted on save
- **WHEN** an administrator has selected a valid logo file and submits the edit organization form
- **THEN** the file SHALL be uploaded to `orgs/{tenantId}/brand/logo.{ext}` via upsert
- **THEN** `tenants.logo_url` SHALL be updated to the returned signed URL

#### Scenario: No logo file selected — existing URL preserved on save
- **WHEN** an administrator submits the edit organization form without selecting a new logo file
- **THEN** the existing `tenants.logo_url` value SHALL be sent unchanged in the update payload

#### Scenario: Form submit is blocked while logo upload is in progress
- **WHEN** a logo upload is in progress (`uploading = true`)
- **THEN** the form submit button SHALL be disabled to prevent double-submission

---

### Requirement: TenantIdentityCard refreshes signed URL on image load failure
`TenantIdentityCard` SHALL handle logo image load errors by calling `storageService.getSignedUrl` to refresh the signed URL and retry rendering. This prevents display failures when a stored signed URL approaches expiry between logo re-uploads.

#### Scenario: Logo renders correctly with a valid signed URL
- **WHEN** `TenantIdentityCard` renders and `logo_url` contains a valid signed URL
- **THEN** the `<img>` element SHALL load and display the logo without error

#### Scenario: Logo re-fetches signed URL on image load error
- **WHEN** the `<img>` element fires an `onError` event (e.g. expired signed URL)
- **THEN** the component SHALL call `storageService.getSignedUrl` to generate a fresh URL and SHALL re-attempt rendering the logo
