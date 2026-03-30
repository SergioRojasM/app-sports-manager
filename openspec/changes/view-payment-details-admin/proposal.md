## Why

Administrators managing subscriptions in `gestion-suscripciones` have no way to inspect a payment's comprobante or full details once it has been validated or rejected — the "Validar Pago" button is only shown for `pendiente` payments. This gap forces admins to rely on memory or external records to review historical payment proofs.

## What Changes

- Add a **"Ver Pago"** read-only action button in `SuscripcionesTable` for every row where a payment exists (`row.pago !== null`), regardless of payment status.
- Introduce a new `VerDetallePagoModal` component that displays all payment fields (amount, method, status badge, dates, validated-by info) and renders the comprobante preview (inline image or PDF link) using the existing `useComprobanteViewer` hook.
- Extend the `ModalType` union in `useGestionSuscripciones` to include the new `'verDetalle'` type and expose an `openVerDetalleModal` action.
- Wire the modal into `GestionSuscripcionesPage`.

## Capabilities

### New Capabilities
- `admin-payment-detail-view`: Read-only modal for admins to view full payment details and comprobante from the subscription management table, available for all payment statuses.

### Modified Capabilities
- `subscription-management`: New "Ver Pago" row action added to the admin subscription table; the `ModalType` union is extended.

## Impact

- **Components**: `SuscripcionesTable.tsx` (new prop + button), `GestionSuscripcionesPage.tsx` (new modal render), new `VerDetallePagoModal.tsx`
- **Hooks**: `useGestionSuscripciones.ts` (extended `ModalType`, new `openVerDetalleModal` action)
- **Barrel**: `index.ts` for `gestion-suscripciones` slice
- **No database changes** — reads existing `PagoAdminRow` already loaded in memory
- **No new services** — reuses `useComprobanteViewer` (signed URL) from the existing hook
- **No breaking changes** — existing "Validar Pago" flow is untouched; the new button is additive

## Non-goals

- Editing or mutating payment data from the new modal (no approve/reject/update actions)
- Displaying payment details for subscriptions without any payment record
- Changing the "Validar Pago" modal behaviour or its access conditions
