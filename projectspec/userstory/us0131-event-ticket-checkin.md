# US-0131 — Event Ticket Check-in

## ID
US-0131

## Name
Door check-in of event tickets by QR scan or manual code entry, with single entry and undo

## As a
Tenant administrator or trainer (`administrador` / `entrenador`) working the door of a team event

## I Want
To scan the QR code on an attendee's ticket (or type its `EV-XXXXXXXX` code), see right away whether the ticket is valid for this event, and record the attendee's entry once

## So That
Only people with a confirmed, unused ticket for this event get in, duplicates and screenshots are caught, and the organization knows how many attendees actually came

---

## Description

### Current State
- Payment validation already exists: `validar_compra_evento` moves a purchase from `en_validacion` to `confirmada` and its tickets to `activa` (US-0121, `/gestion-eventos/{eventoId}/compras`).
- Every row in `evento_tickets` has a unique `codigo` (`EV-` plus 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, made by `_generar_codigo_ticket()`).
- The ticket PDF (`src/lib/portal/eventos-ticket-pdf.ts`) prints the code. It adds a QR code that encodes exactly `ticket.codigo` only when the ticket is `activa`.
- **Missing:** there is no way to record that a ticket was used, no check-in screen, and no QR reader. The app has `qrcode` (a generator) but no scanner. Trainers have no "Eventos" menu entry.

### Proposed Changes

**Data**
- Add `ingreso_at` and `ingreso_por` to `evento_tickets`. A ticket has been used when `ingreso_at is not null`.
- Each ticket allows one entry. A repeat scan reports when the ticket was already used and who recorded it.
- Staff can undo an entry, which sets both columns back to null.

**Business logic (RPCs, `security definer`)**
- `registrar_ingreso_evento(p_evento_id, p_codigo)` checks the ticket and records the entry. Business outcomes come back as a `resultado` field, not as exceptions, so the UI can show them. Only authorization errors raise an exception.
- `revertir_ingreso_evento(p_ticket_id)` undoes an entry.
- `resumen_ingresos_evento(p_evento_id)` returns the counters.
- `cancelar_compra_evento` now rejects a cancellation when any ticket of the purchase has `ingreso_at` set.

**Code normalization** (done in both the client and the RPC):
- Trim the code and make it uppercase.
- Remove inner spaces.
- If the code is exactly 8 valid characters with no prefix, add `EV-`.

**Result catalog** (the order of evaluation matters):

| `resultado` | Condition | UI tone | Message |
|---|---|---|---|
| `no_encontrado` | No ticket has that code, or the ticket belongs to another tenant | red | "Código no encontrado" |
| `otro_evento` | The ticket belongs to another event of the same tenant (e.g. a *Múltiple* bundle) | amber | "Esta entrada es para {evento}" |
| `anulada` | Ticket `estado = 'anulada'` (purchase rejected, cancelled or expired) | red | "Entrada anulada — no válida para ingreso" |
| `pendiente` | Ticket `estado = 'pendiente'` (payment not validated yet) | amber | "Pago pendiente de validación" |
| `ya_ingreso` | `ingreso_at is not null` | amber | "Ya ingresó a las {HH:MM} · registrado por {nombre}" |
| `ok` | `activa`, not used yet → write `ingreso_at = now()`, `ingreso_por = auth.uid()` | green | "Ingreso registrado" |

Every outcome except `no_encontrado` also returns the attendee name, attendee email, ticket name and code. A code from another tenant always returns `no_encontrado` with no details, so the RPC does not reveal that the code exists.

