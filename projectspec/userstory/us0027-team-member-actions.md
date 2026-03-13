# US-0027 — Team Member Actions: Edit, Remove, and Block

## ID
US-0027

## Title
Team Member Actions: Edit Profile, Remove from Team, Block from Team

## As a
Tenant administrator

## I Want
Three per-row action buttons in the team members table (gestion-equipo) that let me edit a member's profile, remove them from the team, or block them from the organization.

## So That
I can maintain accurate member profiles, manage team composition, and prevent unwanted users from rejoining the organization — all from a single management view.

---

## Description

The `EquipoTable` component already renders an **Acciones** column with a single action (assign discipline level). This story introduces three new actions for each member row:

| Action | Icon | Behavior |
|---|---|---|
| **Edit Profile** | Pencil | Opens `EditarMiembroModal` — admin edits editable profile fields |
| **Remove from Team** | Person-minus | Confirmation dialog → deletes row from `miembros_tenant` |
| **Block** | Ban/slash | Confirmation dialog with optional `motivo` → deletes from `miembros_tenant` + inserts into `miembros_tenant_bloqueados` |

### 1. Edit Member Profile

The admin can edit the following fields of a team member's `usuarios` row:

| Field | Column | Type | Rules |
|---|---|---|---|
| First Name | `nombre` | varchar(100) | Required |
| Last Name | `apellido` | varchar(100) | Required |
| Phone | `telefono` | varchar(20) | Optional |
| Date of Birth | `fecha_nacimiento` | date | Optional |
| ID Type | `tipo_identificacion` | enum | `CC`, `CE`, `TI`, `NIT`, `Pasaporte`, `Otro` |
| ID Number | `numero_identificacion` | varchar(30) | Optional |
| Blood Type | `rh` | varchar(10) | Optional |
| Status | `estado` | enum | `activo`, `mora`, `suspendido`, `inactivo` |

> **NOT editable by admin:** `email` (auth-tied), `foto_url` (user-managed).

**New RLS migration required:** Admins currently can only update their own `usuarios` row (`usuarios_update_own`). A new policy `usuarios_update_admin` must allow admins to update any `usuarios` row where the user is a member of one of the admin's tenants. The policy must restrict updatable columns to the fields listed above (not `id`, `email`).

### 2. Remove from Team

- Deletes the row from `miembros_tenant` for the given `(tenant_id, usuario_id)` pair.
- The `usuarios` row is **not** deleted.
- The user is **not** blocked; they may submit a new access request in the future.
- A two-step confirmation dialog must display the member's full name before executing.

**New RLS migration required:** `miembros_tenant` has no admin DELETE policy. A new policy `miembros_tenant_delete_admin` must allow admins to delete rows where `tenant_id` is in the admin's tenants.

### 3. Block from Team

- Removes the row from `miembros_tenant` (same logic as Remove).
- Inserts a row into `miembros_tenant_bloqueados` with `bloqueado_por = auth.uid()` and an optional `motivo`.
- The existing `bloqueados_insert_admin` RLS policy already covers the insert. Only the `miembros_tenant_delete_admin` policy is new.
- After blocking, the user appears in the **Bloqueados** tab (already implemented via `BloqueadosTab`).
- A two-step confirmation dialog must display the member's full name and include an optional `motivo` textarea.

---

## Expected Results

1. Every row in `EquipoTable` has three new action buttons (edit, remove, block) in addition to the existing "assign level" button.
2. The **Edit Profile** modal loads the current values, validates the form, and saves to `usuarios` via a new service method; the table row updates optimistically or after refresh.
3. The **Remove from Team** confirmation dialog shows the member's name; on confirm, the member disappears from the table.
4. The **Block** confirmation dialog shows the member's name and an optional motivo input; on confirm, the member disappears from the Equipo tab and appears in the Bloqueados tab.
5. All three operations are protected by tenant-scoped RLS policies. No operation is possible without the admin role in the relevant tenant.
6. Loading and error states are handled gracefully (toast or inline error).

---

## Database Changes

### New Migration: `YYYYMMDDHHMMSS_equipo_member_actions_rls.sql`

```sql
-- ─── usuarios: UPDATE policy for admins ───────────────────────────────────────
-- Allows tenant admins to update profile fields of members in their tenants.
-- Does NOT allow updating email or id.
drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
  for update
  to authenticated
  using (
    id IN (
      SELECT mt.usuario_id
      FROM public.miembros_tenant mt
      WHERE mt.tenant_id IN (
        SELECT tenant_id FROM get_admin_tenants_for_authenticated_user()
      )
    )
  )
  with check (
    id IN (
      SELECT mt.usuario_id
      FROM public.miembros_tenant mt
      WHERE mt.tenant_id IN (
        SELECT tenant_id FROM get_admin_tenants_for_authenticated_user()
      )
    )
  );

-- ─── miembros_tenant: DELETE policy for admins ────────────────────────────────
-- Allows tenant admins to remove members from their tenants.
drop policy if exists miembros_tenant_delete_admin on public.miembros_tenant;
create policy miembros_tenant_delete_admin on public.miembros_tenant
  for delete
  to authenticated
  using (
    tenant_id IN (
      SELECT tenant_id FROM get_admin_tenants_for_authenticated_user()
    )
  );

-- Grant DELETE privilege on miembros_tenant to authenticated role
grant delete on public.miembros_tenant to authenticated;
-- Grant UPDATE privilege on usuarios to authenticated role (already present for own row)
-- The column-level restriction is enforced via application layer + with check clause.
grant update (nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion,
              numero_identificacion, rh, estado)
  on public.usuarios to authenticated;
```

