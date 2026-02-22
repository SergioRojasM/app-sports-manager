## 1. Branch Setup

- [x] 1.1 Create branch `feat/portal-dashboard-layout` from the current base branch
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop` before proceeding

## 2. Types

- [x] 2.1 Create `src/types/portal.types.ts` — define `UserRole` (`'admin' | 'athlete' | 'coach'`), `UserProfile`, `MenuItem`, and `ROLE_MENU_CONFIG` constant mapping each role to its ordered menu items (label + href)

## 3. Service — portalService

- [x] 3.1 Create `src/services/supabase/portal.ts` — implement `getUserProfile(userId: string): Promise<UserProfile>` using the **browser** Supabase client; query `public.usuarios` joined with `public.roles` filtered by `id`

## 4. Server Action — setRoleCookie

- [x] 4.1 Create `src/app/actions/portal.actions.ts` with `'use server'` directive
- [x] 4.2 Implement `setRoleCookie(role: UserRole | null): Promise<void>` — writes (or clears with `maxAge: 0`) an httpOnly cookie `portal_role` with `sameSite: 'lax'`, `secure: true`, `path: '/portal'`, TTL 24 h

## 5. Hook — useAuth update

- [x] 5.1 In `src/hooks/auth/useAuth.ts`, after a successful `signInWithPassword`, call `portalService.getUserProfile(userId)` to fetch the user profile
- [x] 5.2 Call `setRoleCookie(profile.role)` Server Action to persist role in cookie
- [x] 5.3 Update post-login redirect from `/dashboard` to `/portal`
- [x] 5.4 On `signOut`, call `setRoleCookie(null)` to clear the cookie before redirecting to `/auth/login`

## 6. Portal Layout — Server Component

- [x] 6.1 Create `src/app/portal/layout.tsx` as a Server Component
- [x] 6.2 Read `portal_role` cookie via `cookies().get('portal_role')` from `next/headers`
- [x] 6.3 Implement fallback: if cookie is absent or invalid, call `portalService.getUserProfile(userId)` using the server Supabase client and invoke `setRoleCookie` to restore cookie
- [x] 6.4 Pass resolved `role` and `userProfile` as props to `PortalSidebar` and `PortalHeader`
- [x] 6.5 Create `src/app/portal/loading.tsx` — minimal loading indicator for the portal segment

## 7. Components — Portal Shell

- [x] 7.1 Create `src/components/portal/RoleBasedMenu.tsx`
- [x] 7.2 Create `src/components/portal/PortalSidebar.tsx`
- [x] 7.3 Create `src/components/portal/UserAvatarMenu.tsx`
- [x] 7.4 Create `src/components/portal/PortalHeader.tsx`

## 8. Hook — usePortalNavigation

- [x] 8.1 Create `src/hooks/portal/usePortalNavigation.ts`

## 9. Portal Pages

- [x] 9.1 Create `src/app/portal/page.tsx` — portal home placeholder
- [x] 9.2 Create `src/app/portal/gestion-organizacion/page.tsx` — admin placeholder
- [x] 9.3 Create `src/app/portal/gestion-escenarios/page.tsx` — admin placeholder
- [x] 9.4 Create `src/app/portal/gestion-entrenamientos/page.tsx` — admin + coach placeholder
- [x] 9.5 Create `src/app/portal/perfil/page.tsx` — athlete + coach placeholder
- [x] 9.6 Create `src/app/portal/entrenamientos-disponibles/page.tsx` — athlete placeholder
- [x] 9.7 Create `src/app/portal/atletas/page.tsx` — coach placeholder

## 10. Middleware & Routing

- [x] 10.1 In `middleware.ts`, add `'/portal'` to `protectedPaths` array alongside `'/dashboard'`
- [x] 10.2 Replace the contents of `src/app/dashboard/page.tsx` with `redirect('/portal')` using `next/navigation`

## 11. Visual Design Alignment

- [x] 11.1 Add `Lexend` font (Google Fonts or `next/font/google`) to `src/app/layout.tsx`
- [x] 11.2 Add Material Symbols Outlined icon font link to `src/app/layout.tsx`
- [x] 11.3 Extend `tailwind.config.ts` with portal design tokens
- [x] 11.4 Add `sidebar-item-active` CSS class (gradient + left border) to `src/app/globals.css`
- [x] 11.5 Verify portal shell renders correctly in dark mode matching `projectspec/designs/dashboard.html`

## 12. Cleanup & Documentation

- [x] 12.1 Update `README.md` — add `/portal` route table, role-based menu matrix, and note on `portal_role` cookie lifecycle
- [x] 12.2 Run `next build` (or `next dev`) and resolve any TypeScript/lint errors
