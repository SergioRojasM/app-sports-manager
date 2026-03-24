# US-0041 — Supabase Object Storage Integration

## ID
US-0041

## Name
Supabase Object Storage Integration — org assets, branding, and payment proofs

## As a
Organization administrator or athlete

## I Want
To upload files (organization logo, payment proof) directly from the app, with files stored securely in Supabase Storage under a predictable, scalable per-organization folder structure

## So That
- Admins can brand their organization with a real logo upload instead of a raw URL
- Athletes can attach a payment proof file when subscribing to a plan, removing the need to share receipts out-of-band
- All binary assets are stored in a single, governed bucket under a consistent path hierarchy that scales to future use cases (training covers, event banners, user documents)

---

## Description

### Current State

- `tenants.logo_url` is a free-text URL field — admins type or paste a URL in the edit form. No file upload, no storage governance.
- `pagos.comprobante_url` column exists but is always inserted as `null`. The `SuscripcionModal` has a file picker UI wired for MIME validation only; the selected file is never uploaded or persisted.
- No Supabase Storage bucket exists in the project.
- No `storage.service.ts` or `storage.types.ts` exists; no architectural pattern for object storage has been established yet.

### Proposed Changes

#### 1. Architecture — Storage Service Layer

Introduce a dedicated outbound adapter following the existing hexagonal pattern:

```
src/types/portal/storage.types.ts        ← port / contracts
src/services/supabase/portal/storage.service.ts   ← outbound adapter
```

**Path scheme (all under one private bucket `org-assets`):**

```
orgs/{tenantId}/
  brand/
    logo.{ext}             ← primary logo (used in TenantIdentityCard, header)
    primary-logo.{ext}
    icon.{ext}
    brand-banner.{ext}

  users/{userId}/
    receipts/
      {pagoId}.{ext}       ← payment proof uploaded at subscription time

  trainings/{trainingId}/
    assets/
      cover.{ext}
      banner.{ext}
      thumbnail.{ext}

  events/{eventId}/
    assets/
      cover.{ext}
      banner.{ext}
      social-post-{n}.{ext}
```

Folder initialization uses placeholder `.keep` files uploaded at org-creation time so every top-level prefix is "real" from Supabase Storage's perspective.

#### 2. Bucket: `org-assets`

- **Public**: `false` (all reads require signed URLs or authenticated requests)
- **File size limit**: 10 MiB (bucket-level; individual limits enforced in service)
- **Allowed MIME types** (enforced per path prefix in service, not at bucket level):
  - Brand / training / event images: `image/jpeg`, `image/png`, `image/webp`
  - Payment receipts: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

#### 3. Org Folder Initialization on Creation

When a new tenant is created, call `storageService.initOrgFolders(tenantId)` which uploads a `.keep` placeholder to each first-level prefix:

```
orgs/{tenantId}/brand/.keep
orgs/{tenantId}/users/.keep
orgs/{tenantId}/trainings/.keep
orgs/{tenantId}/events/.keep
```

This call MUST be made with the **service-role** Supabase client (server-side only) because the org creator may not yet have a membership record in the new tenant at the moment of creation.

#### 4. Logo Upload in Edit Organization

Replace the `logo_url` free-text field in `EditTenantForm` with a file-upload input:

- Show current logo preview if `logoUrl` is set (existing behavior).
- "Cambiar logo" button opens a native file picker (accept: `image/jpeg,image/png,image/webp`, max 2 MiB).
- On file selection, validate MIME and size client-side; show inline error if invalid.
- On form submit, if a new file is selected:
  1. Upload to `orgs/{tenantId}/brand/logo.{ext}` (upsert — overwrite if exists).
  2. Get public URL (signed URL with long TTL **or** build deterministic public path if bucket becomes public in future; use signed URL for now).
  3. Set `logo_url` in the form payload to the resolved URL.
- If no new file is selected, keep the existing `logo_url` value unchanged.
- The `useOrgLogoUpload` hook encapsulates upload state (uploading, progress, error).

#### 5. Payment Proof Upload in Subscription Modal

The `SuscripcionModal` already has a file picker UI with MIME validation but the selected file is never uploaded. Wire the full flow:

- On `handleConfirm`, before creating the subscription/payment records:
  1. If a file is selected, upload it to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}`.
  2. Resolve the signed URL and pass it as `comprobante_url` to `pagosService.createPago`.
- The `pagoId` is generated client-side as a UUID before insert so the path can be pre-computed, **or** the file is uploaded after `createPago` and the pago record is patched with the URL.
  - **Preferred**: create pago first → get `pago.id` → upload file to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` → patch `pagos.comprobante_url`.
- File is optional — subscription can still be submitted without a proof upload.
- `useSuscripcion` receives a `file: File | null` parameter added to `SuscripcionSubmitData`.

---

## Database Changes

### 1. Supabase Storage Bucket

Created via migration using `storage.buckets` insert:

```sql
-- 20260324000100_create_org_assets_bucket.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  false,
  10485760, -- 10 MiB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;
```

