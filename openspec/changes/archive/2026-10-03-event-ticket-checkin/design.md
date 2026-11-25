## Context

- `evento_tickets` (US-0121, `20261001120000_eventos_compras.sql`) has a unique `codigo` (`EV-` + 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, made by `_generar_codigo_ticket()`) and an `estado` of `pendiente | activa | anulada`. Clients can only `select` it: the owner or tenant staff can read it, and all writes go through `security definer` RPCs.
- The ticket PDF (`src/lib/portal/eventos-ticket-pdf.ts`) encodes the plain `codigo` in a QR code, and only for `activa` tickets.
- Staff checks in RPCs use `get_trainer_or_admin_tenants_for_authenticated_user()`, as in `validar_compra_evento`.
- `cancelar_compra_evento` (only defined in `20261001120100_eventos_compras_rpc.sql`) is the only transition that moves `activa` tickets to `anulada`. `validar_compra_evento(false)` and expiry only void `pendiente` tickets.
- The `(shared)` route group admits any tenant member with a role, including `usuario`. Trainers have no events menu today.
- `eventosService.listEventos(tenantId, {desde, hasta})` filters on `fecha_hora`, which excludes undated events.
- Staff names live in `public.usuarios (nombre, apellido)`.
- No mockup exists. The UI reuses grit-arena-v2 tokens, `EventoModalShell` and the `EventoComprasTable` / `EventoComprasStats` layouts.

## Goals / Non-Goals

**Goals:**
- Fast, unambiguous door check-in from a phone: camera or manual entry, one entry per ticket, undo.
- Correct when several devices scan at the same time.
- Only the tenant's admins and trainers can check in, and other tenants' codes reveal nothing.

**Non-Goals:**
- Offline mode, re-entry or an entry log, signed QR codes, notifications.
- Changing payment validation, the checkout or the PDF.

## Decisions

### Architecture (page → component → hook → service → types)

```
(shared)/control-ingreso/page.tsx ── role guard ──► ControlIngresoEventosPage ─► useGestionEventos({excluirBorradores, proximosDesdeHoy}) + EventosToolbar + EventosTable(renderAcciones)
(shared)/control-ingreso/[evento_id]/page.tsx ── role guard + UUID ──► ControlIngresoPage
   ├─ IngresoResumenHeader ◄────────────── useControlIngreso.resumen ◄── resumenIngresos ──► rpc resumen_ingresos_evento
   ├─ QrScanner (dynamic, ssr:false) ─┐
   ├─ CodigoManualForm ───────────────┴─► useControlIngreso.registrar(codigo) ─► registrarIngreso ─► rpc registrar_ingreso_evento
   ├─ IngresoResultadoCard ── "Deshacer" ─► useControlIngreso.revertir(ticketId) ─► revertirIngreso ─► rpc revertir_ingreso_evento
   └─ AsistentesIngresoTable ◄─ useAsistentesIngreso ◄─ listAsistentesEvento (select evento_tickets, RLS staff)
          └─ RevertirIngresoModal
types: eventos-compras.types.ts (IngresoResultado, ResumenIngresos, AsistenteIngreso)
lib:   eventos-ingreso.utils.ts (normalizarCodigoTicket, esCodigoTicketValido, ingresoResultadoMeta)
```

### 1. Store entry on the ticket row, not in a new table
`ingreso_at timestamptz` + `ingreso_por uuid` on `evento_tickets`. One entry per ticket means one nullable timestamp is enough. The row lock on the ticket makes the "first scan wins" rule trivial.

Alternative: an `evento_ticket_ingresos` log table. Rejected for now: re-entry and audit are non-goals. It can be added later without breaking these columns.

Constraints:
- `ingreso_at is null or estado = 'activa'`: a used ticket cannot be `pendiente` or `anulada`.
- `ingreso_at is not null or ingreso_por is null`: no author without an entry. The reverse case is allowed, because `ingreso_por` is `on delete set null`.

### 2. Business outcomes as data, authorization as exceptions
`registrar_ingreso_evento` returns `jsonb {resultado, …}`, where `resultado` is one of:

