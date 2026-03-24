## Why

Organization administrators currently cannot change a team member's role after they join. Roles are assigned automatically at membership creation time (defaulting to `usuario`) and remain fixed. To promote a user to coach or grant admin privileges, there is no UI path — it requires direct database access. This blocks day-to-day team management and creates dependency on technical staff for a routine administrative task.

## What Changes

- **Inline role selector in Equipo table**: Replace the static role text in the `Perfil` column with a `<select>` dropdown allowing the admin to pick between `Administrador`, `Entrenador`, and `Usuario`.
- **Confirmation dialog (`CambiarRolModal`)**: A centered modal that shows the current and new role before committing the change, preventing accidental mutations.
- **Self-demotion warning**: When an admin changes their own role away from `administrador`, the dialog displays a prominent amber warning about losing admin access.
- **Last-admin guard**: The system blocks role changes that would leave a tenant with zero administrators — enforced both in the service layer and at the UI level.
- **RLS policy for UPDATE on `miembros_tenant`**: A new database policy scoped to admin tenants to allow updating `rol_id`.
- **Service function `cambiarRolMiembro`**: Performs the last-admin check then updates `miembros_tenant.rol_id`.
- **Service function `getRoles`**: Fetches the three role options from `public.roles` for dropdown population.
- **Hook extension (`useEquipo`)**: Exposes `roles`, `cambiarRol`, and `isCambiandoRol` to the component layer.

## Non-goals

- Bulk role assignment (changing roles for multiple members at once).
- Creating, editing, or deleting roles themselves — the three roles (`administrador`, `entrenador`, `usuario`) remain fixed seed data.
- Changing roles from outside the Equipo table (e.g., from the Edit Profile modal or a separate roles page).
- Audit trail / history of role changes (may be a future enhancement).
- Changing roles for blocked users — only active members in the Equipo tab are in scope.

## Capabilities

### New Capabilities

_(None — this change extends an existing capability.)_

### Modified Capabilities

- `team-management`: Adds the ability for administrators to change a member's role inline from the Equipo table, including confirmation dialog, self-demotion warning, last-admin guard, and the underlying service/RLS mutation.

## Impact

### Files to Create

| File | Purpose |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_equipo_update_rol.sql` | RLS policy for admin UPDATE on `miembros_tenant` + grant |
| `src/components/portal/gestion-equipo/CambiarRolModal.tsx` | Confirmation dialog for role change |

### Files to Modify

| File | Change |
|---|---|
| `src/types/portal/equipo.types.ts` | Add `CambiarRolMiembroInput`, `RolOption` types |
| `src/services/supabase/portal/equipo.service.ts` | Add `getRoles()`, `cambiarRolMiembro()` with last-admin guard |
| `src/hooks/portal/gestion-equipo/useEquipo.ts` | Expose `roles`, `cambiarRol`, `isCambiandoRol` |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Replace static role text with inline `<select>` dropdown |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add role change state, wire modal, pass props to table |
| `src/components/portal/gestion-equipo/index.ts` | Export `CambiarRolModal` |

### Implementation Plan (page → component → hook → service → types)

1. **Types** — Add `CambiarRolMiembroInput` and `RolOption` to `equipo.types.ts`.
2. **Migration** — Create RLS policy `miembros_tenant_update_rol_admin` for UPDATE on `miembros_tenant` scoped to admin tenants.
3. **Service** — Add `getRoles()` (SELECT from `roles`) and `cambiarRolMiembro()` (last-admin check + UPDATE `rol_id`) to `equipo.service.ts`.
4. **Hook** — Extend `useEquipo` to fetch roles on mount and expose the `cambiarRol` mutation with loading state.
5. **Component: `CambiarRolModal`** — Confirmation dialog showing current/new role, self-demotion warning, and last-admin error.
6. **Component: `EquipoTable`** — Add `roles` and `onCambiarRol` props; render inline `<select>` in the role column.
7. **Component: `EquipoPage`** — Wire modal state, hook methods, and pass props to `EquipoTable` and `CambiarRolModal`.
8. **Export** — Update `index.ts` barrel export.

### Affected Systems

- **Database**: New RLS policy + grant on `miembros_tenant`.
- **Authorization**: Role changes take effect immediately for the affected member's next authenticated request (menu, route guards, RLS).
- **No breaking changes**: Existing bookings, subscriptions, attendance, and other membership-linked data are unaffected by a role change.