**UI — new route under `(shared)`** (admin and trainer)
- `/portal/orgs/{tenantId}/control-ingreso`: the same list view and filters as the events management page (search, Estado, Periodo, Disciplina), without drafts and without the admin actions menu. "Próximos" counts from today 00:00 Bogotá. Each `confirmado` event has a "Control de ingreso" action that opens its check-in screen.
- `/portal/orgs/{tenantId}/control-ingreso/{eventoId}`: the check-in screen, laid out mobile-first:
  - **Header**: the event name and date, and "Ingresaron X / Y" (Y counts `activa` tickets), with a progress bar.
  - **Scanner**: uses the rear camera with the `qr-scanner` library, loaded through `next/dynamic` with `ssr: false`. The camera is off by default and starts with the button "Habilitar lectura de QR con cámara"; "Desactivar cámara" turns it off. It skips the same code for 3 s. It pauses while a result is shown and resumes on "Siguiente" or after 4 s for `ok`. If camera permission is denied or no camera exists, it shows "No se pudo acceder a la cámara. Ingresa el código manualmente." and moves focus to the manual input.
  - **Manual code input**: the field gets the `EV-` prefix, the format is checked on the client, and Enter submits. This also works with USB scanners that type like a keyboard.
  - **Result card**: a large card with an icon, a text label and a color, so the result is never shown by color alone. It shows the attendee name, the ticket name and the code. "Deshacer ingreso" appears on `ok` and `ya_ingreso`. `navigator.vibrate` runs when available: a short pulse for `ok`, a double pulse for other results.
  - **Attendee list** (tab or section "Asistentes"): the event's `activa` tickets. It has a search by name, email or code, a filter (*Todos / Ingresaron / Pendientes de ingreso*), 20 rows per page, and stacks into cards below `md`. Each row has "Registrar ingreso", which calls `registrar_ingreso_evento` with the ticket's code, or "Revertir", which asks for confirmation first.
- Menu: add "Eventos Check-in" (icon `qr_code_scanner`) for `administrador` and `entrenador` in `resolvePortalMenu`.
- `EventoActionsMenu` (admin events): add a "Control de ingreso" action.
- Breadcrumb label `control-ingreso` → "Control de ingreso".

**Small UI updates elsewhere**
- `EventoComprasTable` / `CompraDatosModal`: show "Ingresó {dd MMM HH:mm}" for each used ticket.
- `MiCompraCard` (Mis entradas): show a "Usada" badge on used tickets, and hide "Cancelar" when any ticket was used.
- `EventoComprasStats`: add an "Ingresaron" card.

**Out of scope**: offline mode, entry/exit logs (re-entry), signed or encrypted QR payloads, and email notifications.

---

## Database Changes

Migration `supabase/migrations/20261008120000_evento_tickets_checkin.sql`:

```sql
alter table public.evento_tickets
  add column ingreso_at  timestamptz,
  add column ingreso_por uuid references auth.users(id) on delete set null,
  add constraint evento_tickets_ingreso_ck
    check (ingreso_at is null or estado = 'activa'),
  add constraint evento_tickets_ingreso_por_ck
    check ((ingreso_at is null) = (ingreso_por is null) or ingreso_por is null);

create index idx_evento_tickets_evento_ingreso
  on public.evento_tickets (evento_id, ingreso_at);
```

- The second check lets `ingreso_por` become null on its own when the user is deleted, which is what `on delete set null` does.
- RLS: no change. `evento_tickets` stays read-only for clients (`select` for the owner or tenant staff). Every write goes through the RPCs below. The existing staff `select` policy already covers the new columns.
- `validar_compra_evento(false)` and `cancelar_compra_evento` set tickets to `anulada`. Because of `evento_tickets_ingreso_ck`, they must clear `ingreso_at` / `ingreso_por` in the same `update`. In practice the cancel path is blocked first by the new rule below.
- Update `cancelar_compra_evento`: before the policy check, add
  `if exists (select 1 from evento_tickets where compra_id = p_compra_id and ingreso_at is not null) then raise exception 'CANCELACION_NO_PERMITIDA'; end if;`

RPCs (same file; style of `validar_compra_evento` in `20261001120100_eventos_compras_rpc.sql`):

