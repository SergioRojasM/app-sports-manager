## Context

- **What exists (US-0118 to US-0120):**
  - `eventos` stores capacity, the sale and cancellation lead times, `omitir_confirmacion_compra`, `formulario_id` and the `metodos_pago` snapshots.
  - `evento_entradas` holds ticket types, readable by `anon` and `authenticated` through `eventos` RLS. `evento_entrada_cupones` is readable by staff only.
  - `EventoEntradasModal` receives an `EventoPublicoListItem` (from `EventosPublicosPage`, `EventoDetallePortalPage` and `EventoDetalleLandingPage`) and ends in a disabled "Continuar" (`onContinuar` seam).
- **Nothing about purchases is stored yet.** There is also no PDF/QR library and no transactional email.
- **Constraints that shaped the design:**
  - The public event projection deliberately omits `formulario_id` and `omitir_confirmacion_compra`.
  - `formularios_plantillas` / `formulario_plantilla_esquema` are granted only to `authenticated`, so **a guest cannot read the event form from the templates**. Templates are also mutable: an admin can edit one after tickets were sold.
  - In `org-assets`, `org_member_read` and `event_banner_read` expose everything under `orgs/{t}/…`, so purchase files must live elsewhere.
  - Migrations are applied **locally only**, never pushed to the remote Supabase.
  - UI follows the US-0116 grit visual system and the existing modal patterns (no separate design was provided). There is no toast system.
  - Production has "Confirm email" enabled. Locally, `enable_confirmations = false`.

## Goals / Non-Goals

**Goals:**
- An atomic, server-authoritative purchase: price, coupon, method, form, capacity and uniqueness are all re-validated in one locked transaction.
- A guest can buy without an account, download the ticket immediately, and see it later by signing up with the same verified email.
- A small, auditable state machine (`evento_compras.estado` + `evento_tickets.estado`), and an outbox a later phase can drain.
- One PDF generator shared by step 4 and "Mis Entradas".
- Admin validation reuses the patterns of subscription `pagos`.

**Non-Goals:** email delivery, payment gateways and refunds, cash, check-in/QR scanning, multi-attendee purchases, public capacity display, captcha or rate limiting, token links.

## Architecture

```
Page                                   Component                                  Hook                          Service / DB
─────────────────────────────────      ──────────────────────────────────────     ───────────────────────────   ─────────────────────────────────────
(existing) eventos pages ───────────▶  EventoEntradasModal (shell)                 useEventoCompra ───────────▶  eventoComprasService
                                         ├ EventoCompraStepper                      │ step state                  ├ listEntradasVendibles ─▶ evento_entradas (RLS)
                                         ├ EventoCompraPasoEntrada                  │ coupon / data / form        ├ getFormularioEvento ──▶ evento_formularios (vigente, RLS)
                                         ├ EventoCompraPasoDatos ─ FormularioSecc…  │ method / proof              ├ validarCupon ─────────▶ rpc validar_cupon_evento
                                         ├ EventoCompraPasoPago ─ EventoMetodoPago… │ submit + retry              ├ iniciarCompra ────────▶ rpc iniciar_compra_evento
                                         └ EventoCompraPasoConfirmacion             └ result                      ├ subirArchivoCompra ───▶ storage org-assets/compras-eventos/…
                                             └ lib/eventos-ticket-pdf (jspdf+qrcode)                              └ finalizarCompra ──────▶ rpc finalizar_compra_evento
app/portal/(atleta)/mis-entradas ───▶  MisEntradasPage ─ MiCompraCard …          useMisEntradas ────────────▶  vincularComprasInvitado, listMisCompras,
                                                                                                                 reenviarComprobante, cancelarCompra
app/portal/orgs/[t]/(administrador)/   EventoComprasPage ─ Table / Stats /       useEventoCompras ──────────▶  listComprasEvento, contarVendidas, getArchivoUrl
  gestion-eventos/[id]/compras ─────▶    CompraDatosModal / Validar / Rechazar    useValidarCompraEvento ────▶  validarCompra ─▶ rpc validar_compra_evento

DB (SECURITY DEFINER RPCs are the only writers)
  evento_compras 1─* evento_tickets          evento_compras 1─* evento_notificaciones (outbox, no client grants)
  pg_cron */5 ─▶ expirar_compras_evento_pendientes()     lazy: _expirar_compras_pendientes(targets) inside iniciar_compra_evento
```

