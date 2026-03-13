## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0029-edit-team-member-role` from `develop`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/YYYYMMDDHHMMSS_equipo_update_rol.sql` with RLS policy `miembros_tenant_update_rol_admin` for UPDATE on `public.miembros_tenant`, scoped to `get_admin_tenants_for_authenticated_user()` with both `USING` and `WITH CHECK` clauses
- [x] 2.2 Add `GRANT UPDATE ON TABLE public.miembros_tenant TO authenticated` in the same migration (verify it is not already granted)
- [ ] 2.3 Apply the migration locally with `supabase db push` or `supabase migration up` and verify it succeeds

## 3. Types

- [x] 3.1 Add `CambiarRolMiembroInput` type (`miembro_id`, `tenant_id`, `nuevo_rol_id`) to `src/types/portal/equipo.types.ts`
- [x] 3.2 Add `RolOption` type (`id`, `nombre`) to `src/types/portal/equipo.types.ts`
- [x] 3.3 Extend `EquipoServiceError` code union from `'forbidden' | 'unknown'` to `'forbidden' | 'unknown' | 'last_admin' | 'not_found'`

## 4. Service Layer

- [x] 4.1 Add `getRoles()` function to `src/services/supabase/portal/equipo.service.ts` — SELECT `id, nombre` FROM `public.roles` ORDER BY `nombre`, returning `RolOption[]`
- [x] 4.2 Add `cambiarRolMiembro(input: CambiarRolMiembroInput)` function to `equipo.service.ts` — implement last-admin guard: count admins in tenant, throw `EquipoServiceError` with `code: 'last_admin'` if sole admin is being changed away from `administrador`
- [x] 4.3 In `cambiarRolMiembro`, execute UPDATE `miembros_tenant` SET `rol_id = nuevo_rol_id` WHERE `id = miembro_id AND tenant_id = tenant_id`, throw `'not_found'` if zero rows affected, `'forbidden'` on RLS error
- [x] 4.4 Update the imports in `equipo.service.ts` to include the new types (`CambiarRolMiembroInput`, `RolOption`)

## 5. Hook

- [x] 5.1 Add `roles: RolOption[]` state in `useEquipo` and fetch via `getRoles()` on mount (alongside existing `loadData`)
- [x] 5.2 Add `cambiarRol: (input: CambiarRolMiembroInput) => Promise<void>` mutation method — call `cambiarRolMiembro`, then `refresh()` on success
- [x] 5.3 Add `isCambiandoRol: boolean` loading flag, set to `true` during `cambiarRol` execution, `false` in `finally`
- [x] 5.4 Expose `roles`, `cambiarRol`, and `isCambiandoRol` in the hook return object and update the `UseEquipoResult` type

## 6. Component: CambiarRolModal

- [x] 6.1 Create `src/components/portal/gestion-equipo/CambiarRolModal.tsx` following the `EliminarMiembroModal` pattern (null-guard on `miembro`, overlay + backdrop, internal `isSubmitting` state)
- [x] 6.2 Accept props: `miembro: MiembroTableItem | null`, `nuevoRol: RolOption | null`, `isSelfDemotion: boolean`, `onClose`, `onConfirm: () => Promise<void>`, `isLoading: boolean`
- [x] 6.3 Display member full name, current role (`miembro.rol_nombre`), and new role (`nuevoRol.nombre`) in the dialog body
- [x] 6.4 When `isSelfDemotion` is true, render an amber warning banner: _"Estás a punto de remover tus permisos de administrador. Si continúas, perderás acceso a las funciones de administración de esta organización."_
- [x] 6.5 Add Cancel (ghost) and Confirm (primary) buttons with loading/disabled state during submission
- [x] 6.6 Handle `last_admin` error from `onConfirm` — display the error message inline in the modal without closing

## 7. Component: EquipoTable Update

- [x] 7.1 Add optional props `roles?: RolOption[]` and `onCambiarRol?: (row: MiembroTableItem, nuevoRol: RolOption) => void` to `EquipoTableProps`
- [x] 7.2 Replace the static `row.rol_nombre` text in the Perfil `<td>` with a `<select>` dropdown when both `roles` and `onCambiarRol` are provided; fall back to static text otherwise
- [x] 7.3 Populate the `<select>` with options from the `roles` prop, pre-select the option matching `row.rol_nombre`, and add `aria-label="Cambiar rol"`
- [x] 7.4 On `<select>` change, find the selected `RolOption` and call `onCambiarRol(row, selectedRolOption)` — only trigger when the selected value differs from the current role

## 8. Component: EquipoPage Wiring

- [x] 8.1 Add `rolChangeTarget` state (`{ miembro: MiembroTableItem; nuevoRol: RolOption } | null`) to `EquipoPage`
- [x] 8.2 Destructure `roles`, `cambiarRol`, and `isCambiandoRol` from the `useEquipo` hook
- [x] 8.3 Pass `roles` and `onCambiarRol={(row, nuevoRol) => setRolChangeTarget({ miembro: row, nuevoRol })}` to `EquipoTable`
- [x] 8.4 Render `CambiarRolModal` with `miembro`, `nuevoRol`, `isSelfDemotion` (compare `usuario_id` with `user.id`), `onClose`, `onConfirm` (call `cambiarRol` then clear state), and `isLoading`
- [x] 8.5 Import `CambiarRolModal` and `RolOption` type at the top of the file

## 9. Barrel Export

- [x] 9.1 Add `export { CambiarRolModal } from './CambiarRolModal'` to `src/components/portal/gestion-equipo/index.ts`

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` to reflect the new `CambiarRolModal.tsx` component in the `gestion-equipo` feature slice

## 11. Verification & Commit

- [x] 11.1 Run `npm run build` and verify no TypeScript compilation errors
- [ ] 11.2 Manually test: change a member's role, verify the table refreshes and shows the new role
- [ ] 11.3 Manually test: try to change the last admin's role — verify the last-admin error is displayed
- [ ] 11.4 Manually test: change own role away from admin — verify the self-demotion warning appears
- [ ] 11.5 Create a commit with message: `feat(equipo): add inline role editing for team members (US-0029)` and a pull request description summarizing the changes
