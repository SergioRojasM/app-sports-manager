# US-0046 — View Payment Details Modal (Admin)

## ID
US-0046

## Name
View Full Payment Details and Comprobante from Subscription Management (Admin)

## As a
Administrador of a tenant organization

## I Want
To open a read-only modal from the subscription management table that shows all payment information — amount, method, status, dates, validation info, and the payment proof (comprobante) — regardless of the payment's current status

## So That
I can review the full payment record and comprobante at any time (including already-validated or rejected payments) without triggering the validation workflow unintentionally

---

## Description

### Current State
The `gestion-suscripciones` page (`(administrador)/gestion-suscripciones/page.tsx`) shows a subscription table with a **"Validar Pago"** action button that only appears for rows where `pago.estado === 'pendiente'`. This button opens `ValidarPagoModal`, which shows payment details + comprobante preview and allows approve/reject actions.

There is **no action** to view payment details for subscriptions with a payment in `validado` or `rechazado` state. Admins cannot review the comprobante after a payment has been processed, nor inspect the details of rejected payments without changing their status.

The `mis-suscripciones-y-pagos` feature (athlete-facing view) has a `PagoCard` component that renders payment info and comprobante viewer in a compact, read-only format. This pattern should be mirrored in the admin view as a dedicated modal.

### Proposed Changes

#### New Action Button in Table
Add a **"Ver Pago"** action button in `SuscripcionesTable` for every row that has an associated `pago` (i.e., `row.pago !== null`), regardless of the payment's `estado`. The button is always visible alongside the existing conditional action buttons:

- "Ver Pago" (new) — visible when `row.pago !== null`
- "Validar Pago" — existing, only when `pago.estado === 'pendiente'`
- "Validar Suscripción" / "Cancelar" — existing
- "Editar" — existing
- "Eliminar" — existing

#### New Read-Only Modal: `VerDetallePagoModal`
A new modal component `VerDetallePagoModal.tsx` that displays:

**Header:**
- Title: "Detalle de Pago"
- Subtitle: Athlete name and plan name (e.g., "Suscripción de **Juan Pérez** al plan **Plan Mensual**")

**Payment Details Section:**
A bordered info block (`rounded-lg border border-portal-border bg-white/[0.02] p-4`) with rows:
- **Monto**: formatted as currency using `toLocaleString` (e.g., `$50,000`)
- **Método de pago**: `pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'`
- **Estado**: `<PagoEstadoBadge estado={pago.estado} />`
- **Fecha de pago**: formatted date or `'—'` when null
- **Validado por**: `pago.validado_por_nombre ?? '—'`
- **Fecha de validación**: formatted date or `'—'` when null

**Comprobante Section:**
Uses `useComprobanteViewer(pago.comprobante_path)` (already exists in `useComprobanteViewer.ts`):
- While loading: spinner
- On error: error message in `text-slate-400`
- When no `comprobante_path`: message "No se ha subido comprobante para este pago."
- When `comprobante_path` and signed URL is ready:
  - **Image** (`.jpg`, `.jpeg`, `.png`, `.webp`): inline `<img>` with `max-h-52`, wrapped in `<a>` to open full image in new tab
  - **PDF** (`.pdf`): PDF icon + filename + "Ver comprobante" link opening in new tab
  - **Download / view link** always shown below: `<a href={signedUrl} target="_blank">Ver comprobante</a>`

**Footer:**
- Single "Cerrar" button (no approve/reject actions)
- Keyboard: close on `Escape`
- Click on backdrop closes modal

#### Hook: `useGestionSuscripciones`
Add a new `openVerDetalleModal` action alongside the existing `openPagoModal`, `openSuscripcionModal`, `openEditarModal`, `openEliminarModal`. This sets `modalType = 'verDetalle'` and `selectedRow = row`.

The existing `modalType` union type must be extended to include `'verDetalle'`.

#### Page: `GestionSuscripcionesPage`
- Destructure `openVerDetalleModal` from the hook
- Pass `onVerDetallePago={openVerDetalleModal}` to `SuscripcionesTable`
- Render `<VerDetallePagoModal>` when `modalType === 'verDetalle'`

---

## Database Changes

No database changes required. All necessary columns already exist in `pagos` and `suscripciones`. The `useComprobanteViewer` hook already generates signed URLs from `comprobante_path` using the existing `storage.service.ts`.