## Decisions

### D1. Writes only through `SECURITY DEFINER` RPCs; RLS is read-only
The client gets `select` only: the owner's rows, or every row of tenants where the caller is staff. Every insert and update goes through RPCs that lock the rows and validate everything.
- **Why:** price, coupon, capacity and uniqueness must be checked atomically, with the event rows locked. RLS cannot express "count < cupo". Guests (anon) must also be able to write without getting any table grant.
- **Alternative considered:** RLS insert policies plus triggers. Rejected: the checks would be split across layers, and anon would need insert grants.

### D2. Two-call purchase (`iniciar` → upload → `finalizar`) with a 30-min hold
Files can only be uploaded to a folder keyed by a real `compra_id`, and the storage policy checks that purchase (`evento_compra_acepta_archivo`). The first call reserves capacity (a `pendiente_pago` purchase with `pendiente` tickets). The second attaches files and changes the state.
- **Retry:** a failed upload or finalize is retried against the same `compra_id`, so there is no duplicate purchase and the codes stay the same.
- **Expiry:** the cron runs every 5 min, and expiry also runs lazily on the target events inside `iniciar_compra_evento`, so a stale hold never blocks a buyer for long.
- **Free shortcut:** a free purchase without image fields is confirmed inside the first call.
- **Alternative considered:** uploading to a temp folder before creating the purchase. Rejected: anon would need unrestricted upload rights, and orphaned files would pile up.

### D3. Uniqueness and capacity under concurrency
- **Locking:** the target event rows (main + bundle) are locked with `select … for update` **in id order**, then tickets are counted. Concurrent purchases of the last seat are serialized, and the fixed lock order avoids deadlocks between *Múltiple* bundles.
- **Duplicates:** the partial unique index `uq_evento_tickets_evento_email (evento_id, asistente_email) where estado <> 'anulada'` is the last line of defense. A `23505` on it is re-raised as `ENTRADA_DUPLICADA`.

### D4. Event form snapshot (`evento_formularios`) + answers table (`evento_formulario_respuestas`), both independent of the templates
**Gap:** a guest must see the event's form in step 2, but anon cannot read the template tables, and templates can change after tickets are sold.

**Decision (requested in review):** the event owns a JSON copy of its form, and the answers live in their own table. Checkout, validation and "Ver datos" never touch `formularios_plantillas` / `formulario_plantilla_esquema`.
- **`evento_formularios`**: one row per snapshot **version**.
  - Columns: `nombre`, `perfil_campos_requeridos`, `campos` (the active esquema rows, ordered), `contenido_hash`, `vigente`, and `formulario_plantilla_id` for provenance only.
  - A partial unique index allows one `vigente` row per event.
  - Readable by `anon` / `authenticated` whenever the event is readable (the `evento_entradas` pattern). Writable by tenant staff, since the invoker `guardar_evento_completo` writes it.
- **Snapshot sync in `guardar_evento_completo`:**
  - on every save, it rebuilds the snapshot from the template and compares hashes;
  - if the content changed, it retires the current version and inserts a new one;
  - `formulario_id = null` retires the current version;
  - the migration backfills existing events.
- **`evento_formulario_respuestas`**: one row per purchase (`compra_id` unique).
  - Columns: `evento_formulario_id` (`on delete restrict`), `datos_perfil`, `respuestas`, `archivos`.
  - Select only, for staff or the buyer. Written only by the purchase RPCs.
  - `evento_compras` loses its form columns (`datos_perfil`, `formulario_*`, `archivos`) and keeps only the buyer's fixed data.
- **Why versions and not overwrite:** an answer must always render with the labels and field list it was given. Updating in place would silently re-label old answers. `on delete restrict` keeps any version that has answers.
- **Cancellation settings:** these come from the listing projection. `cancelacion_antelacion_horas` is added to `EVENTOS_PUBLICOS_LIST_SELECT`; it is public event data. `omitir_confirmacion_compra` is still never exposed, and step 4 learns the outcome from the purchase `estado`.

**Alternatives considered:**
- a read RPC over the templates (the previous draft): rejected in review, because the form would still depend on mutable templates, and answers would have to carry their own ad-hoc field snapshot;
- granting anon `select` on the template tables: rejected, because it would expose every tenant's templates.

