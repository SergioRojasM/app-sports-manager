## Why

The current organization management flow at `/portal/gestion-organizacion` is read-only, forcing administrators to leave context or postpone updates to core tenant profile data. This change adds in-place editing so admins can maintain organization information quickly and safely within the portal workflow.

## What Changes

- Add an admin edit flow from organization management using a right-side drawer pattern aligned with `projectspec/designs/07_edit_organization.html`.
- Prefill editable organization fields from the current tenant and allow updates to `public.tenants` only.
- Add validation, submit/loading/error/success feedback, and in-place refresh of organization cards after successful save.
- Preserve current role-based access and portal shell behavior at `/portal/gestion-organizacion`.
- Enforce architecture boundaries: page → component → hook → service → types.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `organization-view`: Extend requirements from read-only display to include tenant-scoped organization edit interactions (drawer open/close, prefilled form, validation, persistence to `public.tenants`, and post-save UI refresh).

## Impact

- Affected route and feature slice: `/portal/gestion-organizacion`, `organization-view`.
- Affected data access: Supabase `tenants` update path scoped by authenticated `tenant_id`.
- Affected UX contracts: organization cards now integrate edit trigger and post-save refresh behavior.
- No new external dependencies are expected; existing Supabase and UI stack remain in use.

## Non-goals

- Editing coach/trainer, scenarios, or any tables other than `public.tenants`.
- Introducing new routes, role changes, or navigation redesign.
- Building a new REST API surface outside existing Supabase service usage.

## Files to Modify or Create

- `src/app/portal/(administrador)/gestion-organizacion/page.tsx`
- `src/components/portal/organization-view/OrganizationInfoCards.tsx`
- `src/components/portal/organization-view/EditOrganizationDrawer.tsx` (new)
- `src/components/portal/organization-view/EditOrganizationForm.tsx` (new)
- `src/hooks/portal/organization-view/useEditOrganization.ts` (new)
- `src/hooks/portal/organization-view/useOrganizationView.ts`
- `src/services/supabase/portal/organization-view.service.ts`
- `src/types/portal/organization-view.types.ts`
- `README.md` (optional update)

## Step-by-step Implementation Plan

1. Extend domain types for editable organization form values and tenant update payload/result.
2. Add service methods to fetch editable tenant fields and persist updates in `public.tenants`.
3. Implement `useEditOrganization` for drawer state, validation orchestration, submit lifecycle, and error/success handling.
4. Build drawer and form components following the existing portal visual pattern and accessibility expectations.
5. Wire edit trigger and submit flow into organization view, then refresh displayed cards after successful save.
6. Validate role/tenant scoping and confirm no direct Supabase access from page/components.
7. Update docs and verify lint/typecheck for touched files.