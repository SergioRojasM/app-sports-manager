# Delivery — team-events-management-phase-four (US-0121)

## Commit message

```
feat(team-events-management-phase-four): add ticket purchase, mis entradas and purchase validation

- Checkout in EventoEntradasModal: Entrada › Datos › Pago › Listo, for users and guests;
  sellable tickets from evento_entradas, coupon validation, non-cash payment methods,
  required proof upload, retry on the same purchase and a 30-minute capacity hold
- Event form independent of the templates: evento_formularios (versioned JSON snapshot
  written by guardar_evento_completo, readable by guests) and evento_formulario_respuestas
- evento_compras, evento_tickets and the evento_notificaciones outbox (filled, not sent);
  clients only read, every write goes through SECURITY DEFINER RPCs
- Purchase files under org-assets/compras-eventos/, outside orgs/, write-once
- Client-side ticket PDF (jspdf + qrcode): QR only for active tickets
- /portal/mis-entradas: guest purchases linked by verified email, re-upload, cancel, PDF
- Admin /gestion-eventos/[evento_id]/compras: sold count, stats, validate / reject payments
- Events with sales can no longer be hard-deleted (has_purchases)
- Wizard: cash methods tagged as not available online, cancellation helper text
- Copy no longer promises that tickets are emailed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request description

### Why
After US-0120, people could find events and open the tickets modal, but "Continuar" was disabled and
nothing was stored. US-0121 adds the purchase end to end: guests and logged-in users buy one ticket
per purchase and download it as a PDF; registered buyers track their tickets in "Mis Entradas";
tenant admins validate or reject payments. Nothing leaves the platform in this phase: there is no
email and no payment gateway.

User story: `projectspec/userstory/us0121-event-ticket-purchase.md`
OpenSpec change: `openspec/changes/team-events-management-phase-four/`

### What changes
- **Checkout** (`EventoEntradasModal` + `useEventoCompra` + `components/portal/eventos/compra/`)
  - Step 1: sellable tickets read from `evento_entradas` (sale window, reservation lead time),
    coupon, cancellation policy line, total. Blocked when there is nothing to sell, the sale
    closed, or the user already holds a ticket.
  - Step 2: full name, email (typed twice by guests, read-only for users) and date of birth, plus
    the profile fields and form the event asks for. Nothing typed here updates the profile.
  - Step 3 (total > 0): non-cash methods only, required proof (JPEG / PNG / WebP / PDF, ≤ 5 MB).
  - Step 4: confirmed or "payment to be validated", ticket codes, PDF download. Guests are told
    to create an account with the same email.
  - Submit is `iniciar_compra_evento` → uploads → `finalizar_compra_evento`. A failed step is
    retried on the same purchase; after 30 minutes the hold expires and the flow restarts.
- **Mis Entradas** (`/portal/mis-entradas`, menu item after "Mis Reservas"): links guest purchases
  made with the account's verified email, then lists purchases (Próximas / Pasadas, estado
  filter) with PDF download, proof re-upload after a rejection, and cancellation within the policy.
- **Admin Compras** (`/portal/orgs/{t}/gestion-eventos/{id}/compras`, "Ver compras" in the event
  actions menu): "Vendidas: X / cupo", stats, filters, proof viewer, buyer data, validate / reject.
- **Portal event page**: "Ya tienes una entrada para este evento · Ver mis entradas".
- **Wizard**: cash methods tagged "No disponible para compra en línea" (+ non-blocking warning when
  a paid event only has cash); helper under the cancellation field.
- **Delete event**: blocked once the event has sales, with an inline message.

### Database (local only — do not push to the remote project from this PR)
Five migrations (the fifth, `20261002120000_eventos_bundle_formulario.sql`, limits Múltiple bundles to events without a form or with the same form):
1. `20261001115000_evento_formularios.sql` — `evento_formularios` (versioned form snapshot, readable
   whenever the event is), `guardar_evento_completo` re-created with the snapshot sync (same
   signature and grants), backfill for existing events with a form.
2. `20261001120000_eventos_compras.sql` — `evento_compras`, `evento_tickets`,
   `evento_formulario_respuestas`, `evento_notificaciones`; read-only RLS (buyer or tenant staff).
3. `20261001120100_eventos_compras_rpc.sql` — helpers and RPCs: `validar_cupon_evento`,
   `iniciar_compra_evento`, `finalizar_compra_evento`, `reenviar_comprobante_compra_evento`,
   `cancelar_compra_evento`, `validar_compra_evento`, `vincular_compras_invitado`,
   `expirar_compras_evento_pendientes`.
4. `20261001120200_eventos_compras_storage_cron.sql` — storage policies for
   `compras-eventos/{tenant}/{compra}/` and the `expirar-compras-eventos` cron (every 5 min).

Notes for whoever applies them:
- `eventos` rows with purchases can no longer be hard-deleted (`on delete restrict`).
- Guest linking relies on `auth.users.email_confirmed_at`. Production must keep "Confirm email"
  enabled.
- A template edit reaches an event only when the event is saved again in the wizard.

### New dependencies
`jspdf`, `qrcode`, `@types/qrcode` (dev). Both libraries are loaded by dynamic import inside
`descargarEntradasPdf`.

### Differences from the first draft of the user story
- The event form is served from `evento_formularios` / `evento_formulario_respuestas` instead of
  the templates (decided in review; the user story was updated).
- Copy that promised emailed tickets was corrected (`ObtenerEntradaModal` hint, guest note).
- Added during implementation:
  - error code `MOTIVO_REQUERIDO` for a rejection without a reason;
  - storage helper `evento_compra_archivo_legible` for the read policy; both storage helpers take
    the folder segments as text and cast safely;
  - `useMiTicketEnEvento` hook for the portal event page note;
  - the form header in step 2 is built from the snapshot, because `FormularioHeaderEditor` reads
    `tenants`, which a guest cannot;
  - the public listing projection includes `cancelacion_antelacion_horas`.

### Test plan
Verified locally (SQL as anon / guest / registered / other user / staff, and in the browser):
- [x] Direct writes denied on the purchase tables; read scopes; storage upload / read rules
- [x] Guest paid purchase → admin validates → guest signs up with the same email → "Mis Entradas"
      shows it confirmed → PDF with QR
- [x] Registered free purchase (prefill from the profile; profile unchanged)
- [x] *Múltiple* purchase: two tickets, two PDF pages; bundled event full → nothing written
- [x] Coupon valid / invalid / other ticket; duplicate email; cash-only event; sale closed by lead time
- [x] Upload failure + "Reintentar" (same purchase and codes); expiry after 30 min; cron expiry
- [x] Reject (reason required) → re-upload; cancel within the window; no "Cancelar" with a null
      policy or outside the window
- [x] Two concurrent purchases of the last seat → exactly one succeeds
- [x] Form snapshot: unchanged save keeps the version; template edit + save creates a new one;
      older answers keep their labels
- [x] Delete an event with sales → inline message; wizard cash tag, warning and helper
- [x] `npx tsc --noEmit` (project sources) and `eslint` on the changed files pass
- [ ] Not exercised in the browser: a trainer opening the Compras route (relies on the existing
      `(administrador)` layout redirect), admin pagination beyond 20 rows, and a PDF proof opened
      in a new tab (image proofs were tested)

### Screenshots checklist
- [ ] Checkout steps 1–4 (desktop and mobile full-screen)
- [ ] Ticket PDF: active (QR) and pending
- [ ] Mis Entradas: confirmed, rejected with reason, cancelled
- [ ] Admin Compras: table, "Ver datos", reject modal

🤖 Generated with [Claude Code](https://claude.com/claude-code)
