## Context

The app currently has no file upload infrastructure. `tenants.logo_url` is a free-text field where admins paste raw URLs — there is no validation, no lifecycle governance, and no fallback if a third-party URL breaks. `pagos.comprobante_url` exists in the DB schema and the `SuscripcionModal` already renders a file picker with MIME validation, but the selected `File` object is discarded immediately after filename display — the field is always written as `null`.

This design introduces Supabase Object Storage as the single, governed binary asset layer for the application. All file storage is centralized under one private bucket (`org-assets`) with a deterministic path hierarchy keyed by `tenantId`. Access is enforced by Supabase RLS policies on `storage.objects`. No new npm packages are needed — the existing `@supabase/supabase-js` client already includes the Storage API.

The project follows a hexagonal architecture: UI components go through hooks for business logic, hooks call services for external access, and all data contracts live in `types/`. This layering is respected throughout this design.

---

## Goals / Non-Goals

**Goals:**
- Provision a private `org-assets` Supabase Storage bucket with per-org folder structure via SQL migration
- Implement RLS policies that enforce org-admin upload rights, org-member read rights, and per-user receipt isolation
- Introduce a typed storage service (`storage.service.ts`) as the outbound adapter for all Storage API calls
- Implement `initOrgFolders` (service-role, server-side only) to initialize the folder structure when a new tenant is created
- Replace `logo_url` text input in `EditTenantForm` with a file-upload input that uploads to `orgs/{tenantId}/brand/logo.{ext}` and resolves a signed URL
- Wire the existing comprobante file picker in `SuscripcionModal/useSuscripcion` to perform a real upload and persist the signed URL in `pagos.comprobante_url`

**Non-Goals:**
- No public bucket or CDN — all asset access uses signed URLs (1-year TTL)
- No image compression, resizing, or thumbnail generation
- No training cover or event banner upload (path scheme reserved but deferred)
- No admin UI for browsing or deleting storage objects
- No migration of existing `logo_url` values (existing URLs stay until an admin re-uploads)
- No background cleanup of orphaned/replaced logo files in Storage

---

## Decisions

### 1. Single bucket `org-assets` with path-based namespacing (over multiple buckets)

**Decision:** Use one private bucket with path prefix `orgs/{tenantId}/` to namespace all assets.

**Rationale:** Supabase's `storage.foldername()` helper allows RLS policies to extract path segments and enforce per-tenant and per-user access with a single policy set. Multiple buckets would require separate RLS policies per bucket, increase migration complexity, and make cross-asset signed URL generation inconsistent. One bucket simplifies the service layer — all four functions share the same bucket constant.

**Alternative considered:** One bucket per tenant — rejected because it demands a service-role bucket creation call at org creation time and multiplies management overhead linearly with tenant count.

---

### 2. Signed URLs (1-year TTL) over making the bucket public

**Decision:** Bucket is private; all read access uses signed URLs with a 1-year TTL.

**Rationale:** Organization logos and payment proofs are not public assets. Making the bucket public would allow anyone with a guessable path to access payment receipts, violating the principle of least privilege. Signed URLs with a long TTL give the UX of a stable URL without exposing the bucket publicly. If at any time business requirements change to allow public logos, the bucket policy can be changed independently.

**Alternative considered:** `unauthenticated` read policy on logo paths only — rejected for now; the simpler governance model of "everything signed" is preferable until a genuine public-access requirement exists.

---

### 3. Path for logo: upsert to fixed name `logo.{ext}` (over random UUID filenames)

**Decision:** Upload logo to `orgs/{tenantId}/brand/logo.{ext}` using `upsert: true`.

**Rationale:** A fixed, predictable filename means the signed URL path is stable across re-uploads (only expiry changes). It also avoids accumulating multiple logo versions in Storage. The `upsert: true` flag on the Supabase Storage upload call replaces the existing file atomically.

**Trade-off:** If two admins upload simultaneously, the last write wins — acceptable for a logo field.

---

### 4. Payment proof path: `{pagoId}.{ext}` — create pago first, then upload