```sql
-- registrar_ingreso_evento(p_evento_id uuid, p_codigo text) returns jsonb
-- 1. v_evento := eventos row; if not found or tenant not in
--    get_trainer_or_admin_tenants_for_authenticated_user() → raise 'FORBIDDEN' (42501)
-- 2. v_codigo := normalized code; if it does not match '^EV-[A-HJ-NP-Z2-9]{8}$' → resultado 'no_encontrado'
-- 3. select t.* … from evento_tickets t where t.codigo = v_codigo for update
--    not found or t.tenant_id <> v_evento.tenant_id → 'no_encontrado'
--    t.evento_id <> p_evento_id                     → 'otro_evento' (+ evento_nombre of t.evento_id)
--    t.estado = 'anulada'                           → 'anulada'
--    t.estado = 'pendiente'                         → 'pendiente'
--    t.ingreso_at is not null                       → 'ya_ingreso' (+ ingreso_at, ingreso_por_nombre)
--    else update … set ingreso_at = now(), ingreso_por = auth.uid() → 'ok'
-- returns {resultado, ticket_id, codigo, asistente_nombre, asistente_email,
--          entrada_nombre, evento_nombre, ingreso_at, ingreso_por_nombre}

-- revertir_ingreso_evento(p_ticket_id uuid) returns jsonb
--   staff check on the ticket's tenant → FORBIDDEN; ingreso_at is null → 'ESTADO_INVALIDO'
--   update set ingreso_at = null, ingreso_por = null; returns the same shape with resultado 'revertido'

-- resumen_ingresos_evento(p_evento_id uuid) returns jsonb
--   staff check → FORBIDDEN; {activas, ingresaron, pendientes_pago}

revoke all on function public.registrar_ingreso_evento(uuid, text) from public, anon;
grant execute on function public.registrar_ingreso_evento(uuid, text) to authenticated;
-- same for revertir_ingreso_evento(uuid) and resumen_ingresos_evento(uuid)
```

- The entry name comes from `entrada_nombre` on `evento_compras`.
- `ingreso_por_nombre` is resolved from the users/profile table already used for staff names (the same source the trainer snapshots use).

---

## API / Server Actions

All of these go in `src/services/supabase/portal/eventos-compras.service.ts` (`eventoComprasService`), using the browser client.

