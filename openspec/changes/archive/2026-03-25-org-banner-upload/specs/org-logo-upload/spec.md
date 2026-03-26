# Capability: org-logo-upload (delta)

## ADDED Requirements

### Requirement: storage.types.ts exposes banner path helper alongside logo path helper
`storage.types.ts` SHALL export `buildOrgBannerPath(tenantId: string, ext: string): string` returning `orgs/{tenantId}/brand/banner.{ext}`, and SHALL export `UploadOrgBannerInput`. These additions SHALL not alter any existing export (`buildOrgLogoPath`, `STORAGE_BUCKET`, `SIGNED_URL_TTL`, `StorageUploadResult`, `UploadOrgLogoInput`).

#### Scenario: Banner path helper coexists with logo path helper
- **WHEN** `storage.types.ts` is imported
- **THEN** both `buildOrgLogoPath` and `buildOrgBannerPath` SHALL be available as named exports

---

### Requirement: storageService exposes uploadOrgBanner alongside uploadOrgLogo
`storageService` SHALL add `uploadOrgBanner(supabase, tenantId, file)` following the identical pattern as `uploadOrgLogo` (upsert upload + `createSignedUrl` returning `StorageUploadResult`). The existing `uploadOrgLogo` method SHALL remain unchanged.

#### Scenario: uploadOrgBanner and uploadOrgLogo are both callable
- **WHEN** `storageService` is imported
- **THEN** both `uploadOrgLogo` and `uploadOrgBanner` SHALL be available methods
