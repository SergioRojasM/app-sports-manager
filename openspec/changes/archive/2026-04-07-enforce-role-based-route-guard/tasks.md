## 1. Git Setup

- [x] 1.1 Create a new branch: `feat/enforce-role-based-route-guard`
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop`

## 2. Cache Helper

- [x] 2.1 Create `src/lib/portal/tenant-access.cache.ts` — export `getCachedTenantAccess` wrapping `tenantService.canUserAccessTenant` with React `cache()`

## 3. Update TenantLayout

- [x] 3.1 Update `src/app/portal/orgs/[tenant_id]/layout.tsx` to import and use `getCachedTenantAccess` instead of calling `tenantService.canUserAccessTenant` directly

## 4. Route Group Layouts

- [x] 4.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/layout.tsx` — call `getCachedTenantAccess`, redirect if `decision.role !== 'administrador'`
- [x] 4.2 Create `src/app/portal/orgs/[tenant_id]/(atleta)/layout.tsx` — call `getCachedTenantAccess`, redirect if `decision.role !== 'usuario'`
- [x] 4.3 Create `src/app/portal/orgs/[tenant_id]/(entrenador)/layout.tsx` — call `getCachedTenantAccess`, redirect if `decision.role !== 'entrenador'`
- [x] 4.4 Create `src/app/portal/orgs/[tenant_id]/(shared)/layout.tsx` — call `getCachedTenantAccess`, redirect if `!decision.allowed || !decision.role`

## 5. Verification

- [x] 5.1 Run `tsc --noEmit` and confirm no TypeScript errors
- [x] 5.2 Test: log in as `usuario`, navigate directly to `/portal/orgs/[id]/gestion-organizacion` → expect redirect to tenant root
- [x] 5.3 Test: log in as `usuario`, navigate directly to `/portal/orgs/[id]/atletas` → expect redirect
- [x] 5.4 Test: log in as `administrador`, navigate directly to `/portal/orgs/[id]/mis-suscripciones-y-pagos` → expect redirect
- [x] 5.5 Test: log in as `entrenador`, navigate directly to `/portal/orgs/[id]/gestion-disciplinas` → expect redirect
- [x] 5.6 Test: each role accessing their own permitted routes renders normally

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md` — add `layout.tsx` entries for `(administrador)/`, `(atleta)/`, `(entrenador)/`, `(shared)/` and document `src/lib/portal/tenant-access.cache.ts`

## 7. Commit

- [x] 7.1 Stage all changed files and write commit message: `feat: enforce role-based route guard on tenant route groups`
- [x] 7.2 Write pull request description summarizing the security fix, files added/modified, and test steps
