# US-0048 — Enforce Role-Based Route Guard on Tenant Route Groups

## ID
US-0048

## Name
Enforce Role-Based Route Guard on Tenant Route Groups

## As a
System (security enforcement on behalf of all authenticated users)

## I Want
Each tenant route group (`(administrador)`, `(atleta)`, `(entrenador)`, `(shared)`) to have its own `layout.tsx` that verifies the authenticated user's role matches the group's required role before rendering any page inside it

## So That
A user with the `usuario` or `entrenador` role cannot access admin-only pages such as `gestion-organizacion` or `gestion-disciplinas` by navigating directly to the URL, and similarly no role can access pages belonging to a different role group

---

## Description

### Current State

`src/app/portal/orgs/[tenant_id]/layout.tsx` verifies that the user has a valid membership in the tenant and obtains their role via `canUserAccessTenant`. However, it does **not** enforce that the role matches the route being accessed — it only redirects when there is no membership at all.

Next.js route groups (`(administrador)`, `(atleta)`, `(entrenador)`, `(shared)`) are organizational only; they provide zero runtime access control. None of these groups currently have a `layout.tsx` file, meaning any authenticated tenant member can access any page under any group by entering the URL directly.

The only exception is `(atleta)/mis-suscripciones-y-pagos/page.tsx`, which has an inline role check.

### Proposed Changes

Create a `layout.tsx` inside each of the four route groups. Each layout must:

1. Create a Supabase server client and obtain the authenticated user.
2. Call `getCachedTenantAccess(supabase, user.id, tenantId)` to get the user's actual role from the database.
3. Verify that `decision.allowed` is `true` **and** that `decision.role` matches the group's required role.
4. If the check fails, redirect to `/portal/orgs/[tenant_id]` (which in turn redirects to the role-appropriate landing page).
5. If the check passes, render `{children}`.

To avoid duplicate database round-trips within a single request (since `TenantLayout` already calls `canUserAccessTenant` for the same user and tenant), wrap `canUserAccessTenant` with React's `cache()` function in a dedicated helper at `src/lib/portal/tenant-access.cache.ts`. Both `TenantLayout` and the new group layouts will call this cached version.

**Role requirements per route group:**

| Route group | Required role |
|---|---|
| `(administrador)` | `administrador` |
| `(atleta)` | `usuario` |
| `(entrenador)` | `entrenador` |
| `(shared)` | any valid role (`administrador`, `usuario`, `entrenador`) — only membership required |

---

## Database Changes

None. No schema or RLS changes required.

---

## API / Server Actions

No new API routes or server actions. The existing `tenantService.canUserAccessTenant` is reused via a cached wrapper.

**New helper**
- **File path**: `src/lib/portal/tenant-access.cache.ts`
- **Export**: `getCachedTenantAccess(supabase, userId, tenantId): Promise<TenantAccessDecision>`
- **Implementation**: Wraps `tenantService.canUserAccessTenant` with React `cache()` so repeated calls within the same server request return the memoized result.
- **Auth**: Called only from Server Components; receives an already-authenticated Supabase client.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Lib helper | `src/lib/portal/tenant-access.cache.ts` | New file — React `cache()` wrapper around `tenantService.canUserAccessTenant` |
| Layout | `src/app/portal/orgs/[tenant_id]/(administrador)/layout.tsx` | New — role guard: `administrador` only |
| Layout | `src/app/portal/orgs/[tenant_id]/(atleta)/layout.tsx` | New — role guard: `usuario` only |
| Layout | `src/app/portal/orgs/[tenant_id]/(entrenador)/layout.tsx` | New — role guard: `entrenador` only |
| Layout | `src/app/portal/orgs/[tenant_id]/(shared)/layout.tsx` | New — membership check (any valid role) |
| Layout | `src/app/portal/orgs/[tenant_id]/layout.tsx` | Modify — replace direct `tenantService.canUserAccessTenant` call with `getCachedTenantAccess` |

---

## Acceptance Criteria

1. A user with role `usuario` who navigates directly to `/portal/orgs/[tenant_id]/gestion-organizacion` is redirected to `/portal/orgs/[tenant_id]`.
2. A user with role `usuario` who navigates directly to `/portal/orgs/[tenant_id]/gestion-disciplinas` is redirected.
3. A user with role `usuario` who navigates directly to `/portal/orgs/[tenant_id]/atletas` is redirected.
4. A user with role `administrador` who navigates directly to `/portal/orgs/[tenant_id]/mis-suscripciones-y-pagos` is redirected.
5. A user with role `entrenador` who navigates directly to `/portal/orgs/[tenant_id]/gestion-organizacion` is redirected.
6. A user with role `entrenador` who navigates directly to `/portal/orgs/[tenant_id]/mis-suscripciones-y-pagos` is redirected.
7. A user with role `administrador` can access all pages under `(administrador)/` without being redirected.
8. A user with role `usuario` can access all pages under `(atleta)/` without being redirected.
9. A user with role `entrenador` can access all pages under `(entrenador)/` without being redirected.
10. All three roles can access pages under `(shared)/` (`gestion-entrenamientos`, `gestion-planes`) without being redirected.
11. A user with no membership in the tenant is still redirected by `TenantLayout` before any group layout is evaluated.
12. Deduplication confirmed: only one DB call to `miembros_tenant` per request even with nested layouts calling `getCachedTenantAccess`.

---

## Implementation Steps

- [ ] Create `src/lib/portal/tenant-access.cache.ts` with a `cache()`-wrapped version of `tenantService.canUserAccessTenant`
- [ ] Update `src/app/portal/orgs/[tenant_id]/layout.tsx` to use `getCachedTenantAccess` instead of `tenantService.canUserAccessTenant`
- [ ] Create `src/app/portal/orgs/[tenant_id]/(administrador)/layout.tsx` with role guard `administrador`
- [ ] Create `src/app/portal/orgs/[tenant_id]/(atleta)/layout.tsx` with role guard `usuario`
- [ ] Create `src/app/portal/orgs/[tenant_id]/(entrenador)/layout.tsx` with role guard `entrenador`
- [ ] Create `src/app/portal/orgs/[tenant_id]/(shared)/layout.tsx` with membership-only guard (any valid role)
- [ ] Test manually: each role attempting to access each forbidden group's routes → redirected
- [ ] Test manually: each role accessing their own routes → no redirect
- [ ] Verify TypeScript compiles with no errors

---

## Non-Functional Requirements

- **Security**: Role is always fetched from the database (`miembros_tenant`) server-side. It must never be read from a client-controlled source (cookie, query param) for access control decisions in these layouts.
- **Performance**: React `cache()` ensures `canUserAccessTenant` executes at most once per server request even when called from multiple nested layouts.
- **Accessibility**: No UI changes; redirects are silent server-side.
- **Error handling**: If `canUserAccessTenant` returns an error or `allowed: false`, redirect to `/portal/orgs/[tenant_id]`. Never render a 500 page for an authorization failure.
