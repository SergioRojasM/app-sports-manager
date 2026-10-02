# US-0127 — "Reservar" Button on Training Cards and Booking Rejections in a Top-Most Modal

## ID
US-0127

## Name
Add a "Reservar" button directly on each training card, always show booking rejections in a modal rendered above every other layer and, when the rejection is caused by a missing plan, ask "¿Deseas adquirir un plan?" with a link to the organization's plans page.

## As a
Member of a tenant who books trainings (athlete `usuario`; also a trainer booking for themself or on behalf of an athlete)

## I Want
To book a training straight from its card, to see every "you cannot book" notice in a modal on top of everything and, when the reason is that I have no plan, to be offered a direct link to the plans page

## So That
Booking takes one click instead of three, I always see why a booking failed — today the notice is hidden behind the booking dialog — and I can acquire a plan right away when that is what is missing.

---

## Description

### Current State
- A member books from `gestion-entrenamientos` → `ReservasPanel` (right-side drawer) → "Reservar" → `ReservaFormModal` (the dialog with the "Notas"/comments field) and, when the training has an internal form, `FormularioRespuestaModal`.
- `reservasService.create` returns a `BookingRejection` (`{ ok: false, code, message, servicioNombre? }`) when the booking is not allowed. `useReservas` stores it in `bookingRejection` (from `createReserva`, `confirmAdminBooking` and the cancel action), and `ReservasPanel` renders it as a small amber inline alert **inside the drawer** ([ReservasPanel.tsx:751-765](../../src/components/portal/entrenamientos/reservas/ReservasPanel.tsx)).
- Problems:
  - Booking is buried: on a training card (`EntrenamientosList`) the athlete only has a "Ver" button, which opens `EntrenamientoActionModal`; from there "Ver reservas" opens the drawer, and only there is the "Reservar" button. Three clicks before the booking dialog appears.
  - The drawer is `fixed … z-50`. `ReservaFormModal` and `FormularioRespuestaModal` are full-screen overlays (`fixed inset-0 z-50`) rendered after it, and they stay open when the booking fails. The alert is therefore painted **underneath** the booking dialog: the user presses "Reservar", nothing visible happens, and the reason is hidden.
  - For a missing plan (`SERVICIO_REQUERIDO`: "Este entrenamiento requiere una suscripción activa con unidades disponibles en el servicio: {servicio}.") the alert only states the problem; there is no link to the plans page.
- `SERVICIO_REQUERIDO` is also reused for cases where offering a plan is wrong (a plan request already pending approval, a deferred plan no longer available, the generic "No cumples los requisitos" fallback), so the code alone cannot decide when to offer a plan.

### Proposed Changes

#### 1. Mark which rejections are solved by acquiring a plan (logic)
Add an optional flag to `BookingRejection` in `src/types/portal/entrenamiento-restricciones.types.ts`:

```ts
/** True when the rejection is solved by acquiring a plan — the rejection modal then offers the plans page (US-0127). */
ofrecerPlan?: boolean;
```

Set `ofrecerPlan: true` in `src/services/supabase/portal/reservas.service.ts` on exactly these rejections:

| Site | Code | Situation |
|------|------|-----------|
| Restriction evaluation, step 5b (`!activeServicioIds.has(servicioId)`) | `SERVICIO_REQUERIDO` | No active subscription grants the required service |
| Unit resolution before the RPC (the `exhausted` branch) | `UNIDADES_AGOTADAS` | The plan has no units left |
| RPC error `UNIDADES_AGOTADAS` | `UNIDADES_AGOTADAS` | Units ran out between check and submit |
| RPC error `SUSCRIPCION_INACTIVA` | `SERVICIO_REQUERIDO` | The subscription expired / was cancelled meanwhile |

Every other rejection leaves the flag unset. No rejection codes, messages or SQL change.

#### 2. New modal `ReservaRechazoModal` (UI)
New presentational component `src/components/portal/entrenamientos/reservas/ReservaRechazoModal.tsx`. It replaces the inline amber alert for **all** booking rejections.

Props:

```ts
type ReservaRechazoModalProps = {
  rejection: BookingRejection | null; // null → renders nothing
  tenantId: string;
  /** True when the plan offer applies: rejection.ofrecerPlan and the booking was for the current user. */
  ofrecerPlan: boolean;
  onClose: () => void;
};
```

Two variants (Spanish, exact copy):

