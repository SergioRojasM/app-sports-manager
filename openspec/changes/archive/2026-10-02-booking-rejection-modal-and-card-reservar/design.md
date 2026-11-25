## Context

Booking lives in the `entrenamientos` feature slice. `EntrenamientosPage` renders `EntrenamientosList` (cards) and one `ReservasPanel` (right-side drawer, `fixed … z-50`). The drawer owns the booking state through `useReservas` and `useReservaForm`, and renders `ReservaFormModal` and `FormularioRespuestaModal` (both `fixed inset-0 z-50`, rendered after the drawer content).

`reservasService.create` returns `Reserva | BookingRejection`. `useReservas` stores a rejection in `bookingRejection` from three paths (`createReserva`, `confirmAdminBooking`, `cancelReserva`) and exposes `clearRejection`. The drawer renders it as an amber inline alert, which is painted under the booking dialogs that stay open on failure.

`SERVICIO_REQUERIDO` is reused by several unrelated rejections (missing service, inactive subscription, pending plan request, plan no longer available, generic fallback), so the code cannot tell the UI whether acquiring a plan solves the problem.

Constraints: no database or RPC changes; hexagonal layering (component → hook → service → types); grit-arena-v2 tokens; no mockup provided, so the UI reuses existing frames.

```
EntrenamientosPage
 ├─ EntrenamientosList ──onReservar(id)──┐          (new card button, athletes only)
 │                                       ▼
 └─ ReservasPanel (drawer, z-50)   autoReservar=true
     ├─ useReservas ── bookingRejection ──────────────┐
     ├─ ReservaFormModal (z-50)  ◄─ auto-opened once  │
     ├─ FormularioRespuestaModal (z-50)               │
     └─ ReservaRechazoModal ◄─────────────────────────┘
          └─ BodyPortal → document.body, z-[70]   (above everything)
               ├─ plan-offer variant → Link /portal/orgs/{tenantId}/gestion-planes
               └─ default variant    → "Entendido"
```

## Goals / Non-Goals

**Goals:**
- A booking rejection is always visible, regardless of which dialog is open.
- A "no plan" rejection offers a one-click path to the plans page.
- An athlete reaches the booking dialog with one click from a training card.
- Zero new queries and zero changes to booking rules.

**Non-Goals:**
- "Reservado" state on cards, calendar booking button, in-modal plan purchase, auto-resuming the booking after purchase.
- Relocating unexpected errors (`reservasHook.error`, `submitError`).
- Card booking for administrators / trainers.

## Decisions

### D1. Explicit `ofrecerPlan` flag on `BookingRejection` instead of matching on `code`
The service sets `ofrecerPlan: true` on exactly four sites: restriction step 5b (service not in the entitlement set), the pre-RPC `exhausted` branch (`UNIDADES_AGOTADAS`), the RPC `UNIDADES_AGOTADAS` error, and the RPC `SUSCRIPCION_INACTIVA` error.
- *Alternative — match `code === 'SERVICIO_REQUERIDO'` in the UI*: rejected; it would ask "¿Deseas adquirir un plan?" to a user whose plan request is pending approval or whose rejection is the generic fallback.
- *Alternative — new rejection codes*: rejected; `BookingRejectionCode` is consumed elsewhere and messages/codes must not change. An optional boolean is additive and backward compatible.

### D2. One modal for all rejections, with two variants
`ReservaRechazoModal` takes `rejection`, `tenantId`, `ofrecerPlan`, `onClose`. Variant is chosen by the `ofrecerPlan` prop; the default title depends on `rejection.code` (`TIMING_CANCELACION` → "No es posible cancelar la reserva", otherwise "No es posible completar la reserva").
- *Alternative — a plan-only modal and keep the inline alert for the rest*: rejected by the product owner; the inline alert is hidden for every rejection, not only the plan one.
- *Alternative — raise the alert inside `ReservaFormModal`*: rejected; rejections also arise from `FormularioRespuestaModal` and from cancellation (no dialog open), which would need three render sites.

