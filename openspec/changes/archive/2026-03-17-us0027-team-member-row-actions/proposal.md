## Why

The Gestión de Equipo table gives administrators a read-only view of their team members with no way to correct member data, remove departing members, or block problematic ones — forcing workarounds outside the platform. Adding contextual Edit Profile, Remove, and Block actions directly on each row closes this operational gap and completes the team lifecycle management workflow already started with access-request control (US-0026).

## What Changes

- **Extend `EquipoTable` actions column** with three new icon buttons per row: Edit Profile (`edit`), Remove from Team (`person_remove`), and Block from Team (`block`), alongside the existing Assign Level button.
- **New `EditarPerfilMiembroModal` component** — right-side slide-in modal pre-filled with the member's `usuarios` and `perfil_deportivo` fields; admin can update personal, contact, document, status, and sports profile data.
- **New `EliminarMiembroModal` component** — confirmation dialog that deletes the `miembros_tenant` row; the user's account is preserved.
- **New `BloquearMiembroModal` component** — modal with optional `motivo` field that inserts into `miembros_tenant_bloqueados` and removes the `miembros_tenant` row; the member immediately appears in the Bloqueados tab.
- **New service functions** in `equipo.service.ts`: `editarPerfilMiembro`, `eliminarMiembro`, `bloquearMiembroDelEquipo`.
- **Extend `useEquipo` hook** to expose the three new mutation methods and trigger list refresh on success.
- **New DB migration** with two RLS policies: `usuarios_update_admin` (allows admins to UPDATE `public.usuarios` for members of their tenant) and `miembros_tenant_delete_admin` (allows admins to DELETE rows from `public.miembros_tenant` for their tenant).
- **New types** `EditarPerfilMiembroInput` and `EliminarMiembroInput` in `equipo.types.ts`.

## Non-goals

- Creating or authenticating user accounts (auth email is read-only and never patched).
- Building a standalone user administration page outside of team management.
- Bulk operations (select-all and delete/block multiple members at once).
- Managing the member's subscriptions, bookings, or training history during removal.

## Capabilities

### New Capabilities
<!-- none — behavior extends an existing capability -->

### Modified Capabilities

- `team-management`: Adds row-level action requirements to the Equipo table — admin SHALL be able to edit a member's profile, remove a member from the team, and block a member directly from the table. Each action requires a modal interaction and produces a persisted mutation. The `EquipoTable` column set and the service/hook interfaces for this capability change.

## Impact

**DB / migrations**
- New file: `supabase/migrations/<timestamp>_equipo_admin_actions.sql`
  - RLS policy `usuarios_update_admin` on `public.usuarios`
  - RLS policy `miembros_tenant_delete_admin` on `public.miembros_tenant`
  - `GRANT DELETE ON public.miembros_tenant TO authenticated`

**Types**
- `src/types/portal/equipo.types.ts` — add `EditarPerfilMiembroInput`, `EliminarMiembroInput`

**Service**
- `src/services/supabase/portal/equipo.service.ts` — add `editarPerfilMiembro`, `eliminarMiembro`, `bloquearMiembroDelEquipo`

**Hook**
- `src/hooks/portal/gestion-equipo/useEquipo.ts` — expose `editarPerfil`, `eliminarDelEquipo`, `bloquearDelEquipo`

**Components (new)**
- `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx`
- `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx`
- `src/components/portal/gestion-equipo/BloquearMiembroModal.tsx`

**Components (modified)**
- `src/components/portal/gestion-equipo/EquipoTable.tsx` — add action button props; always show Acciones column
- `src/components/portal/gestion-equipo/EquipoPage.tsx` — add modal state, wire callbacks, render modals
- `src/components/portal/gestion-equipo/index.ts` — export new modals

**Dependencies**
- `miembros_tenant_bloqueados` table and `bloquearUsuario` logic already implemented in `solicitudes.service.ts` (US-0026) — will be reused or replicated.
- No new npm packages required.
