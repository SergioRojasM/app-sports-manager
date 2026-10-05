## ADDED Requirements

### Requirement: Event banner storage path and read access
Event banners SHALL be stored in the `org-assets` bucket at `orgs/{tenantId}/eventos/{eventoId}.{ext}`, built by `buildEventoBannerPath(tenantId, eventoId, ext)` in `src/types/portal/storage.types.ts`.
- Uploads SHALL use `upsert: true` and are authorized by the existing `org_admin_upload` / `org_admin_update` policies.
- A new SELECT policy `event_banner_read` SHALL allow any `authenticated` user to read objects whose first folder is `orgs` and whose third folder is `eventos`, mirroring `public_training_banner_read`.
- `storageService.uploadEventoBanner(supabase, tenantId, eventoId, file)` SHALL return `{ signedUrl, path }`, with a signed URL valid for `SIGNED_URL_TTL`. The signed URL is the value persisted in `eventos.banner_url`.

#### Scenario: Admin uploads an event banner
- **WHEN** an administrator of T uploads `banner.png` for event E
- **THEN** the object SHALL be stored at `orgs/T/eventos/E.png`, and the function SHALL return a signed URL and that path

#### Scenario: Re-upload overwrites
- **WHEN** the administrator uploads a new banner for the same event with the same extension
- **THEN** the existing object SHALL be replaced without error

#### Scenario: Non-admin cannot upload
- **WHEN** a user without the `administrador` role in T uploads to `orgs/T/eventos/E.png`
- **THEN** the storage API SHALL return a 403-equivalent error

#### Scenario: Other-tenant user can read
- **WHEN** an authenticated user with no membership in T requests `orgs/T/eventos/E.png`
- **THEN** the object SHALL be readable
