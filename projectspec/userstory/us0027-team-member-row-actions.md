# US-0027 – Team Member Row Actions: Edit Profile, Remove, and Block

---

## Title
Team Member Row Actions: Edit Profile, Remove from Team, and Block from Team

## ID
US-0027

## Name
team-member-row-actions

---

## As a
Organization administrator

## I Want
To be able to perform three contextual actions directly on each row of the team members table within the **Gestión de Equipo** feature:
1. **Edit Profile** – update a team member's personal and sports profile data.
2. **Remove from Team** – delete the membership record, removing the user from the organization without deleting their account.
3. **Block from Team** – block the user from the organization, preventing future access requests, and automatically removing their active membership.

## So That
I can keep the team roster accurate and up to date, correct or enrich member information, and manage access by removing or blocking members as needed, all from a single centralized view without navigating away from the team management page.

---

## Description

### Context

The `Gestión de Equipo` feature (`/portal/orgs/[tenant_id]/gestion-equipo`) currently displays a table of active team members (`miembros_tenant`) with an `Acciones` column containing only one button: _Asignar Nivel_. This story extends that column with three additional action buttons per row.

The three new actions cover the full lifecycle of a team member:

| Action | Trigger | Outcome |
|---|---|---|
| Edit Profile | Click pencil icon | Opens a right-side slide-in modal with the member's profile fields pre-filled. Admin saves changes to `public.usuarios` and `public.perfil_deportivo`. |
| Remove from Team | Click delete/person-remove icon | Shows an inline confirmation modal. On confirm, deletes the `miembros_tenant` record. The user's account is preserved. |
| Block from Team | Click block icon | Opens a small modal requesting an optional `motivo`. On confirm, inserts a record into `miembros_tenant_bloqueados`, deletes the `miembros_tenant` row, and reflects the user in the **Bloqueados** tab immediately. |

### Data Sources

#### `public.usuarios` — editable fields by admin:
| Field | Type | Constraint |
|---|---|---|
| `nombre` | varchar(100) | required |
| `apellido` | varchar(100) | optional |
| `telefono` | varchar(20) | optional |
| `fecha_nacimiento` | date | optional |
| `tipo_identificacion` | varchar(20) | `CC`, `CE`, `TI`, `NIT`, `Pasaporte`, `Otro` |
| `numero_identificacion` | varchar(30) | optional |
| `rh` | varchar(10) | optional |
| `estado` | text | `activo`, `mora`, `suspendido`, `inactivo` |

> `email` is **read-only** (managed by Supabase Auth) and shown as a disabled field for reference only.

#### `public.perfil_deportivo` — editable by admin:
| Field | Type | Notes |
|---|---|---|
| `peso_kg` | numeric(5,2) | optional |
| `altura_cm` | numeric(5,2) | optional |

#### `public.miembros_tenant` — delete on remove/block:
- DELETE WHERE `id = miembro_id AND tenant_id = tenantId`

#### `public.miembros_tenant_bloqueados` — insert on block:
- Uses existing `BloquearUsuarioInput` from `solicitudes.types.ts`
- Fields: `tenant_id`, `usuario_id`, `bloqueado_por` (current auth user), `motivo` (optional)

---

## Implementation Plan

### 1. Database Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_equipo_admin_actions.sql`

Two new RLS policies are required:

**a) Allow admin to UPDATE `usuarios` for members of their tenant:**
```sql
create policy usuarios_update_admin on public.usuarios
  for update to authenticated
  using (
    id in (
      select mt.usuario_id
      from public.miembros_tenant mt
      where mt.tenant_id in (
        select id from public.get_admin_tenants_for_authenticated_user()
      )
    )
  )
  with check (
    id in (
      select mt.usuario_id
      from public.miembros_tenant mt
      where mt.tenant_id in (
        select id from public.get_admin_tenants_for_authenticated_user()
      )
    )
  );
```

**b) Allow admin to DELETE from `miembros_tenant` in their tenant:**
```sql
create policy miembros_tenant_delete_admin on public.miembros_tenant
  for delete to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );
```