| | Plan-offer variant (`ofrecerPlan = true`) | Default variant |
|---|---|---|
| Icon (`aria-hidden`) | `card_membership` | `warning` (amber) |
| Title (`h2`) | **"¿Deseas adquirir un plan?"** | **"No es posible cancelar la reserva"** when `rejection.code === 'TIMING_CANCELACION'`; otherwise **"No es posible completar la reserva"** |
| Body | `rejection.message` + a second line "Adquiere un plan para poder reservar este entrenamiento." | `rejection.message` |
| Primary action | `GritButton variant="primary"` with `href={`/portal/orgs/${tenantId}/gestion-planes`}`, label **"Ver planes"** (Next `<Link>`, same tab) | `GritButton variant="primary"`, label **"Entendido"** → `onClose` |
| Secondary action | `GritButton variant="secondary"`, label **"Ahora no"** → `onClose` | — |

Layering ("on top of everything"):
- Render through `BodyPortal` (exported from `src/components/portal/gestion-eventos/EventoModalShell.tsx`) so no `backdrop-blur` ancestor can trap the `fixed` overlay.
- Overlay classes: `fixed inset-0 z-[70] flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm`. `z-[70]` is above the drawer (`z-50`), `ReservaFormModal` / `FormularioRespuestaModal` (`z-50`) and the athlete combobox list (`z-[60]`). `EventoModalShell` itself is not reused because its `z-50` is hard-coded.
- Dialog frame matches `EventoModalShell` (`mx-4 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-6 shadow-2xl backdrop-blur-md`).

Behavior:
- Closes on its buttons, on Escape and on backdrop click; closing only calls `onClose`.
- "Ver planes" navigates to the plans page; the booking UI unmounts with the route change, no extra cleanup needed.
- `rejection.message` is rendered as plain text.

#### 3. Wire it in `ReservasPanel` (UI)
- **Remove** the inline "Booking rejection alert" block (the amber `div` at lines 751-765). Rejections are no longer rendered inside the drawer.
- Track who the last create attempt was for: a `useState<string | null>` `rejectedAtletaId`, set to `input.atleta_id` inside the existing `onCreateReserva` callback before calling `reservasHook.createReserva`.
- Render once, at the end of the panel's JSX:
  ```tsx
  <ReservaRechazoModal
    rejection={reservasHook.bookingRejection}
    tenantId={tenantId}
    ofrecerPlan={!!reservasHook.bookingRejection?.ofrecerPlan && rejectedAtletaId === currentUserId}
    onClose={reservasHook.clearRejection}
  />
  ```
- Because the modal is driven by `reservasHook.bookingRejection`, it covers every source of rejection: self booking, booking on behalf of an athlete, the admin no-units confirmation (`confirmAdminBooking`) and reservation cancellation.
- A trainer/admin booking on behalf of another athlete without a plan gets the **default** variant (the question "¿Deseas adquirir un plan?" is only meaningful for the person who would buy it).
- Closing the modal only clears the rejection. `ReservaFormModal` / `FormularioRespuestaModal` stay open underneath with the entered data intact (existing "keep modals open on failure" behavior).
- The admin `ADMIN_CONFIRM_NO_UNITS` confirmation inside `ReservaFormModal` is unchanged (it is not stored in `bookingRejection`).

#### 4. "Reservar" button on the training card (UI)
Applies to the cards of the "Lista de entrenamientos" in `gestion-entrenamientos` (`EntrenamientosList`).

**`EntrenamientosList.tsx`**
- New optional prop `onReservar?: (trainingId: string) => void`.
- In each card's action area (the `flex items-center gap-2` container that holds "Opciones"/"Ver"), render a "Reservar" button **before** the existing button when all of these hold: `onReservar` is defined, `!canManage`, and the training is not historical (`isHistorical === false`).
- Button: primary style used by the drawer's own "Reservar" (`inline-flex items-center gap-1 rounded-grit-md bg-grit-cyan px-2.5 py-1.5 text-xs font-semibold text-grit-bg hover:bg-grit-cyan/90 disabled:opacity-50`) with the `bookmark_add` icon (`aria-hidden`) and `aria-label={`Reservar ${item.instance.nombre}`}`.
- When the training is full (`cupo_maximo != null && (reservas_activas ?? 0) >= cupo_maximo`) the button is rendered `disabled` with the label "Cupo lleno".
- The existing "Ver" button is kept unchanged (detail and reservations remain reachable).
- Administrators and trainers (`canManage`) do not get the card button: their booking needs the athlete picker and stays under "Opciones" → "Ver reservas" → "Nueva reserva".

