# US-0043 — Organization Banner Upload

## ID
US-0043

## Name
Organization Banner Upload — replace header gradient with a custom brand banner image

## As a
Organization administrator

## I Want
To upload a banner image for my organization that replaces the default gradient in the organization identity card header

## So That
My organization has a distinct visual identity, and members immediately recognize the org through its brand imagery when visiting the organization view

---

## Description

### Current State

- `TenantIdentityCard` renders a `h-24` header strip using a fixed Tailwind gradient (`bg-gradient-to-r from-primary/45 to-turquoise/35`).
- A placeholder "Edit Banner" button already exists in that header area (`aria-label="Edit organization banner (coming soon)"`), but clicking it does nothing.
- `tenants` table has `logo_url varchar(500)` but no `banner_url` column.
- The `org-assets` bucket already exists with RLS policies that allow org admins to upload/update/delete files under `orgs/{tenantId}/` and org members to read them. No new bucket or RLS changes are required.
- `storage.types.ts` has `buildOrgLogoPath` but no banner path helper.
- `storage.service.ts` has `uploadOrgLogo` but no banner upload method.

### Proposed Changes

#### 1. Database — `banner_url` column on `tenants`

Add a nullable `banner_url varchar(500)` column to `tenants`, mirroring the existing `logo_url` pattern.

#### 2. Storage path

Store the banner at:
```
orgs/{tenantId}/brand/banner.{ext}
```
Uploaded with upsert — overwriting any previous banner for the same org.

#### 3. Storage & type layer

- Add `buildOrgBannerPath(tenantId, ext)` helper to `storage.types.ts`.
- Add `UploadOrgBannerInput` type to `storage.types.ts`.
- Add `uploadOrgBanner(supabase, tenantId, file)` method to `storageService` following the exact same pattern as `uploadOrgLogo` (upsert upload → createSignedUrl → return `StorageUploadResult`).

#### 4. Upload hook — `useOrgBannerUpload`

New hook at `src/hooks/portal/tenant/useOrgBannerUpload.ts`, identical in shape to `useOrgLogoUpload`:
- Same MIME validation (`image/jpeg`, `image/png`, `image/webp`).
- Same 2 MiB size limit (banners are a branding image displayed at low height; 2 MiB is sufficient).
- `upload(tenantId)` calls `storageService.uploadOrgBanner`.
- Returns `{ uploading, error, selectedFile, previewUrl, handleFileSelect, upload, reset }`.

#### 5. Type model changes

`TenantIdentityPayload` (used by `TenantIdentityCard`):
- Add `bannerUrl: string | null`.

`TenantEditFormValues`:
- Add `banner_url: string`.

`TenantEditPayload`:
- Add `banner_url: string | null`.

#### 6. Service layer — `tenant.service.ts`

- Include `banner_url` in all `select` queries that fetch tenant data:
  - `fetchTenantEditData` — populate `values.banner_url`.
  - The query inside `getTenantViewData` (or equivalent function) that maps to `TenantIdentityPayload` — populate `bannerUrl`.
- Include `banner_url` in the `updateTenant` payload mapping.

#### 7. Hook — `useEditTenant`

- Add `banner_url: ''` to `EMPTY_VALUES`.
- Add `uploadBanner?: () => Promise<string | null>` to `UseEditTenantOptions`.
- In `submit()`, after resolving `logoUrl`, resolve `bannerUrl` the same way:
  ```ts
  let bannerUrl = values.banner_url;
  if (uploadBanner) {
    const signedUrl = await uploadBanner();
    if (signedUrl) bannerUrl = signedUrl;
  }
  ```
- Pass `bannerUrl` into `toPayload`.

#### 8. Component — `EditTenantForm`

- Accept an optional `bannerUpload?: BannerUploadState` prop (shape mirrors `LogoUploadState`).
- Render a banner upload section below the logo upload section:
  - A horizontal preview area (`h-20 w-full rounded-xl overflow-hidden`) showing the current banner or a placeholder with a `panorama` icon.
  - A native file picker (`accept="image/jpeg,image/png,image/webp"`).
  - Helper text: `"JPEG, PNG o WebP. Máximo 2 MB."`.
  - Inline error display below the input.

#### 9. Component — `TenantIdentityCard`

- Accept `bannerUrl` from `identity.bannerUrl`.
- Replace the static gradient `div` with a container that:
  - If `bannerUrl` is set: renders `<img src={bannerUrl} alt="Organization banner" className="h-full w-full object-cover" onError={handleBannerError} />` inside the `h-24` container (gradient as fallback via CSS background).
  - If `bannerUrl` is null / after error: shows the existing gradient (keep current CSS as default background).
- Remove the placeholder "Edit Banner" button (it becomes redundant once editing is available in the drawer).
- `handleBannerError`: on `<img>` error, attempt to fetch a fresh signed URL from storage using common extensions (`png`, `jpg`, `webp`) via the same lazy-refresh pattern already used for the logo; fall back to setting `bannerSrc = null` if all attempts fail.

#### 10. Component — `TenantInfoCards`

- Instantiate `useOrgBannerUpload()`.
- Wire `uploadBannerForTenant` callback (same pattern as `uploadLogoForTenant`).
- Pass `uploadBanner` to `useEditTenant` when `bannerUploadHook.selectedFile` is truthy.
- Pass `bannerUpload` state to `EditTenantDrawer` → `EditTenantForm`.

---

## Database Changes

```sql
-- Migration: add banner_url column to tenants
alter table public.tenants
  add column if not exists banner_url varchar(500);
```

No new RLS policies needed. Existing `org_admin_upload`, `org_admin_update`, `org_admin_delete`, and `org_member_read` policies on `storage.objects` already cover `orgs/{tenantId}/brand/banner.{ext}` because they match on `bucket_id = 'org-assets'` and `(storage.foldername(name))[1] = 'orgs'` and verify the acting user's tenant membership.

