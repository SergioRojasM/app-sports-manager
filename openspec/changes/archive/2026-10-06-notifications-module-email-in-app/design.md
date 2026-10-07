## Context

US-0125 (`projectspec/userstory/us0125-notifications-module-email-in-app.md`) asks for a cross-cutting notifications module whose first consumer is event ticket purchases.

Current state, verified against the code:
- No application email. Resend is only the SMTP provider behind Supabase Auth. There is no `resend` dependency and no `RESEND_API_KEY`.
- `_encolar_notificacion(p_compra_id, p_tipo)` (`20261001120100_eventos_compras_rpc.sql:100`) fills `evento_notificaciones`, which nothing reads. It has 7 live call sites, in `finalizar_compra_evento`, `reenviar_comprobante_compra_evento`, `validar_compra_evento` (same migration), `iniciar_compra_evento` (`20261007120000`) and `cancelar_compra_evento` (`20261008120000`).
- The header bell in `PortalHeader.tsx` is a static button. The legacy `public.notificaciones` table is unused and its policy lets every authenticated user read every row.
- The ticket PDF is drawn in the browser by `descargarEntradasPdf`; only `doc.save()` is browser-specific.
- `pg_cron` is enabled with 4 jobs; `pg_net` is not. There are no Edge Functions, no Realtime usage and no test runner. Hosting is Vercel; production origin `https://www.grit-arena.com`.
- Reusable pieces: `createServiceClient()` (`src/services/supabase/server.ts`), `jsonNoStore` / `methodNotAllowed` / `getAppUrl` (`src/lib/portal/privileged-route.ts`), `logAuditEvent` (`src/lib/portal/audit-log.ts`), `formatCop` / `formatEventoFecha` / `formatEventoHora` (`src/lib/portal/eventos.utils.ts`).

Constraints: migrations are applied locally only, never pushed to the remote project; UI components need an approved design first; type-check and lint must pass, `build` is never run.

## Goals / Non-Goals

**Goals:**
- One way to send an email and/or an in-app notification from any module's RPC.
- Buyers receive their ticket by email; administrators learn about purchases by email and in the portal.
- Notification work never fails or slows a business transaction.
- At-least-once email delivery with bounded retries and no duplicates in the normal path.
- Zero cost when idle and no behaviour change in local setups without configuration.

**Non-Goals:**
- Preferences, unsubscribe, bounce handling, push, toasts, an admin screen for failures, i18n, a test runner, notifications for other modules.
- Editing the purchase RPC bodies or their results.

## Decisions

### Architecture

```
purchase RPC ──> _encolar_notificacion()
                   ├─> _notificar_email()  ──> notificaciones_outbox
                   └─> _notificar_in_app() ──> notificaciones ──Realtime──> NotificacionesBell

notificaciones_outbox ── after-insert trigger (pg_net) ──┐
pg_cron every minute, only when rows are due ────────────┴─> POST /api/internal/notificaciones/despachar
                                                               └─> despacharNotificaciones()
                                                                     reclamar → registro → handler → Resend → resolver
```

UI layering (page → component → hook → service → types):

```
src/app/portal/notificaciones/page.tsx
  └─ NotificacionesPage ─┐
PortalHeader             ├─ useNotificaciones ── notificacionesService ── notificaciones.types
  └─ NotificacionesBell ─┘        (browser client: select, RPCs, Realtime channel)
       └─ NotificacionesPanel └─ NotificacionItem
```

### D1. Transactional outbox in Postgres, dispatched by a Next.js route
The RPC only inserts rows, in its own transaction; sending happens later. The alternative of calling Resend from the client or from a server action after the RPC would lose emails when the browser closes and cannot cover staff-triggered transitions uniformly. Supabase Edge Functions were rejected because the project has none, and the PDF code (jsPDF, `qrcode`, shared formatters) already lives in the Next.js codebase.