| `resultado` | Meaning |
|---|---|
| `ok` | Entry recorded |
| `ya_ingreso` | Ticket already used |
| `pendiente` | Payment not validated yet |
| `anulada` | Ticket voided |
| `otro_evento` | Ticket of another event of the tenant |
| `no_encontrado` | Unknown, malformed or other-tenant code |

Only `FORBIDDEN` (42501) is raised. Raising would roll back the transaction and hand the client a generic error, but at the door every outcome is an expected, displayable state.

Alternative: one exception per case, mapped by `mapCompraError`. Rejected: it mixes failures with normal answers, and it would need extra code to return attendee details with a `ya_ingreso`.

### 3. Evaluation order and tenant isolation
The RPC goes through these steps in order:
1. Staff check on the **selected event's** tenant. If it fails, raise `FORBIDDEN`.
2. Normalize the code. If it does not match `^EV-[A-HJ-NP-Z2-9]{8}$`, return `no_encontrado`.
3. Look up the ticket with `select … for update` on the code.
4. If there is no ticket, or its `tenant_id` differs from the event's, return `no_encontrado` without details, so another tenant's code reveals nothing.
5. If the ticket is for another event of the tenant, return `otro_evento` with that event's name. This helps with *Múltiple* bundles.
6. If the ticket is `anulada`, return `anulada`. If it is `pendiente`, return `pendiente`.
7. If `ingreso_at` is already set, return `ya_ingreso` with the author's name from `usuarios`, joined as `nombre || ' ' || apellido`, falling back to the email.
8. Otherwise write the entry and return `ok`.

### 4. Concurrency through the row lock
`for update` on the ticket serializes concurrent scans of the same code: the second transaction waits, then reads `ingreso_at` already set and returns `ya_ingreso`. No advisory lock or unique index is needed.

### 5. Code normalization in two places
- **Client** (`normalizarCodigoTicket`): trim, uppercase, remove spaces and inner hyphens, then add the `EV-` prefix when 8 valid characters are left. It also skips a request when the format is invalid, so the card shows `no_encontrado` locally.
- **RPC**: repeats the same normalization, so direct callers and USB scanners with odd keyboard layouts get the same result.

### 6. Undo
`revertir_ingreso_evento(p_ticket_id)`:
- runs the staff check on the ticket's tenant;
- raises `ESTADO_INVALIDO` when `ingreso_at is null`, which the existing mapping turns into "La compra cambió de estado. Recarga la página.";
- otherwise clears both columns and returns `{resultado: 'revertido', …}`.

### 7. Counters RPC instead of a client count
`resumen_ingresos_evento` returns `{activas, ingresaron, pendientes_pago}` in one query, using the `(evento_id, ingreso_at)` index. A client count over RLS would need three requests.

### 8. Cancellation guard
`cancelar_compra_evento` is replaced (same signature). After the estado check, it raises `CANCELACION_NO_PERMITIDA` if any ticket of the purchase has `ingreso_at`. This also means the `→ anulada` update never meets a used ticket, so the check constraint never fires there. `validar_compra_evento` and expiry are unchanged, because they only touch `pendiente` tickets.

### 9. Routes under `(shared)` with a page-level guard
- Trainers need access, and `(administrador)` would redirect them. So the pages go under `(shared)`.
- Because `(shared)` also admits `usuario`, each page calls `getCachedTenantAccess` and redirects to `/portal/orgs/{tenantId}` unless the role is `administrador` or `entrenador`.
- The `[evento_id]` page also redirects on a non-UUID id.
- The RPCs are the real security boundary.

Alternative: a new `(staff)` group with its own layout. Rejected: it adds a group for one feature, and the guard is two lines.

### 10. Event selector reuses the management list view
The selector is the same list view as "Eventos" (requested by the user): `useGestionEventos`, `EventosToolbar` and `EventosTable`, with three small extensions instead of a copy.
- `useGestionEventos(tenantId, { excluirBorradores, proximosDesdeHoy })`. Drafts are dropped from the data set. "Próximos" counts from today 00:00 America/Bogotá instead of from now: in management an event that started an hour ago is "past", but at the door that is exactly the event being checked in.
- `EventosToolbar`: `vista` / `onVistaChange` are optional (no view switcher), and `ocultarBorrador` removes the "Borrador" estado option.
- `EventosTable`: a `renderAcciones(evento)` prop replaces the admin actions menu. In that mode the management-only columns (Visibilidad, Activo) are hidden, because the wider "Control de ingreso" button would otherwise fall outside a 1280 px viewport.

