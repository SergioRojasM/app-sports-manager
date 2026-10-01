## Why

After US-0120, people can find events and open the tickets modal, but "Continuar" is disabled and nothing is stored. Teams can't sell tickets or control access, and buyers can't get a ticket. US-0121 adds the purchase flow end to end:
- guests and logged-in users can buy one ticket per purchase and download it as a PDF right away;
- registered buyers can track their tickets in a "Mis Entradas" page;
- tenant staff can validate or reject payments.

Nothing leaves the platform in this phase: there is no email and no payment gateway.

## What Changes

- **New data model** (3 migrations, applied locally only):
  - tables `evento_compras`, `evento_tickets` and `evento_notificaciones` (an outbox that is filled but never sent);
  - RLS is read-only (the owner or tenant staff can read), and every write goes through `SECURITY DEFINER` RPCs;
  - a partial unique index allows only one live ticket per email per event.
- **New RPCs**: `validar_cupon_evento`, `iniciar_compra_evento`, `finalizar_compra_evento`, `reenviar_comprobante_compra_evento`, `cancelar_compra_evento`, `validar_compra_evento`, `vincular_compras_invitado`, and `expirar_compras_evento_pendientes` (run by pg_cron every 5 min). A pending purchase holds capacity for 30 min. The server re-validates prices, coupons, methods, forms, capacity and uniqueness itself.
- **Event form independent of the templates**:
  - `evento_formularios` is a versioned JSON snapshot of the event's form, written by `guardar_evento_completo` and readable by anon whenever the event is;
  - `evento_formulario_respuestas` holds each purchase's answers (profile fields, answers, image paths), tied to the snapshot version it answered;
  - checkout and validation never read `formularios_plantillas`;
  - the public listing adds `cancelacion_antelacion_horas` to its projection.
- **Storage**: purchase files go under `org-assets/compras-eventos/{tenantId}/{compraId}/`, outside `orgs/` so the existing broad read policies don't expose them. The files are write-once, anon can upload only to their own pending guest purchase, and only the buyer and tenant staff can read them.
- **Checkout**:
  - `EventoEntradasModal` becomes a four-step stepper: Entrada › Datos › Pago › Listo;
  - tickets are read from `evento_entradas` and filtered by their sale window;
  - coupons are validated through the RPC;
  - buyer data = fixed fields + the event form's profile fields and fields;
  - payment = non-cash methods only, plus a required proof upload;
  - a failed step can be retried on the same purchase;
  - the "próximamente" notice and the `onContinuar` seam are removed.
- **Ticket PDF**: built in the browser with the new `jspdf` + `qrcode` dependencies. A5, one page per ticket. Only `activa` tickets get a QR code; `pendiente` tickets carry a "PENDIENTE DE VALIDACIÓN" banner.
- **New portal page `/portal/mis-entradas`**, with a global menu item "Mis Entradas" after "Mis Reservas":
  - on load, guest purchases made with the account's verified email are linked to the account;
  - *Próximas* / *Pasadas* tabs and an estado filter;
  - actions: download PDF, re-upload proof, cancel within the policy.
- **New admin page `/portal/orgs/{t}/gestion-eventos/{id}/compras`**, opened from a "Ver compras" item in `EventoActionsMenu`: sold count vs capacity, stats, a filterable table, "Ver comprobante", "Ver datos", "Validar pago" and "Rechazar".
- **Cancellation policy**:
  - `cancelacion_antelacion_horas = null` means no cancellation and no refund;
  - this is stated in the checkout, the confirmation, the PDF and "Mis Entradas".
- **Portal event page**: shows "Ya tienes una entrada para este evento · Ver mis entradas" when the user already holds a live ticket.
- **Wizard**:
  - step 3 tags cash methods as "No disponible para compra en línea" and warns when only cash methods are selected;
  - step 1 adds a cancellation helper text.
- **Copy**: the `ObtenerEntradaModal` hint and the guest note no longer promise email delivery.
- **`deleteEvento`**: an FK `on delete restrict` blocks deleting an event with sales. The error maps to the new `has_purchases` code and is shown inline in `EliminarEventoModal`.

## Capabilities