### D5. Guest identity and later access = email + verified linking
- Registered buyers: the RPCs force `comprador_email` to the session email and ignore the payload.
- Guests: the email is trimmed and lowercased. The guest types it twice (client only).
- Linking: `vincular_compras_invitado()` runs on every "Mis Entradas" load. It is idempotent, and it links only when `auth.users.email_confirmed_at is not null`.
- **Rejected alternatives:** token links and a "recover" page. Both are out of scope by product decision; the PDF on the confirmation screen is the guest's receipt.

### D6. Files outside `orgs/`, write-once
- Path: `org-assets/compras-eventos/{tenantId}/{compraId}/{kind}-{Date.now()}.{ext}`.
- Upload (`insert`) is allowed to `anon, authenticated` through `evento_compra_acepta_archivo(tenant, compra)`:
  - `pendiente_pago`, younger than 30 min, and (guest, or the caller is the buyer); or
  - `rechazada` and the caller is the buyer.
- Read: staff of the tenant or the buyer, served through 300 s signed URLs.
- There are no `update` / `delete` policies. RPCs verify that each path has the right prefix and that the object exists in `storage.objects`.

### D7. Client-side PDF (`jspdf` + `qrcode`)
- **Why:** there is no server rendering cost, and guests can download in step 4 with no network call, because the `iniciar` / `finalizar` response already carries everything.
- **Input:** a single `TicketPdfData[]` view model, built from either the RPC result or `MiCompra`.
- **Rules:** A5, one page per ticket. Only `activa` tickets get a QR code. `pendiente` tickets get a "PENDIENTE DE VALIDACIÓN — No válida para ingreso" banner. `anulada` tickets are never offered.
- **Loading:** both libraries are imported dynamically (`await import('jspdf')`) inside `descargarEntradasPdf`, so they stay out of the page bundles.
- **Alternative considered:** an edge function or a server route. Rejected for this phase.

### D8. Checkout as a hook-driven stepper inside the existing modal
`EventoEntradasModal` keeps its props, **minus `onContinuar`**. All logic lives in `useEventoCompra({ evento, modo, open })`:
- steps `entrada | datos | pago | confirmacion`; `pago` is skipped when the total is 0;
- loads sellable tickets (`listEntradasVendibles`, filtered with `entradaVendible()`), the checkout config (D4), and the registered prefill (`usuarios`, `perfil_deportivo`);
- handles the coupon, form values and validation, method and proof;
- runs the submit sequence (`iniciar` → uploads → `finalizar`), keeps `compraId` and `createdAt` for retry, and moves to the 30-min expired state.

The step components are presentational. The three call sites need no changes beyond dropping `onContinuar` (none pass it today).

### D9. Error mapping
`eventos-compras.service.ts` has its own `mapCompraError`, which parses `CODE[:detail]` from the exception message and uses the table in the user story. `EventoCompraServiceError(code, message)` mirrors `EventoServiceError`. `deleteEvento` maps a `23503` to the new `has_purchases` code before the generic `invalid_reference` branch.

### D10. Outbox only
The RPCs call `_encolar_notificacion(compra_id, tipo)` on every transition that a later phase would announce: `compra_recibida`, `compra_confirmada`, `compra_rechazada` and `compra_cancelada`. The table has no client grants. Nothing reads it in this phase.

### D11. Copy that promised email is corrected (not in the user story)
Two US-0120 texts promise email delivery, which is no longer true:
- the `ObtenerEntradaModal` hint "te las enviaremos a tu correo";
- the guest note "…para enviarte la entrada".

They become:
- hint: "Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo."
- guest note: "Estás comprando como invitado. Descarga tu entrada al finalizar; para verla después, crea una cuenta con el mismo correo."

## Risks / Trade-offs