### 2. RLS Policies on `storage.objects`

```sql
-- Policy: tenant admin can upload/update/delete files under their org prefix
CREATE POLICY "org_admin_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM miembros_tenant mt
    JOIN roles r ON r.id = mt.rol_id
    WHERE mt.tenant_id = (storage.foldername(name))[2]::uuid
      AND mt.user_id = auth.uid()
      AND r.nombre = 'administrador'
      AND mt.estado = 'activo'
  )
);

CREATE POLICY "org_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM miembros_tenant mt
    JOIN roles r ON r.id = mt.rol_id
    WHERE mt.tenant_id = (storage.foldername(name))[2]::uuid
      AND mt.user_id = auth.uid()
      AND r.nombre = 'administrador'
      AND mt.estado = 'activo'
  )
);

-- Policy: any active tenant member can read files under their org prefix
CREATE POLICY "org_member_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM miembros_tenant mt
    WHERE mt.tenant_id = (storage.foldername(name))[2]::uuid
      AND mt.user_id = auth.uid()
      AND mt.estado = 'activo'
  )
);

-- Policy: athlete can upload their own receipts
CREATE POLICY "athlete_upload_own_receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'users'
  AND (storage.foldername(name))[4] = auth.uid()::text
  AND (storage.foldername(name))[5] = 'receipts'
);
```

### 3. No new columns required

`pagos.comprobante_url` already exists (`text | null`). No migration changes needed for that column.

---

## API / Server Actions

### `storageService.initOrgFolders(tenantId: string): Promise<void>`

- **File**: `src/services/supabase/portal/storage.service.ts`
- **Description**: Uploads `.keep` placeholder files to `orgs/{tenantId}/brand/.keep`, `orgs/{tenantId}/users/.keep`, `orgs/{tenantId}/trainings/.keep`, `orgs/{tenantId}/events/.keep`
- **Client**: Server-side Supabase client (service role) — MUST NOT be called from browser
- **Auth**: Service role — bypasses RLS intentionally; called only by server actions
- **Called from**: Server action that creates a new tenant (or a Postgres trigger via Extensions if preferred)

### `storageService.uploadOrgLogo(tenantId: string, file: File): Promise<string>`

- **File**: `src/services/supabase/portal/storage.service.ts`
- **Description**: Uploads file to `orgs/{tenantId}/brand/logo.{ext}`, returns the signed URL (1-year TTL)
- **Client**: Browser Supabase client
- **Auth**: Caller must be active admin of `tenantId` (enforced by RLS policy `org_admin_upload`)
- **Input**: `tenantId: string`, `file: File`
- **Returns**: `string` — signed URL

### `storageService.uploadPaymentProof(tenantId: string, userId: string, pagoId: string, file: File): Promise<string>`

- **File**: `src/services/supabase/portal/storage.service.ts`
- **Description**: Uploads file to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}`, returns signed URL
- **Client**: Browser Supabase client
- **Auth**: Caller must be the owner user (enforced by RLS policy `athlete_upload_own_receipts`)
- **Input**: `tenantId: string`, `userId: string`, `pagoId: string`, `file: File`
- **Returns**: `string` — signed URL

### `storageService.getSignedUrl(path: string, expiresIn?: number): Promise<string>`

- **File**: `src/services/supabase/portal/storage.service.ts`
- **Description**: Generates a signed URL for any object path in `org-assets`
- **Input**: `path: string` (relative to bucket root), `expiresIn?: number` (seconds, default 31536000)
- **Returns**: `string` — signed URL

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/storage.types.ts` | New — `OrgStoragePath`, `UploadOrgLogoInput`, `UploadPaymentProofInput`, `StorageUploadResult` |
| Service | `src/services/supabase/portal/storage.service.ts` | New — `initOrgFolders`, `uploadOrgLogo`, `uploadPaymentProof`, `getSignedUrl` |
| Hook | `src/hooks/portal/tenant/useOrgLogoUpload.ts` | New — file selection state, client-side validation, calls `storageService.uploadOrgLogo` |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Modify — add `file: File | null` to `SuscripcionSubmitData`; call `storageService.uploadPaymentProof` after `createPago` and patch `comprobante_url` |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | Modify — replace `logo_url` text input with `LogoUploadInput` sub-component; integrate `useOrgLogoUpload` |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Modify — pass selected `File` object (not just name) to `onConfirm`; pass it through the existing file input |
| Migration | `supabase/migrations/20260324000100_create_org_assets_bucket.sql` | New — create `org-assets` bucket + RLS policies |
| Service (server) | `src/services/supabase/server.ts` | Verify that a service-role client export exists (or add `createServiceClient()` if not present) |

---

## Acceptance Criteria