### New Capabilities
- `team-events-purchase-data`: the purchase, ticket and outbox tables, the event form snapshot (`evento_formularios`) and answers (`evento_formulario_respuestas`) tables, their RLS and grants, the purchase state machine, every purchase RPC (with its validation rules and error codes), the 30-min hold with cron/lazy expiry, the `compras-eventos/` storage policies, and the `eventoComprasService` data-access and error-mapping contract.
- `team-events-checkout`: the stepper in `EventoEntradasModal` (steps Entrada, Datos, Pago, Confirmación), guest vs registered behavior, the submit/retry flow, the cancellation-policy line, and the client-side ticket PDF.
- `team-events-my-tickets`: the `/portal/mis-entradas` page (guest-purchase linking, tabs/filter, purchase cards, re-upload, cancel, PDF download) and the "Ya tienes una entrada" note on the portal event page.
- `team-events-purchase-validation`: the admin "Compras" page (sold count, stats, table, filters, pagination, proof and data viewers, validate/reject).

### Modified Capabilities
- `team-events-discovery`:
  - the "Tickets modal and purchase seam" requirement is replaced by the checkout; the modal reads sellable tickets from `evento_entradas`, and "Continuar" is enabled;
  - the get-ticket hint no longer promises email.
- `team-events-management`:
  - a "Ver compras" action for published events;
  - "Delete event" fails for events with purchases, showing the `has_purchases` message inline.
- `team-events-wizard`:
  - step 3 tags cash methods and warns when only cash is selected;
  - step 1 has a helper under `cancelacion_antelacion_horas`.
- `team-events-data`:
  - the `EventoServiceError` mapping gains `has_purchases` for `23503` on `deleteEvento`;
  - the public listing projection includes `cancelacion_antelacion_horas`.
- `team-events-tickets-data`: `guardar_evento_completo` syncs the versioned form snapshot in `evento_formularios`.
- `portal-role-navigation`: the global sidebar gains "Mis Entradas" (icon `confirmation_number`) after "Mis Reservas".

## Non-goals

- Sending email. The `evento_notificaciones` outbox is only filled.
- Token-protected ticket pages and any "recuperar entradas" flow.
- Online payment gateways and automatic refunds. Refunds are handled by the organizer outside the platform.
- Cash payments, or "pay at the event".
- Check-in or QR scanning.
- More than one attendee per purchase.
- Showing the remaining capacity on public pages.
- Captcha and rate limiting for guest RPCs.
- Updating the user's profile with data typed during checkout.
- A toast system.

## Files to Create or Modify

Order follows page → component → hook → service → types, then lib, database, dependencies and docs.

| Layer | File | Change |
|-------|------|--------|
| Page | `src/app/portal/(atleta)/mis-entradas/page.tsx` | New: renders `<MisEntradasPage />` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/compras/page.tsx` | New: `<EventoComprasPage tenantId eventoId />` |
| Component | `src/components/portal/eventos/EventoEntradasModal.tsx` | Becomes the checkout shell: stepper, sticky footer, full-screen on mobile. The "próximamente" notice and `onContinuar` are removed |
| Component | `src/components/portal/eventos/compra/EventoCompraStepper.tsx`, `EventoCompraPasoEntrada.tsx`, `EventoCompraPasoDatos.tsx`, `EventoCompraPasoPago.tsx`, `EventoCompraPasoConfirmacion.tsx`, `EventoCompraEstadoBadge.tsx`, `PoliticaCancelacion.tsx`, `index.ts` | New |
| Component | `src/components/portal/eventos/ObtenerEntradaModal.tsx` | Hint text without the email promise |
| Component | `src/components/portal/eventos/detalle/EventoDetallePortalPage.tsx` | "Ya tienes una entrada" note |
| Component | `src/components/portal/mis-entradas/MisEntradasPage.tsx`, `MiCompraCard.tsx`, `ReenviarComprobanteModal.tsx`, `CancelarCompraModal.tsx`, `index.ts` | New |
| Component | `src/components/portal/gestion-eventos/compras/EventoComprasPage.tsx`, `EventoComprasTable.tsx`, `EventoComprasStats.tsx`, `CompraDatosModal.tsx`, `ValidarCompraModal.tsx`, `RechazarCompraModal.tsx`, `index.ts` | New |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | New "Ver compras" item (published events) |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx`, `EventosGrid.tsx`, `EventosTable.tsx`, `EventosCalendar.tsx` | Wire "Ver compras" to `/gestion-eventos/{id}/compras` |
| Component | `src/components/portal/gestion-eventos/EliminarEventoModal.tsx` | Show the `has_purchases` message inline |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Cash tag and cash-only warning |
| Component | `src/components/portal/gestion-eventos/wizard/EventoConfiguracionStep.tsx` | Cancellation helper text |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Labels `mis-entradas` → "Mis entradas" and `compras` → "Compras" |
| Hook | `src/hooks/portal/eventos/useEventoCompra.ts` | New: checkout state machine |
| Hook | `src/hooks/portal/mis-entradas/useMisEntradas.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useEventoCompras.ts`, `useValidarCompraEvento.ts` | New |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | New `eventoComprasService` + `mapCompraError` |
| Service | `src/services/supabase/portal/eventos.service.ts` | Map `23503` in `deleteEvento` to `has_purchases`; add `cancelacion_antelacion_horas` to the listing projection |
| Types | `src/types/portal/eventos-compras.types.ts` | New |
| Types | `src/types/portal/eventos.types.ts` | Add `has_purchases` to `EventoServiceErrorCode`; move `cancelacionAntelacionHoras` to `EventoPublicoListItem` |
| Types | `src/types/portal.types.ts` | `MIS_ENTRADAS_MENU_ITEM` after "Mis Reservas" |
| Lib | `src/lib/portal/eventos-compra.utils.ts` | New: sellability, cancellability, slugify, file validation |
| Lib | `src/lib/portal/eventos-ticket-pdf.ts` | New: `descargarEntradasPdf`, `politicaCancelacionTexto` |
| Migration | `supabase/migrations/20261001115000_evento_formularios.sql` | `evento_formularios` + RLS; `guardar_evento_completo` with the snapshot sync; backfill |
| Migration | `supabase/migrations/20261001120000_eventos_compras.sql` | Tables (including `evento_formulario_respuestas`), indexes, triggers, RLS, grants |
| Migration | `supabase/migrations/20261001120100_eventos_compras_rpc.sql` | Private helpers, RPCs, grants |
| Migration | `supabase/migrations/20261001120200_eventos_compras_storage_cron.sql` | `compras-eventos/` storage policies, `evento_compra_acepta_archivo`, `expirar-compras-eventos` cron |
| Dependency | `package.json` | Add `jspdf`, `qrcode` and `@types/qrcode` |
| Docs | `projectspec/03-project-structure.md` | Routes, slices, tables, RPCs, storage folder, cron, and the email-confirmation dependency of guest linking |

