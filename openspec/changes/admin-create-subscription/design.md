## Context

The subscription management panel (`gestion-suscripciones`) already supports viewing, approving, editing, and deleting subscriptions. However there is no way for an admin to create a new one: athletes must self-enroll through the plans page.

The existing codebase provides all supporting infrastructure:
- `suscripcionesService.createSuscripcion` (self-enrollment) and `pagosService.createPago` can be reused.
- `planesService.getPlanes` loads plans with subtypes.
- `metodosPagoService.getMetodosPago` loads payment methods.
- The searchable athlete combobox pattern was already proven in `ReservaFormModal` (US-0058).
- The 2-step `SuscripcionModal` (user self-enrollment) demonstrates plan/subtype selection UX.
- `useGestionSuscripciones` already manages all other modal types through a unified `ModalType` union.

The only missing pieces are:
1. An admin INSERT RLS policy on `suscripciones` (currently only `suscripciones_insert_own` exists, which blocks admins from setting `atleta_id` to a different user).
2. An admin INSERT RLS policy on `pagos` (the existing `pagos_insert_own` is athlete-scoped).
3. A `crearSuscripcionAdmin` service function that atomically inserts subscription + optional payment.
4. A `useCrearSuscripcion` hook managing 3-step form state.
5. A `CrearSuscripcionModal` component.

## Goals / Non-Goals

**Goals:**
- Admin can create a subscription for any active athlete-role member of their tenant.
- Admin can optionally register a payment record (amount, method, status) in the same action.
- The form is multi-step to reduce cognitive load: athlete → plan/subtype → config.
- The athlete picker is searchable (name or `numero_identificacion`) — consistent with US-0058 booking picker.
- All new code follows the existing `page → component → hook → service → types` layering.
- Migration applies only to local Supabase (`npx supabase db push`); do NOT push to remote.

**Non-Goals:**
- Payment `comprobante` (file upload) is not supported in this admin creation flow.
- No email/notification is triggered on admin-created subscriptions.
- The athlete self-enrollment flow is not modified.
- No bulk-creation of subscriptions.

## Decisions

### D1 — Extend `ModalType` union in `useGestionSuscripciones` rather than creating an independent hook composition

**Decision**: Add `'crear'` to `ModalType` and `openCrearModal()` to the hook result, following the exact same pattern used for `'pago'`, `'suscripcion'`, `'editar'`, `'eliminar'`, and `'verDetalle'`.

**Rationale**: The `GestionSuscripcionesPage` already owns a single `selectedRow` / `modalType` state machine. Keeping `openCrearModal` in the same hook ensures the page only ever has one modal open at a time, reuses the `closeModal` / `handleModalSuccess` flow, and avoids threading an extra callback prop through the header component.

**Alternative considered**: A standalone `useCrearSuscripcion` hook managed entirely inside `CrearSuscripcionModal`. Rejected because it bypasses the page-level modal exclusivity and the `refresh()` callback would need to be passed as a prop rather than already being available via the hook.

---

### D2 — New `crearSuscripcionAdmin` service function in `gestion-suscripciones.service.ts` (not `suscripciones.service.ts`)

**Decision**: Place the new function in `gestion-suscripciones.service.ts` alongside the other admin-facing service functions.

**Rationale**: `suscripciones.service.ts` is the athlete-facing service (self-enrollment). Admin operations (`fetchSuscripcionesAdmin`, `validarSuscripcion`, `editarSuscripcion`, etc.) all live in `gestion-suscripciones.service.ts`. Keeping admin creation here maintains clear separation by persona.

---

### D3 — Two separate INSERT calls (suscripcion then pago) rather than a stored procedure

**Decision**: Perform the pago INSERT as a second client-side call after the suscripcion INSERT succeeds, wrapped in a try/catch that does not roll back the suscripcion on pago failure.

**Rationale**: A database transaction (RPC) would be cleaner but adds migration complexity and an RPC function to maintain. In practice, if the pago INSERT fails the subscription is still valid — the admin can use `ValidarPagoModal` or `EditarSuscripcionModal` to add a payment manually. The partial-failure case (subscription created, payment not) is observable and recoverable via the existing admin UI.

**Trade-off**: Risk of orphaned subscriptions (no payment) if the pago INSERT fails silently. Mitigation: surface pago INSERT errors explicitly in the modal with a clear message.

---

### D4 — Filter athlete list to `activo = true` AND role `atleta` via `v_miembros_equipo` view

**Decision**: Query the `v_miembros_equipo` view (or the underlying `miembros_tenant` + `usuarios` join used in `ReservaFormModal`) and filter by `rol_nombre = 'atleta'` and `activo = true`.

**Rationale**: Admins should only subscribe active athletes. Consistency with `ReservaFormModal`'s existing query pattern. Filtering by role prevents accidentally creating subscriptions for coaches or other admins.

---

### D5 — Auto-fill `fecha_fin` and `clases_restantes` from subtype when subtype changes

**Decision**: In `useCrearSuscripcion`, use a `useEffect` that watches `selectedPlanTipoId` and, when it changes, updates `fecha_fin` to `addDays(fecha_inicio, plan_tipo.vigencia_dias)` and `clases_restantes` to `plan_tipo.clases_incluidas`. Both values remain user-editable.

**Rationale**: Matches the UX of `ValidarSuscripcionModal` (which uses the same auto-fill approach). Avoids admins forgetting to set the expiry when a subtype with `vigencia_dias` is available.

## Risks / Trade-offs

- **Partial failure on pago INSERT** → Mitigation: Show clear inline error distinguishing "subscription created but payment failed" from "subscription creation failed".
- **RLS misconfiguration** → Mitigation: Test with an athlete-role user to verify they cannot trigger admin policies. The `get_admin_tenants_for_authenticated_user()` function returns an empty set for non-admin roles by design.
- **Large athlete list performance** → For typical tenant sizes (<500 members) client-side filtering is adequate. Not paginating is an acceptable trade-off at this scale.
- **Migration run order** → `20260605000100_suscripciones_admin_insert_rls.sql` must be applied before testing. Only local (`npx supabase db push`).
