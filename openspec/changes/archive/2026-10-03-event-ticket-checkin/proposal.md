## Why

Payments for event tickets are validated (US-0121) and every `activa` ticket carries a QR code with its `codigo`, but nothing happens with that code at the door: there is no way to record that a ticket was used, no check-in screen and no QR reader. Admins and trainers need to scan or type the code, know right away whether the ticket is valid for this event, and record the entry once, so duplicates and screenshots are caught and attendance is known (US-0131, `projectspec/userstory/us0131-event-ticket-checkin.md`).

## What Changes

- New columns `evento_tickets.ingreso_at` and `evento_tickets.ingreso_por` (a ticket is used when `ingreso_at is not null`), with checks and an index on `(evento_id, ingreso_at)`.
- New RPCs, callable by the tenant's admins and trainers only:
  - `registrar_ingreso_evento(p_evento_id, p_codigo)` returns a `resultado` (`ok | ya_ingreso | pendiente | anulada | otro_evento | no_encontrado`) instead of raising business errors. Only `ok` writes.
  - `revertir_ingreso_evento(p_ticket_id)` undoes an entry.
  - `resumen_ingresos_evento(p_evento_id)` returns the counters.
- `cancelar_compra_evento` rejects a purchase with a used ticket (`CANCELACION_NO_PERMITIDA`). It is the only transition that voids `activa` tickets, so a used ticket can never become `anulada` (also enforced by a check).
- New `(shared)` routes `/portal/orgs/{tenantId}/control-ingreso` (event selector: the same list view and filters as "Eventos", without drafts) and `/control-ingreso/{eventoId}` (check-in screen). Both have a server-side guard that admits only `administrador` and `entrenador`.
- The check-in screen has:
  - a camera QR scanner (`qr-scanner`, dynamically imported), off until the user presses "Habilitar lectura de QR con cámara";
  - a manual / USB-scanner code input with normalization (`ev-abcd2345`, `ABCD2345` → `EV-ABCD2345`);
  - a result card (text + icon + color) with "Deshacer ingreso";
  - an "Ingresaron X / Y" header;
  - an attendee list with search, filter, register and revert.
- New menu item "Eventos Check-in" for admins and trainers, a breadcrumb label, and a "Control de ingreso" action in the admin event menu.
- The entry time is shown in the admin purchases table, in "Ver datos" and in a new "Ingresaron" stats card. "Mis entradas" shows a "Usada" badge and hides "Cancelar" once a ticket was used.

### Non-goals

- Offline check-in (PWA, local cache, sync queue). This is planned as a separate story.
- Re-entry or an entry/exit log. Each ticket allows one entry, and the undo leaves no audit trail.
- Signed or encrypted QR payloads. The QR keeps encoding the plain `codigo`, and existing PDFs stay valid.
- Email or push notifications on entry.
- Changes to payment validation, the checkout or the ticket PDF.
- A trainer-facing "Eventos" management menu. Trainers only get "Eventos Check-in".

## Capabilities

### New Capabilities

- `team-events-checkin`: the check-in RPCs and result catalog, the `control-ingreso` routes and role guard, the scanner / manual input / result card / attendee list, and the menu and breadcrumb entries.

### Modified Capabilities

- `team-events-purchase-data`: `evento_tickets` gains `ingreso_at` / `ingreso_por` with checks. `cancelar_compra_evento` rejects purchases with used tickets.
- `team-events-purchase-validation`: the purchases table / "Ver datos" show each ticket's entry time, and the stats add "Ingresaron".
- `team-events-my-tickets`: "Usada" badge, and "Cancelar" hidden when any ticket of the purchase was used.
- `team-events-management`: the event actions menu gains "Control de ingreso".
- `portal-role-navigation`: "Eventos Check-in" menu item for `administrador` and `entrenador`.

## Impact

Design: no mockup. Confirmed with the user: reuse the existing patterns (grit-arena-v2 tokens, `EventoModalShell`, `EventoComprasTable` / `EventoComprasStats` layouts).

