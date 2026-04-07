## Context

The `gestion-suscripciones` admin page already supports viewing and acting on payments via `ValidarPagoModal`, but that modal is gated to `pago.estado === 'pendiente'` because its purpose is to approve or reject a payment. Once a payment is validated or rejected, there is no admin path to revisit its comprobante or details without triggering a state mutation.

The `useComprobanteViewer` hook (used by both `ValidarPagoModal` and `PagoCard` in the athlete view) already handles signed-URL generation for `comprobante_path`. The `SuscripcionAdminRow` type already carries the full `PagoAdminRow` — no new data-fetching is needed.

This change is purely additive at every layer: a new button, a new read-only modal, an extended type union, and a wired call site.

## Goals / Non-Goals

**Goals:**
- Allow admins to inspect full payment details and comprobante for any subscription that has a payment, regardless of payment status.
- Reuse existing `useComprobanteViewer` hook without modification.
- Keep the change contained to the `gestion-suscripciones` feature slice.

**Non-Goals:**
- Modifying the "Validar Pago" flow, its modal, or its conditions.
- Adding inline editing or mutation capabilities to the new modal.
- Changing the payment data model or introducing new service functions.

## Decisions

### D1: New modal vs. extending `ValidarPagoModal`
**Decision**: New `VerDetallePagoModal` component.  
**Rationale**: `ValidarPagoModal` owns approve/reject logic via `useValidarPago`. Extending it with a conditional read-only mode would couple two concerns (view vs. act) behind a prop flag, making future changes to either path riskier. A dedicated component is simpler, has no conditional branches for actions, and is easier to test in isolation.  
**Alternative considered**: Adding `readOnly?: boolean` prop to `ValidarPagoModal` — rejected because the modal would carry dead-code paths (hooks still instantiated even when unused) and logic branches that obscure intent.

### D2: Where to track modal state
**Decision**: Extend the existing `ModalType` union in `useGestionSuscripciones` with `'verDetalle'`, using the existing `selectedRow` + `modalType` pattern.  
**Rationale**: All other modal interactions (`validarPago`, `validarSuscripcion`, `editar`, `eliminar`) already use this pattern. Consistency reduces cognitive overhead and avoids introducing a parallel state slice.

### D3: Data source for the modal
**Decision**: The modal reads directly from `selectedRow: SuscripcionAdminRow`, which already includes `PagoAdminRow`.  
**Rationale**: No additional fetch is needed. The list data is already in memory, and the comprobante is loaded lazily by `useComprobanteViewer` only when the modal is open.

## Risks / Trade-offs

- **Signed URL expiry**: The comprobante URL expires after 300 s (5 min). If an admin opens the modal and leaves it open, the link will expire. Mitigation: when the admin clicks the link after expiry, the browser will show a storage error. This is acceptable — the admin can close and re-open the modal to regenerate a URL. No auto-refresh is implemented to keep the implementation simple.
- **No comprobante for some payments**: Some payments may have `comprobante_path = null` (e.g., cash payments). The modal handles this explicitly with a "No se ha subido comprobante" message.
