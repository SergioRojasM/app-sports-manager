## 1. Branch Setup

- [x] 1.1 Create a new branch: `feat/us0046-view-payment-details-admin`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Extend Hook — `useGestionSuscripciones`

- [x] 2.1 In `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts`, extend the `ModalType` union to include `'verDetalle'`
- [x] 2.2 Add `openVerDetalleModal(row: SuscripcionAdminRow): void` action that sets `modalType = 'verDetalle'` and `selectedRow = row`
- [x] 2.3 Expose `openVerDetalleModal` in the hook's return object

## 3. New Component — `VerDetallePagoModal`

- [x] 3.1 Create `src/components/portal/gestion-suscripciones/VerDetallePagoModal.tsx`
- [x] 3.2 Implement modal scaffold: `role="dialog"`, `aria-modal="true"`, `aria-label="Detalle de Pago"`, `tabIndex={-1}` with `focus()` on mount; Escape key and backdrop click close the modal
- [x] 3.3 Add header: title "Detalle de Pago" + subtitle with athlete name and plan name
- [x] 3.4 Add payment details section: monto (currency), método de pago, `PagoEstadoBadge`, fecha de pago, validado por, fecha de validación — all formatted (`'—'` for null values)
- [x] 3.5 Add comprobante section using `useComprobanteViewer(pago.comprobante_path)`: spinner while loading, error message if URL fails, "No se ha subido comprobante para este pago." when `comprobante_path` is null
- [x] 3.6 Render inline `<img>` preview (max-h-52) for image paths (`.jpg`, `.jpeg`, `.png`, `.webp`), wrapped in `<a target="_blank">` for full view
- [x] 3.7 Render PDF icon + filename + "Ver comprobante" `<a target="_blank">` for `.pdf` paths
- [x] 3.8 Add "Cerrar" button in footer (no approve/reject actions)

## 4. Update Table — `SuscripcionesTable`

- [x] 4.1 In `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`, add `onVerDetallePago: (row: SuscripcionAdminRow) => void` to the `SuscripcionesTableProps` type
- [x] 4.2 Add a "Ver Pago" action button in the actions cell for every row where `row.pago !== null`, rendered before the existing "Validar Pago" button
- [x] 4.3 Style the button consistently with existing action buttons (e.g., `border-slate-500/30 text-slate-300`)

## 5. Wire Modal in Page — `GestionSuscripcionesPage`

- [x] 5.1 In `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx`, destructure `openVerDetalleModal` from `useGestionSuscripciones`
- [x] 5.2 Pass `onVerDetallePago={openVerDetalleModal}` to `<SuscripcionesTable>`
- [x] 5.3 Add `{modalType === 'verDetalle' && selectedRow && <VerDetallePagoModal row={selectedRow} onClose={closeModal} />}` render block

## 6. Barrel Export

- [x] 6.1 Export `VerDetallePagoModal` from `src/components/portal/gestion-suscripciones/index.ts`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add `VerDetallePagoModal.tsx` to the `gestion-suscripciones` feature slice component list with a short description

## 8. Verification

- [x] 8.1 Test: open the subscription list, click "Ver Pago" on a row with a validated payment — confirm modal shows all fields and comprobante
- [x] 8.2 Test: open modal for a payment with no `comprobante_path` — confirm "No se ha subido comprobante" message is shown
- [x] 8.3 Test: open modal for a payment with a PDF comprobante — confirm PDF icon + "Ver comprobante" link is rendered
- [x] 8.4 Test: press Escape and click backdrop — confirm modal closes without data change
- [x] 8.5 Test: the existing "Validar Pago" button still only appears for `pago.estado === 'pendiente'` and opens `ValidarPagoModal` with approve/reject actions unaffected

## 9. Commit and PR

- [ ] 9.1 Stage all changes and create a commit: `feat(gestion-suscripciones): add Ver Pago read-only payment detail modal (US-0046)`
- [ ] 9.2 Push branch and open a Pull Request with description:
  ```
  ## Summary
  Adds a "Ver Pago" read-only action to the admin subscription management table.
  Admins can now inspect full payment details and the comprobante (proof of payment)
  for any payment status — not just pending ones.
  
  ## Changes
  - New `VerDetallePagoModal` component (read-only, no mutations)
  - Extended `ModalType` union in `useGestionSuscripciones` with `'verDetalle'`
  - New `onVerDetallePago` action wired through `SuscripcionesTable` → `GestionSuscripcionesPage`
  - Barrel export updated
  
  ## Testing
  - Verified modal opens for validated, rejected, and pending payments
  - Verified comprobante image preview and PDF link
  - Verified no-comprobante empty state
  - Verified existing Validar Pago flow is unaffected
  
  Closes #US-0046
  ```
