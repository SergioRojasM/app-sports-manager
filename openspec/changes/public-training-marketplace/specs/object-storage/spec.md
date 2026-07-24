## ADDED Requirements

### Requirement: RLS policy enforces public read rights for training publication banners
The system SHALL define a SELECT policy on `storage.objects` granting any authenticated user — regardless of tenant membership — read access to files under `orgs/{tenantId}/entrenamientos-publicos/` in the `org-assets` bucket. This is distinct from the membership-gated `org_member_read` policy, since publication banners must be visible to cross-tenant marketplace visitors. Upload, update, and delete access to this path remain governed by the existing `org_admin_upload`/`org_admin_update`/`org_admin_delete` policies (tenant admin only) — no new write policy is introduced.

#### Scenario: Non-member reads a publication banner
- **WHEN** an authenticated user with no membership in `tenantId` requests a file under `orgs/{tenantId}/entrenamientos-publicos/`
- **THEN** the object SHALL be accessible (RLS `public_training_banner_read` policy allows SELECT)

#### Scenario: Non-admin cannot upload a publication banner
- **WHEN** an authenticated user without `administrador` role in `tenantId` attempts to upload to `orgs/{tenantId}/entrenamientos-publicos/`
- **THEN** the storage API SHALL return a 403-equivalent error, since no INSERT policy grants this to non-admins

#### Scenario: Files outside the org-assets bucket are unaffected
- **WHEN** a request targets a path in a different bucket or a different subpath under `orgs/{tenantId}/`
- **THEN** the `public_training_banner_read` policy SHALL NOT apply
