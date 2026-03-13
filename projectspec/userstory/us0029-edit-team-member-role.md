# US-0029 – Edit Team Member Role

---

## Title
Edit Team Member Role from Team Management

## ID
US-0029

## Name
edit-team-member-role

---

## As a
Organization administrator

## I Want
To be able to change the role of any team member directly from the **Gestión de Equipo** table, choosing between `administrador`, `entrenador`, or `usuario`.

## So That
I can adjust team member permissions as their responsibilities within the organization evolve — for example, promoting a regular user to coach or granting admin privileges — without needing direct database access.

---

## Description

### Context

The `Gestión de Equipo` feature (`/portal/orgs/[tenant_id]/gestion-equipo`) displays a table of active team members. Each membership row (`miembros_tenant`) carries a `rol_id` (UUID FK to `public.roles`), which determines the member's navigation menu, feature access, and authorization scope across the application.

Currently, the role is assigned automatically when a member joins (via the `handle_new_auth_user` trigger or admin acceptance of an access request) and defaults to `usuario`. There is **no UI** to change a member's role after the fact. The `EditarPerfilMiembroModal` (US-0027) edits identity, contact, document, status, and sports profile data — but deliberately excludes the role.

This story adds a dedicated **inline role selector** per row in the Equipo table, allowing the admin to change a member's role with a single interaction (select → confirm), plus a **service + hook + RLS** layer to support the mutation securely.

### Functional Requirements

1. **Inline role selector** in the Equipo table: replace the current static text display of `rol_nombre` with a `<select>` dropdown (or an equivalent styled component) containing the three possible values: `Administrador`, `Entrenador`, `Usuario`.
2. When the admin selects a different role from the dropdown, a **confirmation dialog** appears before committing the change. The dialog must clearly state the current role and the new role, e.g.: _"¿Cambiar rol de **Juan Pérez** de **Usuario** a **Entrenador**?"_
3. On confirmation, the `miembros_tenant.rol_id` is updated to the UUID of the selected role.
4. On success: the table row refreshes to reflect the new role, and a toast notification confirms the change.
5. On error: an inline error message is displayed near the selector.
6. **Self-demotion guard**: if the current authenticated admin attempts to change their **own** role away from `administrador`, show an additional warning: _"Estás a punto de remover tus permisos de administrador. Si continúas, perderás acceso a las funciones de administración de esta organización."_ The action should still be allowed after explicit confirmation, but the warning must be prominent.
7. **Last-admin guard**: if the member being changed is the **only** administrator in the tenant, the role change must be **blocked** with a clear message: _"No se puede cambiar el rol del único administrador de la organización. Asigna otro administrador primero."_ This must be enforced both in the UI and at the database level (via a check in the service layer).

### Data Sources

#### `public.roles` — read-only lookup:
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | varchar(50) | `administrador`, `entrenador`, `usuario` |

#### `public.miembros_tenant` — update target:
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK — membership row |
| `tenant_id` | uuid | FK to tenants |
| `usuario_id` | uuid | FK to usuarios |
| `rol_id` | uuid | FK to roles — **this is the field to update** |

---

## Implementation Plan

### 1. Database Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_equipo_update_rol.sql`

**a) RLS policy — allow admin to UPDATE `rol_id` on `miembros_tenant` rows within their tenant:**

```sql
create policy miembros_tenant_update_rol_admin on public.miembros_tenant
  for update to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  )
  with check (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );
```

**b) Grant UPDATE permission (if not already granted):**

```sql
grant update on table public.miembros_tenant to authenticated;
```

> Note: the existing RLS policies on `miembros_tenant` should be reviewed to confirm there is no conflicting blanket `for update` policy. If an `update` grant already exists, skip this step.

### 2. Types

**File:** `src/types/portal/equipo.types.ts`

Add the following new type:

```typescript
export type CambiarRolMiembroInput = {
  miembro_id: string;
  tenant_id: string;
  nuevo_rol_id: string;
};
```

Additionally, add a type for the roles lookup result:

```typescript
export type RolOption = {
  id: string;
  nombre: string;
};
```

### 3. Service Layer

**File:** `src/services/supabase/portal/equipo.service.ts`

Add two new functions:

#### `getRoles(): Promise<RolOption[]>`
- SELECT `id, nombre` FROM `public.roles` ORDER BY `nombre`.
- Returns the three role options for use in the UI dropdown.
- Cache-friendly: roles are static; this can be called once on component mount.