| Function | Input | Returns | Notes |
|---|---|---|---|
| `registrarIngreso(eventoId, codigo)` | `string`, `string` | `IngresoResultado` | RPC `registrar_ingreso_evento`; normalizes the code client-side first; exceptions go through `mapCompraError` (`FORBIDDEN`) |
| `revertirIngreso(ticketId)` | `string` | `IngresoResultado` | RPC `revertir_ingreso_evento`; `ESTADO_INVALIDO` → existing "La compra cambió de estado. Recarga la página." message |
| `resumenIngresos(eventoId)` | `string` | `ResumenIngresos` | RPC `resumen_ingresos_evento` |
| `listAsistentesEvento(eventoId)` | `string` | `AsistenteIngreso[]` | `select` on `evento_tickets` (RLS staff) where `evento_id = eventoId and estado = 'activa'`, embedding `evento_compras(entrada_nombre)`, ordered by `asistente_nombre`; filtering and paging happen on the client (one event's tickets) |

`src/services/supabase/portal/eventos.service.ts`: reuse `listEventos(tenantId, { desde, hasta })` for the event selector. Filter out `borrador` and `estado <> 'confirmado'` on the client.

Auth: every RPC checks `get_trainer_or_admin_tenants_for_authenticated_user()`. Pages also check the role on the server (see Non-Functional Requirements).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261008120000_evento_tickets_checkin.sql` | Columns, checks, index, 3 RPCs, `cancelar_compra_evento` update |
| Dependency | `package.json` | Add `qr-scanner` |
| Types | `src/types/portal/eventos-compras.types.ts` | `IngresoResultadoCodigo`, `IngresoResultado`, `ResumenIngresos`, `AsistenteIngreso`; `ingresoAt` on the ticket shapes of `CompraAdminItem` / `MiCompra` |
| Util | `src/lib/portal/eventos-ingreso.utils.ts` | `normalizarCodigoTicket`, `esCodigoTicketValido`, `ingresoResultadoMeta` (tone/icon/label per result) |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | `registrarIngreso`, `revertirIngreso`, `resumenIngresos`, `listAsistentesEvento`; select `ingreso_at` in `listComprasEvento` / `listMisCompras` |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | Options `excluirBorradores` and `proximosDesdeHoy` for the check-in selector |
| Component | `src/components/portal/gestion-eventos/EventosToolbar.tsx`, `EventosTable.tsx` | Optional view switcher, `ocultarBorrador`, `renderAcciones` |
| Hook | `src/hooks/portal/control-ingreso/useControlIngreso.ts` | Scan/submit state, last result, pending flag, de-duplication, refresh of counters and list |
| Hook | `src/hooks/portal/control-ingreso/useAsistentesIngreso.ts` | Attendee list, search, filter, paging |
| Component | `src/components/portal/control-ingreso/ControlIngresoEventosPage.tsx` | Event selector page |
| Component | `src/components/portal/control-ingreso/ControlIngresoPage.tsx` | Check-in screen shell (header, scanner/manual, result, list) |
| Component | `src/components/portal/control-ingreso/QrScanner.tsx` | Camera + `qr-scanner`, dynamic import, permission errors |
| Component | `src/components/portal/control-ingreso/CodigoManualForm.tsx` | Manual / USB scanner input |
| Component | `src/components/portal/control-ingreso/IngresoResultadoCard.tsx` | Result card + "Deshacer ingreso" |
| Component | `src/components/portal/control-ingreso/IngresoResumenHeader.tsx` | "Ingresaron X / Y" + progress |
| Component | `src/components/portal/control-ingreso/AsistentesIngresoTable.tsx` | Attendee list with register/revert |
| Component | `src/components/portal/control-ingreso/RevertirIngresoModal.tsx` | Confirmation (uses `EventoModalShell`) |
| Component | `src/components/portal/control-ingreso/index.ts` | Barrel |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/page.tsx` | Server role guard + `ControlIngresoEventosPage` |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/[evento_id]/page.tsx` | Server role guard + UUID check + `ControlIngresoPage` |
| Nav | `src/types/portal.types.ts` | "Eventos Check-in" item for `administrador` and `entrenador` |
| Nav | `src/components/portal/PortalBreadcrumb.tsx` | `control-ingreso` → "Control de ingreso"; event UUID → "Evento" |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | "Control de ingreso" action |
| Component | `src/components/portal/gestion-eventos/compras/EventoComprasTable.tsx`, `CompraDatosModal.tsx`, `EventoComprasStats.tsx` | Entry time per ticket, "Ingresaron" card |
| Component | `src/components/portal/mis-entradas/MiCompraCard.tsx` | "Usada" badge, hide "Cancelar" when used |
| Docs | `projectspec/03-project-structure.md` | Document the new route, slice, hooks, service functions |

---

## Acceptance Criteria

1. An admin or trainer of tenant T sees "Eventos Check-in" in the tenant menu. A `usuario` member does not see it, and opening the URL directly redirects them to `/portal/orgs/{tenantId}`.
2. `/control-ingreso` lists T's non-draft events with the same filters as the events management list. With Periodo "Próximos", an event that started earlier today is still listed. With no events, it shows "No hay eventos para controlar ingreso."
3. Scanning the QR code of an `activa`, unused ticket of the selected event shows a green "Ingreso registrado" card with the attendee name and ticket name. The ticket row then has `ingreso_at` and `ingreso_por = auth.uid()`, and the counter goes up by 1.
4. Scanning the same ticket again shows "Ya ingresó a las HH:MM · registrado por {nombre}". The database is not changed.
5. Two staff scanning the same ticket at the same moment: exactly one gets `ok`, and the other gets `ya_ingreso`.
6. A `pendiente` ticket shows "Pago pendiente de validación". An `anulada` ticket shows "Entrada anulada — no válida para ingreso". Neither records an entry.
7. A ticket of another event of the same tenant shows "Esta entrada es para {evento}" and records nothing.
8. A nonexistent code, a malformed code, or a code from another tenant shows "Código no encontrado" with no attendee details.
9. Typing `ev-abcd2345`, `EV ABCD2345` or `ABCD2345` in the manual field resolves to `EV-ABCD2345`.
10. The camera is off when the screen opens and starts only after "Habilitar lectura de QR con cámara". If camera permission is then denied, the screen shows the camera message, the manual field gets focus, and check-in still works by manual entry.
11. "Deshacer ingreso" (or "Revertir" in the list, after confirmation) clears `ingreso_at`/`ingreso_por` and lowers the counter. A later scan returns `ok` again.
12. Reverting a ticket that was already reverted in another tab shows "La compra cambió de estado. Recarga la página." inline.
13. Calling any of the three RPCs as `anon`, as an athlete, or as staff of another tenant fails with a permission error (`42501`).
14. `insert`/`update` on `evento_tickets` by `authenticated` still fails, so entries can only be written through the RPCs.
15. A buyer cannot cancel a purchase with a used ticket. "Cancelar" is hidden, and the RPC raises `CANCELACION_NO_PERMITIDA`.
16. In "Mis entradas", a used ticket shows a "Usada" badge. In the admin purchases table, the ticket shows its entry time, and the stats include "Ingresaron".
17. In the attendee list, search by name, email or code, and the *Ingresaron / Pendientes de ingreso* filter, return the right rows. Paging is 20 per page. Loading, error-with-retry and empty states are shown.
18. The result card shows its outcome as text and an icon, not only color, and is announced through an `aria-live="assertive"` region.

---

## Implementation Steps

- [ ] Create migration `20261008120000_evento_tickets_checkin.sql` (columns, checks, index, RPCs, `cancelar_compra_evento` guard) and apply it locally (`supabase db reset`)
- [ ] Write SQL checks for every row of the result catalog, the concurrency case, revert, and the permission cases
- [ ] `npm i qr-scanner`
- [ ] Add types and `eventos-ingreso.utils.ts` (normalization + result meta)
- [ ] Add service functions; add `ingreso_at` to the existing purchase/ticket selects
- [ ] Create hooks in `src/hooks/portal/control-ingreso/`
- [ ] Build the components (`QrScanner` dynamic, manual form, result card, header, attendee table, revert modal)
- [ ] Add both pages under `(shared)/control-ingreso` with the server-side role guard
- [ ] Menu item, breadcrumb labels, `EventoActionsMenu` action
- [ ] Update `EventoComprasTable`, `CompraDatosModal`, `EventoComprasStats`, `MiCompraCard`
- [ ] Verify RLS: client writes on `evento_tickets` are still denied
- [ ] Test manually: free ticket → PDF QR → scan from a phone over HTTPS (tunnel) → green; re-scan → amber; undo; pending/anulada/other-event codes; camera denied
- [ ] `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**:
  - Every write goes through `security definer` RPCs with `set search_path = public` and a staff check through `get_trainer_or_admin_tenants_for_authenticated_user()`. The RPCs are revoked from `public`/`anon`.
  - Codes from other tenants return `no_encontrado` with no details, so they do not reveal anything.
  - Both pages check on the server, with `getCachedTenantAccess`, that the role is `administrador` or `entrenador`. The `(shared)` layout also admits `usuario`.
  - `[evento_id]` must be a UUID, or the page redirects.
  - The code is validated against `^EV-[A-HJ-NP-Z2-9]{8}$` before any lookup.
- **Performance**:
  - The lookup is by the unique `codigo` index.
  - The counters use `idx_evento_tickets_evento_ingreso`.
  - `qr-scanner` and its worker load only on the check-in page, through `next/dynamic`.
  - The camera stream is stopped on unmount and when the tab is hidden (`visibilitychange`).
  - After each result, refresh only the counters and the list, not the whole page.
- **Accessibility**:
  - The result card uses `role="status"` / `aria-live="assertive"` and pairs color with an icon and text.
  - The manual input has a visible label.
  - Every action is reachable by keyboard.
  - The scanner region has an `aria-label`, and the camera is turned on and off with real `<button>` elements.
- **Error handling**:
  - Business outcomes appear on the result card.
  - RPC exceptions (`FORBIDDEN`, `ESTADO_INVALIDO`, network) appear inline above the scanner with "Reintentar", through `mapCompraError`.
  - Camera errors fall back to manual entry.
  - The list has loading, error-with-retry and empty states.
- **Browser support**: the camera needs HTTPS (or localhost). The page works on iOS Safari and Android Chrome. Manual entry works everywhere.