Also grant DELETE permission:
```sql
grant delete on table public.miembros_tenant to authenticated;
```

### 2. Types

**File:** `src/types/portal/equipo.types.ts`

Add the following new types:

```typescript
export type EditarPerfilMiembroInput = {
  usuario_id: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null; // ISO date string
  tipo_identificacion?: TipoIdentificacion | null;
  numero_identificacion?: string | null;
  rh?: string | null;
  estado: MiembroEstado;
  peso_kg?: number | null;
  altura_cm?: number | null;
};

export type EliminarMiembroInput = {
  miembro_id: string;
  tenant_id: string;
};
```

> `BloquearUsuarioInput` already exists in `src/types/portal/solicitudes.types.ts` and should be imported directly into the service layer.

### 3. Service Layer

**File:** `src/services/supabase/portal/equipo.service.ts`

Add three new functions:

#### `editarPerfilMiembro(input: EditarPerfilMiembroInput): Promise<void>`
- UPDATE `public.usuarios` SET `{nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, rh, estado}` WHERE `id = usuario_id`
- UPSERT `public.perfil_deportivo` SET `{peso_kg, altura_cm}` WHERE `user_id = usuario_id` (only if at least one value is provided)
- Throw `EquipoServiceError` with `code: 'forbidden'` on RLS violation, `code: 'unknown'` otherwise.

#### `eliminarMiembro(input: EliminarMiembroInput): Promise<void>`
- DELETE FROM `public.miembros_tenant` WHERE `id = miembro_id AND tenant_id = tenant_id`
- Throw `EquipoServiceError` accordingly.

#### `bloquearMiembroDelEquipo(input: BloquearUsuarioInput & { miembro_id: string }): Promise<void>`
- Call existing `bloquearUsuario(input)` from `solicitudes.service.ts` (to INSERT into `miembros_tenant_bloqueados`) — or replicate logic inline to avoid cross-service coupling.
- DELETE FROM `public.miembros_tenant` WHERE `id = miembro_id AND tenant_id = tenant_id`.
- Both operations must succeed; if the block insert fails, do not delete the membership. Use sequential calls with error handling.
- Throw `EquipoServiceError` with `code: 'forbidden'` on RLS violation.

### 4. Hook

**File:** `src/hooks/portal/gestion-equipo/useEquipo.ts`

Extend the existing hook to expose three new mutation methods:

```typescript
editarPerfil: (input: EditarPerfilMiembroInput) => Promise<void>
eliminarDelEquipo: (input: EliminarMiembroInput) => Promise<void>
bloquearDelEquipo: (input: BloquearUsuarioInput & { miembro_id: string }) => Promise<void>
```

Each method should:
- Set a loading flag (`isSubmitting` or per-action flags).
- Call the corresponding service function.
- On success: call `refresh()` to reload the member list.
- On error: surface structured error messages for display in the UI.

### 5. Components

#### 5a. `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx`
- **Pattern**: Right-side slide-in modal, matching the existing `AsignarNivelModal.tsx` layout.
- **Props**: `miembro: MiembroTableItem | null`, `onClose: () => void`, `onSave: (input: EditarPerfilMiembroInput) => Promise<void>`, `isLoading: boolean`
- **Sections**:
  - **Identity**: `nombre` (required), `apellido`, `email` (disabled, read-only)
  - **Contact**: `telefono`, `fecha_nacimiento`
  - **Document**: `tipo_identificacion` (select), `numero_identificacion`, `rh`
  - **Status**: `estado` (select: `activo`, `mora`, `suspendido`, `inactivo`)
  - **Sports Profile**: `peso_kg`, `altura_cm`
- Pre-fill all fields from the `miembro` prop on open.
- Show a loading spinner on the Save button while submitting.
- On success: close modal and display a toast notification.
- On error: display inline error message within the modal.

