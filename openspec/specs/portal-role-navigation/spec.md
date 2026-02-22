## ADDED Requirements

### Requirement: User profile and role fetched once at login
Immediately after a successful `signInWithPassword`, `useAuth` SHALL call `portalService.getUserProfile(userId)` to fetch the user's profile and role from `public.usuarios` joined with `public.roles`. This query MUST run exactly once per login event and SHALL NOT be repeated on subsequent portal navigations.

#### Scenario: Profile is fetched after login
- **WHEN** a user successfully authenticates
- **THEN** `useAuth` SHALL call `portalService.getUserProfile` and obtain `UserProfile` including `role`, `nombre`, `apellido`, `foto_url`

#### Scenario: Profile fetch failure is handled
- **WHEN** `portalService.getUserProfile` returns an error
- **THEN** `useAuth` SHALL expose a `profileError` string and SHALL NOT redirect to `/portal`

---

### Requirement: Role persisted in httpOnly cookie after login
After fetching the user profile, `useAuth` SHALL invoke the `setRoleCookie(role)` Server Action to write an httpOnly cookie named `portal_role`. The cookie MUST be set with `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (production), `path: /portal`, and a TTL of 24 hours.

#### Scenario: Role cookie is written on login
- **WHEN** the user profile is successfully fetched after login
- **THEN** an httpOnly cookie `portal_role` with value `admin`, `athlete`, or `coach` SHALL be set

#### Scenario: Cookie has correct security attributes
- **WHEN** the `portal_role` cookie is set in production
- **THEN** it SHALL have `httpOnly: true`, `secure: true`, `sameSite: lax`, and `path: /portal`

---

### Requirement: Portal layout reads role from cookie — no DB call
`portal/layout.tsx` SHALL read the user role exclusively from the `portal_role` cookie via `cookies().get('portal_role')` from `next/headers`. It MUST NOT call `portalService` on every navigation when a valid cookie is present.

#### Scenario: Layout resolves role from cookie
- **WHEN** an authenticated user navigates to any `/portal/*` page and `portal_role` cookie is present
- **THEN** the layout SHALL read the role from the cookie and pass it to `PortalSidebar` without querying the database

---

### Requirement: Fallback role resolution when cookie is absent
If `portal_role` cookie is missing or contains an invalid value, `portal/layout.tsx` SHALL fall back to calling `portalService.getUserProfile(userId)` using the server Supabase client, and subsequently invoke `setRoleCookie(role)` to restore the cookie.

#### Scenario: Missing cookie triggers DB fallback
- **WHEN** an authenticated user navigates to `/portal/*` and `portal_role` cookie is absent
- **THEN** the layout SHALL fetch the profile from the database, set the cookie, and render the correct menu

#### Scenario: Invalid cookie value triggers DB fallback
- **WHEN** the `portal_role` cookie contains a value that is not `admin`, `athlete`, or `coach`
- **THEN** the layout SHALL treat it as missing and execute the DB fallback

---

### Requirement: Role cookie cleared on logout
The `setRoleCookie(null)` Server Action SHALL be called during logout to expire and clear the `portal_role` cookie. After logout the cookie MUST NOT be readable.

#### Scenario: Cookie is cleared on logout
- **WHEN** the user clicks "Logout"
- **THEN** `setRoleCookie(null)` SHALL be called, setting the cookie's `maxAge` to `0`

#### Scenario: Portal layout has no role after logout
- **WHEN** the user accesses `/portal/*` after logging out
- **THEN** middleware SHALL redirect to `/auth/login` before the layout attempts to read the cookie

---

### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL receive the resolved `UserRole` as a prop and render only the menu items authorised for that role, as defined in `ROLE_MENU_CONFIG` in `src/types/portal.types.ts`. Menu items for other roles MUST NOT appear in the DOM.

The menu items per role SHALL be:
- `admin`: Organization Management (`/portal/gestion-organizacion`), Venue Management (`/portal/gestion-escenarios`), Training Management (`/portal/gestion-entrenamientos`)
- `athlete`: Profile (`/portal/perfil`), Available Trainings (`/portal/entrenamientos-disponibles`)
- `coach`: Profile (`/portal/perfil`), Training Management (`/portal/gestion-entrenamientos`), Athletes (`/portal/atletas`)

#### Scenario: Admin sees only admin menu items
- **WHEN** the authenticated user has role `admin`
- **THEN** the sidebar SHALL display exactly 3 items: Organization Management, Venue Management, Training Management — and no athlete or coach-only items

#### Scenario: Athlete sees only athlete menu items
- **WHEN** the authenticated user has role `athlete`
- **THEN** the sidebar SHALL display exactly 2 items: Profile, Available Trainings — and no admin or coach-only items

#### Scenario: Coach sees only coach menu items
- **WHEN** the authenticated user has role `coach`
- **THEN** the sidebar SHALL display exactly 3 items: Profile, Training Management, Athletes — and no admin or athlete-only items

---

### Requirement: Active navigation state
`usePortalNavigation` SHALL use `usePathname()` to determine the current route and expose an `activePath` string. `RoleBasedMenu` SHALL apply the active visual state to the menu item whose `href` matches `activePath`.

#### Scenario: Current route menu item is highlighted
- **WHEN** the user is on `/portal/perfil`
- **THEN** the "Profile" menu item SHALL display the active state style and no other item shall

#### Scenario: Active state updates on navigation
- **WHEN** the user navigates from `/portal/perfil` to `/portal/gestion-entrenamientos`
- **THEN** the active state SHALL move to "Training Management" and "Profile" SHALL return to its default style

---

### Requirement: Avatar displays user initials as fallback
If the authenticated user has no `foto_url`, the avatar button in `PortalHeader` SHALL display the first letter of `nombre` as a text fallback. If `nombre` is also unavailable, it SHALL display a generic user icon.

#### Scenario: Avatar shows photo when available
- **WHEN** the user has a non-empty `foto_url`
- **THEN** the avatar button SHALL render an `<img>` with that URL

#### Scenario: Avatar shows initials when photo is absent
- **WHEN** the user has an empty or null `foto_url` but has a `nombre`
- **THEN** the avatar button SHALL display the first character of `nombre` as uppercase text