### D3. Layering: `BodyPortal` + `z-[70]`, not `EventoModalShell`
The modal renders through `BodyPortal` (exported by `gestion-eventos/EventoModalShell.tsx`) so no `backdrop-blur` ancestor becomes its containing block, with `z-[70]` — above the drawer and booking dialogs (`z-50`) and the athlete combobox list (`z-[60]`). The dialog frame copies `EventoModalShell`'s classes.
- *Alternative — reuse `EventoModalShell`*: rejected; its `z-50` is hard-coded and it would tie with the booking dialogs. Adding a z-index prop to a shared events component for one caller is a wider change than a small dedicated frame.
- Importing `BodyPortal` across feature slices has precedent (`mis-entradas` reuses `EventoModalShell`).

### D4. The plan offer applies only to the person booking for themself
`ReservasPanel` stores `rejectedAtletaId` (the `atleta_id` of the last create attempt, set in `onCreateReserva`) and passes `ofrecerPlan = rejection.ofrecerPlan && rejectedAtletaId === currentUserId`. A trainer/admin booking on behalf of another athlete gets the default variant.
- *Alternative — decide by role*: rejected; a trainer booking for themself should get the offer, and role does not say who the booking is for.

### D5. Card booking = open the drawer in auto-book mode
The card button calls `openReservaDirecta(trainingId)` in `EntrenamientosPage`, which opens `ReservasPanel` with `autoReservar`. A one-shot effect in the drawer (guarded by a `useRef`, reset when `open` turns false or `instance.id` changes) waits for `currentUserId` and `!reservasHook.isLoading`, then calls the existing `handleSelfBook()` only if `!isAdmin && !myReserva && !isPast && (capacidad === null || capacidad.disponible)`.
- *Alternative — a standalone booking dialog mounted from the page*: rejected; it would duplicate `useReservas` / `useReservaForm` / formulario / profile-completion wiring that lives in the drawer (~1000 lines).
- *Alternative — per-card "already reserved" lookup*: rejected (non-goal); needs a month-wide per-user query. The drawer already knows `myReserva`, so it decides and simply shows the existing reservation.
- The card disables itself with "Cupo lleno" from `reservas_activas` / `cupo_maximo`, already loaded with the list.

### D6. Card button only for non-managers
Rendered when `onReservar && !canManage && !isHistorical`. Managers book on behalf of athletes through the athlete picker and keep "Opciones".

## Risks / Trade-offs

- [The auto-open effect fires before categories load, so the level is not auto-selected] → gate on `reservasHook.isLoading === false`; `loadReservas` loads reservations, capacity and categories in one `Promise.all`.
- [The effect re-fires after the user cancels the dialog] → one-shot `useRef` guard per drawer opening; covered by a manual test.
- [Stale `reservas_activas` on the card lets a user click "Reservar" on a training that just filled] → the drawer re-checks `capacidad.disponible` and the service enforces capacity; worst case the drawer opens with its own disabled button.
- [`rejectedAtletaId` is not set for cancellation rejections] → cancellation never carries `ofrecerPlan`, so the default variant is always correct there.
- [Two stacked backdrops (booking dialog + rejection modal) darken the screen] → accepted; it signals that the lower dialog is inactive.
- [A user who already reserved clicks the card's "Reservar" and only sees the drawer] → accepted for this phase; the drawer shows their reservation. A "Reservado" card state is a follow-up.
- [No mockup provided] → the modal copies an approved frame (`EventoModalShell`) and the button copies the drawer's "Reservar" style; visual adjustments can follow review.

## Migration Plan

Frontend-only; no migration. Deploy with the normal release. Rollback = revert the commit (the `ofrecerPlan` field is optional and ignored by older UI code).

## Open Questions

None blocking. Follow-up candidates: "Reservado" state on cards; moving unexpected errors into the same modal.
