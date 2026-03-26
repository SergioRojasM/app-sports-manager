## Why

Organizations want distinct visual identities beyond a logo — a banner image in the identity card header gives admins a powerful branding surface visible to all members on the organization view. The placeholder "Edit Banner" button in `TenantIdentityCard` already signals this intent; this change fulfills it.

## What Changes

- Add `banner_url varchar(500)` column to `tenants` table (mirrors existing `logo_url` pattern).
- Add `buildOrgBannerPath` path helper and `UploadOrgBannerInput` type to `storage.types.ts`.
- Add `uploadOrgBanner` method to `storageService` (upsert to `orgs/{tenantId}/brand/banner.{ext}`, returns `StorageUploadResult`).
- Create `useOrgBannerUpload` hook — mirrors `useOrgLogoUpload` (JPEG/PNG/WebP, 2 MiB limit).
- Extend `TenantIdentityPayload`, `TenantEditFormValues`, and `TenantEditPayload` with `bannerUrl`/`banner_url` fields.
- Update `tenant.service.ts` — include `banner_url` in all select queries and `updateTenant` payload.
- Update `useEditTenant` — add `banner_url` form state, `uploadBanner` option, and resolution in `submit`.
- Update `EditTenantForm` — add banner upload section (preview + file picker) below the existing logo section.
- Update `TenantIdentityCard` — replace static gradient with `<img>` when `bannerUrl` is set; add `handleBannerError` with lazy signed-URL refresh fallback; remove the inert "Edit Banner" placeholder button.
- Update `TenantInfoCards` — instantiate `useOrgBannerUpload`, wire upload callback to `useEditTenant`, pass state to `EditTenantForm`.

## Capabilities

### New Capabilities
- `org-banner-upload`: Upload, store, and display a custom banner image for an organization's identity card header; covers storage path, service method, upload hook, form UI, and card rendering with error fallback.

### Modified Capabilities
- `org-logo-upload`: Storage types (`storage.types.ts`) gains a parallel banner path helper and upload input type alongside the existing logo types; `storageService` gains `uploadOrgBanner` alongside `uploadOrgLogo` — the upload pattern contract is extended.
- `organization-view`: `TenantIdentityCard` rendering behavior changes — the static gradient is conditionally replaced by a banner image; `TenantInfoCards` wires a new upload hook into the edit flow.

## Impact

- **Database**: New `banner_url` column on `tenants` — nullable, no backfill needed.
- **Storage**: No new bucket or RLS policies — existing `org_admin_upload / update / delete` and `org_member_read` policies on `org-assets` already match `orgs/{tenantId}/brand/banner.*`.
- **Types**: `storage.types.ts`, `tenant.types.ts` extended.
- **Services**: `storage.service.ts`, `tenant.service.ts` extended.
- **Hooks**: New `useOrgBannerUpload`; `useEditTenant` updated.
- **Components**: `EditTenantForm`, `TenantIdentityCard`, `TenantInfoCards` updated.
- **No breaking changes** to existing logo upload flow; all existing behaviour preserved.

## Non-goals

- Mobile-specific crop or resize of the banner image.
- Separate banner deletion UI (banner is implicitly cleared by uploading a replacement or by the admin manually; a dedicated delete button is out of scope).
- Animations or transitions when the banner loads.
- Admin-level restriction on who can see the banner — all authenticated members with access to the org view can see it.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_add_banner_url_tenants.sql` | Add `banner_url varchar(500)` to `tenants` |
| Types | `src/types/portal/storage.types.ts` | Add `buildOrgBannerPath`, `UploadOrgBannerInput` |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadOrgBanner` method |
| Hook | `src/hooks/portal/tenant/useOrgBannerUpload.ts` | New hook mirroring `useOrgLogoUpload` |
| Types | `src/types/portal/tenant.types.ts` | Add `bannerUrl` / `banner_url` to identity, form, and payload types |
| Service | `src/services/supabase/portal/tenant.service.ts` | Include `banner_url` in selects and update payload |
| Hook | `src/hooks/portal/tenant/useEditTenant.ts` | Add `banner_url` state, `uploadBanner` option, URL resolution in submit |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | Add `bannerUpload` prop and banner section UI |
| Component | `src/components/portal/tenant/TenantIdentityCard.tsx` | Conditional banner image, error fallback, remove placeholder button |
| Component | `src/components/portal/tenant/TenantInfoCards.tsx` | Wire `useOrgBannerUpload` end-to-end |

## Implementation Steps

1. Create and apply migration (`banner_url` column on `tenants`).
2. Extend `storage.types.ts` with banner path helper and input type.
3. Add `uploadOrgBanner` to `storageService`.
4. Create `useOrgBannerUpload` hook.
5. Extend `tenant.types.ts` with banner fields.
6. Update `tenant.service.ts` selects and update payload.
7. Update `useEditTenant` with banner resolution.
8. Update `EditTenantForm` with banner upload section.
9. Update `TenantIdentityCard` with conditional banner and fallback.
10. Update `TenantInfoCards` to wire everything together.
11. Manual test: upload banner → save → verify card shows banner.
12. Manual test edge cases: no banner (gradient), expired URL (fallback), oversized file, wrong MIME.
