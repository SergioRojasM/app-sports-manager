# Capability: org-banner-upload

## Purpose
Defines the organization banner upload flow: the banner section in the edit organization form, the `useOrgBannerUpload` hook that manages file selection state and storage upload, the `storageService.uploadOrgBanner` method, and the `TenantIdentityCard` rendering of the banner with graceful fallback to the gradient.

## Requirements

### Requirement: storage.types.ts exposes a banner path helper and input type
`storage.types.ts` SHALL export `buildOrgBannerPath(tenantId: string, ext: string): string` that returns `orgs/{tenantId}/brand/banner.{ext}`. It SHALL also export `UploadOrgBannerInput` with at minimum `tenantId: string` and `file: File`.

#### Scenario: buildOrgBannerPath constructs the canonical path
- **WHEN** `buildOrgBannerPath("abc-123", "png")` is called
- **THEN** it SHALL return `"orgs/abc-123/brand/banner.png"`

---

### Requirement: storageService exposes uploadOrgBanner
`storageService` SHALL expose `uploadOrgBanner(supabase, tenantId, file)` that uploads the file to `orgs/{tenantId}/brand/banner.{ext}` with `upsert: true` and `contentType: file.type`, then calls `createSignedUrl` with `SIGNED_URL_TTL` and returns `StorageUploadResult`. On upload error it SHALL throw. On signed-URL error it SHALL throw.

#### Scenario: Successful upload returns StorageUploadResult
- **WHEN** `uploadOrgBanner` is called with a valid file and the Supabase storage call succeeds
- **THEN** it SHALL return `{ signedUrl: string, path: string }` where `path` equals `orgs/{tenantId}/brand/banner.{ext}`

#### Scenario: Upload error propagates
- **WHEN** the Supabase storage upload call returns an error
- **THEN** `uploadOrgBanner` SHALL throw with that error message

---

### Requirement: useOrgBannerUpload hook manages banner file selection state and upload
The system SHALL provide `useOrgBannerUpload` at `src/hooks/portal/tenant/useOrgBannerUpload.ts`. It SHALL mirror the shape and behavior of `useOrgLogoUpload`: MIME validation (JPEG, PNG, WebP), 2 MiB size limit, `uploading` state, and an `upload(tenantId)` method that calls `storageService.uploadOrgBanner`. It SHALL expose `{ uploading, error, selectedFile, previewUrl, handleFileSelect, upload, reset }`.

#### Scenario: Hook validates MIME type on file selection
- **WHEN** `handleFileSelect` is called with a file whose MIME type is not `image/jpeg`, `image/png`, or `image/webp`
- **THEN** the hook SHALL set `error` to `"Solo se permiten imágenes JPEG, PNG o WebP."` and SHALL NOT set `selectedFile`

#### Scenario: Hook validates file size on file selection
- **WHEN** `handleFileSelect` is called with a file exceeding 2 MiB
- **THEN** the hook SHALL set `error` to `"El archivo no puede superar 2 MB."` and SHALL NOT set `selectedFile`

#### Scenario: Hook returns preview URL for valid selection
- **WHEN** `handleFileSelect` is called with a valid file
- **THEN** `selectedFile` SHALL be set to the file, `previewUrl` SHALL be a non-null object URL, and `error` SHALL be null

#### Scenario: Hook upload calls storageService and returns signed URL
- **WHEN** `upload(tenantId)` is called with a valid `selectedFile` set
- **THEN** the hook SHALL call `storageService.uploadOrgBanner`, set `uploading = true` during the call, and return the resolved `signedUrl`

#### Scenario: Hook reset clears all state
- **WHEN** `reset()` is called
- **THEN** `selectedFile`, `previewUrl`, and `error` SHALL all be null, and `uploading` SHALL be false

---

### Requirement: EditTenantForm renders a banner upload section
`EditTenantForm` SHALL accept an optional `bannerUpload` prop (same shape as `logoUpload`). When provided, it SHALL render a banner upload section below the logo section. The section SHALL include: a horizontal preview area (`h-20 w-full rounded-xl overflow-hidden`) showing the current banner URL or `previewUrl` if selected — or a placeholder with an icon when neither is set; a native file input (`accept="image/jpeg,image/png,image/webp"`); helper text `"JPEG, PNG o WebP. Máximo 2 MB."`; and an inline error display.

#### Scenario: Banner section shows existing banner preview
- **WHEN** `EditTenantForm` renders with `bannerUpload` and `values.banner_url` non-empty and no `previewUrl`
- **THEN** an `<img>` with `src={values.banner_url}` SHALL be rendered inside the preview area

#### Scenario: Banner section shows selected file preview
- **WHEN** `bannerUpload.previewUrl` is non-null
- **THEN** an `<img>` with `src={previewUrl}` SHALL be rendered in the preview area

#### Scenario: Banner section shows placeholder when no banner
- **WHEN** both `values.banner_url` and `bannerUpload.previewUrl` are null/empty
- **THEN** a placeholder element (icon or text) SHALL be rendered instead of an `<img>`

#### Scenario: Banner section shows inline error
- **WHEN** `bannerUpload.error` is non-null
- **THEN** the error message SHALL be rendered below the file input

#### Scenario: Banner section input is disabled during upload
- **WHEN** `bannerUpload.uploading` is true
- **THEN** the file input SHALL be disabled

---

### Requirement: useEditTenant resolves banner URL on form submission
`useEditTenant` SHALL add `banner_url: string` to its form values (initialized from the current DB value; defaults to `''`). It SHALL accept an optional `uploadBanner?: () => Promise<string | null>` in `UseEditTenantOptions`. In `submit()`, after resolving `logoUrl`, if `uploadBanner` is provided it SHALL call it and use the returned value for `bannerUrl`; otherwise, the current `values.banner_url` is used. `toPayload` SHALL include `banner_url: bannerUrl || null`.

#### Scenario: Banner uploaded on form save
- **WHEN** the form is submitted and `uploadBanner` returns a non-null signed URL
- **THEN** `toPayload.banner_url` SHALL be set to that signed URL

#### Scenario: Existing banner_url preserved when no new file selected
- **WHEN** the form is submitted
- **THEN** `uploadBanner` is not provided or returns null, and `values.banner_url` is non-empty
- **THEN** `toPayload.banner_url` SHALL equal `values.banner_url`

#### Scenario: banner_url is null in payload when form value is empty and no upload
- **WHEN** `values.banner_url` is `''` and `uploadBanner` is not provided
- **THEN** `toPayload.banner_url` SHALL be `null`

---

### Requirement: TenantIdentityCard renders banner image with gradient fallback
`TenantIdentityCard` SHALL render the `h-24` header as a cover image (`object-cover`, `w-full`, `h-full`) when `identity.bannerUrl` is non-null. It SHALL include `onError={handleBannerError}` on the `<img>`. `handleBannerError` SHALL attempt to fetch a fresh signed URL from storage for the known extensions (`png`, `jpg`, `webp`); if all attempts fail it SHALL set `bannerSrc = null` so the gradient renders. When `identity.bannerUrl` is null, or after a failed refresh, the existing Tailwind gradient SHALL be the sole visual.
