# Capability: organization-view (delta)

## ADDED Requirements

### Requirement: TenantIdentityPayload includes bannerUrl
`TenantIdentityPayload` in `src/types/portal/tenant.types.ts` SHALL include `bannerUrl: string | null`. When the DB `banner_url` is null this field SHALL be null.

#### Scenario: bannerUrl is populated from DB value
- **WHEN** `getTenantViewData` returns data for a tenant with a non-null `banner_url`
- **THEN** the returned payload's `identity.bannerUrl` SHALL equal that DB value

#### Scenario: bannerUrl is null when DB value is null
- **WHEN** `getTenantViewData` returns data for a tenant with `banner_url = null`
- **THEN** `identity.bannerUrl` SHALL be null

---

### Requirement: TenantEditFormValues and TenantEditPayload include banner_url
`TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `banner_url: string`. `TenantEditPayload` SHALL include `banner_url: string | null`. These follow the same type pattern as the existing `logo_url` fields.

#### Scenario: banner_url is present in form values type
- **WHEN** `TenantEditFormValues` is typed
- **THEN** it SHALL include `banner_url: string`

#### Scenario: banner_url is present in payload type
- **WHEN** `TenantEditPayload` is typed
- **THEN** it SHALL include `banner_url: string | null`
