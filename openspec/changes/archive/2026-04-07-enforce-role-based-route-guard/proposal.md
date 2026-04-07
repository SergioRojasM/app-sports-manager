## Why

Any authenticated tenant member can access any route inside the tenant (including admin-only pages) by navigating directly to the URL, because Next.js route groups provide no runtime protection. A `usuario` or `entrenador` can reach `gestion-organizacion`, `gestion-disciplinas`, or any other `(administrador)` page without restriction.

## What Changes

- Add a `layout.tsx` to each of the four tenant route groups — `(administrador)`, `(atleta)`, `(entrenador)`, and `(shared)` — that verifies the user's role from the database before rendering children.
- Introduce a React `cache()`-wrapped helper (`src/lib/portal/tenant-access.cache.ts`) so the `canUserAccessTenant` DB call is deduplicated across the nested layout chain within a single request.
- Update the existing `TenantLayout` (`src/app/portal/orgs/[tenant_id]/layout.tsx`) to consume the same cached helper.
- All access control decisions use only server-side DB data — never cookies or client-supplied values.

## Capabilities

### New Capabilities
- `tenant-role-route-guard`: Server-side role verification layouts for each tenant route group. A user is only permitted to view pages in a route group whose required role matches their actual database role.

### Modified Capabilities
- `portal-role-navigation`: The deduplication helper and updated `TenantLayout` change how the membership/role lookup is performed inside the tenant routing layer, though the navigation spec requirements themselves are unchanged.

## Impact

- **Files created**: `src/lib/portal/tenant-access.cache.ts`, four new `layout.tsx` files inside `(administrador)/`, `(atleta)/`, `(entrenador)/`, and `(shared)/`.
- **Files modified**: `src/app/portal/orgs/[tenant_id]/layout.tsx` (use cached helper).
- **No database changes**: No migrations, no new tables, no RLS changes.
- **No API changes**: No new server actions or routes.
- **No UI changes**: Redirects are silent and server-side.

## Non-goals

- This change does not modify the middleware — the middleware only validates session presence and that is sufficient for its scope.
- This change does not add any error or forbidden page UI (access failures redirect silently to the tenant root page).
- This change does not affect the `portal_role` cookie logic in `bootstrap/route.ts`.
