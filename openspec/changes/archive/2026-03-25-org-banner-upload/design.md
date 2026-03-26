## Context

`TenantIdentityCard` already renders a `h-24` header strip and contains a placeholder "Edit Banner" button that does nothing. The `tenants` table has `logo_url` but no `banner_url`. The `org-assets` bucket exists with RLS policies that already cover any path under `orgs/{tenantId}/`, so no storage policy changes are needed. The entire logo upload stack (`useOrgLogoUpload`, `storageService.uploadOrgLogo`, `buildOrgLogoPath`) serves as a direct working template for the new banner capability.

## Goals / Non-Goals

**Goals:**
- Add `banner_url` column to `tenants` with a non-destructive migration.
- Parallel the logo upload stack exactly (path helper → service method → hook → form section → persistence) for the banner.
- Render the banner in `TenantIdentityCard` with a lazy signed-URL refresh fallback to the gradient when the image fails.
- Remove the inert "Edit Banner" placeholder button once the real edit surface exists in the drawer.

**Non-Goals:**
- Banner crop, resize, or CDN optimization.
- Dedicated banner delete UI.
- Separate RLS policies (existing policies already cover the banner path).
- Animations or transitions.

## Decisions

### D1 — Storage path: `orgs/{tenantId}/brand/banner.{ext}`

**Decision**: Store the banner at `orgs/{tenantId}/brand/banner.{ext}`, mirroring the logo path `orgs/{tenantId}/brand/logo.{ext}`.

**Alternatives considered**:
- `orgs/{tenantId}/banner/banner.{ext}` — different subfolder, gains no benefit and deviates from the established convention of grouping brand assets under `brand/`.

**Why**: Consistency with existing structure; existing RLS policies match on `(storage.foldername(name))[1] = 'orgs'` so the banner path is already covered.

---

### D2 — Size limit: 2 MiB

**Decision**: Same 2 MiB limit as the logo.

**Alternatives considered**: 5 MiB — unnecessary; the card renders the banner at `h-24` / small height; large files bring no visual benefit.

**Why**: Consistent with the logo upload hook contract; simple to communicate to admins (`"Máximo 2 MB"`).

---

### D3 — Error fallback: lazy signed-URL refresh matching logo pattern

**Decision**: `TenantIdentityCard` attempts to refresh the signed URL when `<img onError>` fires, using a known extension list (`png`, `jpg`, `webp`). If all attempts fail, `bannerSrc` is set to `null` and the gradient renders.

**Alternatives considered**: Persisting a permanent public URL — rejected; consistent with the security rationale for the logo (no long-lived public URLs).

**Why**: Mirrors the existing `handleLogoError` pattern already in `TenantIdentityCard`; no new pattern needed.

---

### D4 — `banner_url` in `TenantEditFormValues`: same `string` type (not `string | null`)

**Decision**: `banner_url: string` in form values (empty string means no value), `string | null` in the DB payload — identical to the `logo_url` treatment.

**Why**: Controlled forms expect a defined string; null is coerced at the service boundary before the DB write.

## Risks / Trade-offs

- **Expired signed URL on first load** → Mitigated by the `onError` lazy-refresh fallback.
- **Form save without banner file silently preserves existing value** → This is the desired behaviour (matches logo); no risk.
- **`useEditTenant.uploadBanner` option is optional** → If not passed (e.g., banner upload hook not wired), `banner_url` form value is passed as-is to the payload. The form correctly defaults to the existing DB value, so no overwrite occurs.

## Migration Plan

1. Create migration `supabase/migrations/{timestamp}_add_banner_url_tenants.sql`:
   ```sql
   alter table public.tenants add column if not exists banner_url varchar(500);
   ```
2. Apply locally with `npx supabase migration up`.
3. No backfill needed — `banner_url` defaults to `null` for all existing rows.
4. **Rollback**: `alter table public.tenants drop column if exists banner_url;` — safe because no production data depends on this column yet.

## Open Questions

_None — all decisions are resolved by the existing logo upload pattern._
