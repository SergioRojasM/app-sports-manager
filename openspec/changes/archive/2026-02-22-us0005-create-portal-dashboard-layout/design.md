## Context

The app currently has an ad-hoc `/dashboard` route with no shared layout or authentication shell. The `/auth/login` and `/auth/signup` flows are complete, but post-login destination is still `/dashboard`. `middleware.ts` only protects `["/dashboard"]`.

The tech stack is Next.js 15 App Router, React 19, TypeScript 5, Tailwind CSS 4, and Supabase (auth + PostgreSQL). The architecture mandates hexagonal layering: page → component → hook → service → types. Server Components are the default; `'use client'` only where necessary.

Design reference: `projectspec/designs/dashboard.html` — dark navy theme, sidebar left, sticky top header, `Lexend` font, Material Symbols icons, electric-blue/turquoise brand palette.

## Goals / Non-Goals

**Goals:**
- Replace the ad-hoc `/dashboard` with a proper `/portal` App Router segment and shared layout
- Role-based sidebar menu resolving `admin | athlete | coach` from Supabase database
- Fixed header with logo, notifications placeholder, and avatar dropdown (Profile / Logout)
- All `/portal/*` routes protected; unauthenticated users redirected to `/auth/login`
- Clean layer separation: layout owns structure, components own UI, hook owns logic, service owns data

**Non-Goals:**
- Business logic for any internal module (org, trainings, athletes)
- Real notifications system
- Action-level or row-level authorization beyond menu visibility
- Unit/E2E tests in this change

## Decisions

### 1. `/portal` as a Next.js App Router route group with `layout.tsx`

`src/app/portal/layout.tsx` is a Server Component layout that wraps all `/portal/*` pages with `PortalSidebar` + `PortalHeader` + `{children}`. This exploits App Router's built-in layout nesting — no duplication, no conditional rendering across pages.

**Alternative considered:** A single layout in `src/app/layout.tsx` with conditional rendering by path. Rejected — pollutes the root layout with portal-specific logic and breaks layout isolation.

### 2. Role resolution via cookie — set once at login, read on every navigation

The user role is resolved from the database **once** — immediately after a successful login — and stored in a short-lived, httpOnly server cookie (`portal_role`). On every subsequent `/portal/*` navigation, `portal/layout.tsx` reads the cookie via `cookies()` from `next/headers` without touching the database.

**Flow:**
1. `useAuth` hook calls `authService.signInWithPassword()` → success.
2. Hook then calls `portalService.getUserProfile(userId)` to fetch profile + role from DB.
3. Hook calls a **Server Action** `setRoleCookie(role)` which writes an httpOnly cookie `portal_role` with a short TTL (session-scoped or 24 h).
4. `portal/layout.tsx` reads `cookies().get('portal_role')` → passes role to `PortalSidebar` as a prop. No DB call.
5. **Fallback:** if cookie is absent or invalid (direct navigation, expired session), layout falls back to `portalService.getUserProfile(userId)` and re-sets the cookie.
6. On logout, the `setRoleCookie` action is called with `null` / `maxAge: 0` to clear the cookie.

**Cookie spec:**
- Name: `portal_role`
- Value: `admin | athlete | coach`
- `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production
- `path: /portal`
- TTL: session-scoped (expires when browser closes) or explicit 24 h

**Alternative considered:** Fetch role from DB on every SSR navigation using `portalService` directly in the layout. Rejected — one extra DB round-trip per page load; unnecessary once role is established.

**Alternative considered:** Store role in a React Context provided by the layout. Rejected — context requires a Client Component boundary; cookie is readable server-side with no extra client JS.

`usePortalNavigation` client hook still reads `activePath` from `usePathname()` and builds filtered `menuItems` client-side based on the role prop forwarded from the server layout. No global context needed.

### 3. Component tree decomposition

```
portal/layout.tsx  (Server Component — fetches profile, composes shell)
  ├── PortalSidebar  (Client Component — receives role + items, handles active state)
  │     └── RoleBasedMenu  (Client Component — renders filtered nav items)
  └── PortalHeader  (Client Component — notifications, avatar dropdown toggle)
        └── UserAvatarMenu  (Client Component — dropdown state)