## Implementation Plan

1. Migrations: form snapshot + `guardar_evento_completo`, then purchase tables and RLS, then RPCs, then storage and cron. Apply locally and verify every RLS, storage and RPC branch in SQL (anon, guest, registered, other user, member, staff), including the concurrent purchase of the last seat.
2. Dependencies: `jspdf`, `qrcode`, `@types/qrcode`.
3. Types: `eventos-compras.types.ts`, plus `has_purchases` in `EventoServiceErrorCode`.
4. Service: `eventoComprasService` with `mapCompraError`, and the `deleteEvento` FK mapping.
5. Lib: `eventos-compra.utils.ts`, then `eventos-ticket-pdf.ts`.
6. Hooks: `useEventoCompra`, `useMisEntradas`, `useEventoCompras`, `useValidarCompraEvento`.
7. Components:
   - the `compra/` step components and the `EventoEntradasModal` refactor;
   - the portal event page note;
   - the `mis-entradas/` components;
   - the admin `compras/` components;
   - the "Ver compras" wiring, wizard helper texts and `EliminarEventoModal` message.
8. Pages: `mis-entradas` and `gestion-eventos/[evento_id]/compras`.
9. Navigation: the "Mis Entradas" menu item and breadcrumb labels.
10. Manual verification of every journey in the user story, then `npx tsc --noEmit` and lint on the changed files.
11. Update `projectspec/03-project-structure.md`.

## Impact

- **Database**:
  - five new tables (`evento_formularios`, `evento_compras`, `evento_tickets`, `evento_formulario_respuestas`, `evento_notificaciones`), and `guardar_evento_completo` re-created (same signature);
  - eight public RPCs, plus private helpers;
  - new storage policies on `org-assets` and a new pg_cron job;
  - `eventos` rows with purchases can no longer be hard-deleted (`on delete restrict`).
- **Security**:
  - anon can call the guest RPCs and upload to its own pending purchase folder;
  - identity and email for registered buyers come from the session;
  - coupons stay unreadable;
  - guest linking requires `email_confirmed_at` (production has email confirmation on).
- **Dependencies**: `jspdf`, `qrcode`, `@types/qrcode`.
- **Code**:
  - `EventoEntradasModal`'s public props change: `onContinuar` is removed;
  - new `compra/`, `mis-entradas/` and `gestion-eventos/compras/` slices.
- **Unchanged**: the US-0120 listing and detail pages, `ObtenerEntradaModal` routing, `LoginForm` / `SignupForm`.
