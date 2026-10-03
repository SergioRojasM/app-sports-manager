## 1. Branch

- [x] 1.1 Create branch `feat/event-ticket-checkin` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Database (local only)

- [x] 2.1 Create `supabase/migrations/20261008120000_evento_tickets_checkin.sql`:
  - add `evento_tickets.ingreso_at timestamptz` and `ingreso_por uuid references auth.users(id) on delete set null`;
  - add checks `evento_tickets_ingreso_ck` and `evento_tickets_ingreso_por_ck`;
  - add index `idx_evento_tickets_evento_ingreso`;
  - add column comments.
- [x] 2.2 In the same migration, add `registrar_ingreso_evento(p_evento_id uuid, p_codigo text)`:
  - `security definer`, `search_path = public`;
  - staff check on the event's tenant (`FORBIDDEN` 42501);
  - code normalization and regex check;
  - `select … for update` on `codigo`;
  - the ordered result catalog `no_encontrado → otro_evento → anulada → pendiente → ya_ingreso → ok`, with the author name from `usuarios` (email fallback);
  - the documented return shape.
- [x] 2.3 In the same migration, add `revertir_ingreso_evento(p_ticket_id uuid)`: staff check on the ticket's tenant, `ESTADO_INVALIDO` when there is no entry, clear both columns, return `resultado = 'revertido'`.
- [x] 2.4 In the same migration, add `resumen_ingresos_evento(p_evento_id uuid)`: staff check, return `{activas, ingresaron, pendientes_pago}`.
- [x] 2.5 For all three functions, `revoke all … from public, anon` and `grant execute … to authenticated`.
- [x] 2.6 Re-create `cancelar_compra_evento` from `20261001120100_eventos_compras_rpc.sql` with the used-ticket guard (`CANCELACION_NO_PERMITIDA`) after the estado check. Keep the signature and grants, and diff against the source to confirm that only the guard was added.
- [x] 2.7 Apply to local Supabase only (never push to remote). Run SQL checks:
  - every result of the catalog;
  - normalization (`ev-abcd2345`, `EV ABCD2345`, `ABCD2345`);
  - revert and re-scan;
  - the `ya_ingreso` author name;
  - concurrency (two sessions, one `ok`);
  - `anon` / athlete / other-tenant staff → 42501;
  - a direct `update` on `evento_tickets` denied;
  - the `anulada` update on a used ticket failing the check;
  - cancelling a used purchase → `CANCELACION_NO_PERMITIDA`.

## 3. Pages

- [x] 3.1 Create `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/page.tsx`: `getCachedTenantAccess` role guard (`administrador` | `entrenador`, else redirect to `/portal/orgs/{tenantId}`), render `ControlIngresoEventosPage`.
- [x] 3.2 Create `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/[evento_id]/page.tsx`: same guard, plus a UUID check that redirects to `/control-ingreso`; render `ControlIngresoPage`.

## 4. Components

- [x] 4.1 `src/components/portal/control-ingreso/ControlIngresoEventosPage.tsx`: the management list view (`useGestionEventos` with `excluirBorradores` + `proximosDesdeHoy`, `EventosToolbar` without the view switcher or "Borrador", `EventosTable` with `renderAcciones`): "Control de ingreso" link for `confirmado` events, "Evento cancelado" otherwise; loading, error-with-retry, empty ("No hay eventos para controlar ingreso.") and no-match states.
- [x] 4.2 `src/components/portal/control-ingreso/IngresoResumenHeader.tsx`: event name and date, "Ingresaron X / Y", progress bar.
- [x] 4.3 `src/components/portal/control-ingreso/QrScanner.tsx`:
  - import `qr-scanner` inside an effect, using the rear camera with the scan region highlighted;
  - camera off by default: "Habilitar lectura de QR con cámara" starts it, "Desactivar cámara" stops it; a labelled region;
  - stop on unmount and on `visibilitychange`;
  - `onDetect` / `onError` callbacks.
  - Used through `next/dynamic({ ssr: false })` from `ControlIngresoPage`.
- [x] 4.4 `src/components/portal/control-ingreso/CodigoManualForm.tsx`: labelled input, Enter submits, client normalization and format check, `inputRef` for focus.
- [x] 4.5 `src/components/portal/control-ingreso/IngresoResultadoCard.tsx`:
  - `role="status"` / `aria-live="assertive"`, icon + label + tone from `ingresoResultadoMeta`;
  - attendee, ticket and code details;
  - "Deshacer ingreso" on `ok` / `ya_ingreso`, and "Siguiente".
- [x] 4.6 `src/components/portal/control-ingreso/RevertirIngresoModal.tsx` on `EventoModalShell`, with an inline error.
- [x] 4.7 `src/components/portal/control-ingreso/AsistentesIngresoTable.tsx`:
  - search, filter *Todos / Ingresaron / Pendientes de ingreso*, 20 rows per page, stacked below `md`;
  - "Registrar ingreso" / "Revertir" per row with their own pending state;
  - loading, error-with-retry and empty states.