> **Note:** The migration file should be placed in `supabase/migrations/` with a timestamp prefix following the existing convention.

---

## API / Service Layer

### File: `src/services/supabase/portal/equipo.service.ts`

Add three new exported async functions:

#### `editarMiembro(input: EditarMiembroInput): Promise<void>`

```ts
type EditarMiembroInput = {
  usuarioId: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  fechaNacimiento?: string;   // ISO date string
  tipoIdentificacion?: TipoIdentificacion;
  numeroIdentificacion?: string;
  rh?: string;
  estado: MiembroEstado;
};
```

- Calls `supabase.from('usuarios').update({...}).eq('id', usuarioId)`.
- Throws `EquipoServiceError` with `code: 'forbidden'` on Supabase 403/RLS violation.

#### `eliminarMiembro(tenantId: string, usuarioId: string): Promise<void>`

- Calls `supabase.from('miembros_tenant').delete().eq('tenant_id', tenantId).eq('usuario_id', usuarioId)`.
- Throws `EquipoServiceError` on failure.

#### `bloquearMiembro(input: BloquearMiembroInput): Promise<void>`

```ts
type BloquearMiembroInput = {
  tenantId: string;
  usuarioId: string;
  bloqueadoPor: string;
  motivo?: string;
};
```

- Step 1: calls `eliminarMiembro(tenantId, usuarioId)`.
- Step 2: calls `supabase.from('miembros_tenant_bloqueados').insert({ tenant_id, usuario_id, bloqueado_por, motivo })`.
- Handles `23505` unique violation on `miembros_tenant_bloqueados` (user already blocked) gracefully.

---

## Types

### File: `src/types/portal/equipo.types.ts`

Add:

```ts
export type EditarMiembroInput = {
  usuarioId: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  fechaNacimiento?: string;
  tipoIdentificacion?: TipoIdentificacion;
  numeroIdentificacion?: string;
  rh?: string;
  estado: MiembroEstado;
};

export type BloquearMiembroInput = {
  tenantId: string;
  usuarioId: string;
  bloqueadoPor: string;
  motivo?: string;
};
```

---

## Hook Changes

### File: `src/hooks/portal/gestion-equipo/useEquipo.ts`

Extend with three new action callbacks:

| Callback | Signature | Behavior |
|---|---|---|
| `editarMiembro` | `(input: EditarMiembroInput) => Promise<void>` | Calls service, then `refresh()` |
| `eliminarMiembro` | `(usuarioId: string) => Promise<void>` | Calls service, then `refresh()` |
| `bloquearMiembro` | `(input: BloquearMiembroInput) => Promise<void>` | Calls service, then `refresh()` |

Each action should set a per-row `actionsLoading` state (keyed by `usuario_id`) to show spinner on the active row and disable all action buttons on that row during the operation.

---

## Component Changes

### File: `src/components/portal/gestion-equipo/EquipoTable.tsx`

- Add three icon buttons to the **Acciones** column per row, placed before the existing "assign level" button:
  - **Edit** — pencil icon (`PencilIcon`), calls `onEdit(member)`
  - **Remove** — user-minus icon (`UserMinusIcon`), calls `onRemove(member)`
  - **Block** — no-symbol/ban icon (`NoSymbolIcon`), calls `onBlock(member)`
- Accept new props:
  ```ts
  onEdit: (member: MiembroTableItem) => void;
  onRemove: (member: MiembroTableItem) => void;
  onBlock: (member: MiembroTableItem) => void;
  actionsLoading?: Record<string, boolean>; // keyed by usuario_id
  ```
- Disable all action buttons for a row when `actionsLoading[member.usuario_id]` is `true`.

### New File: `src/components/portal/gestion-equipo/EditarMiembroModal.tsx`

A right-side drawer (consistent with `AsignarNivelModal` pattern):

- **Props:** `member: MiembroTableItem | null`, `open: boolean`, `onClose: () => void`, `onSave: (input: EditarMiembroInput) => Promise<void>`
- Pre-populates fields from `member`.
- Fields: `nombre` (required), `apellido` (required), `telefono`, `fechaNacimiento`, `tipoIdentificacion` (select), `numeroIdentificacion`, `rh`, `estado` (select with all four values).
- Submit button shows spinner while saving.
- Displays inline server error via `EquipoServiceError`.