```

Components need `'use client'` only because they manage interactive state (open/close dropdown, active nav highlight). The data-heavy part (profile fetch, menu config) stays on the server.

### 4. Role-to-menu mapping as a static config constant

Menu items per role are defined in `src/types/portal.types.ts` as a typed `ROLE_MENU_CONFIG` constant rather than fetched from the database. Only the role string comes from the DB; menu shape is a frontend concern.

```
admin   → Organization Management, Venue Management, Training Management
athlete → Profile, Available Trainings
coach   → Profile, Training Management, Athletes
```

**Alternative considered:** Storing menu structure in the DB. Rejected — adds complexity with no present benefit; role enum is stable.

### 5. Middleware update

`protectedPaths` in `middleware.ts` extended from `["/dashboard"]` to `["/dashboard", "/portal"]`. Same `updateSession` + redirect pattern already in place. No new middleware logic required.

Post-login redirect: `src/hooks/auth/useAuth.ts` (or `LoginForm`) currently redirects to `/dashboard` after `signInWithPassword`. This will be updated to `/portal`.

### 6. `/dashboard` deprecation

`src/app/dashboard/page.tsx` replaced with a simple `redirect('/portal')` (Next.js `redirect()` from `next/navigation`). Keeps backward compatibility for any existing links.

### 7. Data access — `portalService` + `setRoleCookie` Server Action

New `src/services/supabase/portal.ts` exposes:

```ts
// Called once after login (browser client)
getUserProfile(userId: string): Promise<UserProfile>
```

Query:
```ts
from('usuarios')
  .select('id, nombre, apellido, email, foto_url, activo, tenant_id, rol_id, roles(id, nombre)')
  .eq('id', userId)
  .single()
```

Uses the **browser Supabase client** (`createClient`) because it is called from `useAuth` (client hook) immediately after login.

New `src/app/actions/portal.actions.ts` (Server Actions file):

```ts
'use server'
export async function setRoleCookie(role: UserRole | null): Promise<void>
```

Called by `useAuth` after profile fetch to persist the role cookie server-side. Also called on logout with `null` to clear it.

`portal/layout.tsx` reads the cookie:

```ts
import { cookies } from 'next/headers'

const role = cookies().get('portal_role')?.value as UserRole | undefined
// fallback: if (!role) { profile = await portalService.getUserProfile(userId); setRoleCookie(profile.role) }
```

### 8. Visual design alignment

The dashboard.html design uses:
- `font-family: Lexend` → add to `globals.css` or `layout.tsx` via Next.js `localFont` / Google Fonts
- Dark mode (`dark` class on `<html>`) → enabled via Tailwind dark mode config
- `primary: #00d4ff`, `secondary: #00f5d4` → extend `tailwind.config.ts`
- Material Symbols Outlined icon font → add to `src/app/layout.tsx` `<head>` or via `next/font`
- `sidebar-item-active` gradient + left border → replicated as Tailwind utility or CSS class

## Risks / Trade-offs

- **Stale role cookie** → If an admin changes a user's role in the DB, the cookie won't reflect the change until it expires or the user logs out/in. Mitigation: keep TTL short (24 h); force re-login on role change (acceptable for this stage).
- **Cookie missing on first load after deploy/clear** → Fallback path in `portal/layout.tsx` re-queries DB and resets cookie; no broken experience, just one extra DB call.
- **`'use client'` boundary on Sidebar/Header** → Server props must be serializable (plain objects, not class instances). `UserProfile` and `menuItems` are plain TS types — no issue.
- **`/dashboard` redirect** → If any external link or test relies on `/dashboard` resolving to content, it now hard-redirects. Acceptable for this stage.
- **No loading state during layout SSR** → Next.js handles this with `loading.tsx`; will add a `portal/loading.tsx` placeholder.
- **Middleware matcher breadth** → Current matcher covers all routes. Adding `/portal` to `protectedPaths` is sufficient; no regex change needed.

## Open Questions

- Should unauthenticated access to `/portal` show a redirect with `?next=` parameter preserved (already done for `/dashboard`) or a plain redirect? → Adopt same pattern as existing `middleware.ts` for consistency.
- `foto_url` fallback: if user has no avatar photo, show initials or a default icon? → Show initials (first letter of `nombre`) as fallback — no external dependency.
