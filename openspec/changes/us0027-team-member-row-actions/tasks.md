## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/team-member-row-actions`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/$(date +%Y%m%d%H%M%S)_equipo_admin_actions.sql`
- [x] 2.2 Add RLS policy `usuarios_update_admin` on `public.usuarios` FOR UPDATE TO `authenticated`, scoped to users who are members of an admin-managed tenant
- [x] 2.3 Add RLS policy `miembros_tenant_delete_admin` on `public.miembros_tenant` FOR DELETE TO `authenticated`, scoped to admin-managed tenants
- [x] 2.4 Add `GRANT DELETE ON TABLE public.miembros_tenant TO authenticated`
- [x] 2.5 Apply migration locally with `supabase db reset` or `supabase migration up` and verify no errors
- [x] 2.6 Manually test RLS: confirm admin session can UPDATE `usuarios` and DELETE `miembros_tenant`; confirm non-admin cannot

## 3. Types

- [x] 3.1 Add `EditarPerfilMiembroInput` type to `src/types/portal/equipo.types.ts` with fields: `usuario_id`, `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `rh`, `estado`, `peso_kg`, `altura_cm`
- [x] 3.2 Add `EliminarMiembroInput` type to `src/types/portal/equipo.types.ts` with fields: `miembro_id`, `tenant_id`
- [x] 3.3 Add `PerfilDeportivoRow` (or inline return type) for `getPerfilDeportivo` result: `{ peso_kg: number | null; altura_cm: number | null }`

## 4. Service Layer

- [x] 4.1 Add `equipoService.getPerfilDeportivo(usuarioId: string)` — SELECT `peso_kg`, `altura_cm` from `public.perfil_deportivo` WHERE `user_id = usuarioId`; return `{ peso_kg: null, altura_cm: null }` when no row exists
- [x] 4.2 Add `equipoService.editarPerfilMiembro(input: EditarPerfilMiembroInput)` — UPDATE `public.usuarios` with all non-email fields; UPSERT `public.perfil_deportivo` only when `peso_kg` or `altura_cm` is non-null; throw `EquipoServiceError` with appropriate `code` on failure
- [x] 4.3 Add `equipoService.eliminarMiembro(input: EliminarMiembroInput)` — DELETE from `public.miembros_tenant` WHERE `id = miembro_id AND tenant_id = tenant_id`; throw `EquipoServiceError` on failure
- [x] 4.4 Add `equipoService.bloquearMiembroDelEquipo(input: BloquearUsuarioInput & { miembro_id: string })` — INSERT into `public.miembros_tenant_bloqueados` first; only on success DELETE from `public.miembros_tenant`; throw `EquipoServiceError` on failure

## 5. Hook

- [x] 5.1 Add `editarPerfil(input: EditarPerfilMiembroInput): Promise<void>` to `useEquipo` — calls `equipoService.editarPerfilMiembro`, then `refresh()` on success
- [x] 5.2 Add `eliminarDelEquipo(input: EliminarMiembroInput): Promise<void>` to `useEquipo` — calls `equipoService.eliminarMiembro`, then `refresh()` on success
- [x] 5.3 Add `bloquearDelEquipo(input: BloquearUsuarioInput & { miembro_id: string }): Promise<void>` to `useEquipo` — calls `equipoService.bloquearMiembroDelEquipo`, then `refresh()` on success
- [x] 5.4 Update `UseEquipoResult` type to include the three new mutation functions

## 6. Components

- [x] 6.1 Update `EquipoTable.tsx`: make Acciones `<th>` always visible (remove `onAsignarNivel` conditional guard on the column header)
- [x] 6.2 Add optional props to `EquipoTableProps`: `onEditarPerfil?: (row: MiembroTableItem) => void`, `onEliminar?: (row: MiembroTableItem) => void`, `onBloquear?: (row: MiembroTableItem) => void`
- [x] 6.3 Add Edit Profile button (`edit` icon, `hover:text-turquoise`, `title="Editar perfil"`) to each row, rendered only when `onEditarPerfil` is provided
- [x] 6.4 Add Remove button (`person_remove` icon, `hover:text-rose-400`, `title="Eliminar del equipo"`) to each row, rendered only when `onEliminar` is provided
- [x] 6.5 Add Block button (`block` icon, `hover:text-amber-400`, `title="Bloquear usuario"`) to each row, rendered only when `onBloquear` is provided
- [x] 6.6 Create `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx` — right-side slide-in modal; props: `miembro`, `onClose`, `onSave`, `isLoading`; sections: Identity, Contact, Document, Status, Sports Profile; email as disabled read-only field; fetch `perfil_deportivo` on open with skeleton; inline validation for `nombre` required; loading state on Save button
- [x] 6.7 Create `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx` — centred confirmation dialog; props: `miembro`, `onClose`, `onConfirm`, `isLoading`; displays member full name and "account will not be deleted" warning; Cancel (ghost) and Confirm (red) buttons; loading state on Confirm
- [x] 6.8 Create `src/components/portal/gestion-equipo/BloquearMiembroModal.tsx` — centred modal; props: `miembro`, `onClose`, `onConfirm`, `isLoading`; member name display, optional `motivo` textarea (max 300 chars), blocking consequence warning; Cancel and Confirm Block (amber) buttons; loading state on Confirm
- [x] 6.9 Update `EquipoPage.tsx`: add state `editTarget`, `removeTarget`, `blockTarget` (all `MiembroTableItem | null`); wire `editarPerfil`, `eliminarDelEquipo`, `bloquearDelEquipo` from `useEquipo`; pass `onEditarPerfil`, `onEliminar`, `onBloquear` callbacks to `EquipoTable`; render the three new modals at the bottom of the page
- [x] 6.10 Update `src/components/portal/gestion-equipo/index.ts` to export `EditarPerfilMiembroModal`, `EliminarMiembroModal`, `BloquearMiembroModal`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` to reflect the three new modal component files under `src/components/portal/gestion-equipo/` and the new service functions in `equipo.service.ts`

## 8. Verification

- [x] 8.1 Run `npm run build` (or `tsc --noEmit`) and confirm zero TypeScript errors
- [x] 8.2 Manually verify Edit Profile: open modal, confirm pre-fill, edit fields, save, confirm table refreshes
- [x] 8.3 Manually verify Remove: open modal, confirm, member disappears from table
- [x] 8.4 Manually verify Block: open modal, enter motivo, confirm, member disappears from Equipo tab and appears in Bloqueados tab
- [x] 8.5 Verify email field is non-editable in the Edit Profile modal
- [x] 8.6 Verify `nombre` validation fires when field is empty on save
- [x] 8.7 Verify all action buttons render `title` attributes

## 9. Commit & Pull Request

- [ ] 9.1 Stage all changes and create a commit with message:
  ```
  feat(gestion-equipo): add edit profile, remove, and block row actions

  - Add RLS policies: usuarios_update_admin, miembros_tenant_delete_admin
  - Add service: getPerfilDeportivo, editarPerfilMiembro, eliminarMiembro, bloquearMiembroDelEquipo
  - Add hook mutations: editarPerfil, eliminarDelEquipo, bloquearDelEquipo
  - Add components: EditarPerfilMiembroModal, EliminarMiembroModal, BloquearMiembroModal
  - Update EquipoTable with always-visible Acciones column and 3 new icon buttons
  - Update EquipoPage to wire modals and mutation handlers

  Closes US-0027
  ```
- [ ] 9.2 Open a pull request with title `feat: team member row actions (US-0027)` and description summarising the three new actions, the RLS migration, and files modified
