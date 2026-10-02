# US-0129 — Cancel a Booking from "Mis Reservas"

## ID
US-0129

## Name
Add a "Cancelar" action to each active, upcoming booking in the athlete's cross-tenant "Mis Reservas" page, reusing the existing cancellation rules, so athletes no longer have to open the trainings panel of the organization to cancel.

## As a
Athlete (any authenticated user viewing their own bookings in `/portal/mis-reservas`)

## I Want
To cancel one of my upcoming bookings directly from the "Mis Reservas" list

## So That
I can free my spot and get my plan units back from the place where I already see all my bookings, without having to enter the organization, find the training in `gestion-entrenamientos` and open its reservations panel.

---

## Description

### Current State
- `/portal/mis-reservas` (`MisReservasPage` → `useMisReservas` → `reservasService.getMisReservas`) is **read-only**: filters, a paginated table (`MisReservasTable`) and CSV export over `reservas_reporte_view`, scoped by `atleta_id = auth.uid()` across every organization.
- The only place an athlete can cancel is `gestion-entrenamientos` → training card → "Ver reservas" → `ReservasPanel` → row menu → "Cancelar" ([ReservasPanel.tsx:234-244](../../src/components/portal/entrenamientos/reservas/ReservasPanel.tsx)). That path uses `window.confirm` and then `useReservas.cancelReserva` → `reservasService.cancel(id, tenantId, entrenamientoId, isAdminOrCoach)`.
- `reservasService.cancel` ([reservas.service.ts:978-1018](../../src/services/supabase/portal/reservas.service.ts)) already contains every rule needed and takes no tenant-page context:
  1. Athlete only: training already started → rejection `ENTRENAMIENTO_PASADO`.
  2. Athlete only: past the `entrenamientos.cancelacion_antelacion_horas` cutoff → rejection `TIMING_CANCELACION`.
  3. RPC `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)`: sets `estado = 'cancelada'`, `fecha_cancelacion = now()`, restores finite units from the `reserva_servicios` ledger and deletes the ledger rows.
- `ReservaRechazoModal` (US-0127) already renders cancellation rejections on top of everything, but its title only switches to "No es posible cancelar la reserva" for `TIMING_CANCELACION`; `ENTRENAMIENTO_PASADO` raised by a cancellation gets "No es posible completar la reserva".

### Proposed Changes

#### 1. Which rows are cancellable (logic)
A row of `ReservaReportRow` shows the "Cancelar" action when **both** hold:

- `reserva_estado` is `pendiente` or `confirmada` (same states `ReservasPanel` allows; `cancelada`, `completada` and `rechazada` never show it).
- `entrenamiento_fecha` is not null and is later than the current time.

Put this in one exported pure helper in `src/hooks/portal/mis-reservas/useMisReservas.ts`:

```ts
export function puedeCancelarReserva(row: ReservaReportRow, now: Date = new Date()): boolean
```

The cancellation-lead-time rule is **not** evaluated in the UI (the view does not expose `cancelacion_antelacion_horas`); the action is shown and `reservasService.cancel` rejects with `TIMING_CANCELACION`, exactly as the trainings panel behaves today.

#### 2. Table (UI) — `MisReservasTable`
- Add a 9th column **"Acciones"** (right-aligned header and cell). Update the empty-row `colSpan` from 8 to 9.
- For cancellable rows render a small danger-outline button "Cancelar" (`type="button"`, `aria-label={`Cancelar reserva de ${row.entrenamiento_nombre ?? 'entrenamiento'}`}`), styled like `EventoDangerButton` but compact (`px-2.5 py-1 text-xs`). Non-cancellable rows render an empty cell.
- New props: `onCancelar: (row: ReservaReportRow) => void` and `cancelandoId: string | null` (the button of that row is disabled while its cancellation is in flight).
- The component stays presentational (no hooks, no service calls).

#### 3. Confirmation modal (UI) — new `CancelarReservaModal`
New file `src/components/portal/mis-reservas/CancelarReservaModal.tsx`, modeled on `src/components/portal/mis-entradas/CancelarCompraModal.tsx` (reuses `EventoModalShell`, `EventoDangerButton`, `GritButton`). It replaces `window.confirm` for this flow.