### New File: `src/components/portal/gestion-equipo/ConfirmarEliminarMiembroModal.tsx`

A centered confirmation dialog:

- **Props:** `member: MiembroTableItem | null`, `open: boolean`, `onClose: () => void`, `onConfirm: () => Promise<void>`
- Shows: "¿Estás seguro de que deseas eliminar a **{fullName}** del equipo? Esta acción no se puede deshacer."
- Two buttons: Cancel (secondary) and Eliminar (danger/red), with spinner on confirm.

### New File: `src/components/portal/gestion-equipo/ConfirmarBloquearMiembroModal.tsx`

A centered confirmation dialog with optional motivo:

- **Props:** `member: MiembroTableItem | null`, `open: boolean`, `onClose: () => void`, `onConfirm: (motivo?: string) => Promise<void>`
- Shows: "¿Estás seguro de que deseas bloquear a **{fullName}**? Se eliminará del equipo y no podrá enviar nuevas solicitudes de acceso."
- Optional `<textarea>` for `motivo`.
- Two buttons: Cancel (secondary) and Bloquear (danger/red), with spinner on confirm.

### File: `src/components/portal/gestion-equipo/EquipoPage.tsx`

- Wire the three new callbacks from `useEquipo` into `EquipoTable`.
- Manage local state: `editingMember`, `removingMember`, `blockingMember` (each `MiembroTableItem | null`).
- Render the three new modals with their respective state and callbacks.
- On successful action: clear modal state; `useEquipo.refresh()` updates the table.

### File: `src/components/portal/gestion-equipo/index.ts`

Export the three new modal components.

---

## Files to Create / Modify

| Action | File |
|---|---|
| **CREATE** | `supabase/migrations/YYYYMMDDHHMMSS_equipo_member_actions_rls.sql` |
| **MODIFY** | `src/types/portal/equipo.types.ts` |
| **MODIFY** | `src/services/supabase/portal/equipo.service.ts` |
| **MODIFY** | `src/hooks/portal/gestion-equipo/useEquipo.ts` |
| **MODIFY** | `src/components/portal/gestion-equipo/EquipoTable.tsx` |
| **MODIFY** | `src/components/portal/gestion-equipo/EquipoPage.tsx` |
| **CREATE** | `src/components/portal/gestion-equipo/EditarMiembroModal.tsx` |
| **CREATE** | `src/components/portal/gestion-equipo/ConfirmarEliminarMiembroModal.tsx` |
| **CREATE** | `src/components/portal/gestion-equipo/ConfirmarBloquearMiembroModal.tsx` |
| **MODIFY** | `src/components/portal/gestion-equipo/index.ts` |

---

## Completion Checklist

- [ ] Migration file created and applied locally via `npx supabase db reset` or `npx supabase migration up`.
- [ ] `EditarMiembroInput` and `BloquearMiembroInput` types exported from `equipo.types.ts`.
- [ ] `editarMiembro`, `eliminarMiembro`, `bloquearMiembro` implemented in `equipo.service.ts`.
- [ ] `useEquipo` exposes the three new callbacks with per-row loading state.
- [ ] `EquipoTable` renders the three new action buttons with props accepted.
- [ ] `EditarMiembroModal` renders, pre-populates, validates, and saves.
- [ ] `ConfirmarEliminarMiembroModal` renders, confirms, and removes member.
- [ ] `ConfirmarBloquearMiembroModal` renders, accepts motivo, and blocks member.
- [ ] `EquipoPage` wires all modals and callbacks.
- [ ] After a **Block** action, the user appears under the Bloqueados tab (no additional changes to `BloqueadosTab` required).
- [ ] Buttons are disabled/loading-state during in-flight requests.
- [ ] Errors from the service layer surface to the user (toast or modal inline message).
- [ ] No TypeScript compilation errors.
- [ ] Tested manually: edit, remove, and block flows work end-to-end in local dev.

---

## Non-Functional Requirements

### Security
- All three operations are gated by `get_admin_tenants_for_authenticated_user()` in RLS — no client-side-only guard.
- The `usuarios_update_admin` policy uses column-grants on Supabase to ensure `email` and `id` cannot be updated by admins.
- The `miembros_tenant_delete_admin` policy ensures an admin can only remove members from **their own** tenants.
- Service functions must not expose raw Supabase errors to the UI; map to `EquipoServiceError` codes.

### Performance
- No new full-table scans; all new policies rely on the existing `(tenant_id, usuario_id)` indexes on `miembros_tenant` and `miembros_tenant_bloqueados`.
- `refresh()` in `useEquipo` re-fetches only the member list for the current tenant (scoped query).

### UX
- Action buttons use Heroicons (consistent with the existing codebase: `PencilIcon`, `UserMinusIcon`, `NoSymbolIcon`).
- Destructive actions (remove, block) require a two-step confirmation to prevent accidental data loss.
- Modals follow the existing design language (Tailwind classes, right-drawer for edit, centered dialog for confirmations).