**`EntrenamientosPage.tsx`**
- New state `reservasPanelAutoReservar: boolean` (default `false`).
- New handler `openReservaDirecta(trainingId)`: resolves the instance exactly as `openActionModal` does, then sets `reservasPanelInstance`, `reservasPanelOpen = true` and `reservasPanelAutoReservar = true`.
- `openReservasPanel` (from the action modal) sets `reservasPanelAutoReservar = false`; `closeReservasPanel` resets it to `false`.
- Pass `onReservar={openReservaDirecta}` to `EntrenamientosList` and `autoReservar={reservasPanelAutoReservar}` to `ReservasPanel`.

**`ReservasPanel.tsx`**
- New optional prop `autoReservar?: boolean` (default `false`).
- The card does not know whether the user already holds a reservation, so the drawer decides. One-shot effect, guarded by a `useRef` that is reset whenever `open` becomes `false` or `instance?.id` changes: when `open && autoReservar`, `currentUserId` is resolved and `reservasHook.isLoading` is `false` (reservations, capacity and categories loaded), then
  - if `!isAdmin && !myReserva && !isPast && (capacidad === null || capacidad.disponible)` → call the existing `handleSelfBook()` (opens `ReservaFormModal` with the level auto-selected; the internal-form step and the rejection modal work as in the regular flow);
  - otherwise do nothing: the drawer stays open showing the user's existing reservation, the "Entrenamiento finalizado" note or the disabled "Reservar" button.
- The effect runs at most once per drawer opening: closing `ReservaFormModal` leaves the user in the drawer and does not reopen the dialog.
- No change to the booking logic itself; restrictions are still evaluated on submit by `reservasService.create`.

#### Out of scope
- A "Reservado" state on the card (would need a per-user reservation lookup for the whole month).
- A booking button on the calendar grid (`EntrenamientosCalendar`).
- Buying the plan inside the modal (no `PlanesPublicosModal` / `SuscripcionModal` embedding) — the modal only links to the plans page.
- Resuming the booking automatically after the purchase.
- Unexpected (non-rejection) errors: the red inline error in the drawer (`reservasHook.error`) and `submitError` inside the booking dialogs keep their current rendering.
- The events ticket-purchase flow (US-0121).

---

## Database Changes
None. No migrations, RLS policies or functions change. The plans page (`gestion-planes`) already enforces its own visibility rules (hidden / inactive plans are not listed to athletes, US-0126).

---

## API / Server Actions
No new server actions or routes.

**Modified** — `src/services/supabase/portal/reservas.service.ts`
- **Function**: `reservasService.create(input: CreateReservaInput)` and its internal restriction evaluator.
- **Input**: unchanged.
- **Return value**: unchanged shape (`Reserva | BookingRejection`); the `BookingRejection` now carries `ofrecerPlan: true` on the four sites listed in "Proposed Changes §1".
- **Auth / RLS**: unchanged.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add optional `ofrecerPlan?: boolean` to `BookingRejection` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Set `ofrecerPlan: true` on the four "no plan / no units" rejections |
| Component | `src/components/portal/entrenamientos/reservas/ReservaRechazoModal.tsx` | New top-most rejection modal with default and plan-offer variants |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Remove the inline rejection alert; track `rejectedAtletaId`; render `ReservaRechazoModal`; new `autoReservar` prop with the one-shot auto-open effect |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | New `onReservar` prop; "Reservar" / "Cupo lleno" button on each non-historical card for non-managers |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | `reservasPanelAutoReservar` state, `openReservaDirecta` handler, wire both props |
| Barrel | `src/components/portal/entrenamientos/reservas/index.ts` | Export `ReservaRechazoModal` |
| Docs | `projectspec/03-project-structure.md` | Add `ReservaRechazoModal.tsx` to the `reservas/` slice; note `ofrecerPlan` on `BookingRejection`, that `ReservasPanel` no longer renders rejections inline, and the card "Reservar" button / `autoReservar` prop |

`useReservas.ts` needs no change: it already exposes `bookingRejection` and `clearRejection`.

---

## Acceptance Criteria

