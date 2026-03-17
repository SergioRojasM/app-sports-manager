## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/us0032-edit-delete-subscriptions-admin`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`: `git branch --show-current`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/YYYYMMDD000100_suscripciones_admin_delete_rls.sql` with `GRANT DELETE ON public.suscripciones TO authenticated` and `suscripciones_delete_admin` RLS policy using `get_admin_tenants_for_authenticated_user()`
- [x] 2.2 Apply migration locally with `supabase db push` and verify the policy appears in the Supabase dashboard under `public.suscripciones` policies

## 3. Types

- [x] 3.1 Add `EditarSuscripcionFormValues` interface to `src/types/portal/gestion-suscripciones.types.ts` with fields: `plan_id: string`, `estado: SuscripcionEstado`, `fecha_inicio: string | null`, `fecha_fin: string | null`, `clases_restantes: number | null`, `clases_plan: number | null`, `comentarios: string | null`

## 4. Service

- [x] 4.1 Add `editarSuscripcion(suscripcionId: string, values: EditarSuscripcionFormValues): Promise<void>` to `src/services/supabase/portal/gestion-suscripciones.service.ts` — issues `supabase.from('suscripciones').update(payload).eq('id', suscripcionId)`, throws `GestionSuscripcionesServiceError` on failure
- [x] 4.2 Add `eliminarSuscripcion(suscripcionId: string): Promise<void>` to `src/services/supabase/portal/gestion-suscripciones.service.ts` — issues `supabase.from('suscripciones').delete().eq('id', suscripcionId)`, throws `GestionSuscripcionesServiceError` on failure

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` — accepts `{ row: SuscripcionAdminRow | null, tenantId: string, onSuccess: () => void }`, fetches active tenant plans on mount, exposes `formValues`, field setters, `planes` list, `isLoadingPlanes`, `isSubmitting`, `error`, and `submit` action; calls `gestionSuscripcionesService.editarSuscripcion` on submit with date range validation (fecha_fin must be after fecha_inicio when both set)
- [x] 5.2 Create `src/hooks/portal/gestion-suscripciones/useEliminarSuscripcion.ts` — accepts `{ onSuccess: () => void }`, exposes `isSubmitting`, `error`, and `confirmar(suscripcionId: string)` action; calls `gestionSuscripcionesService.eliminarSuscripcion`

## 6. Extend `useGestionSuscripciones`

- [x] 6.1 Extend `ModalType` union in `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` to `'pago' | 'suscripcion' | 'editar' | 'eliminar' | null`
- [x] 6.2 Add `openEditarModal: (row: SuscripcionAdminRow) => void` and `openEliminarModal: (row: SuscripcionAdminRow) => void` handlers to the hook result type and implementation
- [x] 6.3 Expose both new handlers in the hook return value and update the `UseGestionSuscripcionesResult` type accordingly

## 7. Components

- [x] 7.1 Create `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` — `'use client'` modal following the `ValidarSuscripcionModal` visual pattern; fields: `plan_id` (select populated from `useEditarSuscripcion.planes`), `estado` (select with all four values), `fecha_inicio` (date input), `fecha_fin` (date input), `clases_restantes` (number input ≥ 0), `clases_plan` (number input ≥ 0), `comentarios` (textarea); shows inline error; disables all buttons while `isSubmitting`; dismisses on Escape/backdrop when not submitting
- [x] 7.2 Create `src/components/portal/gestion-suscripciones/EliminarSuscripcionModal.tsx` — `'use client'` confirmation dialog following the `ValidarPagoModal` visual pattern; displays athlete full name and plan name; confirmation text notes that associated payments will also be removed; shows inline error; disables all buttons while `isSubmitting`; dismisses on Escape/backdrop when not submitting
- [x] 7.3 Add `EditarSuscripcionModal` and `EliminarSuscripcionModal` to `src/components/portal/gestion-suscripciones/index.ts`

## 8. `SuscripcionesTable`

- [x] 8.1 Add `onEditar: (row: SuscripcionAdminRow) => void` and `onEliminar: (row: SuscripcionAdminRow) => void` to the `SuscripcionesTableProps` type in `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`
- [x] 8.2 Add "Editar" button (amber/yellow colour scheme consistent with edit actions in the codebase) and "Eliminar" button (rose/red colour scheme) to the Actions cell for every row — both always visible regardless of subscription `estado`; wire to `onEditar(row)` and `onEliminar(row)` respectively

## 9. `GestionSuscripcionesPage`

- [x] 9.1 Destructure `openEditarModal` and `openEliminarModal` from `useGestionSuscripciones` in `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx`
- [x] 9.2 Pass `onEditar={openEditarModal}` and `onEliminar={openEliminarModal}` to `SuscripcionesTable`
- [x] 9.3 Mount `EditarSuscripcionModal` conditionally when `modalType === 'editar'` — pass `row={selectedRow}`, `tenantId`, `onClose={closeModal}`, `onSuccess={handleModalSuccess}`
- [x] 9.4 Mount `EliminarSuscripcionModal` conditionally when `modalType === 'eliminar'` — pass `row={selectedRow}`, `onClose={closeModal}`, `onSuccess={handleModalSuccess}`

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` — add `EditarSuscripcionModal.tsx` and `EliminarSuscripcionModal.tsx` to the `gestion-suscripciones/` component slice listing; add `useEditarSuscripcion.ts` and `useEliminarSuscripcion.ts` to the `gestion-suscripciones/` hooks listing

## 11. Validation

- [x] 11.1 Run `npm run build` (or `npm run typecheck`) and confirm zero TypeScript errors
- [x] 11.2 Manually verify "Editar" button opens the modal pre-populated with correct values for an existing subscription
- [x] 11.3 Manually verify submitting the edit form updates the row in the table and closes the modal
- [x] 11.4 Manually verify date validation rejects `fecha_fin ≤ fecha_inicio`
- [x] 11.5 Manually verify "Eliminar" button opens the confirmation dialog with correct athlete and plan names
- [x] 11.6 Manually verify confirming deletion removes the row from the table and its associated payments from `pagos`
- [x] 11.7 Manually verify all existing actions (Validar Pago, Validar Suscripción, Cancelar) remain unchanged

## 12. Commit and Pull Request

- [ ] 12.1 Stage all changes and create a commit with message: `feat(gestion-suscripciones): add edit and delete subscription actions for admins (US0032)`
- [ ] 12.2 Push branch and open a Pull Request with description:
  ```
  ## Summary
  Adds "Editar" and "Eliminar" actions to every row in the admin subscription table.
  
  ## Changes
  - New `EditarSuscripcionModal` + `useEditarSuscripcion` for full-field subscription editing
  - New `EliminarSuscripcionModal` + `useEliminarSuscripcion` for delete-with-confirmation
  - `gestionSuscripcionesService.editarSuscripcion` and `eliminarSuscripcion` service methods
  - Extended `useGestionSuscripciones` ModalType and openers
  - `SuscripcionesTable` Actions column gains Editar + Eliminar buttons (always visible)
  - DB migration: GRANT DELETE + `suscripciones_delete_admin` RLS policy
  
  ## Testing
  - Verified edit pre-population, field validation, success/error flows
  - Verified delete confirmation dialog, cascade to pagos, table refresh
  - Verified existing Validar Pago / Validar Suscripción actions unaffected
  
  Closes #US0032
  ```
