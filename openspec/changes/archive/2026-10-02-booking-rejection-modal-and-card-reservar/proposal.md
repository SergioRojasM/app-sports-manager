## Why

Booking a training takes three clicks for an athlete ("Ver" on the card → "Ver reservas" → "Reservar" in the drawer), and when the booking is rejected the notice is rendered inside the reservations drawer, underneath the booking dialog that stays open — the athlete presses "Reservar" and sees nothing happen. When the reason is a missing plan there is also no way to act on it. Source: `projectspec/userstory/us0127-booking-rejection-modal.md` (US-0127).

## What Changes

- **"Reservar" button on training cards**: athletes get a "Reservar" button on every non-historical card of "Lista de entrenamientos"; it opens the reservations drawer and auto-opens the booking dialog for the current user. Full trainings show a disabled "Cupo lleno" button. Administrators and trainers keep their "Opciones" flow.
- **Booking rejections in a top-most modal**: every `BookingRejection` (booking, admin no-units confirmation, cancellation) is shown in a new `ReservaRechazoModal` rendered on `document.body` above the drawer, `ReservaFormModal` and `FormularioRespuestaModal`. The amber inline alert in the drawer is removed.
- **"Acquire a plan" offer**: when the rejection is solved by acquiring a plan (no subscription granting the required service, units exhausted, subscription inactive at submit time) and the booking was for the current user, the modal is titled "¿Deseas adquirir un plan?" and offers a "Ver planes" link to `/portal/orgs/{tenant_id}/gestion-planes` plus "Ahora no". Other rejections show "No es posible completar la reserva" / "No es posible cancelar la reserva" with "Entendido".
- **`ofrecerPlan` flag on `BookingRejection`**: set by `reservasService.create` on the four "no plan / no units" rejection sites, so the UI does not infer the offer from the overloaded `SERVICIO_REQUERIDO` code.
- No database, RLS, RPC or route changes. No rejection codes or messages change.

## Non-goals

- A "Reservado" state on the card (needs a per-user reservation lookup for the whole month).
- A booking button on the calendar grid (`EntrenamientosCalendar`).
- Buying the plan inside the modal (no `PlanesPublicosModal` / `SuscripcionModal` embedding); the modal only links to the plans page.
- Resuming the booking automatically after the purchase.
- Moving unexpected (non-rejection) errors: the red inline error in the drawer (`reservasHook.error`) and `submitError` inside the booking dialogs keep their current rendering.
- The events ticket-purchase flow (US-0121).
- A card "Reservar" button for administrators / trainers (their booking needs the athlete picker).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `training-booking`: the "Booking rejection feedback in ReservasPanel" requirement changes from an inline drawer alert to a top-most modal; new requirements for the plan-offer variant, the `ofrecerPlan` flag, and the drawer's auto-open booking mode.
- `training-management`: new requirement for the "Reservar" button on training cards (the existing "Ver reservas" trigger is unchanged).

## Impact

Files, following page → component → hook → service → types:

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` | No change (renders `EntrenamientosPage`) |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Modify: `reservasPanelAutoReservar` state, `openReservaDirecta` handler, wire `onReservar` / `autoReservar` |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Modify: `onReservar` prop; "Reservar" / "Cupo lleno" card button for non-managers on non-historical trainings |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Modify: remove inline rejection alert; track `rejectedAtletaId`; render `ReservaRechazoModal`; `autoReservar` prop with one-shot auto-open effect |
| Component | `src/components/portal/entrenamientos/reservas/ReservaRechazoModal.tsx` | **Create**: top-most rejection modal, default and plan-offer variants |
| Component | `src/components/portal/entrenamientos/reservas/index.ts` | Modify: export `ReservaRechazoModal` |
| Hook | `src/hooks/portal/entrenamientos/reservas/useReservas.ts` | No change (already exposes `bookingRejection`, `clearRejection`) |
| Service | `src/services/supabase/portal/reservas.service.ts` | Modify: set `ofrecerPlan: true` on four rejection sites |
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Modify: optional `ofrecerPlan?: boolean` on `BookingRejection` |
| Docs | `projectspec/03-project-structure.md` | Modify: document the new modal, flag, card button and `autoReservar` |

Design reference: no mockup was provided. The modal reuses the existing dialog frame of `EventoModalShell` (grit-arena-v2 tokens) and the card button reuses the drawer's own "Reservar" button style, as specified in US-0127.

Dependencies: none added. Reuses `BodyPortal` from `src/components/portal/gestion-eventos/EventoModalShell.tsx` and `GritButton` from `src/components/ui`.

## Implementation Plan

1. Create branch `feat/booking-rejection-modal-card-reservar` from `develop`.
2. Types: add `ofrecerPlan` to `BookingRejection`.
3. Service: set `ofrecerPlan: true` on the four rejection sites in `reservas.service.ts`.
4. Component: create `ReservaRechazoModal` and export it.
5. Component: in `ReservasPanel`, replace the inline alert with the modal and track `rejectedAtletaId`.
6. Component: add `autoReservar` to `ReservasPanel` (one-shot auto-open of the booking dialog).
7. Component: add the card button to `EntrenamientosList`; wire state and handler in `EntrenamientosPage`.
8. Verify types and lint; test manually per role.
9. Update `projectspec/03-project-structure.md`; write commit message and PR description.
