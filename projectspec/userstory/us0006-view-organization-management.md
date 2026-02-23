# User Story: View Organization Management Screen (`ver_organizacion`)

## ID
US-0006

## Name
Create organization management view for admin users at `/portal/gestion-organizacion`

### As a...
As an authenticated user with `administrador` role

### I want...
I want to navigate to `/portal/gestion-organizacion` and see organization information cards based on the design in `projectspec/designs/06_view_tenant_information.html`

### So that...
I can quickly review my tenant/team identity and core organization details from a single dashboard view.

## Description
Implement the `OrganizationView` feature (feature alias `ver_organizacion`) inside the admin portal route.
When an admin enters `/portal/gestion-organizacion`, the page must render cards inspired by the design reference (`06_view_tenant_information.html`) while respecting the existing portal shell (sidebar/header) and current role-based access rules.

This story includes visual edit controls from the reference design, but edit actions are not implemented in this iteration (UI-only controls without persistence behavior).

The implementation must follow hexagonal architecture with **feature-first organization** for this module:
- UI in `src/components/portal/organization-view/*`
- orchestration/use cases in `src/hooks/portal/organization-view/*`
- data access in `src/services/supabase/portal/organization-view.service.ts`
- contracts in `src/types/portal/organization-view.types.ts`
- route entry in `src/app/portal/(administrador)/gestion-organizacion/page.tsx`

Shared portal shell concerns (layout, sidebar, header, common navigation primitives) must remain in shared portal locations and not inside `organization-view`.

## Feature Organization Standard (Portal)
Use this convention for all future portal features:
1. Keep route entrypoints in `src/app/portal/...`.
2. Place feature presentation in `src/components/portal/{feature-name}/`.
3. Place feature application logic in `src/hooks/portal/{feature-name}/`.
4. Place feature data access in `src/services/supabase/portal/{feature-name}.service.ts`.
5. Place feature contracts in `src/types/portal/{feature-name}.types.ts`.

For this user story, `{feature-name}` is `organization-view`.

## Functional Scope

### 1) Route behavior
1. Keep route at `GET /portal/gestion-organizacion`.
2. Only users with role `administrador` can access the page through normal navigation.
3. Use existing portal role-based navigation behavior (already configured in `ROLE_MENU_CONFIG`).

### 2) View content (cards)
4. Render organization info as cards inspired by `06_view_tenant_information.html`.
5. Minimum cards required:
   - **Organization Identity Card**
   - **Organization Contact Card**
   - **Organization Social Links Card**
   - **Organization Context Card** (coach/founded/location)
6. Show loading state while data is being resolved.
7. Show empty-state placeholders when values are missing (`—` or equivalent).
8. Show non-blocking error state message if organization data cannot be loaded.
9. Include non-functional edit buttons/controls from the HTML reference as visual placeholders only.

### 3) Data mapping rules
10. Read tenant base data from `public.tenants` filtered by current user `tenant_id`.
11. Resolve “Head Coach” value from `public.usuarios` joined with `public.roles` where role is `entrenador`, same tenant, and `activo = true` (pick first by `created_at` ASC as deterministic fallback).
12. Resolve “Founded” from `tenants.fecha_creacion`.
13. Resolve “Location” from `public.escenarios.ubicacion` for the same tenant, prioritizing active records (`activo = true`), fallback to first available.

## Data / Fields to Read

### From `public.usuarios` (current logged-in profile)
- `id`
- `tenant_id`
- `rol_id`
- `roles.nombre`

### From `public.tenants` (main organization card data)
- `id`
- `nombre`
- `descripcion`
- `logo_url`
- `fecha_creacion`
- `email`
- `telefono`
- `web_url`
- `instagram_url`
- `facebook_url`
- `x_url`

### From `public.usuarios` + `public.roles` (context card)
- `usuarios.nombre`
- `usuarios.apellido`
- `usuarios.activo`
- `usuarios.tenant_id`
- `roles.nombre`

### From `public.escenarios` (context card)
- `tenant_id`
- `ubicacion`
- `activo`

## Endpoints and URLs

### App route
- `GET /portal/gestion-organizacion` → renders admin organization cards view.

### Data access (Supabase SDK, no new REST endpoint)
Use service-layer queries in `src/services/supabase/portal/organization-view.service.ts`:
1. `from('tenants').select('id,nombre,descripcion,logo_url,fecha_creacion,email,telefono,web_url,instagram_url,facebook_url,x_url').eq('id', tenantId).single()`
2. `from('usuarios').select('nombre,apellido,activo,created_at,roles(nombre)').eq('tenant_id', tenantId).eq('activo', true).eq('roles.nombre','entrenador')` (or equivalent joined filter strategy supported by current client)
3. `from('escenarios').select('ubicacion,activo').eq('tenant_id', tenantId).order('activo', { ascending: false })`

## Files to Modify (expected)