1. Any booking rejection (`bookingRejection`) is shown in a modal that is fully visible above `ReservaFormModal`, `FormularioRespuestaModal` and the reservations drawer. It is never rendered inside the drawer.
2. The amber inline rejection alert no longer exists in the drawer.
3. An athlete with no active subscription granting the training's required service confirms a booking: the modal is titled "¿Deseas adquirir un plan?", shows the rejection reason (e.g. "Este entrenamiento requiere una suscripción activa con unidades disponibles en el servicio: Clases grupales.") and the line "Adquiere un plan para poder reservar este entrenamiento."
4. In that variant, "Ver planes" navigates in the same tab to `/portal/orgs/{tenant_id}/gestion-planes` of the training's organization, and "Ahora no" closes the modal.
5. The plan-offer variant also appears when the user's plan has no units left (`UNIDADES_AGOTADAS`) and when the subscription became inactive at submit time (`SUSCRIPCION_INACTIVA`).
6. For every other rejection (plan request pending approval, plan no longer available, inactive membership, insufficient level, booking window, past training, missing form fields, incomplete profile) the modal is titled "No es posible completar la reserva", shows the rejection message and a single "Entendido" button, with no plans link.
7. A rejected cancellation (`TIMING_CANCELACION`) shows the modal titled "No es posible cancelar la reserva" with "Entendido".
8. When a trainer books on behalf of another athlete who has no plan, the default variant is shown (no "¿Deseas adquirir un plan?", no link). When a trainer books for themself without a plan, the plan-offer variant is shown.
9. Closing the modal (button, Escape or backdrop click) closes only this modal: the booking dialog underneath stays open with the previously entered data.
10. Retrying after closing shows the modal again if the rejection repeats.
11. When the training has an internal form, a rejection returned at "Guardar y reservar" shows the modal above `FormularioRespuestaModal`.
12. The administrator no-units confirmation inside `ReservaFormModal` works exactly as before.
13. The modal is usable at 360 px width (no horizontal scroll, all actions visible).
14. An athlete sees a "Reservar" button on every non-historical training card of "Lista de entrenamientos", next to the existing "Ver" button.
15. Clicking the card's "Reservar" opens the reservations drawer and, once it finishes loading, the booking dialog (`ReservaFormModal`) opens automatically for the current user — no further click needed.
16. Confirming that dialog creates the reservation exactly as the drawer's "Reservar" does (level auto-selection, internal-form step, notes); on success the card's capacity pill updates.
17. If the athlete already has an active reservation for that training, clicking the card's "Reservar" opens the drawer showing that reservation and the booking dialog does not open.
18. When the training is full, the card button is disabled and reads "Cupo lleno".
19. Historical trainings show no "Reservar" button on the card.
20. Administrators and trainers see no "Reservar" button on the cards; their "Opciones" flow is unchanged.
21. Cancelling the auto-opened booking dialog leaves the drawer open and the dialog does not reopen by itself; opening the drawer through "Ver" → "Ver reservas" never auto-opens the dialog.
22. A rejection after booking from the card (e.g. no plan) shows `ReservaRechazoModal` on top, as in criteria 1–11.
23. `npm run lint` and `npm run build` pass with no new errors.

---

## Implementation Steps

- [ ] Add `ofrecerPlan?: boolean` to `BookingRejection`
- [ ] Set `ofrecerPlan: true` on the four rejection sites in `reservas.service.ts`
- [ ] Create `ReservaRechazoModal.tsx` (BodyPortal, `z-[70]`, two variants, focus + Escape handling) and export it from the slice barrel
- [ ] In `ReservasPanel.tsx`: remove the inline rejection alert, store `rejectedAtletaId`, render `ReservaRechazoModal`
- [ ] In `ReservasPanel.tsx`: add `autoReservar` and the one-shot auto-open effect
- [ ] In `EntrenamientosList.tsx`: add `onReservar` and the card button ("Reservar" / "Cupo lleno")
- [ ] In `EntrenamientosPage.tsx`: add `reservasPanelAutoReservar`, `openReservaDirecta`, wire the props
- [ ] Test manually the card button: available training, full training, historical training, already reserved, cancel the dialog, training with internal form
- [ ] Test manually as athlete: no plan, exhausted units, pending plan request, another rejection (e.g. booking window), rejected cancellation, training with internal form, mobile width
- [ ] Test manually as trainer (for self / for another athlete) and as administrator
- [ ] Run `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No new data access. The link is built only from the route's `tenantId`; the plans page keeps its own membership guard and plan-visibility RLS. The rejection message is rendered as plain text (no HTML).
- **Performance**: No additional queries; the modal is rendered from state already returned by the failed call, and the card button reuses `reservas_activas` / `cupo_maximo` already loaded with the list.
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title; focus moves to the dialog on open; Escape closes; all actions are keyboard reachable with the `gritFocusRing` style; decorative icon is `aria-hidden`. The card button is a native `<button>` with an `aria-label` that includes the training name; the disabled "Cupo lleno" state uses the `disabled` attribute.
- **Error handling**: All booking rejections surface in the top-most modal. Unexpected errors keep the existing red inline error (`reservasHook.error` / `submitError`).