### D2. `pg_net` trigger plus `pg_cron`, instead of Vercel Cron or polling
The statement-level insert trigger gives near-immediate delivery; `pg_net` queues the request and sends it after commit, so the RPC is not blocked and the rows are visible to the dispatcher. The every-minute cron job covers retries and lost calls, and only calls out when a due row exists, so idle cost is zero. Vercel Cron alone would add up to a minute of latency (or be unavailable at that frequency on the current plan) and would run even when idle.

`_disparar_despacho()` wraps everything in an exception handler and does nothing when the Vault secrets are missing, so local setups and a broken dispatcher never affect purchases.

### D3. Dispatcher secret in Supabase Vault and in a server env variable
The database authenticates with a bearer secret read from Vault (`notificaciones_dispatch_secret`), and the route compares it with `NOTIFICACIONES_DISPATCH_SECRET` using `crypto.timingSafeEqual`. The URL is also a Vault secret (`notificaciones_dispatch_url`), so no origin is hard-coded in a migration. The route lives under `src/app/api/internal/` to separate machine-to-machine endpoints from the user-session routes under `api/portal`.

### D4. Claim with `for update skip locked`, resolve per row
`reclamar_notificaciones_outbox` marks rows `procesando`, so two concurrent dispatcher calls (trigger and cron) never send the same row. Rows stuck in `procesando` for 10 minutes are reclaimed, which covers a function timeout. Resolution is per row, so one bad row does not block a batch. Retries: 1 min, 5 min, 30 min, 2 h, then `error`.

A reclaimed row could be sent twice if the first attempt reached Resend but was never resolved; the outbox row id is passed as Resend `Idempotency-Key` to close that gap within Resend's idempotency window.

### D5. Batches of 20, sent serially
Serial sending stays under Resend's rate limit without a limiter, and 20 rows with PDF generation fit in the 60-second function budget. The `net.http_post` timeout is 55 s. If more rows are due, the next cron tick continues.

### D6. Handler registry keyed by `modulo.tipo`
`registro.ts` maps `eventos.compra_recibida` and the rest to handlers that return `{ asunto, html, texto, adjuntos }` or `null`. Adding a module means adding a file under `src/lib/notificaciones/modulos/` and registering it; the dispatcher does not change. Templates are plain TypeScript functions over one shared layout rather than React Email, to avoid a second new dependency for five simple emails.

### D7. Handlers read current data; the payload is a fallback snapshot
Buyer handlers load the purchase, tickets and events with the service-role client at send time. The PDF must reflect the current ticket state (a retry after validation should not send a "pending" ticket as if it were current), and the payload stays small. If the purchase no longer exists the handler returns `null` and the row is failed as `skipped`.

### D8. Keep `_encolar_notificacion`'s signature
Rewriting only the helper leaves the 7 call sites and three migrations of RPC bodies untouched, which keeps the change small and avoids re-declaring large functions.

### D9. "Confirmed without staff action" is detected with `validado_at = now()`
Administrators must be notified of confirmations that no staff member performed. The helper cannot see who called it, and `validado_por is null` is wrong: `validar_compra_evento(false)` sets `validado_por`, and `reenviar_comprobante_compra_evento` does not clear it, so an auto-confirmed re-upload would be missed. `validar_compra_evento` sets `validado_at = now()` in the same transaction that calls the helper, and `now()` is the transaction timestamp, so `validado_at is distinct from now()` identifies every non-staff confirmation exactly. The alternative, adding a parameter, would mean editing the call sites (against D8).

### D10. Drop and recreate `public.notificaciones`
The legacy table has no `tenant_id`, no link, a `tipo` check limited to four values and an open read policy, and it is empty and unused. Recreating it is simpler and safer than a chain of `alter` statements. Writes go only through SECURITY DEFINER functions; clients get `select` on their own rows.

### D11. Realtime `postgres_changes` for the bell
Realtime honours RLS, so a user only receives own rows; the channel also filters by `usuario_id`. The list is reloaded on reconnect and on tab focus, because events missed while disconnected are not replayed. Polling was rejected as slower and costlier for an always-mounted header.

The hook gets the user id from `supabase.auth.getUser()` on the browser client, because `PortalHeader` only receives `PortalDisplayProfile` (no id). This avoids changing `portal/layout.tsx` and the header props.