#### `cambiarRolMiembro(input: CambiarRolMiembroInput): Promise<void>`
- **Last-admin guard (server-side):**
  1. Query `miembros_tenant` WHERE `tenant_id = input.tenant_id` AND `rol_id = (SELECT id FROM roles WHERE nombre = 'administrador')` — count the results.
  2. If the count is `1` AND the single admin's `id === input.miembro_id`, AND the new role is NOT `administrador` → throw `EquipoServiceError` with `code: 'last_admin'` and message _"Cannot change the role of the only administrator."_
- UPDATE `public.miembros_tenant` SET `rol_id = input.nuevo_rol_id` WHERE `id = input.miembro_id AND tenant_id = input.tenant_id`.
- If zero rows affected → throw `EquipoServiceError` with `code: 'not_found'`.
- On RLS violation → throw `EquipoServiceError` with `code: 'forbidden'`.

### 4. Hook

**File:** `src/hooks/portal/gestion-equipo/useEquipo.ts`

Extend the existing hook to expose:

```typescript
roles: RolOption[];                      // loaded on mount via getRoles()
cambiarRol: (input: CambiarRolMiembroInput) => Promise<void>;
isCambiandoRol: boolean;                 // loading flag
```

The `cambiarRol` method should:
- Set `isCambiandoRol = true`.
- Call `cambiarRolMiembro(input)` from the service.
- On success: call `refresh()` to reload the member list, show success toast.
- On error with `code: 'last_admin'`: surface a specific error message to the UI.
- On other errors: surface a generic structured error message.
- Set `isCambiandoRol = false` in `finally`.

### 5. Components

#### 5a. `src/components/portal/gestion-equipo/CambiarRolModal.tsx` — **New**

A small centered confirmation dialog:

- **Props**:
  ```typescript
  miembro: MiembroTableItem | null;
  nuevoRol: RolOption | null;
  isSelfDemotion: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  ```
- **Content**:
  - Displays member name, current role, and new role.
  - If `isSelfDemotion` is true, shows a prominent amber warning banner: _"Estás a punto de remover tus permisos de administrador. Si continúas, perderás acceso a las funciones de administración de esta organización."_
  - Two buttons: Cancel (ghost) and Confirm Change (primary).
- **Pattern**: Same dialog as `EliminarMiembroModal`, but with information rather than destructive tone (unless self-demotion, which uses amber/warning tone).

#### 5b. `src/components/portal/gestion-equipo/EquipoTable.tsx` — **Update**

- Add new props:
  ```typescript
  roles?: RolOption[];
  onCambiarRol?: (row: MiembroTableItem, nuevoRol: RolOption) => void;
  ```
- Replace the static `row.rol_nombre` text cell with a styled `<select>` element (or a Radix UI `Select` if used in the project):
  - Options populated from `roles` prop.
  - Current value matches `row.rol_nombre` → corresponding `RolOption.id`.
  - On change: calls `onCambiarRol(row, selectedRolOption)` — the parent handles confirmation.
  - If `roles` prop is not provided or `onCambiarRol` is not provided, fall back to the static text display (backward-compatible).

#### 5c. `src/components/portal/gestion-equipo/EquipoPage.tsx` — **Update**

- Add state:
  ```typescript
  const [rolChangeTarget, setRolChangeTarget] = useState<{
    miembro: MiembroTableItem;
    nuevoRol: RolOption;
  } | null>(null);
  ```
- Wire `roles` and `cambiarRol` from the `useEquipo` hook.
- Determine `isSelfDemotion` by comparing `rolChangeTarget.miembro.usuario_id` with the current authenticated user's ID.
- Pass `roles` and the role change handler to `EquipoTable`:
  ```tsx
  roles={roles}
  onCambiarRol={(row, nuevoRol) => setRolChangeTarget({ miembro: row, nuevoRol })}
  ```
- Render `CambiarRolModal` at the bottom of the page:
  ```tsx
  <CambiarRolModal
    miembro={rolChangeTarget?.miembro ?? null}
    nuevoRol={rolChangeTarget?.nuevoRol ?? null}
    isSelfDemotion={rolChangeTarget?.miembro.usuario_id === currentUser?.id}
    onClose={() => setRolChangeTarget(null)}
    onConfirm={async () => {
      await cambiarRol({
        miembro_id: rolChangeTarget!.miembro.id,
        tenant_id: tenantId,
        nuevo_rol_id: rolChangeTarget!.nuevoRol.id,
      });
      setRolChangeTarget(null);
    }}
    isLoading={isCambiandoRol}
  />
  ```

#### 5d. `src/components/portal/gestion-equipo/index.ts` — **Update**

Add export:
```typescript
export { CambiarRolModal } from './CambiarRolModal';
```

