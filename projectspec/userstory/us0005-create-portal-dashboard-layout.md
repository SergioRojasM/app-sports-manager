# User Story: Dashboard Structure in `/portal` with Role-Based Menu and Fixed Header

## ID
US-0005

## Name
Create portal dashboard layout with role-based menu and fixed header

### As a...
As an authenticated user (admin, athlete, or coach)

### I want...
I want the application, after login, to show a dashboard under `/portal` with a shared layout (sidebar menu + fixed top header) and role-based navigation options

### So that...
I can quickly access the features relevant to my role while keeping a consistent experience across all internal pages

## Description
Implement the base post-login dashboard structure using `projectspec/designs/dashboard.html` as the design reference.

The application layout must live under `src/app/portal/` and apply to all child pages in that segment (App Router layout nesting).

The sidebar menu must render different options depending on the logged-in user role:
- **admin**: Organization Management, Venue Management, Training Management
- **athlete**: Profile, Available Trainings
- **coach**: Profile, Training Management, Athletes

The role must be obtained from the database by reading `public.usuarios.rol_id` and its relationship to `public.roles.nombre` (schema in `supabase/migrations/20260221000100_create_database_schema_from_drawio.sql`).

The header must be fixed at the top and contain:
1. Application logo
2. Notifications icon
3. User avatar with dropdown menu (Profile, Logout)

The implementation must follow the feature-based/hexagonal architecture defined in `projectspec/03-project-structure.md`: UI component → hook (logic) → service (Supabase access).

## Functional Scope

### Layout and routing
1. Create `layout.tsx` in `src/app/portal/` that composes:
   - Sidebar menu
   - Fixed top header
   - `children` container
2. All child routes under `/portal/*` must share the same layout with no duplication.
3. Define the `/portal` landing page and folder structure for feature-based child pages.

### Role-based menu
4. Load authenticated user profile and resolve effective role (`admin` | `athlete` | `coach`).
5. Build menu dynamically based on role.
6. Show active state for the selected option.
7. Prevent display of unauthorized routes for each role.

### Header
8. Fixed top header with responsive behavior.
9. Show logo aligned with `projectspec/designs/dashboard.html`.
10. Show notifications icon.
11. Show avatar with dropdown:
    - “Profile” option
    - “Logout” option (use existing auth logout flow)

### Navigation and access
12. After login, user must land on post-login portal (`/portal` or equivalent redirect defined by team).
13. If no valid session exists, `/portal/*` routes must redirect to `/auth/login`.

### Out of scope
- Full business implementation of each internal module (only structure/base pages).
- Real notifications system (header icon/entry point only).
- Advanced action-level authorization (menu visibility by role only in this story).

## Data / Fields to Handle

### Required session/profile fields
1. `auth.users.id` (authenticated user)
2. `usuarios.id`
3. `usuarios.email`
4. `usuarios.nombre`
5. `usuarios.apellido`
6. `usuarios.foto_url`
7. `usuarios.rol_id`
8. `usuarios.tenant_id`
9. `usuarios.activo`
10. `roles.id`
11. `roles.nombre` (source to determine menu)

### UI state fields
- `isLoadingProfile` (boolean)
- `profileError` (string | null)
- `currentRole` (`admin` | `athlete` | `coach` | null)
- `menuItems` (role-filtered navigation array)
- `isAvatarMenuOpen` (boolean)
- `activePath` (string)

## Endpoints and URLs

### App routes (Next.js App Router)
- `GET /portal` → Portal home (post-login)
- `GET /portal/gestion-organizacion` → (admin)
- `GET /portal/gestion-escenarios` → (admin)
- `GET /portal/gestion-entrenamientos` → (admin, coach)
- `GET /portal/perfil` → (athlete, coach)
- `GET /portal/entrenamientos-disponibles` → (athlete)
- `GET /portal/atletas` → (coach)

### Related auth routes
- `GET /auth/login`
- `POST/SDK logout` through existing auth service/hook

### Data access (Supabase)
No new backend REST endpoint is required. Use Supabase SDK for profile/role query:
- Base table: `public.usuarios`
- Relationship: `public.roles`
- Filter: `usuarios.id = auth.user.id`

Expected query structure example:
- `from('usuarios').select('id, nombre, apellido, email, foto_url, activo, tenant_id, rol_id, roles(id,nombre)').eq('id', userId).single()`