### D12. One shared PDF builder
`construirEntradasPdf(tickets)` returns the jsPDF document; the browser calls `save()`, the server calls `output('arraybuffer')`. A single code path guarantees the emailed ticket matches the downloaded one. `jspdf` and `qrcode` stay as dynamic imports so page bundles do not grow.

### D13. Audit log reuse
`AuditEvent` gains `notificacion_enviada` and `notificacion_fallida`, and `tenant_id` / `actor_id` become nullable (the dispatcher has no actor; an outbox row may have no tenant). The type still cannot represent an email address, which preserves the "no PII in logs" guarantee.

### D14. UI design gate
The artifacts specify behaviour, accessibility and copy. The first UI task produces the visual design of the bell badge, panel and page (grit-arena-v2 tokens, existing `Grit*` components) and waits for approval; the backend tasks do not depend on it.

Approved design (2026-10-06, "Compact panel" sketch): cyan pill badge on the bell; 360px glass dropdown in the style of the avatar menu; each item shows a dot and a "Nueva" label when unread, the title, a two-line message and the relative time; footer link "Ver todas". The history page is a `GritPageHeader` with "Marcar todas como leídas", one `GritCard` list of the same items, and "Anterior / Página X de Y / Siguiente".

## Risks / Trade-offs

- [The new table name `notificaciones` reuses a legacy name] → The migration drops the table and its policy explicitly; `grep` confirms no code reads it.
- [Dropping `evento_notificaciones` discards pending rows] → Intended: they are stale notices that were never meant to be sent. The OpenSpec delta records it.
- [Guest emails are unverified addresses] → Emails contain only that purchase's data and the ticket the guest could already download.
- [Resend outage or rate limiting] → Retry schedule over about 2.5 hours, then `error`; rows are inspectable and can be reset by hand.
- [Duplicate email when a response is lost] → Resend idempotency key equal to the outbox id.
- [jsPDF on Node behaves differently from the browser] → The drawing code uses no DOM API; verify the server PDF visually during manual testing, including accents and the QR.
- [Vercel function timeout with large batches] → 20 rows per call, 60 s `maxDuration`, stuck rows reclaimed after 10 min.
- [`pg_net` unavailable or misconfigured remotely] → The trigger function swallows errors; emails wait in `pendiente` and the in-app notifications still work.
- [Realtime connection limits] → One channel per tab, removed on unmount.
- [Administrators who also buy get two notifications] → Accepted; they are different roles of the same person.
- [Every administrator of a tenant gets an email per purchase, with no opt-out] → Accepted for this phase; preferences are a non-goal.
- [No automated tests] → The acceptance criteria are covered by a manual test checklist in the tasks.

## Migration Plan

Local:
1. Apply `20261009120000_notificaciones_modulo.sql` with `npx supabase db reset`. Without Vault secrets nothing is dispatched; call the route by hand with the bearer secret to test.

Remote (manual, by the project owner; not part of the implementation):
1. Create a Resend API key with sending access for `grit-arena.com`.
2. Set `RESEND_API_KEY`, `EMAIL_FROM` (`GRIT Arena <no-reply@grit-arena.com>`) and `NOTIFICACIONES_DISPATCH_SECRET` in Vercel and deploy.
3. Enable `pg_net` and store `notificaciones_dispatch_url` (`https://www.grit-arena.com/api/internal/notificaciones/despachar`) and `notificaciones_dispatch_secret` in Vault.
4. Apply the migration.

Deploying the application before the migration is safe: the route finds nothing to claim only once the functions exist, and nothing calls it before step 3.

Rollback: unschedule `despachar-notificaciones` and delete the Vault secrets to stop sending immediately. A full rollback restores `_encolar_notificacion` and `evento_notificaciones` from `20261001120000` / `20261001120100` and drops the new objects.

## Open Questions

- Should administrators in `inactivo`, `suspendido` or `mora` be excluded? The story only excludes `pendiente_activacion`; this design follows it.
- The guest checkout copy still says the ticket must be downloaded. It remains true, but could later mention the email; left unchanged here.