- [x] 4.8 `src/components/portal/control-ingreso/ControlIngresoPage.tsx`: compose the header, scanner (dynamic), manual form, result card, inline RPC error with "Reintentar", and attendee list. Focus the manual input when the camera fails.
- [x] 4.9 `src/components/portal/control-ingreso/index.ts` barrel.
- [x] 4.10 `src/components/portal/gestion-eventos/EventoActionsMenu.tsx`: "Control de ingreso" (`qr_code_scanner`) after "Ver compras", only for published `confirmado` events.
- [x] 4.11 `src/components/portal/gestion-eventos/compras/EventoComprasStats.tsx`: "Ingresaron X / Y" card. In `EventoComprasTable.tsx` and `CompraDatosModal.tsx`, show "Ingresó {d MMM HH:mm}" (Bogotá) or "Sin ingreso" per ticket.
- [x] 4.12 `src/components/portal/mis-entradas/MiCompraCard.tsx`: "Usada" badge per used ticket; hide "Cancelar" when any ticket has `ingresoAt` (update `puedeCancelarCompra` or its caller).
- [x] 4.13 `src/components/portal/PortalBreadcrumb.tsx`: `control-ingreso` → "Control de ingreso"; the event UUID under it → "Evento".

## 5. Hooks

- [x] 5.1 `src/hooks/portal/gestion-eventos/useGestionEventos.ts`: options `excluirBorradores` and `proximosDesdeHoy` ("Próximos" from today 00:00 Bogotá) for the check-in selector. `EventosToolbar`: optional `vista` / `onVistaChange`, `ocultarBorrador`. `EventosTable`: `renderAcciones`, which also hides Visibilidad and Activo.
- [x] 5.2 `src/hooks/portal/control-ingreso/useControlIngreso.ts`:
  - `resumen`, `resultado`, `pending`, `error`;
  - `registrar(codigo)` with the 3 s same-code skip and a lock while pending or showing a result;
  - `revertir(ticketId)`;
  - `siguiente()`, the 4 s auto-dismiss for `ok`, vibration;
  - refresh of the summary and the list after each change.
- [x] 5.3 `src/hooks/portal/control-ingreso/useAsistentesIngreso.ts`: load `listAsistentesEvento`, search, filter, paging, `reload`.
- [x] 5.4 `src/hooks/portal/gestion-eventos/useEventoCompras.ts`: load `resumenIngresos` together with the list for the stats card.

## 6. Lib and services

- [x] 6.1 Run `npm i qr-scanner`.
- [x] 6.2 Create `src/lib/portal/eventos-ingreso.utils.ts`: `normalizarCodigoTicket`, `esCodigoTicketValido` (same regex as the RPC), `ingresoResultadoMeta` (tone, icon, label builder per result), `formatIngresoHora` (Bogotá).
- [x] 6.3 In `src/services/supabase/portal/eventos-compras.service.ts`, add:
  - `registrarIngreso(eventoId, codigo)` (normalizes first);
  - `revertirIngreso(ticketId)`;
  - `resumenIngresos(eventoId)`;
  - `listAsistentesEvento(eventoId)`.

  Map their errors through `mapCompraError`.
- [x] 6.4 Same service: add `ingreso_at` to the ticket selects of `listComprasEvento` and `listMisCompras`, and map it to `ingresoAt`.

## 7. Types

- [x] 7.1 `src/types/portal/eventos-compras.types.ts`: `IngresoResultadoCodigo`, `IngresoResultado`, `ResumenIngresos`, `AsistenteIngreso`, plus `ingresoAt: string | null` on the ticket shapes of `CompraAdminItem` and `MiCompra`.
- [x] 7.2 `src/types/portal.types.ts`: "Eventos Check-in" menu item (`qr_code_scanner`), after "Eventos" for `administrador` and after "Reservas" for `entrenador`.

## 8. Verification

- [x] 8.1 Manual, with the app running locally:
  - a free purchase → PDF → `/control-ingreso/{evento}` as trainer → manual code → green;
  - re-submit → amber "Ya ingresó";
  - undo → counter decreases;
  - `pendiente`, `anulada`, other-event and unknown codes;
  - a `usuario` member is redirected;
  - the sidebar entries for each role.
- [x] 8.2 Camera: scan the PDF QR from a phone over HTTPS (tunnel). Deny the permission, then confirm the fallback message and the manual input focus.
- [x] 8.3 Purchases page shows the entry time and the "Ingresaron" card. "Mis entradas" shows "Usada" and hides "Cancelar".

## 9. Documentation and delivery

- [x] 9.1 Update `projectspec/03-project-structure.md`: the `(shared)/control-ingreso` routes, the `control-ingreso` component slice, the hooks, the new service functions and utils, the `evento_tickets` columns and RPCs, the menu and breadcrumb entries, and the purchases / "Mis entradas" updates.
- [x] 9.2 Run typecheck (`npx tsc --noEmit`), lint (`npm run lint`) and tests, if any. Do not build.
- [x] 9.3 Write the commit message and PR description.