The action is offered for `confirmado` events only, matching the admin menu. Cancelled events are listed (the Estado filter applies) with "Evento cancelado".

Alternative: a separate table component for the selector. Rejected: it would duplicate the table, the paging and the filters and drift from the management view.

### 11. QR scanning with `qr-scanner`
`qr-scanner` (nimiq) runs its decoding in a Web Worker and works on iOS Safari.
- `QrScanner.tsx` is loaded through `next/dynamic({ ssr: false })` and imports the library inside an effect.
- The camera is **off by default** (requested by the user). The panel shows "Habilitar lectura de QR con cámara"; the library is imported and the permission is requested only after that click. While on, "Desactivar cámara" turns it off. The panel is compact while off and becomes a full viewfinder while on.
- It uses `preferredCamera: 'environment'` and `highlightScanRegion`.
- On decode, it calls `onDetect(codigo)`. The hook skips the same code for 3 s and ignores input while a request is pending or a result is shown.
- The scanner stops on unmount and on `visibilitychange` → hidden, and resumes on visible.
- If camera permission is denied or no camera exists after the click, it shows the camera message, keeps the enable button to retry, and calls `onError`, and the page focuses the manual input.

Alternatives:
- Native `BarcodeDetector`: no iOS support.
- `html5-qrcode`: larger and bundles its own UI.
- `@zxing/browser`: heavier, and we only need QR.

### 12. Result presentation
`ingresoResultadoMeta(resultado)` maps each result to its tone (`success | warning | danger`), its Material icon and its Spanish label.
- `IngresoResultadoCard` has `role="status"` and `aria-live="assertive"`.
- "Deshacer ingreso" is shown for `ok` and `ya_ingreso`.
- `ok` auto-dismisses after 4 s. Other results stay until "Siguiente".
- `navigator.vibrate` is called when available: `[80]` for `ok`, `[80, 60, 80]` otherwise.

### 13. Attendee list
`listAsistentesEvento` selects `id, codigo, asistente_nombre, asistente_email, ingreso_at, compra:evento_compras(entrada_nombre)` where `evento_id` matches and `estado = 'activa'`. Search, filter and 20-row paging happen on the client, since one event's tickets are a small set. After every register or revert, `useControlIngreso` refreshes the counters and the list.

### 14. Existing screens
- `listComprasEvento` and `listMisCompras` add `ingreso_at` to the ticket selects, as `ingresoAt` on the ticket shapes.
- `EventoComprasStats` gets an "Ingresaron" card from `resumenIngresos`.
- `MiCompraCard` shows "Usada", and `puedeCancelarCompra` also requires no used ticket, matching the RPC.

## Risks / Trade-offs

- [Camera requires HTTPS, so it cannot be tested on a phone against `localhost`] → Manual entry always works. Document testing through a tunnel.
- [A screenshot shared before entry can be used once by whoever arrives first] → This is inherent to plain codes. `ya_ingreso` shows the time and author so staff can handle it at the door. Signed or rotating codes are out of scope.
- [Undo leaves no trace] → Accepted for v1. The log table is the planned extension.
- [Client filtering of events loads all tenant events] → Same as the management list today. Add a server filter if it grows.
- [`usuario` members reach the `(shared)` layout] → The page guard redirects them, and the RPCs reject them anyway.
- [Clock: `ingreso_at` uses the server clock] → Consistent across devices. It is displayed in America/Bogotá.

## Migration Plan

1. `supabase/migrations/20261008120000_evento_tickets_checkin.sql`: columns + constraints + index, the three RPCs with `revoke … from public, anon` / `grant execute … to authenticated`, and the `cancelar_compra_evento` replacement. Apply **locally only** (`supabase db reset` / `migration up`). Never push to the remote project from this change.
2. No backfill: existing tickets start with `ingreso_at = null`.
3. Rollback: drop the three functions, restore the previous `cancelar_compra_evento` body, and drop the columns and index.

## Open Questions

None. Design reuse, roles, input method and single entry were confirmed with the user.
