# US-0125 — Cross-cutting Notifications Module (Email + In-App), First Consumer: Events

## ID
US-0125

## Name
Cross-cutting notifications module: transactional email through Resend and an in-app notification inbox, applied first to event ticket purchases

## As a
- **Ticket buyer** (authenticated user or guest)
- **Organization administrator**
- **Developer** of any other portal module

## I Want
- As a buyer: to receive my ticket by email when I buy it, and to receive the authorized ticket again once my purchase is confirmed.
- As an administrator: to be notified by email and inside the platform of every ticket purchase made for my organization's events.
- As a developer: a single, reusable way to send an email and/or an in-app notification from any module.

## So That
Buyers hold proof of purchase and a valid entry ticket without having to open the portal, administrators react quickly to purchases awaiting payment validation, and future modules (bookings, subscriptions, suspensions) can add notifications without building delivery infrastructure again.

---

## Description

### Current State

- **Email**: the application sends no email of its own. Resend is used only as the SMTP provider behind Supabase Auth (invite, signup confirmation, password reset). There is no `resend` dependency, no `RESEND_API_KEY` and no application email template.
- **Events outbox**: the purchase RPCs call `_encolar_notificacion(p_compra_id, p_tipo)` at 7 live points and fill `public.evento_notificaciones`. **Nothing consumes that table**, it only addresses the buyer, and it has no retry, error or provider-id columns. `_encolar_notificacion` is defined in `supabase/migrations/20261001120100_eventos_compras_rpc.sql:100`; the current bodies of the calling RPCs live in three migrations:
  - `20261001120100_eventos_compras_rpc.sql` — `finalizar_compra_evento` (2 calls), `reenviar_comprobante_compra_evento` (1), `validar_compra_evento` (2)
  - `20261007120000_evento_entradas_metodos_pago.sql` — `iniciar_compra_evento` (1, redefined by US-0130)
  - `20261008120000_evento_tickets_checkin.sql` — `cancelar_compra_evento` (1, redefined by US-0131)
- **In-app**: the bell in `src/components/portal/PortalHeader.tsx:31-41` is a static button with a hard-coded dot (no handler, no data). `PortalHeader` receives `profile: PortalDisplayProfile`, which has no user id. A legacy table `public.notificaciones` exists (`20260221000100_migracion_inicial_bd.sql:374-386`) but is unused, has no `tenant_id` or link column, restricts `tipo` to `reserva|pago|entrenamiento|general`, and its policy is `for select to authenticated using (true)` (any user can read every row).
- **Ticket**: the ticket PDF (jsPDF + `qrcode`) is built only in the browser by `descargarEntradasPdf` in `src/lib/portal/eventos-ticket-pdf.ts` and ends in `doc.save()`. Apart from `doc.save()` the drawing code uses no browser API (`jspdf` and `qrcode` are loaded with dynamic `import()`), so it can run in a Node route handler. Callers: `EventoCompraPasoConfirmacion.tsx` and `mis-entradas/MiCompraCard.tsx`.
- **Infrastructure**: `pg_cron` is enabled (4 jobs); `pg_net` is not. There are no Edge Functions, no Realtime usage in `src/`, no test runner. Deployment target is Vercel (production origin `https://www.grit-arena.com`).

### Proposed Changes

#### Architecture

```
purchase RPC ──> _encolar_notificacion() ──> notificaciones_outbox (email)
                                        └──> notificaciones (in-app) ──Realtime──> header bell
notificaciones_outbox ──insert trigger (pg_net) + pg_cron every minute──>
        POST /api/internal/notificaciones/despachar ──> handler registry ──> Resend (+ PDF attachment)
```

#### Notification matrix for events

| Transition | Buyer | Tenant administrators |
|---|---|---|
| Purchase received (`en_validacion`), including proof re-upload after rejection | Email `compra_recibida` with the ticket PDF marked "PENDIENTE DE VALIDACIÓN" (no QR) + in-app if the buyer has an account | Email + in-app `compra_nueva_admin` ("new purchase awaiting validation") |
| Purchase confirmed by staff (`validar_compra_evento`) | Email `compra_confirmada` with the authorized PDF (QR) + in-app | none |
| Purchase confirmed without staff action (free ticket or `eventos.omitir_confirmacion_compra`) | Email `compra_confirmada` with the authorized PDF + in-app | Email + in-app `compra_nueva_admin` ("new confirmed purchase") |
| Purchase rejected | Email `compra_rechazada` (includes `motivo_rechazo`) + in-app | none |
| Purchase cancelled by buyer | Email `compra_cancelada` + in-app | none |

