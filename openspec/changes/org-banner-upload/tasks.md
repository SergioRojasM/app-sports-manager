## 1. Branch Setup

- [x] 1.1 Create and switch to branch `feat/org-banner-upload`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration `supabase/migrations/<timestamp>_add_banner_url_to_tenants.sql` with `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);`
- [x] 2.2 Apply migration locally (`supabase migration up` or `supabase db reset`)

## 3. Types

- [x] 3.1 Add `buildOrgBannerPath(tenantId, ext)` path helper to `src/types/portal/storage.types.ts` (mirrors `buildOrgLogoPath`; path `orgs/{tenantId}/brand/banner.{ext}`)
- [x] 3.2 Add `UploadOrgBannerInput` type to `src/types/portal/storage.types.ts` (`tenantId: string; file: File`)
- [x] 3.3 Add `bannerUrl: string | null` to `TenantIdentityPayload` in `src/types/portal/tenant.types.ts`
- [x] 3.4 Add `banner_url: string` to `TenantEditFormValues` in `src/types/portal/tenant.types.ts` (empty string = no value)
- [x] 3.5 Add `banner_url: string | null` to `TenantEditPayload` in `src/types/portal/tenant.types.ts`

## 4. Services

- [x] 4.1 Add `uploadOrgBanner(supabase, tenantId, file)` method to `src/services/supabase/portal/storage.service.ts` (mirrors `uploadOrgLogo`; calls `buildOrgBannerPath`, upserts, returns `StorageUploadResult`)
- [x] 4.2 Add `banner_url` to the `tenants` SELECT in `fetchTenantIdentity` in `src/services/supabase/portal/tenant.service.ts`; map to `bannerUrl` on the returned `TenantIdentityPayload`
- [x] 4.3 Add `banner_url` to the `tenants` SELECT in `fetchTenantEditData` in `src/services/supabase/portal/tenant.service.ts`; include in the returned `TenantEditFormValues` (coerce null → `''`)
- [x] 4.4 Pass `banner_url` from `TenantEditPayload` in `updateTenant` in `src/services/supabase/portal/tenant.service.ts` (null-coerce same as `logo_url`)

## 5. Banner Upload Hook

- [x] 5.1 Create `src/hooks/portal/tenant/useOrgBannerUpload.ts` mirroring `useOrgLogoUpload` exactly (same MIME allow-list, same 2 MiB limit, same `StorageUploadResult` return); call `storageService.uploadOrgBanner`

## 6. Edit Tenant Hook

- [x] 6.1 Add `banner_url: ''` to `EMPTY_VALUES` in `src/hooks/portal/tenant/useEditTenant.ts`
- [x] 6.2 Add `uploadBanner?: () => Promise<string | null>` to `UseEditTenantOptions`
- [x] 6.3 In `submit()`, resolve banner URL before building the payload (same pattern as `uploadLogo`): call `uploadBanner()` if provided, use returned `signedUrl` when truthy
- [x] 6.4 Pass resolved `banner_url` into `toPayload()`; update `toPayload` to include `banner_url: normalizeNullable(values.banner_url)`

## 7. Edit Tenant Form Component

- [x] 7.1 Add `bannerUpload` prop (shape: `{ previewUrl, error, uploading, onFileSelect }`) to `EditTenantDrawer` / `EditTenantForm` in `src/components/portal/tenant/` (mirrors `logoUpload` prop)
- [x] 7.2 Add banner upload section to the form UI: labelled `<input type="file">`, inline preview `<img>` when `previewUrl` is set, error message when `bannerUpload.error` is truthy

## 8. Tenant Identity Card Component

- [x] 8.1 Destructure `bannerUrl` from `identity` prop in `src/components/portal/tenant/TenantIdentityCard.tsx`
- [x] 8.2 Add `bannerSrc` / `bannerFailed` state and `handleBannerError` callback (mirrors `handleLogoError`; tries extensions via `buildOrgBannerPath`; falls back to gradient when all attempts fail)
- [x] 8.3 Replace the placeholder "Edit Banner" button in the header `div` with a conditional `<img>` element: render `<img src={bannerSrc} onError={handleBannerError}>` when `bannerSrc` is set; keep the gradient as fallback when `bannerSrc` is null

## 9. Tenant Info Cards (Wiring)

- [x] 9.1 Instantiate `useOrgBannerUpload()` hook in `src/components/portal/tenant/TenantInfoCards.tsx`
- [x] 9.2 Add `uploadBannerForTenant` callback (mirrors `uploadLogoForTenant`; guards on `bannerUploadHook.selectedFile`)
- [x] 9.3 Pass `uploadBanner: bannerUploadHook.selectedFile ? uploadBannerForTenant : undefined` to `useEditTenant`
- [x] 9.4 Pass `bannerUpload` object (`previewUrl`, `error`, `uploading`, `onFileSelect`) to `EditTenantDrawer`

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` to document: `useOrgBannerUpload` hook, `banner_url` field in tenant types, and `buildOrgBannerPath` storage helper

## 11. Manual Verification

- [x] 11.1 Upload a valid banner (JPEG/PNG/WebP, ≤ 2 MiB), save → identity card header shows the banner image
- [x] 11.2 Save without selecting a new banner → existing banner is preserved
- [x] 11.3 Select a file over 2 MiB → error shown, upload blocked, save proceeds without overwriting banner
- [x] 11.4 Select an unsupported MIME type (e.g. GIF) → error shown, upload blocked
- [x] 11.5 Simulate an expired banner signed URL → `handleBannerError` retries with `buildOrgBannerPath`; if all attempts fail, gradient background is shown
- [x] 11.6 Org with no banner → gradient background shown in card header (no broken image)

## 12. Commit & PR

- [ ] 12.1 Stage all changes and commit: `feat(org-banner-upload): add banner upload to tenant identity card`
- [ ] 12.2 Push branch and open pull request with description referencing US-0043