- [A template edit doesn't reach an event until the event is saved again] → The template editor shows a notice with a link to the events page (the events are counted, not listed). Intended (the snapshot is the contract with buyers). Documented in `03-project-structure.md`; re-saving the event in the wizard refreshes it.
- [Snapshot versions accumulate] → New versions are created only on real content changes (hash comparison); rows are small.

- [Anon spam holding capacity with fake purchases] → The hold lasts 30 min, there is one live ticket per email and event, and expiry runs through cron and lazily. Captcha and rate limiting are a documented follow-up.
- [Someone buys as a guest with another person's email and blocks them (`ENTRADA_DUPLICADA`)] → The hold expires unless it is finalized. A finalized purchase that is fake can be rejected by the organizer, which frees the email. The error message tells the real owner to sign in with that email.
- [Orphan files after an expired purchase] → They are small and stay in a non-public folder. Cleanup is a follow-up.
- [Email confirmation disabled in production would let accounts claim guest purchases] → `vincular_compras_invitado` still checks `email_confirmed_at`, and the dependency is documented in `03-project-structure.md`.
- [A *Múltiple* cancellation uses only the main event's policy] → This is intended, and the dialog repeats the policy text.
- [Hard delete is blocked once an event has sales] → The admin gets a clear message telling them to cancel the event instead.
- [Client-side PDF depends on browser APIs] → The generator is used only from client components, loaded through a dynamic import.
- [`EventoEntradasModal` API change (`onContinuar` removed)] → Nobody passes it today; `tsc` catches any stragglers.

## Migration Plan

0. `20261001115000_evento_formularios.sql`: the `evento_formularios` table, indexes, RLS and grants; `guardar_evento_completo` re-created with the snapshot sync (same signature and grants); backfill of one `vigente` snapshot per event with a `formulario_id`.
1. `20261001120000_eventos_compras.sql`: `evento_compras`, `evento_tickets`, `evento_formulario_respuestas`, `evento_notificaciones`, indexes, triggers, RLS, grants.
2. `20261001120100_eventos_compras_rpc.sql`: private helpers, the purchase RPCs, and grants (revoke from `public` first).
3. `20261001120200_eventos_compras_storage_cron.sql`: `evento_compra_acepta_archivo`, the storage policies, and `cron.schedule('expirar-compras-eventos', '*/5 * * * *', …)` (unschedule first if present, so it can be re-run).

Apply with `supabase migration up` / `supabase db reset` **locally only**. Regenerate the types if the project keeps a generated database types file (it currently does not appear to). Rollback: drop the cron job, the storage policies, the functions and then the tables, in reverse order. No existing data is altered.

## Implementation notes (added during apply)

- **Rejection reason.** `validar_compra_evento` raises `MOTIVO_REQUERIDO` when rejecting without a 1–500 char reason; the service maps it to `invalid_data`.
- **Storage helpers.** The read policy uses a second helper, `evento_compra_archivo_legible`. Both helpers take the folder segments as text and cast them safely, so a malformed path can never raise inside a policy that is also evaluated for other paths.
- **Helpers live in `public`.** There is no `private` schema; helpers are prefixed with `_` and have every grant revoked.
- **Lock order.** `iniciar_compra_evento` locks the main and bundled events together, in id order, before checking visibility and capacity.
- **Form header in step 2.** Built from the snapshot rows and `eventos.nombre_tenant`. `FormularioHeaderEditor` is not used: it reads `tenants`, which a guest cannot.
- **Snapshot fields.** `campos` stores the whole esquema row minus timestamps (including `id`, `columna_ancho`, `seccion_subtitulo`), so the shared form renderers work unchanged.
- **Own rows only.** `listMisCompras` and `getMiTicketEnEvento` filter by the caller's id; RLS alone would also return a staff member's tenant rows.
- **`useMiTicketEnEvento`.** Small hook added for the portal event page note.
- **Type check.** `npx tsc --noEmit` with the repo config also compiles Next's generated `.next/dev/types`, which were corrupted locally; the check was run over `src/` only.

### D12. Múltiple bundles are limited to one form (added after review)
A purchase stores one set of answers: the main event's. Instead of silently skipping a bundled event's form, the bundle is restricted: a bundled event may have **no form or the same template** as the main event.
- **Server:** `guardar_evento_completo` (final saves) raises `BUNDLE_FORMULARIO_DISTINTO`, and `FORMULARIO_EN_PAQUETE_DISTINTO` for the reverse case (a bundled event switching to another form). Migration `20261002120000_eventos_bundle_formulario.sql`.
- **Wizard:** the bundle selector shows a notice, disables conflicting events ("Formulario distinto") and flags already selected ones.
- **Not enforced at purchase time:** legacy bundles saved before this rule would still sell with only the main event's form.
- **Alternative considered:** asking for every bundled event's form (one answers row per event). More complete, but it changes the answers table, the RPCs, the checkout and "Ver datos"; left for a later change.

## Open Questions

- D4 (form snapshot + answers tables, decided in review) and D11 (the email-promising copy) go beyond the user story.
- A buyer's age is only validated as a date after 1900-01-01 and before today; there is no minimum age. This is assumed per the user story.
