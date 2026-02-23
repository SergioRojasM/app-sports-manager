## Why

Admin users currently reach `/portal/gestion-organizacion` but only see placeholder content, which blocks a critical operational need: quickly understanding tenant identity, contact channels, and basic organization context in one place. We should implement this now to complete the admin portal baseline and align the experience with the approved HTML design reference.

## What Changes

- Introduce a read-focused `OrganizationView` page at `/portal/gestion-organizacion` using cards based on `projectspec/designs/06_view_tenant_information.html`.
- Keep existing portal shell behavior (header, sidebar, role-based navigation) and replace only page-level placeholder content.
- Add feature-scoped structure for this module using `organization-view` slices across page → components → hooks → service → types.
- Read tenant-scoped data from Supabase (`tenants`, `usuarios`+`roles`, `escenarios`) with loading, empty, and non-blocking error states.
- Render visual edit controls from the design as non-functional UI placeholders (no persistence in this change).

## Capabilities

### New Capabilities
- `organization-view`: Allows authenticated admin users to view organization information cards with tenant-scoped data and resilient UI states.

### Modified Capabilities
- `portal-dashboard-layout`: Clarifies that the admin route `/portal/gestion-organizacion` must render functional organization cards instead of construction placeholder content.

## Impact

- **Affected code**:
  - `src/app/portal/(administrador)/gestion-organizacion/page.tsx`
  - `src/components/portal/organization-view/*` (new)
  - `src/hooks/portal/organization-view/*` (new)
  - `src/services/supabase/portal/organization-view.service.ts` (new)
  - `src/types/portal/organization-view.types.ts` (new)
  - `README.md` (portal route + feature convention update)
- **APIs/DB**: No new external API endpoints; reads only from existing Supabase tables and RLS policies.
- **Dependencies**: No new runtime dependencies expected.
- **Systems**: Impacts portal admin UX and feature-based module organization standards.

## Non-goals

- Implementing save/update flows for organization data.
- Changing role authorization model or portal-wide navigation logic.
- Introducing new backend services, migrations, or third-party integrations.

## Files to be Modified or Created

- Modify: `src/app/portal/(administrador)/gestion-organizacion/page.tsx`, `README.md`
- Create: `src/components/portal/organization-view/*`, `src/hooks/portal/organization-view/*`, `src/services/supabase/portal/organization-view.service.ts`, `src/types/portal/organization-view.types.ts`

## Step-by-step Implementation Plan

1. Define `organization-view` domain contracts in `types`.
2. Implement Supabase read methods in feature service.
3. Implement feature hook to orchestrate data and states.
4. Build organization card components from the approved HTML design.
5. Compose cards in route page and remove placeholder UI.
6. Validate role-scoped access behavior remains intact.
7. Update README and run lint for touched files.