- "Tenant administrators" = every `miembros_tenant` row of the purchase's tenant joined to `roles` on `rol_id` with `roles.nombre = 'administrador'` and `miembros_tenant.estado <> 'pendiente_activacion'`; the address is `usuarios.email`. Trainers are not notified.
- A *Múltiple* purchase issues one ticket per bundled event: it still produces **one** buyer email (one PDF, one page per ticket, each page with its own event's name, date and place) and notifies only the administrators of the purchase's `tenant_id`.
- Door check-in (US-0131) sends nothing; a used ticket (`ingreso_at` set) is drawn like any other `activa` ticket.
- Guests (no `comprador_usuario_id`) receive email only.
- Expiry of the 30-minute hold sends nothing (unchanged).

#### Email

- Provider: Resend HTTP API through the `resend` npm package. Sender from `EMAIL_FROM`, value `GRIT Arena <no-reply@grit-arena.com>`.
- Templates are plain TypeScript functions returning `{ asunto, html, texto, adjuntos }`, sharing one HTML layout. Copy is Spanish, numbers and dates use `es-CO` and the America/Bogota timezone (`formatCop`, `formatEventoFecha`, `formatEventoHora` from `src/lib/portal/eventos.utils.ts`). Every interpolated value is HTML-escaped.
- Buyer emails attach the ticket PDF generated on the server from the purchase's current rows (not from the outbox payload), one page per non-voided ticket. File name `entradas-{codigo of first ticket}.pdf`.
- The administrator email links to `{APP_URL}/portal/orgs/{tenant_id}/gestion-eventos/{evento_id}/compras`, with the origin taken from `getAppUrl()` in `src/lib/portal/privileged-route.ts`.
- Each send passes the outbox row id as Resend `Idempotency-Key`.
- When `RESEND_API_KEY` is not set (local development), the dispatcher logs subject and outbox id and resolves the row as failed with error `resend_not_configured`; it never throws.

#### Delivery pipeline

- Outbox rows are claimed in batches of at most 20 with `for update skip locked`, sent one by one, and resolved individually.
- Retry schedule on failure: 1 min, 5 min, 30 min, 2 h; after the 5th failed attempt the row stays in `error`.
- Rows stuck in `procesando` for more than 10 minutes are reclaimed.
- The dispatcher is triggered by the database through `pg_net`: immediately after rows are inserted (statement-level trigger) and every minute by `pg_cron`, which only calls when due pending rows exist (zero invocations when idle).
- The dispatcher URL and bearer secret are read from Supabase Vault. When either is missing (default local setup) the trigger function does nothing.

#### In-app notifications

- The header bell shows the real unread count (hidden when 0, `9+` above 9) and opens a panel with the 10 most recent notifications: title, message, relative time, unread marker.
- Clicking a notification marks it read and navigates to its `url`. "Marcar todas como leídas" marks all. "Ver todas" opens `/portal/notificaciones` with the paginated history (20 per page) and an empty state.
- New notifications arrive in real time (Supabase Realtime `postgres_changes`, `INSERT` on `notificaciones` filtered by `usuario_id`). The list is reloaded on channel reconnect and when the tab regains focus.
- Notifications are per user and cross-tenant (the bell lives in the portal shell). The hook resolves the user id with `supabase.auth.getUser()` on the browser client; `PortalHeader` props and `src/app/portal/layout.tsx` are not changed. Buyer notifications link to `/portal/mis-entradas`; administrator notifications link to the event's purchases page.
- A visual design for the bell, panel and page must be approved before building components (rule in `openspec/config.yaml`).

#### Extensibility contract

Adding notifications to another module requires only: (1) calling `_notificar_email` / `_notificar_in_app` from that module's RPC, and (2) registering handlers for `modulo.tipo` in `src/lib/notificaciones/registro.ts`.

---

## Database Changes

One new migration, `supabase/migrations/20261009120000_notificaciones_modulo.sql` (the latest existing one is `20261008120000_evento_tickets_checkin.sql`), wrapped in `begin; ... commit;`. Local only; the remote project is updated manually.

### 1. `public.notificaciones_outbox` (email outbox)

```sql
create table public.notificaciones_outbox (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid references public.tenants(id) on delete cascade,
  modulo                  varchar(40) not null,
  tipo                    varchar(60) not null,
  destinatario_email      varchar(254) not null,
  destinatario_usuario_id uuid references public.usuarios(id) on delete set null,
  entidad_tipo            varchar(40),
  entidad_id              uuid,
  payload                 jsonb not null default '{}'::jsonb,
  estado                  varchar(20) not null default 'pendiente',
  intentos                smallint not null default 0,
  ultimo_error            text,
  proximo_intento_at      timestamptz not null default timezone('utc', now()),
  bloqueada_at            timestamptz,
  proveedor_id            text,
  created_at              timestamptz not null default timezone('utc', now()),
  enviada_at              timestamptz,
  constraint notificaciones_outbox_estado_ck
    check (estado in ('pendiente', 'procesando', 'enviada', 'error'))
);
create index idx_notificaciones_outbox_pendientes
  on public.notificaciones_outbox (proximo_intento_at) where estado = 'pendiente';
create index idx_notificaciones_outbox_entidad
  on public.notificaciones_outbox (entidad_tipo, entidad_id);
```

RLS enabled, no policies, `revoke all ... from anon, authenticated` (service role / cron only).

### 2. `public.notificaciones` (in-app) — drop the unused legacy table and recreate

```sql
drop table if exists public.notificaciones;
create table public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  tenant_id    uuid references public.tenants(id) on delete cascade,
  modulo       varchar(40) not null,
  tipo         varchar(60) not null,
  titulo       varchar(200) not null,
  mensaje      text not null,
  url          text,
  entidad_tipo varchar(40),
  entidad_id   uuid,
  leida        boolean not null default false,
  leida_at     timestamptz,
  created_at   timestamptz not null default timezone('utc', now())
);
create index idx_notificaciones_usuario on public.notificaciones (usuario_id, created_at desc);
create index idx_notificaciones_no_leidas on public.notificaciones (usuario_id) where leida = false;

alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;
create policy notificaciones_select_own on public.notificaciones
  for select to authenticated using (usuario_id = auth.uid());

alter publication supabase_realtime add table public.notificaciones;
```

No insert/update/delete policy: writes go through SECURITY DEFINER functions.

### 3. Functions (all `security definer`, `set search_path = public`)

| Function | Access | Purpose |
|---|---|---|
| `_notificar_email(p_tenant_id, p_modulo, p_tipo, p_email, p_usuario_id, p_entidad_tipo, p_entidad_id, p_payload)` | internal (revoked from clients) | Insert one outbox row; lowercases the email; skips null/blank emails |
| `_notificar_in_app(p_usuario_id, p_tenant_id, p_modulo, p_tipo, p_titulo, p_mensaje, p_url, p_entidad_tipo, p_entidad_id)` | internal | Insert one in-app row |
| `_admins_tenant(p_tenant_id)` returns `table(usuario_id uuid, email text)` | internal | `miembros_tenant mt join roles r on r.id = mt.rol_id join usuarios u on u.id = mt.usuario_id` where `mt.tenant_id = p_tenant_id`, `r.nombre = 'administrador'` and `mt.estado <> 'pendiente_activacion'` |
| `_encolar_notificacion(p_compra_id uuid, p_tipo text)` | internal, **same signature** | Rewritten: buyer email, buyer in-app when `comprador_usuario_id` is not null, and one `compra_nueva_admin` email + in-app per administrator when `p_tipo = 'compra_recibida'` or (`p_tipo = 'compra_confirmada'` and `validado_at is distinct from now()`, i.e. not confirmed by staff in this transaction — `validado_por` cannot be used because a rejected purchase keeps it and can later auto-confirm on proof re-upload). The 7 call sites are not edited. Payload keeps the existing keys plus `compra_id` and `tenant_id` |
| `reclamar_notificaciones_outbox(p_limite int)` returns `setof notificaciones_outbox` | service role only | Claims due `pendiente` rows and `procesando` rows locked more than 10 min, `for update skip locked`, sets `procesando`, `bloqueada_at = now()` |
| `resolver_notificacion_outbox(p_id uuid, p_ok boolean, p_proveedor_id text, p_error text)` | service role only | Success: `enviada`, `enviada_at`, `proveedor_id`. Failure: `intentos + 1`, `ultimo_error` (truncated to 500 chars), back to `pendiente` with the next retry time, or `error` after 5 attempts |
| `marcar_notificacion_leida(p_id uuid)` | `authenticated` | Marks one own notification read; no-op for rows of another user |
| `marcar_notificaciones_leidas()` | `authenticated` | Marks all own unread notifications read |
| `_disparar_despacho()` | internal | Reads `notificaciones_dispatch_url` and `notificaciones_dispatch_secret` from `vault.decrypted_secrets`; if both exist, `net.http_post` with `Authorization: Bearer` and `timeout_milliseconds := 55000`; otherwise returns |
| `despachar_notificaciones_pendientes()` | internal (cron) | Calls `_disparar_despacho()` only when a due `pendiente` row exists |

### 4. Trigger, extension, cron, cleanup

- `create extension if not exists pg_net;`
- `create trigger notificaciones_outbox_despachar after insert on public.notificaciones_outbox for each statement execute function ...` (wrapper calling `_disparar_despacho()`).
- Cron `despachar-notificaciones`, `* * * * *`, `select public.despachar_notificaciones_pendientes();`, using the existing unschedule-then-schedule pattern.
- `drop table public.evento_notificaciones;` — its rows are **not** migrated, so stale notices are never sent.

---

## API / Server Actions

### Route handler
- **File**: `src/app/api/internal/notificaciones/despachar/route.ts`
- **Verb + path**: `POST /api/internal/notificaciones/despachar` (`runtime = 'nodejs'`, `maxDuration = 60`); other verbs return 405.
- **Auth**: `Authorization: Bearer {NOTIFICACIONES_DISPATCH_SECRET}`, compared with `crypto.timingSafeEqual`. Missing/invalid → `401`. Secret not configured → `503`.
- **Input**: none.
- **Return**: `200 { procesadas: number, enviadas: number, fallidas: number }` through `jsonNoStore`; the 405 uses `methodNotAllowed()` (both from `src/lib/portal/privileged-route.ts`).

### Server library — `src/lib/notificaciones/` (every file `import 'server-only'`)
| File | Export | Contract |
|---|---|---|
| `resend.ts` | `enviarEmail({ para, asunto, html, texto, adjuntos, idempotencyKey })` → `{ id: string }` | Throws a typed error on provider failure |
| `registro.ts` | `resolverHandler(modulo, tipo)` → `NotificacionHandler \| null` | Unknown key resolves the row as failed with `handler_not_found` |
| `plantillas/layout.ts` | `renderLayout({ titulo, cuerpoHtml, cta? })`, `escapeHtml(value)` | Shared branded layout |
| `modulos/eventos.ts` | handlers for `eventos.compra_recibida`, `compra_confirmada`, `compra_rechazada`, `compra_cancelada`, `compra_nueva_admin` | Buyer handlers load purchase + tickets + event with `createServiceClient()` and attach the PDF |
| `despachador.ts` | `despacharNotificaciones(limite = 20)` → `{ procesadas, enviadas, fallidas }` | Claim → render → send → resolve; logs one `logAuditEvent` per row (`evento`: `notificacion_enviada` / `notificacion_fallida`, `objetivo_id` = outbox row id, `codigo` = error code, `actor_id: null`), never an email address |

`src/lib/portal/audit-log.ts`: add the two events to `AuditEvento` and widen `tenant_id` and `actor_id` of `AuditEvent` to `string | null` (the dispatcher has no actor and outbox rows may have no tenant).

### Ticket PDF — `src/lib/portal/eventos-ticket-pdf.ts`
- New `construirEntradasPdf(tickets: TicketPdfData[]): Promise<jsPDF | null>` holding the current drawing logic.
- `descargarEntradasPdf(tickets, fileName)` keeps its signature and calls `construirEntradasPdf` then `save(fileName)`.
- Server use: `Buffer.from(doc.output('arraybuffer'))`.

### Browser service — `src/services/supabase/portal/notificaciones.service.ts`
`export const notificacionesService = { ... }` using the browser client:
| Function | Input | Return | Auth |
|---|---|---|---|
| `listar` | `{ limit: number, offset: number }` | `{ items: Notificacion[], total: number }` | RLS: own rows |
| `contarNoLeidas` | — | `number` | RLS: own rows |
| `marcarLeida` | `id: string` | `void` | RPC `marcar_notificacion_leida` |
| `marcarTodasLeidas` | — | `void` | RPC `marcar_notificaciones_leidas` |
| `suscribir` | `usuarioId: string, onInsert: (n: Notificacion) => void, onReconnect: () => void` | `() => void` (unsubscribe) | Realtime honours RLS |

### Environment variables (server only)
`RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICACIONES_DISPATCH_SECRET`. Added to `.env.example` with empty values, in the existing "Server-only" block. `APP_URL` and `SUPABASE_SERVICE_ROLE_KEY` already exist and are reused.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261009120000_notificaciones_modulo.sql` | Outbox, in-app table, functions, trigger, cron, `pg_net`, drop `evento_notificaciones` |
| Dependency | `package.json` | Add `resend` |
| Env | `.env.example` | Add the 3 variables |
| Lib (server) | `src/lib/notificaciones/resend.ts` | New |
| Lib (server) | `src/lib/notificaciones/registro.ts` | New |
| Lib (server) | `src/lib/notificaciones/despachador.ts` | New |
| Lib (server) | `src/lib/notificaciones/plantillas/layout.ts` | New |
| Lib (server) | `src/lib/notificaciones/modulos/eventos.ts` | New |
| Lib | `src/lib/portal/eventos-ticket-pdf.ts` | Extract `construirEntradasPdf` |
| Lib (server) | `src/lib/portal/audit-log.ts` | Add `notificacion_enviada` / `notificacion_fallida`; `tenant_id` and `actor_id` nullable |
| API route | `src/app/api/internal/notificaciones/despachar/route.ts` | New dispatcher endpoint |
| Types | `src/types/portal/notificaciones.types.ts` | `Notificacion`, outbox row, handler types |
| Service | `src/services/supabase/portal/notificaciones.service.ts` | New |
| Hook | `src/hooks/portal/notificaciones/useNotificaciones.ts` | New: resolves the user id, list, unread count, realtime, mark read |
| Component | `src/components/portal/notificaciones/NotificacionesBell.tsx` | New: bell + badge + panel toggle |
| Component | `src/components/portal/notificaciones/NotificacionesPanel.tsx` | New: dropdown list |
| Component | `src/components/portal/notificaciones/NotificacionItem.tsx` | New |
| Component | `src/components/portal/notificaciones/NotificacionesPage.tsx` | New: full history |
| Component | `src/components/portal/notificaciones/index.ts` | Barrel |
| Component | `src/components/portal/PortalHeader.tsx` | Replace the static bell with `NotificacionesBell` |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Add `notificaciones` → "Notificaciones" to `SLUG_LABELS` |
| Page | `src/app/portal/notificaciones/page.tsx` | New thin page rendering `NotificacionesPage` |
| Docs | `projectspec/03-project-structure.md` | Document module, tables, route, env vars; remove `evento_notificaciones` from the "Event purchases" section |
| Spec | `openspec/specs/team-events-purchase-data/spec.md` | Outbox requirement now points to the generic module |

---

## Acceptance Criteria

1. A paid purchase finalized with a payment proof creates one `notificaciones_outbox` row for the buyer (`eventos` / `compra_recibida`) and one `compra_nueva_admin` row per active tenant administrator.
2. The buyer's `compra_recibida` email arrives from `no-reply@grit-arena.com` with a PDF attachment in which every ticket shows the "PENDIENTE DE VALIDACIÓN" mark and no QR code.
3. After an administrator validates the purchase, the buyer receives a `compra_confirmada` email whose PDF contains one page per ticket with a QR code encoding the ticket `codigo`; no administrator notification is created for this transition.
4. A free ticket, or a paid one on an event with `omitir_confirmacion_compra`, produces the `compra_confirmada` buyer email with the authorized PDF and a `compra_nueva_admin` notification for every administrator.
5. Rejecting a purchase sends the buyer an email containing the rejection reason; cancelling sends a cancellation email. Neither notifies administrators.
6. A guest purchase (no session) receives the emails at the typed address and creates no in-app row for the buyer.
7. An authenticated buyer gets an in-app notification for each of the buyer transitions, linking to `/portal/mis-entradas`.
8. A *Múltiple* purchase produces one buyer email whose PDF has one page per bundled event's ticket.
9. Each administrator gets an in-app notification per purchase linking to `/portal/orgs/{tenant_id}/gestion-eventos/{evento_id}/compras`; members with role `entrenador` or `usuario`, and members in `pendiente_activacion`, get neither email nor in-app notification.
10. With the portal open as administrator, a purchase made in another session increases the bell counter and adds the item to the panel without reloading the page.
11. The bell shows no badge with 0 unread, the exact number from 1 to 9, and `9+` above 9.
12. Clicking a notification marks it read (counter decreases) and navigates to its URL; "Marcar todas como leídas" sets the counter to 0.
13. `/portal/notificaciones` lists the user's notifications newest first, 20 per page, and shows an empty state when there are none.
14. A user can never read or mark another user's notifications: a direct `select` returns only own rows and `marcar_notificacion_leida` with a foreign id changes nothing.
15. `POST /api/internal/notificaciones/despachar` without a valid bearer returns `401` and sends nothing; any other HTTP verb returns `405`.
16. When Resend fails, the row returns to `pendiente` with `intentos` incremented, `ultimo_error` filled and `proximo_intento_at` moved forward (1 min, 5 min, 30 min, 2 h); after the 5th failure it ends in `error` and is not retried.
17. A row that was sent successfully is never sent twice, including when two dispatcher calls run concurrently.
18. A failure or timeout of the dispatcher call never makes a purchase, validation, rejection or cancellation RPC fail.
19. With no Vault configuration, inserting outbox rows raises no error and performs no HTTP call.
20. When no outbox row is due, the cron job performs no HTTP call.
21. `public.evento_notificaciones` no longer exists and none of its former rows is sent.
22. Downloading the ticket PDF from the checkout confirmation step and from "Mis entradas" produces the same document as before the refactor.
23. `npx tsc --noEmit` and `npm run lint` pass.

---

## Implementation Steps

- [ ] Create branch `feat/notifications-module` and verify it is not `main`/`master`/`develop`
- [ ] Get design approval for the bell, panel and notifications page
- [ ] Write the migration and apply it locally (`npx supabase db reset`); never push it to the remote project
- [ ] Add the `resend` dependency and the three env variables to `.env.example` / `.env.local`
- [ ] Extract `construirEntradasPdf` and confirm browser download still works
- [ ] Build `src/lib/notificaciones/` (Resend client, layout, registry, events handlers, dispatcher)
- [ ] Add the dispatcher route handler
- [ ] Add types, service and hook for in-app notifications
- [ ] Build the bell, panel, item and page components; wire the bell into `PortalHeader` and the page route
- [ ] Verify RLS (own rows only) and that Realtime delivers only own rows
- [ ] Test manually: paid purchase, validation, free purchase, rejection, cancellation, guest purchase, retry path, unauthorized dispatcher call
- [ ] Update `projectspec/03-project-structure.md` and the OpenSpec specs
- [ ] Run `npx tsc --noEmit` and `npm run lint` (do not run `build`)
- [ ] Write the commit message and PR description
- [ ] Remote rollout checklist (manual): enable `pg_net`, store `notificaciones_dispatch_url` (`https://www.grit-arena.com/api/internal/notificaciones/despachar`) and `notificaciones_dispatch_secret` in Vault, apply the migration, set the env variables in Vercel, create a Resend API key with sending access for `grit-arena.com`

---

## Non-Functional Requirements

- **Security**:
  - `notificaciones_outbox` has RLS enabled and no client grants; `notificaciones` is select-only for the owner; all writes go through SECURITY DEFINER functions; internal `_` helpers and the claim/resolve functions are revoked from `anon` and `authenticated`.
  - `RESEND_API_KEY` and `NOTIFICACIONES_DISPATCH_SECRET` are read only in `server-only` modules; the dispatcher secret lives in Supabase Vault on the database side.
  - The dispatcher URL is the fixed production origin; links in emails are built from `APP_URL`, never from request headers.
  - All template values are HTML-escaped. Logs never contain email addresses, tokens or payload contents.
  - Guest emails are unverified: emails carry only that purchase's data.
- **Performance**:
  - Partial index on due pending outbox rows; index on `(usuario_id, created_at desc)` and partial unread index for the inbox.
  - Batches of at most 20, sent serially to respect Resend's rate limit; a `429` is handled by the retry schedule.
  - Inbox list is paginated; the panel loads only the latest 10.
  - One Realtime channel per open tab, removed on unmount.
- **Accessibility**:
  - Bell button with `aria-label` including the unread count, `aria-expanded` and `aria-haspopup`.
  - Panel closes on `Escape` and outside click, returns focus to the bell, and is fully keyboard navigable; unread state is not conveyed by colour alone.
  - New-notification count announced through an `aria-live="polite"` region.
- **Error handling**:
  - UI errors use the existing inline banner pattern (`role="alert"`); there is no toast system.
  - Failure to load notifications shows an inline error with a retry action and never breaks the portal header.
  - Email failures are invisible to the buyer and recorded in `ultimo_error`; rows in `error` are inspected directly in the database (no admin UI in this story).

---

## Out of Scope

Per-user notification preferences or unsubscribe, Resend webhooks (bounces/complaints), push notifications, notifications for other modules (bookings, subscriptions, suspensions), a toast system, i18n, an admin screen for failed deliveries, and adding a test runner.