## Files to Modify (expected)

### New files (minimum expected)
1. `src/app/portal/layout.tsx`
2. `src/app/portal/page.tsx`
3. `src/app/portal/gestion-organizacion/page.tsx`
4. `src/app/portal/gestion-escenarios/page.tsx`
5. `src/app/portal/gestion-entrenamientos/page.tsx`
6. `src/app/portal/perfil/page.tsx`
7. `src/app/portal/entrenamientos-disponibles/page.tsx`
8. `src/app/portal/atletas/page.tsx`
9. `src/components/portal/PortalSidebar.tsx`
10. `src/components/portal/PortalHeader.tsx`
11. `src/components/portal/UserAvatarMenu.tsx`
12. `src/components/portal/RoleBasedMenu.tsx`
13. `src/hooks/portal/usePortalNavigation.ts`
14. `src/services/supabase/portal.ts` (or equivalent feature-based service)
15. `src/types/portal.types.ts`

### Existing files to evaluate/adjust
16. `src/hooks/auth/useAuth.ts` (only if profile/role exposure is needed without breaking contract)
17. `src/services/supabase/auth.ts` (only if post-login redirect must be adjusted to `/portal`)
18. `middleware.ts` and/or `src/services/supabase/middleware.ts` (protect `/portal/*` and redirects)
19. `src/app/dashboard/page.tsx` (decide whether to redirect to `/portal` or deprecate)
20. `README.md` (update portal routes and structure)

## Definition of Done (task completion)
1. Shared layout exists in `src/app/portal/layout.tsx` with sidebar + fixed header + `children`.
2. All child routes in `/portal/*` use the same layout.
3. Menu changes correctly by role (`admin`, `athlete`, `coach`).
4. Header shows logo, notifications, and avatar dropdown (Profile, Logout).
5. Logout ends session and redirects to `/auth/login`.
6. Unauthenticated access to `/portal/*` is blocked/redirected.
7. Folder structure is created following feature-based architecture.
8. Visual design aligns with `projectspec/designs/dashboard.html` without introducing non-requested patterns.
9. Lint/tests for changed files pass.
10. Documentation is updated.

## Testing and Validation

### Manual QA checklist
- Successful login redirects to post-login portal.
- `admin` user sees only their 3 menu options.
- `athlete` user sees only their 2 menu options.
- `coach` user sees only their 3 menu options.
- Navigation between child pages keeps header and sidebar constant.
- Avatar dropdown opens/closes via click and keyboard.
- Logout option ends session and redirects to login.
- On mobile/tablet, layout remains usable.

### Unit/Component test guidance
If test stack exists, cover at minimum:
1. Menu resolution by role (3 cases + unknown role)
2. Conditional render of menu options
3. Logout action from dropdown
4. Portal route protection/redirect without session
5. Active navigation state

If no test infrastructure exists yet, document as follow-up without expanding this story scope.

## Documentation Updates
1. Update `README.md` with:
   - New routes under `/portal`
   - Shared layout behavior
   - Role-based menu matrix
2. Reference base design `projectspec/designs/dashboard.html`.
3. Record post-login redirect decision (`/dashboard` vs `/portal`) and final chosen value.

## Non-Functional Requirements

### Security
- Do not expose sensitive data in client or logs (tokens/credentials).
- Validate access to `/portal/*` with active session.
- Restrict navigation visibility to authorized role.
- Preserve Supabase RLS/policies usage according to current setup.

### Performance
- Avoid redundant profile/role queries (load once and reuse in layout/hook).
- Minimize client-side components; use Server Components by default when applicable.
- Keep initial layout render lightweight.

### Accessibility
- Full keyboard navigation for menu and dropdown.
- Visible focus states.
- Proper labels and `aria-*` for avatar menu/notifications.
- Contrast and visual hierarchy aligned with design.

### Maintainability
- Respect boundaries: `components` (UI), `hooks` (logic), `services` (data), `types` (contracts).
- Avoid business logic inside presentation components.
- Reuse portal components across all child pages.

## Expected Result
The project has a solid post-login dashboard foundation under `/portal`, with shared layout, fixed header, role-based sidebar menu, and feature-based folder structure ready to scale functional modules without rebuilding navigation or app shell.
