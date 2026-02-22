## Why

After successful login, the app has no structured post-login experience — users land on an ad-hoc `/dashboard` page with no shared layout or role-aware navigation. US-0005 establishes the `/portal` segment as the canonical authenticated shell, providing a scalable foundation for all internal modules.

## What Changes

- Create `src/app/portal/layout.tsx` with sidebar + fixed top header + `children` slot
- Add placeholder pages for all role-specific routes under `/portal/*`
- Implement `PortalSidebar` with role-driven menu items (admin / athlete / coach)
- Implement `PortalHeader` with logo, notifications icon, and avatar dropdown (Profile / Logout)
- Resolve user role from `public.usuarios` → `public.roles` via Supabase SDK
- Protect `/portal/*` in `middleware.ts`; redirect unauthenticated users to `/auth/login`
- Redirect post-login flow to `/portal` instead of `/dashboard`
- Deprecate / redirect `src/app/dashboard/page.tsx`

## Capabilities

### New Capabilities
- `portal-dashboard-layout`: Shared post-login shell — `portal/layout.tsx`, `PortalHeader`, `PortalSidebar`, `UserAvatarMenu`, placeholder route pages, and `/portal/*` route protection via middleware
- `portal-role-navigation`: Role resolution from Supabase (`usuarios` + `roles`), role-filtered menu config, active-path tracking — covered by `usePortalNavigation` hook and `portal` service

### Modified Capabilities
*(none — existing login and signup specs are unaffected at the requirements level)*

## Impact

**New files**
- `src/app/actions/portal.actions.ts`
- `src/app/portal/layout.tsx`
- `src/app/portal/page.tsx`
- `src/app/portal/gestion-organizacion/page.tsx`
- `src/app/portal/gestion-escenarios/page.tsx`
- `src/app/portal/gestion-entrenamientos/page.tsx`
- `src/app/portal/perfil/page.tsx`
- `src/app/portal/entrenamientos-disponibles/page.tsx`
- `src/app/portal/atletas/page.tsx`
- `src/components/portal/PortalHeader.tsx`
- `src/components/portal/PortalSidebar.tsx`
- `src/components/portal/UserAvatarMenu.tsx`
- `src/components/portal/RoleBasedMenu.tsx`
- `src/hooks/portal/usePortalNavigation.ts`
- `src/services/supabase/portal.ts`
- `src/types/portal.types.ts`

**Modified files**
- `middleware.ts` — add `/portal/*` protection and post-login redirect to `/portal`
- `src/app/dashboard/page.tsx` — redirect to `/portal` or remove
- `README.md` — document new portal routes and role matrix

## Non-goals

- Full business logic for any internal module (org management, trainings, etc.)
- Real notifications system (header icon placeholder only)
- Action-level authorization beyond menu visibility
- Unit/component tests (tracked as follow-up if no test infra exists)
