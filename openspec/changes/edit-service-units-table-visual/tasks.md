## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/edit-service-units-table-visual`
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260611000200_admin_update_suscripcion_servicio_unidades.sql` with the `admin_update_suscripcion_servicio_unidades` SECURITY DEFINER function (validates admin tenant membership, rejects negative values, handles null for unlimited)
- [x] 2.2 Grant `EXECUTE` on the function to the `authenticated` role in the same migration file
- [x] 2.3 Apply migration locally: `npx supabase db reset` or `npx supabase migration up`
- [x] 2.4 Verify function exists in local DB: `\df public.admin_update_suscripcion_servicio_unidades`

## 3. Types

- [x] 3.1 Add `EditarServicioUnidades` interface to `src/types/portal/gestion-suscripciones.types.ts` with fields: `servicio_id`, `servicio_nombre`, `unidades_incluidas: number | null`, `unidades_restantes: number | null`
- [x] 3.2 Extend `EditarSuscripcionFormValues` in the same file with `servicios: EditarServicioUnidades[]`

## 4. Service Layer

- [x] 4.1 Add `adminUpdateServicioUnidades(suscripcionId: string, servicioId: string, unidadesRestantes: number | null): Promise<void>` to `src/services/supabase/portal/gestion-suscripciones.service.ts` — calls `supabase.rpc('admin_update_suscripcion_servicio_unidades', ...)` and maps `42501` to `GestionSuscripcionesServiceError('forbidden', ...)`

## 5. Hook — useEditarSuscripcion

- [x] 5.1 Update `useEditarSuscripcion.ts` to include `servicios: EditarServicioUnidades[]` in `formValues` initial state
- [x] 5.2 In the `useEffect` that pre-populates the form from `row`, also map `row.servicios` into `formValues.servicios`
- [x] 5.3 Add `setServicioUnidades(servicioId: string, value: number | null): void` helper that immutably updates the matching entry in `formValues.servicios`
- [x] 5.4 Expose `setServicioUnidades` in the hook's return type and return object
- [x] 5.5 In `submit()`, after `editarSuscripcion` succeeds, iterate `formValues.servicios`; for each entry where `unidades_restantes` differs from the original `row.servicios` counterpart, call `adminUpdateServicioUnidades`; on first failure set error and stop

## 6. Component — EditarSuscripcionModal

- [x] 6.1 Accept `setServicioUnidades` from `useEditarSuscripcion` in `EditarSuscripcionModal.tsx`
- [x] 6.2 Add a "Unidades por Servicio" section rendered only when `formValues.servicios.length > 0`, placed below the Comentarios field
- [x] 6.3 For each service entry, render: service name (read-only), `unidades_incluidas ?? '∞'` badge (read-only), "Ilimitado" checkbox (checked when `unidades_restantes === null`) with `<label>` and `aria-label`, and a number input for `unidades_restantes` (visible and enabled only when not unlimited, min=0) with `aria-label`
- [x] 6.4 Wire checkbox toggle: checking sets `unidades_restantes = null`; unchecking sets it to `unidades_incluidas ?? 0`
- [x] 6.5 Wire number input `onChange` to call `setServicioUnidades` with the parsed integer value
- [x] 6.6 Ensure all service inputs are disabled when `isSubmitting` is true

## 7. Component — VerServiciosModal (new)

- [x] 7.1 Create `src/components/portal/gestion-suscripciones/VerServiciosModal.tsx` following the `VerDetallePagoModal` pattern
- [x] 7.2 Props: `row: SuscripcionAdminRow`, `onClose: () => void`
- [x] 7.3 Sort services finite-unit first (`unidades_incluidas !== null` before `null`) before rendering
- [x] 7.4 Render each service as a row: name, `unidades_restantes ?? '∞'`, `/`, `unidades_incluidas ?? '∞'`
- [x] 7.5 Attach Escape key listener and backdrop click handler to call `onClose`
- [x] 7.6 Export from `src/components/portal/gestion-suscripciones/index.ts` if that file exists

## 8. Hook — useGestionSuscripciones

- [x] 8.1 Add `'verServicios'` to the `ModalType` union in `useGestionSuscripciones.ts`
- [x] 8.2 Add `openVerServiciosModal: (row: SuscripcionAdminRow) => void` callback that calls `setSelectedRow(row)` and `setModalType('verServicios')`
- [x] 8.3 Expose `openVerServiciosModal` in the hook return type and return object

## 9. Component — SuscripcionesTable (visual refactor)

- [x] 9.1 Add `onVerServicios: (row: SuscripcionAdminRow) => void` to `SuscripcionesTableProps` type
- [x] 9.2 ATLETA column: change `px-4` to `px-2`, add `max-w-[130px]` to the cell, apply `truncate` to both the name `<div>` and email `<div>`, add `title` attributes with full values
- [x] 9.3 PLAN column: change `px-4` to `px-2`, add `max-w-[110px]` to the cell and `truncate` to the text, add `title` attribute with full plan name
- [x] 9.4 INICIO/FIN column: render both `fecha_inicio` and `fecha_fin` at `text-xs`; keep `text-slate-300` for inicio and `text-slate-400` for fin; remove the `text-sm` base size from inicio
- [x] 9.5 SERVICIOS column: add `min-w-[180px]` to `<th>` and `<td>`; sort `row.servicios` with finite-unit entries first before slicing; slice to 2 (down from 3); replace the plain `<li>+{n} más</li>` with `<button type="button" onClick={() => onVerServicios(row)}>+{n} más</button>` styled consistently
- [x] 9.6 VALIDACIÓN column: change both validator name elements to `text-xs text-slate-400` (remove any larger size from the primary validator name)
- [x] 9.7 ACCIONES column: replace all six text-label buttons with inline-SVG icon buttons (16×16 viewBox); add `title` and `aria-label` attributes matching the action description for each; keep conditional rendering logic unchanged

## 10. Component — GestionSuscripcionesPage (wiring)

- [x] 10.1 Destructure `openVerServiciosModal` from `useGestionSuscripciones` in `GestionSuscripcionesPage.tsx`
- [x] 10.2 Pass `onVerServicios={openVerServiciosModal}` as prop to `<SuscripcionesTable>`
- [x] 10.3 Mount `<VerServiciosModal>` in the modal rendering block when `modalType === 'verServicios'` and `selectedRow !== null`, passing `row={selectedRow}` and `onClose={closeModal}`

## 11. Validation

- [x] 11.1 Run `get_errors` on all modified and created TypeScript files; resolve any type errors
- [ ] 11.2 Test: open edit modal for a subscription with no services — verify "Unidades por Servicio" section is absent
- [ ] 11.3 Test: open edit modal for a subscription with services — verify section appears with correct pre-populated values
- [ ] 11.4 Test: toggle "Ilimitado" checkbox on and off — verify number input shows/hides and `unidades_restantes` is set correctly
- [ ] 11.5 Test: save with changed service unit value — verify table refreshes with updated value, no console errors
- [ ] 11.6 Test: save with no changes to service units — verify no `adminUpdateServicioUnidades` RPC calls are made (check browser network tab)
- [ ] 11.7 Test: click "+X más" in SERVICIOS column — verify `VerServiciosModal` opens with full sorted service list
- [ ] 11.8 Test: verify ATLETA and PLAN columns truncate long names with ellipsis
- [ ] 11.9 Test: verify INICIO/FIN dates are the same text size
- [ ] 11.10 Test: verify VALIDACIÓN column shows both names at the same small size
- [ ] 11.11 Test: hover each ACCIONES icon button — verify `title` tooltip appears

## 12. Documentation and Commit

- [ ] 12.1 Update `projectspec/03-project-structure.md` if `VerServiciosModal` or new hook methods need to be listed under the `gestion-suscripciones` feature slice entries
- [ ] 12.2 Create a commit with message: `feat(gestion-suscripciones): edit service unit balances + table visual refactor (US-0067)`
- [ ] 12.3 Write a pull request description summarising: new `admin_update_suscripcion_servicio_unidades` RPC, editable service units in edit modal, 6 visual column changes in SuscripcionesTable, new VerServiciosModal
