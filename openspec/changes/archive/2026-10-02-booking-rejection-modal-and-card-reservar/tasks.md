## 1. Branch Setup

- [x] 1.1 Create branch `feat/booking-rejection-modal-card-reservar` from `develop`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` before making any change

## 2. Page

- [x] 2.1 Confirm `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` needs no change (it only renders `EntrenamientosPage`)

## 3. Components — Booking Rejection Modal

- [x] 3.1 Create `src/components/portal/entrenamientos/reservas/ReservaRechazoModal.tsx` with props `{ rejection: BookingRejection | null; tenantId: string; ofrecerPlan: boolean; onClose: () => void }`; render nothing when `rejection` is null
- [x] 3.2 Render through `BodyPortal` (from `gestion-eventos/EventoModalShell`) with overlay `fixed inset-0 z-[70] flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm` and the `EventoModalShell` dialog frame classes
- [x] 3.3 Implement the default variant: amber `warning` icon, title "No es posible cancelar la reserva" for `TIMING_CANCELACION` else "No es posible completar la reserva", `rejection.message` as plain text, primary `GritButton` "Entendido"
- [x] 3.4 Implement the plan-offer variant: `card_membership` icon, title "¿Deseas adquirir un plan?", message + "Adquiere un plan para poder reservar este entrenamiento.", primary `GritButton` link "Ver planes" to `/portal/orgs/${tenantId}/gestion-planes`, secondary "Ahora no"
- [x] 3.5 Add accessibility and dismissal: `role="dialog"`, `aria-modal`, `aria-labelledby` (useId), focus the dialog on open, close on Escape and backdrop click
- [x] 3.6 Export `ReservaRechazoModal` from `src/components/portal/entrenamientos/reservas/index.ts`

## 4. Components — ReservasPanel

- [x] 4.1 Remove the inline "Booking rejection alert" block from `ReservasPanel.tsx`
- [x] 4.2 Add `rejectedAtletaId` state and set it to `input.atleta_id` in `onCreateReserva` before calling `reservasHook.createReserva`
- [x] 4.3 Render `ReservaRechazoModal` at the end of the panel JSX with `ofrecerPlan={!!bookingRejection?.ofrecerPlan && rejectedAtletaId === currentUserId}` and `onClose={reservasHook.clearRejection}`
- [x] 4.4 Add optional prop `autoReservar?: boolean` and a one-shot effect (ref guard reset when `open` is false or `instance?.id` changes) that calls `handleSelfBook()` once `currentUserId` is set and `reservasHook.isLoading` is false, only if `!isAdmin && !myReserva && !isPast && (capacidad === null || capacidad.disponible)`

## 5. Components — Training Cards

- [x] 5.1 In `EntrenamientosList.tsx` add optional prop `onReservar?: (trainingId: string) => void`
- [x] 5.2 Render the "Reservar" button (drawer primary style, `bookmark_add` icon, `aria-label` with the training name) before "Ver" when `onReservar && !canManage && !isHistorical`
- [x] 5.3 Render it disabled with the label "Cupo lleno" when `cupo_maximo != null && (reservas_activas ?? 0) >= cupo_maximo`
- [x] 5.4 In `EntrenamientosPage.tsx` add `reservasPanelAutoReservar` state and `openReservaDirecta(trainingId)` (resolve the instance as `openActionModal` does, open the panel with auto-book)
- [x] 5.5 Reset `reservasPanelAutoReservar` to false in `openReservasPanel` and `closeReservasPanel`; pass `onReservar` to `EntrenamientosList` and `autoReservar` to `ReservasPanel`

## 6. Hook

- [x] 6.1 Confirm `useReservas.ts` needs no change (`bookingRejection`, `clearRejection`, `isLoading` already exposed)

## 7. Service

- [x] 7.1 In `reservas.service.ts` set `ofrecerPlan: true` on the restriction step 5b `SERVICIO_REQUERIDO` rejection (service not in the entitlement set)
- [x] 7.2 Set `ofrecerPlan: true` on the pre-RPC `UNIDADES_AGOTADAS` rejection (the `exhausted` branch)
- [x] 7.3 Set `ofrecerPlan: true` on the RPC `UNIDADES_AGOTADAS` and RPC `SUSCRIPCION_INACTIVA` rejections; verify no other rejection sets it

## 8. Types

- [x] 8.1 Add optional `ofrecerPlan?: boolean` (with doc comment referencing US-0127) to `BookingRejection` in `src/types/portal/entrenamiento-restricciones.types.ts`

## 9. Manual Verification

- [x] 9.1 Athlete, card button: available training (dialog auto-opens), historical training (no button), cancel the dialog (does not reopen) — verified in the browser
- [x] 9.1b Athlete, card button: full training ("Cupo lleno", disabled), already reserved (drawer only, no dialog), training with internal form — verified in the browser
- [x] 9.2 Athlete, rejections: no plan (plan-offer variant on top, "Ver planes" navigates, "Ahora no" / Escape keep the dialog, retry shows it again), 360 px width — verified in the browser
- [x] 9.2b Athlete, rejections: booking window (default variant, "Entendido"), rejected cancellation title, rejection above `FormularioRespuestaModal` — verified in the browser
- [ ] 9.2c Athlete, rejections — not verified (no local data): exhausted units, pending plan request
- [ ] 9.3 Trainer — not verified (no trainer account): booking for another athlete without plan (default variant), booking for self without plan (plan-offer variant), no card button
- [x] 9.4 Administrator: no card button; no-units confirmation inside `ReservaFormModal` unchanged — verified in the browser
- [x] 9.5 "Ver" → "Ver reservas" opens the drawer without auto-opening the dialog

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`: add `ReservaRechazoModal.tsx` to the `reservas/` slice, note the `ReservasPanel` changes (`autoReservar`, no inline rejection alert), the `EntrenamientosList` card button, and `ofrecerPlan` on `BookingRejection`

## 11. Quality Checks and Delivery

- [x] 11.1 Run type check (`npx tsc --noEmit`) and fix any errors
- [x] 11.2 Run `npm run lint` and fix any new warnings or errors
- [x] 11.3 Run the test suite if one exists for the touched files (do not run `npm run build`) — the project has no test script
- [x] 11.4 Write the commit message and the pull request description for the implementation
