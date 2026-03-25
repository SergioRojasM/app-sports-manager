## ADDED Requirements

### Requirement: Organization edit form logo_url field is a file-upload input
The `logo_url` field in the organization edit form (under `gestion-organizacion/editar`) SHALL no longer be a free-text URL input. It SHALL be replaced by a file-upload input delegating to the `org-logo-upload` capability. The field SHALL only be visible to users with the `administrador` role. The `TenantEditFormValues.logo_url` type SHALL remain `string` (receives the resolved signed URL after upload); `TenantEditPayload.logo_url` SHALL remain `string | null`.

#### Scenario: Admin sees file-upload input instead of URL text field
- **WHEN** an authenticated administrator opens the organization edit form
- **THEN** the `logo_url` field SHALL render as a file-upload input (not a text input) with the current logo preview if set

#### Scenario: Admin saves form without changing the logo
- **WHEN** an administrator opens the edit form, makes changes to other fields (e.g. `nombre`), and submits without selecting a new logo file
- **THEN** `tenants.logo_url` SHALL retain its existing value and no upload call SHALL be made

#### Scenario: Admin saves form after uploading a new logo
- **WHEN** an administrator selects a valid logo file and submits the form
- **THEN** `tenants.logo_url` SHALL be updated to the signed URL of the newly uploaded file