#### 5b. `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx`
- **Pattern**: Centered confirmation dialog, similar to inline rechazar flow in `SolicitudesTable.tsx`.
- **Props**: `miembro: MiembroTableItem | null`, `onClose: () => void`, `onConfirm: () => Promise<void>`, `isLoading: boolean`
- Display member's full name and a clear warning: _"This will remove the member from the organization. Their account will not be deleted."_
- Two buttons: Cancel (ghost) and Confirm Delete (red/destructive).

#### 5c. `src/components/portal/gestion-equipo/BloquearMiembroModal.tsx`
- **Pattern**: Small centered modal.
- **Props**: `miembro: MiembroTableItem | null`, `onClose: () => void`, `onConfirm: (motivo?: string) => Promise<void>`, `isLoading: boolean`
- Contains:
  - Member name display.
  - `motivo` textarea (optional, max 300 chars).
  - Warning: _"The member will be removed from the team and will not be able to send new access requests."_
  - Two buttons: Cancel and Confirm Block (amber/warning tone).

#### 5d. `src/components/portal/gestion-equipo/EquipoTable.tsx` — Update
- Rename the existing `onAsignarNivel` prop to remain but make the `Acciones` column **always visible** (remove conditional rendering).
- Add three new optional callback props:
  ```typescript
  onEditarPerfil?: (row: MiembroTableItem) => void;
  onEliminar?: (row: MiembroTableItem) => void;
  onBloquear?: (row: MiembroTableItem) => void;
  ```
- In each row's `Acciones` cell, render up to four icon buttons (right-aligned, spaced):
  | Action | Icon (`material-symbols-outlined`) | Colour hint |
  |---|---|---|
  | Edit Profile | `edit` | `hover:text-turquoise` |
  | Asignar Nivel | `military_tech` | `hover:text-turquoise` (existing) |
  | Remove | `person_remove` | `hover:text-rose-400` |
  | Block | `block` | `hover:text-amber-400` |
- Each button includes a descriptive `title` attribute for accessibility.
- Render buttons conditionally based on whether the prop is provided (same pattern as current `onAsignarNivel`).

#### 5e. `src/components/portal/gestion-equipo/EquipoPage.tsx` — Update
- Add state variables for modal control:
  ```typescript
  const [editTarget, setEditTarget] = useState<MiembroTableItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MiembroTableItem | null>(null);
  const [blockTarget, setBlockTarget] = useState<MiembroTableItem | null>(null);
  ```
- Wire up `editarPerfil`, `eliminarDelEquipo`, `bloquearDelEquipo` from the `useEquipo` hook.
- Pass handler callbacks to `EquipoTable`:
  ```tsx
  onEditarPerfil={(row) => setEditTarget(row)}
  onEliminar={(row) => setRemoveTarget(row)}
  onBloquear={(row) => setBlockTarget(row)}
  ```
- Render the three new modals at the bottom of the page, each receiving the appropriate target and handler props.
- After a successful block, also call `refreshBloqueados()` if `useBloqueados` is already mounted on the page (or rely on the Bloqueados tab refreshing on mount).

#### 5f. `src/components/portal/gestion-equipo/index.ts` — Update
Export the three new modal components:
```typescript
export { EditarPerfilMiembroModal } from './EditarPerfilMiembroModal';
export { EliminarMiembroModal } from './EliminarMiembroModal';
export { BloquearMiembroModal } from './BloquearMiembroModal';
```

---

## Endpoints / Data Access Patterns

This feature uses the Supabase JS client (no REST API routes). All data access is in the service layer.

| Operation | Table(s) | Method |
|---|---|---|
| Edit profile | `public.usuarios`, `public.perfil_deportivo` | UPDATE / UPSERT |
| Remove member | `public.miembros_tenant` | DELETE |
| Block member | `public.miembros_tenant_bloqueados` (INSERT) + `public.miembros_tenant` (DELETE) | INSERT + DELETE |

---

## Files to Create / Modify