### Delivery layer (`app/`)
1. `src/app/portal/(administrador)/gestion-organizacion/page.tsx`

### Presentation layer (`components/`)
2. `src/components/portal/organization-view/OrganizationInfoCards.tsx` (new)
3. `src/components/portal/organization-view/OrganizationIdentityCard.tsx` (new)
4. `src/components/portal/organization-view/OrganizationContactCard.tsx` (new)
5. `src/components/portal/organization-view/OrganizationSocialLinksCard.tsx` (new)
6. `src/components/portal/organization-view/OrganizationContextCard.tsx` (new)

### Application layer (`hooks/`)
7. `src/hooks/portal/organization-view/useOrganizationView.ts` (new)

### Infrastructure layer (`services/`)
8. `src/services/supabase/portal/organization-view.service.ts` (new)
9. `src/services/supabase/portal.ts` (optional: keep only shared/legacy portal methods or re-export feature service)

### Domain contracts (`types/`)
10. `src/types/portal/organization-view.types.ts` (new)
11. `src/types/portal.types.ts` (optional: keep shared role/menu contracts only)

### Optional adjustments (only if needed)
12. `src/components/portal/PortalNavMenu.tsx` (only if active path highlight requires a small fix)
13. `README.md` (portal section update + feature-folder convention)

## Implementation Steps (for autonomous execution)
1. Define strict TypeScript contracts for organization view data in `src/types/portal/organization-view.types.ts`.
2. Add service methods in `src/services/supabase/portal/organization-view.service.ts` to fetch:
   - tenant base info,
   - coach display name,
   - representative location.
3. Build `useOrganizationView` in `src/hooks/portal/organization-view/useOrganizationView.ts` that orchestrates all reads and exposes:
   - `data`, `loading`, `error`.
4. Implement reusable card components under `src/components/portal/organization-view/` with current design tokens/styles already used in portal.
5. Replace placeholder content in `gestion-organizacion/page.tsx` with composed cards.
6. Ensure UI degrades gracefully for null fields.
7. Verify role-based visibility and route behavior manually.
8. Update docs and tests checklist.

## Definition of Done
1. Admin can open `/portal/gestion-organizacion` and see organization cards populated from Supabase.
2. Page follows the card structure inspired by `06_view_tenant_information.html`.
3. Data comes from `tenants` (+ `usuarios/roles` and `escenarios` for context), scoped to logged-in tenant.
4. No direct Supabase calls in page/components (must go through hook/service).
5. Loading, empty, and error states are implemented.
6. TypeScript types are explicit and no `any` is introduced.
7. Feature files are isolated under `organization-view` in `components`, `hooks`, `services`, and `types`.
8. Lint passes for touched files.
9. Documentation is updated.

## Testing and Validation

### Manual QA checklist
- Login with `administrador` user and navigate to `/portal/gestion-organizacion`.
- Identity card displays tenant name/description/logo/founded date.
- Contact card displays tenant email/phone/web.
- Social card displays available links only (or placeholder when missing).
- Context card displays coach name and location fallback behavior.
- Missing DB values render placeholders without runtime errors.
- Existing portal layout (header/sidebar) remains intact.

### Unit/Component test guidance
If test setup exists, add tests for:
1. `useOrganizationView` success path.
2. `useOrganizationView` error path.
3. Card rendering with partial/null data.
4. Deterministic fallback selection (coach/location).

If no test harness exists for this area, document these as pending and do not expand scope beyond this story.

## Documentation Updates
1. Update `README.md` portal routes list with `/portal/gestion-organizacion` purpose.
2. Add short note that `ver_organizacion` is read-only in data behavior for this iteration (edit controls are visual only).
3. Add the portal feature-folder convention (`{feature-name}` slices).
4. Reference design source: `projectspec/designs/06_view_tenant_information.html`.

## Non-Functional Requirements

### Security
- Respect existing Supabase RLS and authenticated access.
- Do not expose secrets/tokens in client logs.
- Keep tenant scoping strict via authenticated user `tenant_id`.

### Performance
- Avoid duplicate queries in nested components.
- Prefer one orchestration hook that resolves all required data.
- Use lightweight rendering for cards and avoid unnecessary client state.

### Accessibility
- Semantic headings for each card.
- Clear labels for fields.
- Keyboard-accessible links for social/contact URLs.
- Preserve contrast/focus states compatible with current portal theme.

### Maintainability
- Keep responsibilities separated by layer.
- Reuse shared portal styles and component patterns.
- Keep feature code isolated under `organization-view` to avoid cross-feature coupling.
- Apply the same folder convention to future portal features (`{feature-name}` slices).

## Expected Results
- The admin portal includes a complete and stable **organization information view** at `/portal/gestion-organizacion`.
- The page reflects team/tenant data through cards aligned with the provided HTML design language.
- The implementation is ready for future extension (edit mode) without refactoring core architecture.