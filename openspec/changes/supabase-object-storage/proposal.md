## Why

The application has no file upload infrastructure: `tenants.logo_url` is a free-text field requiring admins to paste raw URLs, and `pagos.comprobante_url` is always `null` despite the subscription modal already having a file-picker UI — the selected file is silently discarded. Introducing Supabase Object Storage closes both gaps and establishes a governed, scalable asset layer for the entire platform.

## What Changes

- **New** Supabase Storage bucket `org-assets` (private, 10 MiB limit) created via DB migration
- **New** RLS policies on `storage.objects` to enforce org-admin upload, org-member read, and per-user receipt isolation
- **New** Storage service layer: `src/types/portal/storage.types.ts` + `src/services/supabase/portal/storage.service.ts`
- **New** `useOrgLogoUpload` hook for client-side validation and upload orchestration
- **New** `initOrgFolders` call wired into the tenant-creation server action
- **Modified** `EditTenantForm` — replaces the `logo_url` free-text input with a file-upload input using `useOrgLogoUpload`
- **Modified** `SuscripcionModal` — exposes the selected `File` object through the `onConfirm` callback (previously only filename was used)
- **Modified** `useSuscripcion` hook — adds upload step: after `createPago`, uploads the proof file and patches `pagos.comprobante_url` with the signed URL

## Capabilities

### New Capabilities

- `object-storage`: Bucket creation, RLS policies, storage service (`initOrgFolders`, `uploadOrgLogo`, `uploadPaymentProof`, `getSignedUrl`), and storage types
- `org-logo-upload`: Logo file-upload field in Edit Organization form; `useOrgLogoUpload` hook; client-side MIME + size validation; upsert to `orgs/{tenantId}/brand/logo.{ext}`
- `payment-proof-upload`: Wires the existing file picker in `SuscripcionModal`/`useSuscripcion` to perform an actual upload to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` and persist the signed URL in `pagos.comprobante_url`

### Modified Capabilities

- `organization-view`: The edit organization form's `logo_url` field changes from a free-text URL input to a file-upload input — requirement-level  behavior change to that form
- `plan-management`: `SuscripcionModal`'s comprobante de pago field was spec'd as "UI only — display filename only; no upload"; this change promotes it to a real upload that sets `comprobante_url` — breaking spec-level behavioral change

## Impact

**Files to create:**
- `supabase/migrations/20260324000100_create_org_assets_bucket.sql` — bucket + RLS
- `src/types/portal/storage.types.ts` — `OrgStoragePath`, `UploadOrgLogoInput`, `UploadPaymentProofInput`, `StorageUploadResult`
- `src/services/supabase/portal/storage.service.ts` — `initOrgFolders`, `uploadOrgLogo`, `uploadPaymentProof`, `getSignedUrl`
- `src/hooks/portal/tenant/useOrgLogoUpload.ts` — file selection state, client-side validation, upload call

**Files to modify:**
- `src/components/portal/tenant/EditTenantForm.tsx` — replace `logo_url` text input with file-upload input + logo preview
- `src/components/portal/planes/SuscripcionModal.tsx` — pass selected `File` object (not just filename) through `onConfirm`
- `src/hooks/portal/planes/useSuscripcion.ts` — add `file: File | null` to `SuscripcionSubmitData`; upload proof after `createPago` and patch `comprobante_url`
- `src/services/supabase/server.ts` — verify or add service-role client export used by `initOrgFolders`
- Tenant creation server action — call `storageService.initOrgFolders(tenantId)` after row insert

**Dependencies:**
- `@supabase/supabase-js` Storage API (already included via existing Supabase client setup)
- No new npm packages required

**Non-goals:**
- No public CDN or public bucket — all reads use signed URLs
- No image resizing, compression, or thumbnail generation
- No training cover or event banner upload (path scheme is defined but implementation deferred)
- No admin UI for browsing or deleting storage objects
- No migration of existing logo URLs (existing free-text URLs remain as-is until an admin re-uploads)

## Implementation Plan

1. **Infrastructure** — Create migration for `org-assets` bucket and all RLS policies; apply locally
2. **Types** — Create `src/types/portal/storage.types.ts` (path builders, input/output contracts)
3. **Service** — Create `src/services/supabase/portal/storage.service.ts` (all four functions)
4. **Server client** — Verify `src/services/supabase/server.ts` exports a service-role client; add if missing
5. **Init folders** — Wire `initOrgFolders` into tenant creation server action
6. **Hook** — Create `useOrgLogoUpload.ts` (file state, MIME/size validation, calls `uploadOrgLogo`)
7. **Component: EditTenantForm** — Replace `logo_url` text field with file-upload input using `useOrgLogoUpload`; keep logo preview
8. **Component: SuscripcionModal** — Update `onConfirm` callback signature to carry `File | null`
9. **Hook: useSuscripcion** — Add `file` to submit data; upload proof after `createPago`; patch `comprobante_url`
