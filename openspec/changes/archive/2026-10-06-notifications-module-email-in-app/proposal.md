## Why

The application sends no email of its own and has no working in-app notifications. Event purchase RPCs already fill an outbox (`evento_notificaciones`) that nothing consumes, the header bell is a static button, and the legacy `notificaciones` table is unused and readable by every user. Buyers therefore get no proof of purchase outside the portal, and administrators only learn about purchases awaiting validation by opening the purchases page.

This change (US-0125, `projectspec/userstory/us0125-notifications-module-email-in-app.md`) builds one reusable notifications module and applies it first to event ticket purchases, so later modules (bookings, subscriptions, suspensions) can notify without building delivery again.

## What Changes

- New generic email outbox `notificaciones_outbox` with retry, error and provider-id tracking, written only by SECURITY DEFINER helpers.
- New dispatcher: a server route handler claims due outbox rows, renders the email through a handler registry and sends it with Resend. The database triggers it through `pg_net` (on insert and every minute by `pg_cron`).
- New dependency `resend` and three server-only environment variables (`RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICACIONES_DISPATCH_SECRET`).
- **BREAKING** `public.notificaciones` (legacy, unused) is dropped and recreated as the per-user in-app inbox with owner-only RLS and Realtime.
- **BREAKING** `public.evento_notificaciones` is dropped; its pending rows are not migrated and are never sent.
- `_encolar_notificacion(p_compra_id, p_tipo)` keeps its signature and is rewritten to write to the generic module: buyer email, buyer in-app notification, and administrator email + in-app notification. Its 7 call sites are not edited.
- Buyer emails for event purchases attach the ticket PDF, generated on the server. `eventos-ticket-pdf.ts` is refactored so the drawing code is shared by the browser download and the server.
- The header bell becomes functional: unread badge, dropdown panel with the 10 latest notifications, mark-as-read, real-time arrival, and a new page `/portal/notificaciones` with the paginated history.
- The UI (bell, panel, page) is built only after its visual design is approved; this change specifies behaviour and reuses the existing grit-arena-v2 tokens and `Grit*` components.

### Implementation plan (page → component → hook → service → types)

1. Get the design of the bell, panel and notifications page approved.
2. Page: `src/app/portal/notificaciones/page.tsx`.
3. Components: `NotificacionesBell`, `NotificacionesPanel`, `NotificacionItem`, `NotificacionesPage`; wire the bell into `PortalHeader`; breadcrumb label.
4. Hook: `useNotificaciones`.
5. Service: `notificaciones.service.ts` (browser client, Realtime).
6. Types: `notificaciones.types.ts`.
7. Server: `src/lib/notificaciones/*`, the dispatcher route, the PDF refactor and the audit-log events.
8. Database: one migration with tables, functions, trigger, cron and cleanup (local only).
9. Verification, documentation, commit message and PR description, manual remote rollout checklist.

### Files to create or modify

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/notificaciones/page.tsx` | New thin page rendering `NotificacionesPage` |
| Component | `src/components/portal/notificaciones/NotificacionesBell.tsx` | New: bell, badge, panel toggle |
| Component | `src/components/portal/notificaciones/NotificacionesPanel.tsx` | New: dropdown list |
| Component | `src/components/portal/notificaciones/NotificacionItem.tsx` | New |
| Component | `src/components/portal/notificaciones/NotificacionesPage.tsx` | New: full history |
| Component | `src/components/portal/notificaciones/index.ts` | Barrel |
| Component | `src/components/portal/PortalHeader.tsx` | Replace the static bell with `NotificacionesBell` |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Add `notificaciones` → "Notificaciones" to `SLUG_LABELS` |
| Hook | `src/hooks/portal/notificaciones/useNotificaciones.ts` | New |
| Service | `src/services/supabase/portal/notificaciones.service.ts` | New |
| Types | `src/types/portal/notificaciones.types.ts` | New |
| API route | `src/app/api/internal/notificaciones/despachar/route.ts` | New dispatcher endpoint |
| Lib (server) | `src/lib/notificaciones/resend.ts` | New |
| Lib (server) | `src/lib/notificaciones/registro.ts` | New |
| Lib (server) | `src/lib/notificaciones/despachador.ts` | New |
| Lib (server) | `src/lib/notificaciones/plantillas/layout.ts` | New |
| Lib (server) | `src/lib/notificaciones/modulos/eventos.ts` | New |
| Lib | `src/lib/portal/eventos-ticket-pdf.ts` | Extract `construirEntradasPdf` |
| Lib (server) | `src/lib/portal/audit-log.ts` | Add `notificacion_enviada` / `notificacion_fallida`; `tenant_id` and `actor_id` nullable |
| Migration | `supabase/migrations/20261009120000_notificaciones_modulo.sql` | Outbox, inbox, functions, trigger, cron, `pg_net`, drop `evento_notificaciones` |
| Dependency | `package.json` | Add `resend` |
| Env | `.env.example` | Add the 3 variables |
| Docs | `projectspec/03-project-structure.md` | Document the module; remove `evento_notificaciones` |

## Non-goals

- Per-user notification preferences or unsubscribe.
- Resend webhooks (bounces, complaints) and delivery status beyond "accepted by the provider".
- Push notifications and a toast system.
- Notifications for other modules (bookings, subscriptions, suspensions).
- An admin screen for failed deliveries; rows in `error` are inspected in the database.
- i18n; all copy is Spanish.
- Adding a test runner.
- Changing the guest checkout copy that tells guests to download their ticket.
- Applying anything to the remote Supabase project; the remote rollout is a manual checklist.

## Capabilities

### New Capabilities
- `notifications-delivery`: generic email outbox, enqueue helpers, database-triggered dispatcher, retry policy, Resend sending and the handler registry other modules plug into.
- `notifications-inbox`: per-user in-app notifications — table and RLS, mark-as-read RPCs, browser service and hook, header bell, panel and `/portal/notificaciones` page with real-time updates.
- `team-events-purchase-notifications`: which event purchase transitions notify whom (buyer and tenant administrators), the email contents, the ticket PDF attachment and the in-app texts and links.

### Modified Capabilities
- `team-events-purchase-data`: the `evento_notificaciones` table is removed; purchase transitions now enqueue through the generic module and emails are sent.

## Impact

- **Database**: new tables `notificaciones_outbox` and `notificaciones` (recreated); `evento_notificaciones` dropped; `pg_net` extension enabled; one new cron job (`despachar-notificaciones`); Vault secrets `notificaciones_dispatch_url` and `notificaciones_dispatch_secret`; `notificaciones` added to the `supabase_realtime` publication.
- **Server**: first route under `src/app/api/internal/`; first use of the service-role client outside `api/portal`; new `resend` dependency; jsPDF and `qrcode` now also run in Node.
- **Client**: first use of Supabase Realtime in `src/`; the portal header gains data fetching.
- **Operations**: Resend API key with sending access for `grit-arena.com`, three Vercel environment variables, and Vault secrets on the remote project.
- **Existing behaviour**: purchase RPC signatures and results are unchanged; ticket PDF download output is unchanged.