**Decision:** Create the `pagos` row first → get `pago.id` → upload file to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` → patch `pagos.comprobante_url`.

**Rationale:** Using the DB-assigned `pago.id` as the filename makes the storage path and the DB record mutually discoverable. Generating a client-side UUID for the path and then inserting the pago with the same ID would require pessimistic collision handling. The patch step (`UPDATE pagos SET comprobante_url = ... WHERE id = ...`) is a single update, and if the upload fails the pago still exists with `comprobante_url = null` — which is the safe fallback (same behavior as today).

**Alternative considered:** Generate UUID client-side (pre-compute path before insert) — rejected because it complicates insert with a predictable ID and adds UUID generation outside the service layer.

---

### 5. `initOrgFolders` uses service-role client (server-side only)

**Decision:** `initOrgFolders` MUST be called from a server action using the service-role Supabase client, not the browser anon client.

**Rationale:** At the moment of org creation, the creating user has no `miembros_tenant` row yet — they are added to the org as admin in the same server action that creates the tenant. An upload attempted with the anon client at that instant would fail RLS because membership check returns no rows. The service-role client bypasses RLS, making the operation safe regardless of timing. This is intentionally restricted to server-side execution only to prevent service-role key exposure.

**Implementation note:** A `createServiceClient()` export must be added to `src/services/supabase/server.ts` if not already present, using `SUPABASE_SERVICE_ROLE_KEY` (server-only env var, no `NEXT_PUBLIC_` prefix).

---

### 6. Client-side validation before upload (size + MIME)

**Decision:** Validate file size and MIME type in the hook/component before calling the service upload function, not only in the service.

**Rationale:** Sending a 30 MiB PDF to the Supabase Storage API before rejecting it wastes bandwidth and degrades perceived performance. Client-side validation provides instant inline error feedback. Server-side limits (bucket 10 MiB, service-level checks) serve as the authoritative enforcement layer — client-side is UX optimization only.

**Limits:**
- Logo: `image/jpeg | image/png | image/webp`, max 2 MiB
- Payment proof: `image/jpeg | image/png | image/webp | application/pdf`, max 5 MiB

---

### 7. Architecture layer assignment

Following the hexagonal convention (`types → service → hook → component`):

| Layer | Artifact | Role |
|-------|----------|------|
| Types | `src/types/portal/storage.types.ts` | Path builder helpers, input/result contracts |
| Service | `src/services/supabase/portal/storage.service.ts` | Outbound adapter — all Storage API calls |
| Hook | `src/hooks/portal/tenant/useOrgLogoUpload.ts` | Logo upload UX state + validation + service call |
| Component | `EditTenantForm.tsx` | Renders file input; delegates state to hook |
| Hook (existing) | `src/hooks/portal/planes/useSuscripcion.ts` | Extended to accept `file` and call payment-proof upload |
| Component (existing) | `SuscripcionModal.tsx` | Passes `File` object (not just filename) to `onConfirm` |

Components never call the storage service directly — all uploads flow through hooks.

---

## Risks / Trade-offs

- **Signed URL expiry drift** → A logo URL stored in `tenants.logo_url` 1 year ago becomes invalid. Mitigation: use a 10-year TTL (max Supabase allows) or, on logo display, refresh the signed URL on page load via a `getSignedUrl` call. For now use 1-year TTL; add a refresh strategy as a follow-up if expiry complaints arise.

- **Upload partial failure (proof upload succeeds, patch fails)** → Storage has the file but `pagos.comprobante_url` remains `null`. Mitigation: the pago is still created successfully; an admin can manually update the URL via admin panel. A future improvement could add a retry mechanism or a Postgres trigger.

- **Concurrent logo replacement** → Two admin sessions uploading simultaneously both write to `logo.{ext}` via upsert; last write wins and the `tenants.logo_url` signed URL might point to a file replaced by the concurrent upload, but both sign the same path so either URL would work after refresh. Acceptable trade-off.

- **initOrgFolders called more than once (idempotency)** → `upsert: true` on the `.keep` placeholder uploads means multiple calls are safe — files are overwritten with identical 0-byte content. No error is thrown.

- **Service-role key in environment** → `SUPABASE_SERVICE_ROLE_KEY` must exist as a server-only variable. If accidentally exposed via a `NEXT_PUBLIC_` prefix, RLS is bypassed for any client. Mitigation: enforce naming convention in environment docs; ensure no component imports `createServiceClient`.

---

## Migration Plan

1. Create migration `supabase/migrations/20260324000100_create_org_assets_bucket.sql`
   - Insert into `storage.buckets`
   - Create RLS policies on `storage.objects`
2. Apply migration locally: `npx supabase db reset` or `npx supabase migration up`
3. Verify bucket and policies visible in Supabase Studio → Storage
4. Add `createServiceClient()` to `src/services/supabase/server.ts` (uses `SUPABASE_SERVICE_ROLE_KEY`)
5. Implement `src/types/portal/storage.types.ts`
6. Implement `src/services/supabase/portal/storage.service.ts`
7. Wire `initOrgFolders` into tenant creation server action; smoke-test locally
8. Implement `useOrgLogoUpload` hook
9. Modify `EditTenantForm` — replace `logo_url` text field
10. Modify `SuscripcionModal` — carry `File | null` through `onConfirm`
11. Modify `useSuscripcion` — add upload step post-`createPago`

**Rollback:** Remove the migration (`supabase migration down` or drop bucket via Studio), revert the three code changes to `EditTenantForm`, `SuscripcionModal`, and `useSuscripcion`. No data loss occurs since `pagos.comprobante_url` remains nullable and `tenants.logo_url` is not dropped.

---

## Open Questions

- **Signed URL refresh for display**: ✅ Resolved — keep 1-year TTL renewed on each logo upload. If an image fails to load (e.g. URL expired before re-upload), `TenantIdentityCard` should catch the `onError` event and call `getSignedUrl` to refresh the URL as a fallback.
- **Supabase UPDATE policy on `storage.objects`**: ✅ Resolved — add an explicit `UPDATE` policy for org admins mirroring the `INSERT` policy, to ensure upsert works correctly.
- **`initOrgFolders` call location**: ✅ Resolved — implement as a Supabase database function (PostgreSQL) triggered automatically when a new row is inserted into `tenants`. The function uses the service-role context to upload `.keep` placeholder files via the Storage HTTP API, keeping the server action clean of any storage initialization logic.