### Files to create or modify (page → component → hook → service → types)

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/page.tsx` | New: role guard + `ControlIngresoEventosPage` |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/[evento_id]/page.tsx` | New: role guard + UUID check + `ControlIngresoPage` |
| Component | `src/components/portal/control-ingreso/ControlIngresoEventosPage.tsx` | New: event selector |
| Component | `src/components/portal/control-ingreso/ControlIngresoPage.tsx` | New: check-in screen shell |
| Component | `src/components/portal/control-ingreso/QrScanner.tsx` | New: camera + `qr-scanner` |
| Component | `src/components/portal/control-ingreso/CodigoManualForm.tsx` | New: manual / USB input |
| Component | `src/components/portal/control-ingreso/IngresoResultadoCard.tsx` | New: result + undo |
| Component | `src/components/portal/control-ingreso/IngresoResumenHeader.tsx` | New: counters + progress |
| Component | `src/components/portal/control-ingreso/AsistentesIngresoTable.tsx` | New: attendee list |
| Component | `src/components/portal/control-ingreso/RevertirIngresoModal.tsx` | New: revert confirmation |
| Component | `src/components/portal/control-ingreso/index.ts` | New: barrel |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | "Control de ingreso" action |
| Component | `src/components/portal/gestion-eventos/compras/EventoComprasTable.tsx`, `CompraDatosModal.tsx`, `EventoComprasStats.tsx` | Entry time, "Ingresaron" card |
| Component | `src/components/portal/mis-entradas/MiCompraCard.tsx` | "Usada" badge, hide "Cancelar" |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | `control-ingreso` label |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | Options `excluirBorradores`, `proximosDesdeHoy` |
| Component | `src/components/portal/gestion-eventos/EventosToolbar.tsx`, `EventosTable.tsx` | Optional view switcher, `ocultarBorrador`, `renderAcciones` |
| Hook | `src/hooks/portal/control-ingreso/useControlIngreso.ts` | New |
| Hook | `src/hooks/portal/control-ingreso/useAsistentesIngreso.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useEventoCompras.ts` | Load the entry summary for the stats |
| Lib | `src/lib/portal/eventos-ingreso.utils.ts` | New: code normalization, result meta |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | `registrarIngreso`, `revertirIngreso`, `resumenIngresos`, `listAsistentesEvento`; `ingreso_at` in existing selects |
| Types | `src/types/portal/eventos-compras.types.ts` | `IngresoResultado*`, `ResumenIngresos`, `AsistenteIngreso`; `ingresoAt` on ticket shapes |
| Types | `src/types/portal.types.ts` | Menu item |
| Migration | `supabase/migrations/20261008120000_evento_tickets_checkin.sql` | Columns, checks, index, 3 RPCs, replace `cancelar_compra_evento` |
| Dependency | `package.json` | `qr-scanner` |
| Docs | `projectspec/03-project-structure.md` | Routes, slice, hooks, service, RPCs |

### Step-by-step implementation plan

1. Create branch `feat/event-ticket-checkin` from `develop`.
2. Write the migration and apply it locally. Run SQL checks for every result, the concurrency case, revert and permissions.
3. Add types and `eventos-ingreso.utils.ts`.
4. Add the service functions and the `ingreso_at` selects.
5. Add the hooks.
6. Add the components (scanner, manual form, result card, header, attendee table, revert modal, pages' shells).
7. Add the pages, menu item, breadcrumb and admin action.
8. Make the small updates in purchases and "Mis entradas".
9. Verify manually: manual code, phone camera over HTTPS, and every result.
10. Update the documentation, then run typecheck and lint, and write the commit message and PR description.

### Other impact

- APIs: three new RPCs. The `cancelar_compra_evento` signature stays the same.
- Security: no new tables or policies. `evento_tickets` stays read-only for clients, and the new columns are readable through the existing select policies (owner or staff).
- Dependencies: `qr-scanner` (MIT, ~16 kB plus a worker, loaded only on the check-in page).
- Browser: the camera requires HTTPS or localhost.
