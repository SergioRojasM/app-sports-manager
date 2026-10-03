# Delivery — event-ticket-checkin (US-0131)

## Commit message

```
feat(eventos): add door check-in of event tickets

Admins and trainers can now check attendees in at the door from the new
"Eventos Check-in" section: scan the ticket QR with the camera or type
its EV-XXXXXXXX code, see whether the ticket is valid for the event, and
record the entry once. An entry can be undone.

evento_tickets gains ingreso_at / ingreso_por. registrar_ingreso_evento
returns the outcome as data (ok, ya_ingreso, pendiente, anulada,
otro_evento, no_encontrado) and locks the ticket, so concurrent scans
of one code give a single ok. revertir_ingreso_evento undoes an entry
and resumen_ingresos_evento returns the counters. cancelar_compra_evento
rejects purchases with a used ticket.

The purchases page shows each ticket's entry time and an "Ingresaron"
card; "Mis entradas" shows a "Usada" badge and hides "Cancelar".

US-0131

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request description

### Why
Payments for event tickets are validated and every active ticket carries a QR code, but nothing
happened with that code at the door: there was no way to record that a ticket was used. US-0131
adds the check-in, so only confirmed, unused tickets of the event get in, duplicates are caught,
and the organization knows how many attendees came.

User story: `projectspec/userstory/us0131-event-ticket-checkin.md`
OpenSpec change: `openspec/changes/event-ticket-checkin/`

### What changes
- **Eventos Check-in** (`/portal/orgs/{t}/control-ingreso`, menu item for admins and trainers):
  the same list view and filters as "Eventos" (search, estado, periodo, disciplina), without
  drafts. "Próximos" counts from the start of today, so an event in progress stays listed.
- **Check-in screen** (`/control-ingreso/{eventoId}`):
  - QR scanner with the rear camera (`qr-scanner`). The camera is off until the user presses
    "Habilitar lectura de QR con cámara". If it cannot be used, the screen says so and focuses
    the manual field.
  - Manual code field. It also takes USB scanners. `ev-abcd2345`, `EV ABCD2345` and `ABCD2345`
    all resolve to `EV-ABCD2345`.
  - Result card with icon, text and color: registered, already used (time and who recorded it),
    payment pending, ticket of another event, voided, or not found. "Deshacer ingreso" on the
    first two.
  - "Ingresaron X / Y" counter with a progress bar.
  - Attendee list with search, filter, and "Registrar ingreso" / "Revertir" per row.
- **Admin events**: "Control de ingreso" in the actions menu of published, confirmed events.
- **Admin purchases**: entry time per used ticket, "Entradas" section in "Ver datos", and an
  "Ingresaron" stats card.
- **Mis entradas**: "Usada" badge; "Cancelar" is hidden once a ticket was used.

### Database (local only — do not push to the remote project from this PR)
Migration `20261008120000_evento_tickets_checkin.sql`:
- `evento_tickets.ingreso_at` / `ingreso_por`, two checks (a used ticket must be `activa`) and an
  index on `(evento_id, ingreso_at)`. No backfill.
- `registrar_ingreso_evento`, `revertir_ingreso_evento`, `resumen_ingresos_evento`:
  `security definer`, staff of the tenant only, revoked from `public` and `anon`.
- `cancelar_compra_evento` re-created with one new guard (used ticket → `CANCELACION_NO_PERMITIDA`).
- No new tables or policies. Clients still cannot write `evento_tickets`.

### Dependencies
- `qr-scanner` ^1.4.2 (MIT).

### How it was tested
- SQL (local, rolled back): 20 checks pass — every result, code normalization, revert and
  re-scan, author name, direct write denied, used ticket cannot be voided, cancel of a used
  purchase, and permission errors for a member, staff of another tenant and `anon`.
- Concurrency: two real sessions scanning the same code → one `ok`, one `ya_ingreso`.
- Browser (local, as trainer and as admin): event selector, manual check-in, repeated code,
  undo from the card, other-event and malformed codes, list filter, register and revert from
  the list, menu entries for both roles, admin action, purchases page, member redirect,
  non-UUID redirect, camera-unavailable fallback, and the 390 px layout.
- `npx tsc --noEmit` passes. ESLint passes on every file of this change; `npm run lint` still
  reports 17 errors and 18 warnings in 31 files this change does not touch.

### Not tested
- **Scanning with a real camera.** It needs a phone over HTTPS (for example through a tunnel).
  Only the camera-unavailable path was exercised.
- **"Usada" badge on screen.** The buyer's read of `ingreso_at` was checked through RLS in SQL,
  but "Mis entradas" was not opened as a buyer with a used ticket.
- A `pendiente` or `anulada` code in the browser (covered by the SQL checks).

### Out of scope
Offline check-in, re-entry or an entry log, signed QR codes, notifications.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