```ts
type CancelarReservaModalProps = {
  reserva: ReservaReportRow;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};
```

Content:
- Title: "Cancelar reserva".
- Body: "¿Seguro que deseas cancelar tu reserva de **{entrenamiento_nombre}**?" followed by a line with the organization (`tenant_nombre`) and the training date/time (same `es-CO` format as the table's "Fecha entrenamiento" column).
- When `plan_nombre` is not null: "Las unidades usadas de tu plan **{plan_nombre}** se devolverán." Otherwise omit the line.
- Closing line: "Tu cupo quedará libre para otros atletas."
- `error` rendered as `role="alert"` inline (same classes as `CancelarCompraModal`).
- Footer: secondary "Volver" (disabled while `pending`) + danger "Cancelar reserva" (`loading={pending}`, `loadingLabel="Cancelando…"`). `busy={pending}` so Escape / backdrop are ignored while submitting.

#### 4. Hook — `useMisReservas`
Add cancellation state and actions (no new hook file):

| Member | Type | Behavior |
|--------|------|----------|
| `reservaACancelar` | `ReservaReportRow \| null` | Row whose confirmation modal is open |
| `openCancelar(row)` | `(row: ReservaReportRow) => void` | Sets `reservaACancelar`; clears `cancelError` and `cancelSuccess` |
| `closeCancelar()` | `() => void` | Closes the modal; no-op while `cancelPending` |
| `confirmCancelar()` | `() => Promise<void>` | See below |
| `cancelPending` | `boolean` | True while the request is in flight |
| `cancelError` | `string \| null` | Unexpected error, shown inside the confirmation modal |
| `cancelRejection` | `BookingRejection \| null` | Business rejection, shown in `ReservaRechazoModal` |
| `cancelRejectionTenantId` | `string \| null` | `tenant_id` of the rejected row (required prop of `ReservaRechazoModal`) |
| `clearCancelRejection()` | `() => void` | Clears both rejection fields |
| `cancelSuccess` | `boolean` | Drives the success notice |
| `dismissCancelSuccess()` | `() => void` | Hides the notice |

`confirmCancelar`:
1. Guard: return if no `reservaACancelar` or already `cancelPending`.
2. Call `reservasService.cancel(row.reserva_id, row.tenant_id, row.entrenamiento_id, false)` — `isAdminOrCoach` is **always `false`** here: this page is the athlete's personal view, so athlete rules apply even when the user is a trainer/admin of that organization.
3. Result is a `BookingRejection` (`'ok' in result && !result.ok`): close the confirmation modal, set `cancelRejection` + `cancelRejectionTenantId`. Do not refetch.
4. Success: close the modal, set `cancelSuccess = true`, re-run `fetchReservas(appliedFilters)` (the **applied** filters, not the draft ones), keeping the current page; if the current page is now beyond `totalPages`, clamp to the last page.
5. Thrown error: keep the modal open and set `cancelError` to the `ReservaServiceError` message, or "No fue posible cancelar la reserva." as fallback.

No optimistic update — the list is refetched so `reserva_estado`, `fecha_cancelacion` and the plan columns (the ledger rows are deleted on cancel, see `20260831190000_reservas_reporte_view_plan_nombre.sql`) come from the server.

#### 5. Page wiring — `MisReservasPage`
- Pass `onCancelar={openCancelar}` and `cancelandoId={cancelPending ? reservaACancelar?.reserva_id ?? null : null}` to `MisReservasTable`.
- Render `CancelarReservaModal` when `reservaACancelar` is set.
- Render `ReservaRechazoModal` with `rejection={cancelRejection}`, `tenantId={cancelRejectionTenantId ?? ''}`, `ofrecerPlan={false}`, `accion="cancelar"`, `onClose={clearCancelRejection}`.
- Success notice above the table: dismissible `role="status"` banner "Reserva cancelada correctamente." (emerald styling consistent with the page's existing banners; close button with `aria-label="Cerrar aviso"`). It is cleared when another cancellation starts.
- Update the subtitle to: "Consulta y gestiona tus reservas de entrenamientos en todas tus organizaciones."

#### 6. Rejection modal title — `ReservaRechazoModal`
Add an optional prop `accion?: 'reservar' | 'cancelar'` (default `'reservar'`). Title resolution becomes:
- `ofrecerPlan` → "¿Deseas adquirir un plan?" (unchanged)
- `accion === 'cancelar'` **or** `rejection.code === 'TIMING_CANCELACION'` → "No es posible cancelar la reserva"
- otherwise → "No es posible completar la reserva"

`ReservasPanel` is not modified (it keeps the default), so existing behavior is unchanged.

#### Out of scope
- CSV export columns, filters and pagination are unchanged.
- No change to the cancellation flow inside `ReservasPanel` (it keeps `window.confirm`).
- No notification/email on cancellation.
- Showing the cancellation deadline per row (would require adding `cancelacion_antelacion_horas` to `reservas_reporte_view`).

---

## Database Changes
None. No new tables, columns, views, policies or functions.

Existing objects relied on:
- RPC `public.cancel_and_restore_service_units(p_reserva_id uuid, p_tenant_id uuid)` (`20260612000100_restricciones_por_servicio.sql`), `SECURITY DEFINER`, granted to `authenticated`.
- View `public.reservas_reporte_view` (`security_invoker = true`) — already exposes `reserva_id`, `tenant_id`, `entrenamiento_id`, `reserva_estado`, `entrenamiento_fecha`, `plan_nombre`.

---

## API / Server Actions
No new service functions or routes. Existing ones reused as-is:

- **File**: `src/services/supabase/portal/reservas.service.ts`
- **Function**: `reservasService.cancel(id, tenantId, entrenamientoId?, isAdminOrCoach?)`
  - **Input**: `id: string` (`row.reserva_id`), `tenantId: string` (`row.tenant_id`), `entrenamientoId: string` (`row.entrenamiento_id`), `isAdminOrCoach: false`
  - **Returns**: `Promise<Reserva | BookingResult>` — the cancelled `Reserva`, or a `BookingRejection` with code `ENTRENAMIENTO_PASADO` / `TIMING_CANCELACION`
  - **Throws**: `ReservaServiceError` (`not_found` when the training cannot be read, mapped Postgres errors otherwise)
  - **Auth / RLS**: browser Supabase client with the user session; reads `entrenamientos` under RLS, then calls the `SECURITY DEFINER` RPC.
- **Function**: `reservasService.getMisReservas(filters)` — unchanged, used for the refetch after success.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/mis-reservas/CancelarReservaModal.tsx` | New confirmation modal |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | "Acciones" column, `onCancelar` / `cancelandoId` props, `colSpan` 9 |
| Component | `src/components/portal/mis-reservas/MisReservasPage.tsx` | Wire the action, both modals, success notice, subtitle |
| Component | `src/components/portal/mis-reservas/index.ts` | Export `CancelarReservaModal` |
| Component | `src/components/portal/entrenamientos/reservas/ReservaRechazoModal.tsx` | Optional `accion` prop driving the title |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | `puedeCancelarReserva` helper + cancellation state/actions + refetch with applied filters |
| Docs | `projectspec/03-project-structure.md` | Update the `mis-reservas` slice, `useMisReservas` and `ReservaRechazoModal` entries |

No changes to `src/app/portal/(atleta)/mis-reservas/page.tsx`, to services, types or migrations.

---

## Acceptance Criteria

1. In `/portal/mis-reservas` the table has an "Acciones" column; a row shows a "Cancelar" button only when its status is `pendiente` or `confirmada` and its training date/time is in the future.
2. Rows with status `cancelada`, `completada` or `rechazada`, rows whose training has already started, and rows without a training date show no action.
3. Clicking "Cancelar" opens a confirmation dialog titled "Cancelar reserva" showing the training name, organization and training date/time; nothing is cancelled until "Cancelar reserva" is pressed.
4. When the booking consumed a plan, the dialog shows "Las unidades usadas de tu plan {plan} se devolverán."; otherwise that line is absent.
5. "Volver", Escape and a backdrop click close the dialog without changes; all three are ignored while the cancellation is in flight, and the confirm button shows "Cancelando…" and cannot be pressed twice.
6. On success the dialog closes, the banner "Reserva cancelada correctamente." appears, the list is reloaded with the currently applied filters and the same page, and the row shows the "Cancelada" badge with no action.
7. After a successful cancellation of a booking that consumed finite plan units, `suscripcion_servicios.unidades_restantes` is incremented by 1 per consumed service and the booking's `reserva_servicios` rows are gone (same result as cancelling from the trainings panel).
8. After a successful cancellation the spot is released: the training's active-bookings count in `gestion-entrenamientos` decreases by one.
9. If the training has `cancelacion_antelacion_horas` and the cutoff has passed, the booking is not cancelled, the confirmation dialog closes and `ReservaRechazoModal` shows the title "No es posible cancelar la reserva" with the message "Solo puedes cancelar con al menos {N} h de antelación. …" and an "Entendido" button; it never offers "Ver planes".
10. If the training started between page load and confirmation, the booking is not cancelled and `ReservaRechazoModal` shows "No es posible cancelar la reserva" with "No puedes cancelar la reserva de un entrenamiento que ya ha finalizado."
11. On an unexpected error (network, training not readable, RPC error) the confirmation dialog stays open and shows the error inline (`role="alert"`); the row is unchanged and the user can retry or close.
12. A user who is also trainer/admin of the organization is subject to the athlete rules on this page (criteria 9 and 10 still apply to them).
13. Bookings of any organization can be cancelled from the list, including organizations other than the one last visited; the request uses the row's own `tenant_id`.
14. Filters, pagination, the "last 100" banner, the empty state and the CSV export behave exactly as before.
15. Cancelling from `ReservasPanel` in `gestion-entrenamientos` behaves exactly as before (same confirm, same rejection titles).
16. `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Add `puedeCancelarReserva` and the cancellation state/actions to `useMisReservas`; refetch with `appliedFilters` and clamp the page after success
- [ ] Add the optional `accion` prop to `ReservaRechazoModal` and adjust the title logic
- [ ] Create `CancelarReservaModal` and export it from the slice `index.ts`
- [ ] Add the "Acciones" column and new props to `MisReservasTable`
- [ ] Wire modals, success notice and subtitle in `MisReservasPage`
- [ ] Test manually — happy path: confirmed booking with plan units (units restored), `pendiente` booking, booking in a second organization
- [ ] Test manually — edge cases: cancellation cutoff passed, training already started, double click, Escape while pending, offline/error, cancelling the only row of the last page, active filters preserved
- [ ] Regression: cancel from `ReservasPanel` as athlete and as admin
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run lint and build

---

## Non-Functional Requirements

- **Security**:
  - The action is only offered on rows returned by `getMisReservas`, which filters `atleta_id = auth.uid()` over a `security_invoker` view, so a user only sees and acts on their own bookings. No role guard is added (the portal-level `(atleta)` area has none by design, US-0093).
  - `isAdminOrCoach` is hard-coded to `false`; the client must never derive it from the user's role in this page.
  - Known pre-existing gap, **not addressed here**: the timing/past-training checks run in the browser service, and `cancel_and_restore_service_units` is `SECURITY DEFINER` without verifying that `auth.uid()` owns the booking or manages the tenant. This story does not widen that surface (same call as `ReservasPanel`), but a follow-up story should move the ownership, state and timing checks into the RPC.
- **Performance**: one cancel request plus one list refetch per cancellation; no new queries on page load, no new indexes.
- **Accessibility**: row button with a descriptive `aria-label`; both modals are `role="dialog"` + `aria-modal` with a labelled title, focus moved into the dialog on open and Escape to close (inherited from `EventoModalShell` / `ReservaRechazoModal`); success notice is `role="status"`, inline error is `role="alert"`; the danger button exposes `aria-busy` while pending.
- **Error handling**: business rejections → `ReservaRechazoModal`; unexpected errors → inline alert inside the confirmation dialog with the option to retry; success → dismissible banner above the table. No `window.confirm` / `window.alert`.
