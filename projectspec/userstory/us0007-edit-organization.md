# User Story: Edit Organization Information (`edit_organization`)

## ID
US-0007

## Name
Implement organization edit feature with right-side panel modal at `/portal/gestion-organizacion`

### As a...
As an authenticated user with `administrador` role

### I want...
I want to open an edit action from organization management and update organization data using a right-side panel modal (drawer) based on the visual pattern from `projectspec/designs/07_edit_organization.html`

### So that...
I can keep my organization profile information up to date without leaving the current page context.

## Description
Implement the `edit_organization` feature on top of the existing `US-0006` organization view (`/portal/gestion-organizacion`).

The feature must allow an admin to:
1. Open a right-side overlay modal/drawer from the organization view.
2. See a prefilled form with current organization data.
3. Edit and save organization fields.
4. Close the drawer with cancel or close actions.

Visual behavior must follow the interaction style from `projectspec/designs/07_edit_organization.html`:
- dark translucent full-screen overlay,
- panel attached to the right side,
- fixed header/body/footer sections,
- primary save action + secondary cancel action.

Important scope rule for this user story:
- **Only the `public.tenants` table is used in this feature**. No data from trainers/coaches or scenarios is part of read/update logic.

The implementation must follow the current architecture standard from `projectspec/03-project-structure.md`:
- Delivery: `src/app/portal/(administrador)/gestion-organizacion/page.tsx`
- Presentation: `src/components/portal/organization-view/*`
- Application: `src/hooks/portal/organization-view/*`
- Infrastructure: `src/services/supabase/portal/organization-view.service.ts`
- Domain contracts: `src/types/portal/organization-view.types.ts`

## Functional Scope

### 1) Entry and access
1. Keep route at `GET /portal/gestion-organizacion`.
2. Feature is available only for authenticated `administrador` role users.
3. Existing role-based navigation behavior must remain unchanged.

### 2) Edit trigger behavior
4. Add/edit an `Edit organization` CTA in the organization management view.
5. Clicking the CTA opens the right-side drawer.
6. Drawer can be closed by:
   - close icon,
   - cancel button,
   - `Esc` key,
   - clicking outside panel (overlay).

### 3) Form behavior
7. On open, load current organization values and prefill form controls.
8. Disable save action while submitting.
9. Show inline validation errors before submission when required.
10. Show non-blocking save error message if persistence fails.
11. On successful save:
    - close drawer,
    - refresh organization cards data in place,
    - show success feedback (toast/banner message using existing UI pattern).

### 4) Fields editable in this story
12. Editable fields (source table `public.tenants`):
    - `nombre`
    - `descripcion`
    - `logo_url` (via URL input in this iteration)
    - `email`
    - `telefono`
    - `web_url`
    - `instagram_url`
    - `facebook_url`
    - `x_url`

### 5) Fields explicitly not editable
13. Non-editable fields in this story:
    - role/system metadata and IDs.

## Data Rules and Mapping

### Tenant update target
1. Resolve current tenant from authenticated user profile (`usuarios.tenant_id`).
2. Update exactly one record in `public.tenants` where `id = tenant_id`.
3. All reads and writes in this user story must target only `public.tenants`.

## Validation Rules

### Required
- `nombre`
- `email`

### Format validations
- `email`: valid email format.
- `web_url`, `instagram_url`, `facebook_url`, `x_url`, `logo_url`: valid URL when provided.
- `telefono`: max 30 chars, allow symbols `+`, `-`, spaces, parentheses.
- `descripcion`: max 500 chars.
- `nombre`: min 2 / max 120 chars.

### Normalization
- Trim leading/trailing spaces for all text inputs.
- Convert empty optional fields to `null` before persistence.

## Endpoints and URLs

### App route
- `GET /portal/gestion-organizacion` → renders organization management page with edit drawer support.

### Persistence (service layer using Supabase SDK)
No new REST API endpoint is required. Use service methods:

1. Fetch editable payload:
- `tenants` by `tenant_id`.

2. Update tenant:
- `from('tenants').update({...}).eq('id', tenantId).select().single()`


## Files to Modify (expected)

