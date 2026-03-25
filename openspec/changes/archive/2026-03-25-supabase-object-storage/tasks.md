## 1. Branch Setup

- [x] 1.1 Create new branch `feat/supabase-object-storage` from `develop`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Infrastructure — Migration

- [x] 2.1 Create `supabase/migrations/20260324000100_create_org_assets_bucket.sql` — INSERT into `storage.buckets` for `org-assets` (private, 10 MiB, allowed MIME types)
- [x] 2.2 Add RLS policy `org_admin_upload` (INSERT) on `storage.objects` for active org admin
- [x] 2.3 Add RLS policy `org_admin_update` (UPDATE) on `storage.objects` for active org admin (required by upsert)
- [x] 2.4 Add RLS policy `org_admin_delete` (DELETE) on `storage.objects` for active org admin
- [x] 2.5 Add RLS policy `org_member_read` (SELECT) on `storage.objects` for any active org member
- [x] 2.6 Add RLS policy `athlete_upload_own_receipts` (INSERT) on `storage.objects` scoped to `auth.uid()` receipts path
- [x] 2.7 Create Postgres function and trigger on `public.tenants` INSERT to call `initOrgFolders` (uploads `.keep` placeholders via `pg_net` or Supabase Edge Function — follow design decision)
- [x] 2.8 Apply migration locally: `npx supabase migration up` (or `db reset`)
- [x] 2.9 Verify bucket and all RLS policies are visible in Supabase Studio → Storage

## 3. Types

- [x] 3.1 Create `src/types/portal/storage.types.ts` with:
  - `buildOrgLogoPath(tenantId, ext): string`
  - `buildReceiptPath(tenantId, userId, pagoId, ext): string`
  - `StorageUploadResult` type
  - `UploadOrgLogoInput`, `UploadPaymentProofInput` types

## 4. Service — Storage Outbound Adapter

- [x] 4.1 Create `src/services/supabase/portal/storage.service.ts` with `storageService` object
- [x] 4.2 Implement `uploadOrgLogo(supabase, tenantId, file): Promise<string>` — upsert to `orgs/{tenantId}/brand/logo.{ext}`, return 1-year signed URL
- [x] 4.3 Implement `uploadPaymentProof(supabase, tenantId, userId, pagoId, file): Promise<string>` — upload to receipts path, return signed URL
- [x] 4.4 Implement `getSignedUrl(supabase, path, expiresIn?): Promise<string>` — returns signed URL with configurable TTL (default 31536000s)

## 5. Server Client — Service Role

- [x] 5.1 Add `createServiceClient()` export to `src/services/supabase/server.ts` using `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)
- [x] 5.2 Verify `SUPABASE_SERVICE_ROLE_KEY` is present in `.env.local` and not exposed to client bundles

## 6. Hook — useOrgLogoUpload

- [x] 6.1 Create `src/hooks/portal/tenant/useOrgLogoUpload.ts`
- [x] 6.2 Implement file selection state and `handleFileSelect` with client-side MIME validation (`image/jpeg | image/png | image/webp`) — error: _"Solo se permiten imágenes JPEG, PNG o WebP"_
- [x] 6.3 Implement size validation (max 2 MiB) — error: _"El archivo no puede superar 2 MB"_
- [x] 6.4 Implement `upload()` async function that calls `storageService.uploadOrgLogo` and returns the signed URL
- [x] 6.5 Expose `{ uploading, error, selectedFile, previewUrl, handleFileSelect, upload }` from the hook

## 7. Component — EditTenantForm

- [x] 7.1 Modify `src/components/portal/tenant/EditTenantForm.tsx` — remove `logo_url` from the `FIELDS` array
- [x] 7.2 Add a dedicated logo upload section: show current logo preview (`<img>`) if `values.logo_url` is set
- [x] 7.3 Render file input (accept: `image/jpeg,image/png,image/webp`) that integrates with `useOrgLogoUpload`
- [x] 7.4 Display inline error from hook when file is invalid
- [x] 7.5 Disable submit button while `uploading === true`
- [x] 7.6 On form submit with a new file selected: call `upload()` → set `logo_url` in form payload to resolved signed URL before calling `tenantService.updateTenant`
- [x] 7.7 On form submit without a new file: pass existing `values.logo_url` unchanged

## 8. Component — TenantIdentityCard (signed URL fallback)

- [x] 8.1 Locate `TenantIdentityCard` component rendering the org logo `<img>`
- [x] 8.2 Add `onError` handler: call `storageService.getSignedUrl` to refresh the signed URL and update the `src` attribute for retry

## 9. Component — SuscripcionModal

- [x] 9.1 Modify `src/components/portal/planes/SuscripcionModal.tsx` — add `selectedFile: File | null` state (separate from `fileName`)
- [x] 9.2 Update `handleFileChange` to store the `File` object in `selectedFile` state (keep filename display)
- [x] 9.3 Add 5 MiB size validation to `handleFileChange` — error: _"El archivo no puede superar 5 MB."_
- [x] 9.4 Extend `SuscripcionModalProps.onConfirm` signature to `(data: { comentarios: string; metodo_pago_id: string; file: File | null }) => void`
- [x] 9.5 Update `handleConfirm` to pass `file: selectedFile` in the `onConfirm` call

## 10. Hook — useSuscripcion

- [x] 10.1 Extend `SuscripcionSubmitData` in `src/hooks/portal/planes/useSuscripcion.ts` to include `file: File | null`
- [x] 10.2 After `createPago` succeeds, if `data.file` is non-null: call `storageService.uploadPaymentProof(supabase, tenantId, userId, pago.id, data.file)`
- [x] 10.3 On successful upload, call `pagosService.updateComprobanteUrl(supabase, pago.id, signedUrl)` to patch `pagos.comprobante_url`
- [x] 10.4 If upload fails: show non-blocking inline warning (subscription was recorded, proof upload failed) — do NOT revert pago
- [x] 10.5 If `data.file` is null: skip upload and proceed normally (`comprobante_url = null`)
- [x] 10.6 Add `updateComprobanteUrl(supabase, pagoId, url)` to `src/services/supabase/portal/pagos.service.ts` if not present

## 11. Documentation

- [x] 11.1 Update `projectspec/03-project-structure.md` to document:
  - `src/types/portal/storage.types.ts`
  - `src/services/supabase/portal/storage.service.ts`
  - `src/hooks/portal/tenant/useOrgLogoUpload.ts`

## 12. Wrap-up

- [x] 12.1 Manual smoke test: upload a logo in Edit Org → save → verify logo appears in `TenantIdentityCard`
- [x] 12.2 Manual smoke test: subscribe to a plan with a proof file → verify `pagos.comprobante_url` is a valid signed URL in Supabase Studio
- [x] 12.3 Manual smoke test: subscribe without proof → verify `comprobante_url` is `null`
- [x] 12.4 Test RLS: attempt logo upload as non-admin → expect 403
- [x] 12.5 Test RLS: attempt receipt upload to another user's path → expect 403
- [x] 12.6 Create commit with message: `feat(storage): add Supabase Object Storage — org logo upload and payment proof` and open a PR targeting `develop` with a description referencing US-0041