1. A Supabase Storage bucket named `org-assets` is created locally via migration and visible in the Supabase Studio Storage panel.
2. When a new tenant is created, the folders `orgs/{tenantId}/brand/`, `orgs/{tenantId}/users/`, `orgs/{tenantId}/trainings/`, `orgs/{tenantId}/events/` are initialized (each containing a `.keep` placeholder) without error.
3. An authenticated admin can navigate to **Gestión Organización → Editar** and see a logo upload field. Selecting a valid image (≤ 2 MiB, JPEG/PNG/WebP) and saving updates `tenants.logo_url` with a Supabase signed URL and the logo appears in `TenantIdentityCard`.
4. Selecting a file larger than 2 MiB in the logo field shows an inline error ("El archivo no puede superar 2 MB") and the form cannot be submitted.
5. Selecting a file with an unsupported MIME type for the logo shows an inline error ("Solo se permiten imágenes JPEG, PNG o WebP") and the form cannot be submitted.
6. An authenticated athlete can open the subscription modal, select a payment proof file (JPEG/PNG/WebP/PDF, ≤ 5 MiB), and confirm. The payment record in `pagos` has `comprobante_url` set to a valid Supabase signed URL pointing to the uploaded file.
7. Submitting the subscription modal without selecting a proof file still works — `comprobante_url` is `null`.
8. A non-admin (athlete or coach) cannot upload to `orgs/{tenantId}/brand/` — the RLS policy returns a 403-equivalent error.
9. An athlete cannot upload a receipt to another user's path (`orgs/{tenantId}/users/{otherUserId}/receipts/`) — RLS policy blocks it.
10. A user with no active membership in the tenant cannot read files under `orgs/{tenantId}/` — RLS policy blocks it.
11. Uploading a logo replaces the previous logo file (upsert via `upsert: true`) rather than accumulating duplicate files.
12. `initOrgFolders` is idempotent — calling it on an org that already has folders does not throw an error.

---

## Implementation Steps

- [ ] Create migration `20260324000100_create_org_assets_bucket.sql` — bucket + RLS policies
- [ ] Apply migration locally (`npx supabase db reset` or `npx supabase migration up`)
- [ ] Add `src/types/portal/storage.types.ts` with path builder helpers and service contracts
- [ ] Add `src/services/supabase/portal/storage.service.ts` implementing all four functions
- [ ] Verify (or add) service-role server client in `src/services/supabase/server.ts`
- [ ] Wire `initOrgFolders` into the tenant creation server action / trigger
- [ ] Create `src/hooks/portal/tenant/useOrgLogoUpload.ts`
- [ ] Modify `EditTenantForm.tsx` — replace `logo_url` text field with file-upload input using `useOrgLogoUpload`
- [ ] Modify `SuscripcionModal.tsx` — expose selected `File` object through `onConfirm` callback signature
- [ ] Modify `useSuscripcion.ts` — add upload step for payment proof; patch `comprobante_url` after `createPago`
- [ ] Manually test happy path: logo upload → save → logo appears in identity card
- [ ] Manually test happy path: subscription with proof → check `pagos.comprobante_url` in Supabase Studio
- [ ] Test error paths: oversized file, wrong MIME, missing logo (should still allow saving without upload)
- [ ] Test RLS: attempt upload as non-admin; attempt cross-user receipt upload

---

## Non-Functional Requirements

- **Security**:
  - All files are stored in a private bucket — no object is publicly accessible without a signed URL.
  - Signed URLs for logos should use a 1-year TTL to avoid constant regeneration; short-lived (1-hour) signed URLs for payment proofs to restrict access.
  - RLS policies on `storage.objects` enforce tenant isolation: users can only read/write files under `orgs/{their tenantId}/`.
  - Athletes can only upload to their own `users/{their userId}/receipts/` path.
  - `initOrgFolders` uses a service-role client and must only be called server-side (never exposed to the browser).
  - File uploads validate MIME type and size client-side (UX) **and** rely on bucket `allowed_mime_types` and `file_size_limit` for server-side enforcement.
  - Never log or expose signed URLs in error messages or client-visible state beyond what is needed.

- **Performance**:
  - Logo upload occurs only on explicit form submit, not on file selection — avoids unnecessary uploads on abandoned edits.
  - `initOrgFolders` uploads 4 tiny `.keep` files; no pagination or indexing needed.
  - Signed URL generation is a single Supabase API call — no caching needed for now.

- **Accessibility**:
  - The logo upload input must have an associated `<label>` and `aria-describedby` pointing to the error message element.
  - File picker button must be keyboard-focusable.
  - Upload progress/status must be conveyed via `aria-live="polite"` region.

- **Error handling**:
  - Logo upload failure → show inline error below the file input in the edit form; block form save.
  - Payment proof upload failure → show inline error in `SuscripcionModal`; pago record that was already created should be soft-deleted or the upload should be retried before submit.
  - Prefer upload-after-record pattern: create pago → upload file → patch URL. If upload fails after pago creation, the pago remains with `comprobante_url = null` and admin can request proof separately — this is acceptable.
  - Network errors surfaced via toast (existing `successMessage` / `error` pattern in `useSuscripcion`).
