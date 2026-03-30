## Context

Next.js route groups (`(administrador)`, `(atleta)`, `(entrenador)`, `(shared)`) are purely organizational constructs — they affect URL routing but provide no runtime access control. The existing `TenantLayout` at `src/app/portal/orgs/[tenant_id]/layout.tsx` calls `canUserAccessTenant` and redirects users with no membership, but does not enforce that the user's role matches the specific route group being accessed. As a result, any tenant member can reach any page in any group by navigating directly to the URL.

The access decision source of truth is the `miembros_tenant` table (queried via `tenantService.canUserAccessTenant`). The Supabase client is available server-side in every layout via `createClient()`.

## Goals / Non-Goals

**Goals:**
- Enforce role-scoped access for all four tenant route groups on every page load
- Keep the number of DB round-trips constant (one `canUserAccessTenant` call per request, regardless of how many nested layouts run)
- Use only server-side, database-sourced role data for the access decision

**Non-Goals:**
- Modifying the middleware (session-presence check is sufficient at that layer)
- Adding a 403 / forbidden UI — silent redirect to tenant root is the intended UX
- Fixing the `bootstrap/route.ts` `portal_role` cookie mismatch (separate concern)
- Changing the sidebar navigation or any client component

## Decisions

### 1. Add `layout.tsx` to each route group instead of a single catch-all check

**Decision**: Each route group gets its own `layout.tsx`.

**Rationale**: Next.js App Router's nested layout model is the idiomatic way to scope server logic to a subtree. A single parent layout can't distinguish which group's subtree is being accessed. Using per-group layouts keeps the guard co-located with the routes it protects and makes the constraint immediately visible to future developers.

**Alternative considered**: Checking the pathname inside `TenantLayout` and extracting the group from the URL. Rejected — it requires parsing URL segments and couples the group list to one file.

### 2. React `cache()` wrapper for deduplication

**Decision**: Create `src/lib/portal/tenant-access.cache.ts` that wraps `tenantService.canUserAccessTenant` with React's `cache()` function. All layouts (parent and group) import from this helper.

**Rationale**: React's `cache()` deduplicates identical calls within the same server request render tree. Without it, each nested layout would issue a separate `SELECT` against `miembros_tenant`, turning one request into up to 5 identical queries. `cache()` is the canonical Next.js App Router pattern for this exact scenario.

**Alternative considered**: Passing the decision down via React context. Rejected — server layouts cannot pass data via context across the layout boundary; each layout runs independently.

### 3. Redirect unauthorized access to `/portal/orgs/[tenant_id]`

**Decision**: On role mismatch, redirect to `/portal/orgs/[tenant_id]` (no explicit error page).

**Rationale**: That route's `page.tsx` already handles the role-to-landing redirect, so the user lands on their correct home page. Exposing a 403 page leaks information about route structure. Silent redirect to the correct landing is both safe and good UX.

## Risks / Trade-offs

- **React `cache()` scope**: `cache()` is scoped to a single server request render pass. If any layout triggers a separate render (e.g., via `revalidatePath`), the cache is invalidated and a new query fires. This is expected and acceptable — each real request gets one query.
- **Role changes mid-session**: A user whose role changes in the database will be denied on their next navigation (not immediately). This is inherent to the request-scoped check model and is acceptable given role changes are admin-driven and infrequent.

## Migration Plan

1. Create the cache helper file.
2. Update `TenantLayout` to use the cached helper (no behavior change, just deduplication).
3. Create the four group layouts.
4. Verify TypeScript compiles cleanly.
5. No database migration, no deployment coordination required — purely additive server-side file changes.

**Rollback**: Delete the four group `layout.tsx` files and revert `TenantLayout` to direct `tenantService` call. No data is affected.

## Open Questions

None — the approach is fully determined by the existing codebase patterns.
