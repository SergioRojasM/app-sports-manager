# Capability: object-storage

## Purpose
Defines the Supabase Object Storage infrastructure for the application: the `org-assets` private bucket, RLS policies controlling upload/read/delete access by role and tenant, automatic folder initialization on tenant creation, the `storageService` outbound adapter, and the TypeScript path-builder types.

## Requirements

### Requirement: org-assets storage bucket is provisioned via migration
The system SHALL create a private Supabase Storage bucket named `org-assets` via a SQL migration. The bucket MUST be configured with `public = false`, a file size limit of `10485760` bytes (10 MiB), and allowed MIME types `image/jpeg`, `image/png`, `image/webp`, `image/gif`, and `application/pdf`.

#### Scenario: Bucket exists after migration
- **WHEN** the migration `20260324000100_create_org_assets_bucket.sql` is applied
- **THEN** `storage.buckets` SHALL contain a row with `id = 'org-assets'`, `public = false`, and `file_size_limit = 10485760`

#### Scenario: Bucket creation is idempotent
- **WHEN** the migration is applied more than once
- **THEN** the bucket row SHALL exist exactly once (ON CONFLICT DO NOTHING)

---

### Requirement: RLS policies enforce org-admin upload and update rights
The system SHALL define RLS policies on `storage.objects` so that only active `administrador` members of a tenant can INSERT or UPDATE files under the `orgs/{tenantId}/` prefix in the `org-assets` bucket. The tenant is resolved from the second path segment using `(storage.foldername(name))[2]::uuid`. Membership and role are verified against `miembros_tenant` and `roles` tables.

#### Scenario: Admin uploads a file to their org prefix
- **WHEN** an authenticated administrator calls upload to `orgs/{tenantId}/brand/logo.jpg`
- **THEN** the operation SHALL succeed (RLS `org_admin_upload` policy allows INSERT)

#### Scenario: Admin upserts a file to their org prefix
- **WHEN** an authenticated administrator calls upsert (upload with `upsert: true`) to `orgs/{tenantId}/brand/logo.jpg`
- **THEN** the operation SHALL succeed (RLS `org_admin_update` policy allows UPDATE)

#### Scenario: Non-admin cannot upload to org prefix
- **WHEN** an authenticated user without `administrador` role attempts to upload to `orgs/{tenantId}/brand/logo.jpg`
- **THEN** the storage API SHALL return a 403-equivalent error

#### Scenario: Admin cannot upload to a different org prefix
- **WHEN** an authenticated administrator of tenant A attempts to upload to `orgs/{tenantIdB}/brand/logo.jpg`
- **THEN** the storage API SHALL return a 403-equivalent error

---

### Requirement: RLS policy enforces org-member read rights
The system SHALL define a SELECT policy on `storage.objects` so that any active member of a tenant (any role) can read files under `orgs/{tenantId}/` in the `org-assets` bucket.

#### Scenario: Active member reads a file from their org
- **WHEN** an authenticated user with any active membership in `tenantId` requests a file under `orgs/{tenantId}/`
- **THEN** the object metadata SHALL be accessible (RLS `org_member_read` policy allows SELECT)

#### Scenario: User with no membership cannot read org files
- **WHEN** an authenticated user with no membership in `tenantId` attempts to access a file under `orgs/{tenantId}/`
- **THEN** the storage API SHALL return a 403-equivalent error

---

### Requirement: RLS policy restricts athlete receipt upload to own user path
The system SHALL define an INSERT policy on `storage.objects` so that a user can only upload to `orgs/{tenantId}/users/{userId}/receipts/` where `{userId}` equals `auth.uid()`. Cross-user receipt uploads SHALL be blocked.

#### Scenario: Athlete uploads receipt to own path
- **WHEN** an authenticated athlete uploads to `orgs/{tenantId}/users/{auth.uid()}/receipts/{pagoId}.pdf`
- **THEN** the upload SHALL succeed (RLS `athlete_upload_own_receipts` policy allows INSERT)

#### Scenario: Athlete cannot upload to another user's receipts path
- **WHEN** an authenticated athlete uploads to `orgs/{tenantId}/users/{otherUserId}/receipts/proof.pdf`
- **THEN** the storage API SHALL return a 403-equivalent error

---

### Requirement: Org folder structure is initialized automatically on tenant creation
When a new `tenants` row is inserted, the system SHALL automatically initialize the folder structure in `org-assets` by uploading `.keep` placeholder files to the following paths: `orgs/{tenantId}/brand/.keep`, `orgs/{tenantId}/users/.keep`, `orgs/{tenantId}/trainings/.keep`, `orgs/{tenantId}/events/.keep`. This initialization MUST use a service-role Supabase client (bypassing RLS) and SHALL be implemented as a Postgres database function triggered on `INSERT` into `public.tenants`.

#### Scenario: Folders are created when a new tenant is inserted
- **WHEN** a new row is inserted into `public.tenants`
- **THEN** the four `.keep` placeholder files SHALL exist in `org-assets` under `orgs/{newTenantId}/`

#### Scenario: initOrgFolders is idempotent
- **WHEN** the initialization function is triggered for a tenant that already has the placeholder files
- **THEN** the function SHALL complete without error (upsert semantics, no duplicate error)

---

### Requirement: Storage service exposes typed functions as the outbound adapter
The system SHALL expose a `storageService` object at `src/services/supabase/portal/storage.service.ts` implementing the following functions: `uploadOrgLogo(supabase, tenantId, file)`, `uploadPaymentProof(supabase, tenantId, userId, pagoId, file)`, and `getSignedUrl(supabase, path, expiresIn?)`. All functions accept a `SupabaseClient` as first argument following the existing service layer convention from `tenant.service.ts`.

#### Scenario: uploadOrgLogo returns a signed URL
- **WHEN** `uploadOrgLogo` is called with a valid `tenantId` and a JPEG/PNG/WebP file
- **THEN** it SHALL upload the file to `orgs/{tenantId}/brand/logo.{ext}` using upsert and return a signed URL string with a 1-year TTL

#### Scenario: uploadPaymentProof returns a signed URL
- **WHEN** `uploadPaymentProof` is called with valid `tenantId`, `userId`, `pagoId`, and an allowed file
- **THEN** it SHALL upload the file to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` and return a signed URL string

#### Scenario: getSignedUrl returns a signed URL for a given path
- **WHEN** `getSignedUrl` is called with a valid object path in `org-assets`
- **THEN** it SHALL return a signed URL with the specified TTL (default 31536000 seconds)

---

### Requirement: Storage types define path contracts and service interfaces
The system SHALL define storage-related TypeScript types at `src/types/portal/storage.types.ts` including path builder helpers (`buildOrgLogoPath`, `buildReceiptPath`) and the `StorageUploadResult` type. These types establish the contract between the service layer and its callers.

#### Scenario: Path builder produces correct logo path
- **WHEN** `buildOrgLogoPath(tenantId, ext)` is called
- **THEN** it SHALL return the string `orgs/{tenantId}/brand/logo.{ext}`

#### Scenario: Path builder produces correct receipt path
- **WHEN** `buildReceiptPath(tenantId, userId, pagoId, ext)` is called
- **THEN** it SHALL return the string `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}`