### Delivery
1. `src/app/portal/(administrador)/gestion-organizacion/page.tsx`

### Presentation (`organization-view`)
2. `src/components/portal/organization-view/OrganizationInfoCards.tsx` (wire edit trigger)
3. `src/components/portal/organization-view/EditOrganizationDrawer.tsx` (new)
4. `src/components/portal/organization-view/EditOrganizationForm.tsx` (new)

### Application
5. `src/hooks/portal/organization-view/useEditOrganization.ts` (new)
6. `src/hooks/portal/organization-view/useOrganizationView.ts` (refresh integration after save)

### Infrastructure
7. `src/services/supabase/portal/organization-view.service.ts` (add update methods)

### Domain contracts
8. `src/types/portal/organization-view.types.ts` (add DTOs for edit form + update payload)

### Optional docs
9. `README.md` (route capabilities + edit behavior note)

## Suggested Contracts

### Types
- `OrganizationEditFormValues`
- `OrganizationEditPayload`
- `OrganizationEditResult`

### Hook output
- `openDrawer()`
- `closeDrawer()`
- `isDrawerOpen`
- `initialValues`
- `isSubmitting`
- `submit(values)`
- `error`

## Implementation Steps (autonomous development)
1. Extend domain types for edit view model and update payload.
2. Add/update service methods for fetching editable data and persisting updates.
3. Implement `useEditOrganization` hook for orchestration, validation coordination, and submit lifecycle.
4. Build right-side drawer and form components with current portal style tokens/components.
5. Integrate drawer trigger into organization management page/cards.
6. Refresh read model (`useOrganizationView`) after successful update.
7. Ensure persistence logic updates only `public.tenants`.
8. Add/update tests and docs.

## Definition of Done
1. Admin can open a right-side edit drawer from `/portal/gestion-organizacion`.
2. Drawer is prefilled with current tenant organization data.
3. Save action updates tenant fields in Supabase and reflects changes in the view.
4. Validation, loading state, success feedback, and error feedback are implemented.
5. Only `public.tenants` is read/updated by this feature.
6. No direct Supabase calls from page/components (must use hooks/services).
7. No `any` types introduced in touched files.
8. Lint/typecheck pass for touched files.

## Testing and Validation

### Manual QA checklist
- Open organization management as `administrador`.
- Click edit CTA and verify drawer opens from right.
- Confirm form prefills current values.
- Validate required fields and invalid URL/email behavior.
- Save valid changes and verify data refresh in cards.
- Confirm cancel/close/overlay/Esc close interactions.
- Confirm only tenant organization fields are persisted.

### Unit/Component test guidance
If testing harness exists, add:
1. `useEditOrganization` success path.
2. `useEditOrganization` validation error path.
3. Service update method error propagation.
4. Drawer open/close behavior and submit disabled state.

If no test harness exists in this module, document tests as pending without expanding scope.

## Documentation Updates
1. Update `README.md` portal section to indicate organization data is editable from `/portal/gestion-organizacion`.
2. Document that `US-0007` only uses `public.tenants` for read/update operations.
3. Keep feature slice mapping (`organization-view`) documented for consistency.
4. Reference visual pattern source: `projectspec/designs/07_edit_organization.html`.

## Non-Functional Requirements

### Security
- Enforce authenticated tenant scoping (`tenant_id`) in all reads/updates.
- Respect Supabase RLS policies.
- Avoid logging sensitive payloads in production.

### Performance
- Avoid redundant refetch loops after save.
- Use minimal payload updates (`update` only changed fields where practical).
- Keep form rendering lightweight and avoid unnecessary re-renders.

### Accessibility
- Drawer must be keyboard accessible and focus-managed.
- Inputs must have labels and error text linked semantically.
- Ensure adequate contrast and visible focus states using existing theme tokens.

### Maintainability
- Keep update logic in service/hook layers.
- Keep UI concerns in `components/portal/organization-view`.
- Keep naming and folder conventions aligned with existing architecture.

## Expected Results
- The portal organization screen supports in-place editing through a right-side drawer modal.
- Admin users can update tenant organization profile fields safely and consistently.
- The feature is implemented with clean architecture boundaries and persistence scoped to `public.tenants` only.