---

## Endpoints / Data Access Patterns

This feature uses the Supabase JS client (no REST API routes). All data access is in the service layer.

| Operation | Table(s) | Method |
|---|---|---|
| Fetch available roles | `public.roles` | SELECT |
| Change member role | `public.miembros_tenant` | UPDATE |
| Last-admin check | `public.miembros_tenant` + `public.roles` | SELECT (count) |

---

## Fields to Update

| Table | Field | Operation | Notes |
|---|---|---|---|
| `public.miembros_tenant` | `rol_id` | UPDATE | Change the FK to the new role's UUID |

---

## Files to Create / Modify

### New Files
| File | Purpose |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_equipo_update_rol.sql` | RLS policy for admin UPDATE on `miembros_tenant` |
| `src/components/portal/gestion-equipo/CambiarRolModal.tsx` | Confirmation dialog for role change |

### Modified Files
| File | Change |
|---|---|
| `src/types/portal/equipo.types.ts` | Add `CambiarRolMiembroInput`, `RolOption` types |
| `src/services/supabase/portal/equipo.service.ts` | Add `getRoles()`, `cambiarRolMiembro()` functions |
| `src/hooks/portal/gestion-equipo/useEquipo.ts` | Expose `roles`, `cambiarRol`, `isCambiandoRol` |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Replace static role text with inline `<select>` dropdown |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add role change state, wire modal, pass props to table |
| `src/components/portal/gestion-equipo/index.ts` | Export `CambiarRolModal` |

---

## Expected Results

1. The Equipo table displays a dropdown selector in the role column for each team member instead of static text.
2. Selecting a different role opens a confirmation dialog showing the current and new role.
3. On confirmation, the member's `rol_id` is updated in `miembros_tenant` and the table refreshes to reflect the change.
4. A success toast notification is displayed after a successful role change.
5. If the admin attempts to change their own role away from `administrador`, an additional prominent warning is shown before confirmation.
6. If the target member is the **only** administrator in the organization, the role change is blocked and a clear error message is displayed.
7. Non-admin users cannot see the role dropdown — they see static text (backward-compatible fallback).
8. All mutations are protected by RLS at the database level.

---

## Acceptance Criteria

- [ ] Equipo table shows a role dropdown for each member when the user is an admin.
- [ ] Selecting a new role opens a confirmation dialog with current and new role displayed.
- [ ] Confirming the dialog updates `miembros_tenant.rol_id` and refreshes the table row.
- [ ] A toast notification confirms the successful role change.
- [ ] Self-demotion warning is shown when admin changes their own role away from `administrador`.
- [ ] Self-demotion is allowed after explicit confirmation of the warning.
- [ ] Changing the role of the **only** administrator is blocked with a clear error message.
- [ ] Last-admin guard is enforced both in the UI and in the service layer.
- [ ] Non-admin users see static role text (no dropdown).
- [ ] RLS prevents non-admin users from updating `miembros_tenant` via direct Supabase calls.
- [ ] Loading state is shown during the role change operation.
- [ ] Error messages are displayed inline when the operation fails.
- [ ] After a role change, the affected member's navigation menu reflects their new role on their next page load.
- [ ] TypeScript strict mode — no `any` types used.

---

## Non-Functional Requirements

### Security
- The UPDATE mutation on `miembros_tenant` requires admin membership in the target tenant, enforced by RLS using `get_admin_tenants_for_authenticated_user()`.
- Only the `rol_id` column is modified; no other membership fields are touched in the UPDATE payload.
- The `roles` table is read-only for all authenticated users (no INSERT/UPDATE/DELETE policies needed — roles are seeded data).
- The last-admin guard prevents accidental lockout of an organization by removing its only administrator.

### Performance
- Role change is a single UPDATE on an indexed FK column: O(1), negligible impact.
- The `getRoles()` call fetches exactly 3 rows — effectively constant. It can be called once on mount and cached in the hook state.
- The last-admin count query is lightweight (indexed on `tenant_id` + `rol_id`).

### Data Integrity
- Changing a role does NOT affect existing bookings, subscriptions, attendance records, or any other data tied to the member.
- The `roles` FK constraint (`on delete restrict`) prevents deletion of role records while memberships reference them.
- The new role takes effect immediately for RLS checks on the updated member's subsequent requests.

### Accessibility
- The role `<select>` element must have an accessible label (e.g., `aria-label="Cambiar rol"`).
- The confirmation modal is keyboard-navigable (focus trap) and closable via `Escape`.
- The self-demotion warning uses sufficient color contrast and is not conveyed by color alone (includes icon + text).