---

## API / Server Actions

No new server actions or API routes required. All operations use the existing Supabase client-side SDK pattern:

| Operation | Location | Details |
|-----------|----------|---------|
| Upload banner | `storageService.uploadOrgBanner` | `supabase.storage.from('org-assets').upload(path, file, { upsert: true })` then `createSignedUrl` |
| Update tenant | `tenantService.updateTenant` | Existing function — extended to include `banner_url` in the payload |
| Fetch tenant view | `tenantService.getTenantViewData` | Extended select to include `banner_url`, mapped to `identity.bannerUrl` |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_add_banner_url_tenants.sql` | Add `banner_url varchar(500)` column to `tenants` |
| Types | `src/types/portal/storage.types.ts` | Add `buildOrgBannerPath`, `UploadOrgBannerInput` |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadOrgBanner` method |
| Hook | `src/hooks/portal/tenant/useOrgBannerUpload.ts` | New hook — mirrors `useOrgLogoUpload` |
| Types | `src/types/portal/tenant.types.ts` | Add `bannerUrl` to `TenantIdentityPayload`; add `banner_url` to `TenantEditFormValues` and `TenantEditPayload` |
| Service | `src/services/supabase/portal/tenant.service.ts` | Include `banner_url` in all tenant select queries and update payload |
| Hook | `src/hooks/portal/tenant/useEditTenant.ts` | Add `banner_url` to form state; add `uploadBanner` option; resolve banner URL in `submit` |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | Add `bannerUpload` prop and banner upload section UI |
| Component | `src/components/portal/tenant/TenantIdentityCard.tsx` | Render `bannerUrl` as cover image; remove placeholder "Edit Banner" button; add `handleBannerError` lazy-refresh |
| Component | `src/components/portal/tenant/TenantInfoCards.tsx` | Instantiate `useOrgBannerUpload`; wire to `useEditTenant` and `EditTenantForm` |

---

## Acceptance Criteria

1. An org admin opens **Gestión Organización → Editar organización** and sees a "Banner" upload section below the logo section with a horizontal preview placeholder.
2. Selecting a valid JPEG/PNG/WebP file ≤ 2 MiB shows a live preview in the banner section and does not show an error.
3. Selecting a file larger than 2 MiB shows the error `"El archivo no puede superar 2 MB."` and prevents form submission.
4. Selecting a file with an unsupported MIME type shows `"Solo se permiten imágenes JPEG, PNG o WebP."` and prevents form submission.
5. Saving the form with a banner file uploads the file to `orgs/{tenantId}/brand/banner.{ext}` in the `org-assets` bucket, sets `tenants.banner_url` to a signed URL, and shows the success message.
6. After saving, the `TenantIdentityCard` header renders the uploaded banner image instead of the default gradient.
7. If the banner `<img>` fails to load (e.g., expired signed URL), the component attempts to generate a fresh signed URL from storage; if all attempts fail, the gradient fallback is displayed.
8. Saving the form without selecting a banner file does not overwrite the existing `banner_url` value.
9. An org admin with no banner set sees the default gradient header in `TenantIdentityCard` (not a broken image).
10. A non-admin member (athlete, coach) can see the banner image but has no edit controls visible.
11. The existing logo upload flow is unaffected.

---

## Implementation Steps

- [ ] Create migration `supabase/migrations/{timestamp}_add_banner_url_tenants.sql` and apply locally (`npx supabase db reset` or `npx supabase migration up`)
- [ ] Add `buildOrgBannerPath` and `UploadOrgBannerInput` to `src/types/portal/storage.types.ts`
- [ ] Add `uploadOrgBanner` to `src/services/supabase/portal/storage.service.ts`
- [ ] Create `src/hooks/portal/tenant/useOrgBannerUpload.ts`
- [ ] Extend `TenantIdentityPayload`, `TenantEditFormValues`, `TenantEditPayload` in `src/types/portal/tenant.types.ts`
- [ ] Update `tenant.service.ts` — add `banner_url` to selects and update payload
- [ ] Update `useEditTenant.ts` — add `banner_url` state, `uploadBanner` option, resolution in `submit`
- [ ] Update `EditTenantForm.tsx` — add `bannerUpload` prop and UI section
- [ ] Update `TenantIdentityCard.tsx` — render banner, handle error/fallback, remove placeholder button
- [ ] Update `TenantInfoCards.tsx` — wire `useOrgBannerUpload` end-to-end
- [ ] Test manually: upload → save → banner appears in card
- [ ] Test edge cases: no banner (gradient shown), expired URL (error recovery), oversized file, wrong MIME

---

## Non-Functional Requirements

- **Security**: No new RLS policies required — existing `org_admin_upload`, `org_admin_update`, `org_admin_delete`, and `org_member_read` policies on `storage.objects` already protect paths under `orgs/{tenantId}/`. The banner path `orgs/{tenantId}/brand/banner.{ext}` matches these policies. Client-side MIME and size validation are enforced in `useOrgBannerUpload` before any upload call.
- **Performance**: Banner image is fetched via a signed URL with a 1-year TTL (same as logo). No additional queries or indexes required — `banner_url` is a simple nullable varchar.
- **Accessibility**: The file input must have an associated `<label>` with descriptive text (e.g., `"Banner"`). The banner `<img>` in `TenantIdentityCard` must include a meaningful `alt` attribute (e.g., `"{orgName} banner"`). The fallback gradient must remain visible without JS.
- **Error handling**: Upload errors surface as an inline error string below the banner file input (same pattern as logo). A failed signed-URL refresh silently falls back to the gradient. Save errors use the existing drawer-level `submitError` toast.