---

## API / Server Actions

No new service functions required. The modal reads data already loaded in memory via `useGestionSuscripciones`, which fetches the full `SuscripcionAdminRow` including `PagoAdminRow`.

The comprobante signed URL is generated client-side by the existing `useComprobanteViewer` hook calling `storageService.getSignedUrl(supabase, comprobantePath, 300)`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component (new) | `src/components/portal/gestion-suscripciones/VerDetallePagoModal.tsx` | New read-only payment detail modal |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | Add `onVerDetallePago` prop and "Ver Pago" button |
| Component | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Destructure + wire `openVerDetalleModal`; render new modal |
| Hook | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Extend `ModalType` union to include `'verDetalle'`; expose `openVerDetalleModal` |
| Barrel | `src/components/portal/gestion-suscripciones/index.ts` | Export `VerDetallePagoModal` |

---

## Acceptance Criteria

1. A "Ver Pago" button appears in the actions column for every subscription row that has an associated payment (`pago !== null`), regardless of payment status.
2. Clicking "Ver Pago" opens the `VerDetallePagoModal` without triggering any data mutation.
3. The modal displays: monto, método de pago, estado (badge), fecha de pago, validado por, fecha de validación.
4. When the payment has a `comprobante_path` pointing to an image file, the modal renders an inline image preview (max height 208 px) with a link to open full view in a new tab.
5. When the payment has a `comprobante_path` pointing to a PDF, the modal renders a PDF icon with the filename and a "Ver comprobante" link opening the file in a new tab.
6. When `comprobante_path` is null or empty, the modal shows "No se ha subido comprobante para este pago." instead of the comprobante section.
7. The modal has no approve, reject, or any other mutating action — only a "Cerrar" button.
8. Pressing `Escape` or clicking the backdrop closes the modal.
9. The existing "Validar Pago" button behaviour is unchanged — it still only appears for `pago.estado === 'pendiente'` and opens `ValidarPagoModal` with approve/reject actions.
10. The comprobante signed URL loads correctly with a 5-minute (300 s) TTL.
11. If the signed URL fails to load, a non-blocking error message is shown inside the modal; the rest of the payment details remain visible.
12. The modal renders correctly on mobile widths (max-w-lg, mx-4 padding).

---

## Implementation Steps

- [ ] Extend `ModalType` in `useGestionSuscripciones.ts` to include `'verDetalle'`; add `openVerDetalleModal(row: SuscripcionAdminRow)` action
- [ ] Create `VerDetallePagoModal.tsx` — read-only modal with payment details + `useComprobanteViewer` integration
- [ ] Add `onVerDetallePago` prop to `SuscripcionesTable` and render "Ver Pago" button for rows with `row.pago !== null`
- [ ] Destructure `openVerDetalleModal` in `GestionSuscripcionesPage`; pass it to `SuscripcionesTable`; render `<VerDetallePagoModal>` when `modalType === 'verDetalle'`
- [ ] Export `VerDetallePagoModal` from `index.ts`
- [ ] Test: click "Ver Pago" on a subscription with a validated payment — modal opens with all fields and comprobante
- [ ] Test: click "Ver Pago" on a subscription with no comprobante — "No se ha subido comprobante" message appears
- [ ] Test: existing "Validar Pago" flow is unaffected
- [ ] Test: Escape key and backdrop click close the modal

---

## Non-Functional Requirements

- **Security**: Modal reads data already in memory; no additional fetch is made. Signed URL generation uses server-validated Supabase client — no path injection possible since `comprobante_path` comes from the database. Comprobante URLs expire after 300 seconds (5 minutes).
- **Performance**: No additional data fetching. `useComprobanteViewer` is only invoked when the modal is open and `comprobante_path` is non-null.
- **Accessibility**: Modal uses `role="dialog"`, `aria-modal="true"`, `aria-label="Detalle de Pago"`. Focus is trapped inside when open (`tabIndex={-1}` on the container with `focus()` on mount). Image comprobante uses descriptive `alt` text. Buttons have `aria-label`.
- **Error handling**: Comprobante load failure shows a subtle inline message within the modal. Toast is not required — errors here are non-critical and the rest of the modal content remains usable.