### New Files
| File | Purpose |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_equipo_admin_actions.sql` | RLS policies for admin UPDATE on usuarios and DELETE on miembros_tenant |
| `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx` | Edit profile slide-in modal |
| `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx` | Remove confirmation modal |
| `src/components/portal/gestion-equipo/BloquearMiembroModal.tsx` | Block with motivo modal |

### Modified Files
| File | Change |
|---|---|
| `src/types/portal/equipo.types.ts` | Add `EditarPerfilMiembroInput`, `EliminarMiembroInput` |
| `src/services/supabase/portal/equipo.service.ts` | Add `editarPerfilMiembro`, `eliminarMiembro`, `bloquearMiembroDelEquipo` |
| `src/hooks/portal/gestion-equipo/useEquipo.ts` | Expose `editarPerfil`, `eliminarDelEquipo`, `bloquearDelEquipo` |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Add action button props and render in each row |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add modal state, wire callbacks, render modals |
| `src/components/portal/gestion-equipo/index.ts` | Export new modal components |

---

## Expected Results

1. The `Acciones` column in the Equipo tab displays up to four icon buttons per row: Edit Profile, Assign Level, Remove, Block.
2. **Edit Profile**: clicking the edit icon opens the slide-in modal pre-filled with the member's current data. Saving updates `usuarios` (and optionally `perfil_deportivo`) and refreshes the table.
3. **Remove Member**: clicking the remove icon shows a confirmation modal. Confirming deletes the `miembros_tenant` row. The row disappears from the table. The user's account remains intact.
4. **Block Member**: clicking the block icon opens a modal with an optional reason field. Confirming inserts into `miembros_tenant_bloqueados` and deletes the `miembros_tenant` row. The member disappears from the Equipo tab and appears in the Bloqueados tab.
5. All three actions show loading state during submission and surface error messages inline on failure.
6. RLS prevents any non-admin user from executing these operations at the database level.

---

## Acceptance Criteria

- [ ] Equipo table row always shows the Acciones column with action icons.
- [ ] Admin can open the Edit Profile modal for any team member, update all editable fields, and save successfully.
- [ ] Email field is displayed but not editable in the Edit Profile modal.
- [ ] Admin can remove a member after confirming the dialog; the member disappears from the table.
- [ ] Admin can block a member with an optional motivo; the member disappears from Equipo and appears in Bloqueados.
- [ ] A blocked member loses their active membership immediately.
- [ ] All three actions are protected by RLS at the DB level.
- [ ] Non-admin users cannot trigger these mutations via direct Supabase calls.
- [ ] Loading state is shown on action buttons/modals while the operation is in progress.
- [ ] Error messages are displayed inline when an operation fails.
- [ ] TypeScript strict mode — no `any` types used.

---

## Non-Functional Requirements

### Security
- All three mutations require admin membership in the target tenant, enforced by RLS using `get_admin_tenants_for_authenticated_user()`.
- The `usuarios_update_admin` policy must restrict updates to users who are members of the admin's tenants — never to arbitrary users.
- No sensitive fields (`id`, `created_at`, auth email) are editable via the UI.
- The `email` field is shown as read-only UI but never sent in the UPDATE payload.

### Performance
- Profile edit is a single UPDATE + optional UPSERT: O(1), acceptable.
- Member removal is a single DELETE: O(1), acceptable.
- Block operation (INSERT + DELETE) runs sequentially; both are indexed operations on `tenant_id/usuario_id`.
- No new expensive queries; existing pagination and stats recompute client-side.

### Data Integrity
- Removing a member does NOT cascade-delete their bookings, subscriptions, or attendance records (FK constraints are `ON DELETE CASCADE` only on auth.users → usuarios, not on miembros_tenant).
- Blocking a member uses the `miembros_tenant_bloqueados` unique constraint `(tenant_id, usuario_id)` to prevent duplicate block records.
- `perfil_deportivo` upsert uses `ON CONFLICT (user_id) DO UPDATE` to avoid duplicates.

### Accessibility
- All icon buttons must include a descriptive `title` attribute.
- Modals are keyboard-navigable (focus trap) and closable via `Escape`.
- Destructive buttons (remove/block) use visually distinct colors (red/amber).
