Tasks are listed page → component → hook → service → types. Groups 3 and 4 need the design approved in group 2; groups 5 to 11 do not depend on it.

## 1. Branch setup

- [x] 1.1 Create the branch `feat/notifications-module` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Design approval

- [x] 2.1 Produce the visual design of the bell badge, the dropdown panel (item, unread marker, empty, error, loading) and the `/portal/notificaciones` page, using grit-arena-v2 tokens and existing `Grit*` components
- [x] 2.2 Get the design approved by the product owner and record its reference (sketch, `.pen` node or HTML) in `design.md` under D14. Do not start groups 3 and 4 before this

## 3. Page

- [x] 3.1 Create `src/app/portal/notificaciones/page.tsx` as a thin page rendering `NotificacionesPage` (authentication comes from the portal shell layout)

## 4. Components

- [x] 4.1 `src/components/portal/notificaciones/NotificacionItem.tsx`: title, message, relative time (`es-CO`), unread marker with text or icon (not colour alone); renders as a button calling `onSelect(notificacion)`
- [x] 4.2 `NotificacionesPanel.tsx`: 10 latest items, "Marcar todas como leídas" (disabled with 0 unread), "Ver todas" → `/portal/notificaciones`, loading state, empty state "No tienes notificaciones", inline `role="alert"` error with "Reintentar"
- [x] 4.3 `NotificacionesPanel.tsx`: close on `Escape` and outside click, return focus to the bell, keyboard navigation through the items
- [x] 4.4 `NotificacionesBell.tsx`: bell button with `aria-label` including the unread count, `aria-haspopup`, `aria-expanded`; badge hidden at 0, exact number 1–9, `9+` above 9; `aria-live="polite"` region announcing new notifications; owns the panel open state; uses `useNotificaciones`
- [x] 4.5 `NotificacionesBell.tsx`: on item select, mark read, close the panel and `router.push(url)` when the notification has a `url`
- [x] 4.6 `NotificacionesPage.tsx`: page header, list of `NotificacionItem` newest first, 20 per page with pagination controls (hidden when there is one page), "Marcar todas como leídas", loading, empty and error states
- [x] 4.7 `src/components/portal/notificaciones/index.ts`: barrel
- [x] 4.8 `src/components/portal/PortalHeader.tsx`: replace the static bell button (lines 31-41) with `<NotificacionesBell />`; keep the props unchanged
- [x] 4.9 `src/components/portal/PortalBreadcrumb.tsx`: add `notificaciones: 'Notificaciones'` to `SLUG_LABELS`

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/notificaciones/useNotificaciones.ts` with options `{ limit, paginado? }`; resolve the user id with `supabase.auth.getUser()` on the browser client
- [x] 5.2 Load the list and the unread count; expose `items`, `total`, `noLeidas`, `loading`, `error`, `reload`, and `page` / `setPage` for the paginated mode
- [x] 5.3 Subscribe with `notificacionesService.suscribir`: on insert, prepend the item and increment `noLeidas`; on reconnect, reload. Unsubscribe on unmount
- [x] 5.4 Reload when the tab regains focus (`visibilitychange`)
- [x] 5.5 `marcarLeida(id)` and `marcarTodasLeidas()` with optimistic update and rollback on error
- [x] 5.6 Never throw to the header: on load failure set `error` and keep `noLeidas = 0`

## 6. Service

- [x] 6.1 Create `src/services/supabase/portal/notificaciones.service.ts` exporting `notificacionesService` on the browser client
- [x] 6.2 `listar({ limit, offset })` → `{ items, total }` (`order created_at desc`, `range`, `count: 'exact'`) and `contarNoLeidas()` (`head: true`, `leida = false`)
- [x] 6.3 `marcarLeida(id)` → RPC `marcar_notificacion_leida`; `marcarTodasLeidas()` → RPC `marcar_notificaciones_leidas`
- [x] 6.4 `suscribir(usuarioId, onInsert, onReconnect)`: channel `notificaciones:{usuarioId}`, `postgres_changes` `INSERT` on `public.notificaciones` with filter `usuario_id=eq.{usuarioId}`; call `onReconnect` when the status returns to `SUBSCRIBED` after the first time; return a function that removes the channel

## 7. Types

- [x] 7.1 Create `src/types/portal/notificaciones.types.ts`: `Notificacion`, `NotificacionOutboxRow`, `NotificacionEmail` (`{ asunto, html, texto, adjuntos }`), `NotificacionAdjunto`, `NotificacionHandler` (`(row) => Promise<NotificacionEmail | null>`), `DespachoResultado`

## 8. API route

- [x] 8.1 Create `src/app/api/internal/notificaciones/despachar/route.ts` with `runtime = 'nodejs'` and `maxDuration = 60`
- [x] 8.2 `POST`: return `503` when `NOTIFICACIONES_DISPATCH_SECRET` is unset; compare the bearer token with `crypto.timingSafeEqual` (length-safe) and return `401` on mismatch; otherwise return `jsonNoStore(await despacharNotificaciones(), 200)`
- [x] 8.3 Export `GET`, `PUT`, `PATCH` and `DELETE` returning `methodNotAllowed()`

## 9. Server library

- [x] 9.1 Add the `resend` dependency to `package.json`
- [x] 9.2 `src/lib/notificaciones/resend.ts` (`server-only`): `enviarEmail({ para, asunto, html, texto, adjuntos, idempotencyKey })` → `{ id }`; sender from `EMAIL_FROM`; throw a typed error with a code on provider failure and `resend_not_configured` when `RESEND_API_KEY` is unset (after logging subject and idempotency key, never the address)
- [x] 9.3 `src/lib/notificaciones/plantillas/layout.ts`: `escapeHtml(value)` and `renderLayout({ titulo, cuerpoHtml, cta? })` with inline styles and the GRIT Arena header
- [x] 9.4 `src/lib/notificaciones/modulos/eventos.ts`: loader that reads the purchase, its tickets and their events with `createServiceClient()` and maps them to `TicketPdfData[]`
- [x] 9.5 `modulos/eventos.ts`: buyer handlers `compra_recibida`, `compra_confirmada`, `compra_rechazada`, `compra_cancelada` with the subjects and bodies from the spec; attach `entradas-{codigo}.pdf` to the first two when a non-voided ticket exists; return `null` when the purchase no longer exists
- [x] 9.6 `modulos/eventos.ts`: `compra_nueva_admin` handler (title by `payload.estado`, buyer, ticket, total, link built with `getAppUrl()`), no attachment
- [x] 9.7 `src/lib/notificaciones/registro.ts`: `resolverHandler(modulo, tipo)` over a map keyed `modulo.tipo`, registering the five events handlers
- [x] 9.8 `src/lib/notificaciones/despachador.ts`: `despacharNotificaciones(limite = 20)`: claim with RPC `reclamar_notificaciones_outbox`, then per row resolve handler → render → `enviarEmail` → RPC `resolver_notificacion_outbox`; map missing handler to `handler_not_found` and `null` to `skipped`; catch per row; return `{ procesadas, enviadas, fallidas }`
- [x] 9.9 `src/lib/portal/audit-log.ts`: add `notificacion_enviada` and `notificacion_fallida` to `AuditEvento`; make `tenant_id` and `actor_id` `string | null`; log one event per row from the dispatcher
- [x] 9.10 `src/lib/portal/eventos-ticket-pdf.ts`: extract `construirEntradasPdf(tickets): Promise<jsPDF | null>`; keep `descargarEntradasPdf(tickets, fileName)` calling it and then `save(fileName)`
- [x] 9.11 `.env.example`: add `RESEND_API_KEY`, `EMAIL_FROM` and `NOTIFICACIONES_DISPATCH_SECRET` with comments in the "Server-only" block; add them to `.env.local`
- [x] 9.12 `resend.ts`: development-only transport — when `EMAIL_DEV_MAILPIT_URL` is set and `NODE_ENV` is not `production`, send through the local Mailpit HTTP API instead of Resend; document it in `.env.example`

## 10. Database migration (local only)

- [x] 10.1 Create `supabase/migrations/20261009120000_notificaciones_modulo.sql` wrapped in `begin; ... commit;`
- [x] 10.2 `create extension if not exists pg_net;`
- [x] 10.3 Create `notificaciones_outbox` with its check, the two indexes, RLS enabled, no policies, and `revoke all` from `anon` and `authenticated`
- [x] 10.4 Drop the legacy `public.notificaciones` and recreate it with indexes, RLS, `revoke all`, `grant select` to `authenticated`, the policy `notificaciones_select_own`, and add it to the `supabase_realtime` publication
- [x] 10.5 Create `_notificar_email`, `_notificar_in_app` and `_admins_tenant` (SECURITY DEFINER, `search_path = public`, revoked from `public`, `anon`, `authenticated`)
- [x] 10.6 Rewrite `_encolar_notificacion(uuid, text)` with the same signature: buyer email, buyer in-app when `comprador_usuario_id` is not null, and `compra_nueva_admin` email + in-app per administrator when `p_tipo = 'compra_recibida'` or (`p_tipo = 'compra_confirmada'` and `validado_at is distinct from now()`); payload with the existing keys plus `compra_id` and `tenant_id`; re-apply its `revoke`
- [x] 10.7 Create `reclamar_notificaciones_outbox(int)` and `resolver_notificacion_outbox(uuid, boolean, text, text)` with the retry schedule; grant execute to `service_role` only
- [x] 10.8 Create `marcar_notificacion_leida(uuid)` and `marcar_notificaciones_leidas()`; grant execute to `authenticated` only
- [x] 10.9 Create `_disparar_despacho()` (Vault secrets, `net.http_post`, 55000 ms timeout, catches every exception), `despachar_notificaciones_pendientes()`, and the statement-level `after insert` trigger `notificaciones_outbox_despachar`
- [x] 10.10 Register the cron job `despachar-notificaciones` (`* * * * *`) with the unschedule-then-schedule pattern
- [x] 10.11 `drop table public.evento_notificaciones;`
- [x] 10.12 Apply locally. Applied with `npx supabase migration up` instead of `db reset`, to keep the local test data. Never push the migration to the remote Supabase project

## 11. Verification

- [x] 11.1 Database: RLS — a user selects only own `notificaciones`; direct writes and any access to `notificaciones_outbox` are denied; `marcar_notificacion_leida` with a foreign id changes nothing
- [x] 11.2 Paid purchase: buyer `compra_recibida` row and one `compra_nueva_admin` row and in-app notification per active administrator; none for trainers, athletes or `pendiente_activacion` administrators
- [x] 11.3 Staff validation: buyer `compra_confirmada`, no administrator notification. Free purchase and `omitir_confirmacion_compra`: administrators notified. Rejected purchase re-uploaded on an `omitir_confirmacion_compra` event: administrators notified
- [x] 11.4 Rejection (reason in the email) and cancellation notify only the buyer; a guest purchase creates no buyer in-app row; hold expiry and check-in create nothing
- [x] 11.5 Dispatcher: `401` without a valid bearer, `503` without the secret, `405` on `GET`; authorized call sends pending rows and returns the counts
- [x] 11.6 Emails with a real `RESEND_API_KEY`: sender `no-reply@grit-arena.com`; pending PDF has the "PENDIENTE DE VALIDACIÓN" mark and no QR; confirmed PDF has one page per ticket with a QR that decodes to the `codigo`; a *Múltiple* purchase produces one email with one page per event. Content verified in Mailpit (sender, subjects, pending and QR PDFs, two pages for a Múltiple purchase); Resend accepted the four types sent to its test sink
- [x] 11.7 Retries: with an invalid key, a row goes back to `pendiente` with `intentos` incremented and `proximo_intento_at` moved 1 min, 5 min, 30 min, 2 h, then `error` after the 5th failure; without `RESEND_API_KEY` the error is `resend_not_configured`
- [x] 11.8 Two concurrent dispatcher calls never send the same row; a row left in `procesando` for more than 10 minutes is reclaimed
- [x] 11.9 Without Vault secrets, purchases succeed and no HTTP call is made; with an unreachable URL, purchase RPCs still succeed; the cron makes no call when nothing is due
- [x] 11.10 UI: badge values (0, 1–9, `9+`); real-time arrival as administrator from a purchase in another session; click marks read and navigates; "Marcar todas como leídas"; history pagination and empty state; `Escape`, outside click and focus return; header still renders when the request fails
- [ ] 11.11 Ticket PDF download from the checkout confirmation step and from "Mis entradas" is unchanged
- [x] 11.12 Run `npx tsc --noEmit` and `npm run lint` and fix every error. Do not run `build`

## 12. Documentation and delivery

- [x] 12.1 Update `projectspec/03-project-structure.md`: `api/internal` route, `portal/notificaciones` page, `components/portal/notificaciones`, hook, service, types, `src/lib/notificaciones`, the two tables and functions, the cron job, the env variables; remove `evento_notificaciones` from "Event purchases"
- [x] 12.2 Write the remote rollout checklist in the PR description (Resend key, Vercel variables, `pg_net`, Vault secrets, apply the migration)
- [x] 12.3 Write the commit message and the pull request description
