## 1. Branch setup

- [x] 1.1 Create a new branch `feat/team-events-management-phase-four` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Pages

- [x] 2.1 Create `src/app/portal/(atleta)/mis-entradas/page.tsx`: renders `<MisEntradasPage />` (inside `<Suspense fallback={null}>` if the component reads search params), following the "Mis Reservas" page pattern
- [x] 2.2 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/compras/page.tsx`: an async server page that awaits `params` and renders `<EventoComprasPage tenantId eventoId />`

## 3. Checkout components (`src/components/portal/eventos/compra/`)

- [x] 3.1 `PoliticaCancelacion.tsx`: renders `politicaCancelacionTexto(horas)` with an info icon
- [x] 3.2 `EventoCompraEstadoBadge.tsx`: text badge from `EVENTO_COMPRA_ESTADO_LABELS`, one tone per estado (never color only)
- [x] 3.3 `EventoCompraStepper.tsx`: "Entrada › Datos › Pago › Listo", with "Pago" hidden when `total === 0`, and `aria-current="step"` on the current step
- [x] 3.4 `EventoCompraPasoEntrada.tsx`:
  - a native radio group of sellable tickets: name, `formatCop` / "Gratis", a *Múltiple* badge + "Incluye acceso a este evento y a: {names}" / "N eventos más";
  - the coupon input (uppercased) + "Aplicar" → "{pct} % · {valor} → {total}" or the error; disabled for free tickets;
  - `PoliticaCancelacion`, the total, and the guest note + "¿Prefieres crear una cuenta?" link in `invitado` mode;
  - the blocking states: no sellable ticket, sale closed "La venta cerró {N} h antes del evento.", and "Ya tienes una entrada para este evento." + "Ver mis entradas"
- [x] 3.5 `EventoCompraPasoDatos.tsx`:
  - fixed fields: name (≤150), email (guest: twice; registered: read-only), birth date;
  - profile fields from `perfil_campos_requeridos` minus the fixed ones, labelled via `FORMULARIO_PERFIL_CAMPOS`;
  - the form via `FormularioSeccionesGrouped` (header rows read-only), keeping `imagen` fields as in-memory `File`s;
  - inline errors
- [x] 3.6 `EventoCompraPasoPago.tsx`:
  - the order summary;
  - radio cards of the non-cash methods using `EventoMetodoPagoCard`;
  - the no-online-methods message;
  - a labelled proof input (JPEG/PNG/WebP/PDF, ≤5 MB) showing the name and size, with "Quitar"
- [x] 3.7 `EventoCompraPasoConfirmacion.tsx`, with `role="status"`:
  - title: "¡Entrada confirmada!" or "Compra recibida: el organizador validará tu pago";
  - the ticket list and `PoliticaCancelacion`;
  - "Descargar entrada (PDF)";
  - registered: "Ver mis entradas";
  - guest: the "Guarda tu entrada… crea una cuenta con **{email}**" notice and "Crear mi cuenta" → `/auth/signup?next=/portal/mis-entradas`
- [x] 3.8 `compra/index.ts` barrel

## 4. Checkout shell and event page (`src/components/portal/eventos/`)

- [x] 4.1 Refactor `EventoEntradasModal.tsx` into the checkout shell:
  - remove `onContinuar`, the "próximamente" notice and the `precio`-based list;
  - wire `useEventoCompra({ evento, modo, open })`;
  - render the stepper, the current step and a sticky footer ("Atrás" / the primary action "Continuar" | "Confirmar compra" | "Obtener entrada gratis", or "Procesando…" while submitting);
  - "Reintentar" on submit errors, and the expired state;
  - full-screen below `sm`;
  - keep the dialog a11y; Escape is blocked while submitting; focus moves to each step heading
- [x] 4.2 Update the three call sites (`EventosPublicosPage`, `EventoDetallePortalPage`, `EventoDetalleLandingPage`) for the new props; no `onContinuar`
- [x] 4.3 `ObtenerEntradaModal.tsx`: change the hint to "Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo."
- [x] 4.4 `detalle/EventoDetallePortalPage.tsx`: call `getMiTicketEnEvento(eventoId)`. When a live ticket exists, show "Ya tienes una entrada para este evento · Ver mis entradas" instead of opening the checkout, including for `?entradas=1`

## 5. Mis Entradas components (`src/components/portal/mis-entradas/`)

- [x] 5.1 `MiCompraCard.tsx`:
  - content: banner/placeholder, event name, organization, date, place, ticket type, total, method, `EventoCompraEstadoBadge`, codes (one line per event), `motivo_rechazo`, `PoliticaCancelacion`;
  - actions: "Descargar PDF" / "Reenviar comprobante" / "Cancelar" / "Ver evento", following the visibility rules, each with its own pending state and inline error
- [x] 5.2 `ReenviarComprobanteModal.tsx`: a labelled file input (same limits), then upload + `reenviarComprobante`; inline mapped errors; Escape is blocked while submitting
- [x] 5.3 `CancelarCompraModal.tsx`: repeats the policy, then confirm → `cancelarCompra`; inline errors
- [x] 5.4 `MisEntradasPage.tsx`: a grit page header, *Próximas* / *Pasadas* tabs, the estado filter, a card list, loading/error/empty states ("Aún no tienes entradas." + "Explorar eventos" → `/portal/eventos`)
- [x] 5.5 `mis-entradas/index.ts` barrel

## 6. Admin Compras components (`src/components/portal/gestion-eventos/compras/`)

- [x] 6.1 `EventoComprasStats.tsx`: *En validación*, *Confirmadas*, *Ingresos confirmados*
- [x] 6.2 `EventoComprasTable.tsx`:
  - columns: Comprador (name, email, "Invitado" / "Registrado"), Entrada (+ *Múltiple*), Total (+ coupon), Método, Estado, Fecha, Acciones;
  - stacked below `md`, 20 per page;
  - actions: "Ver comprobante", "Ver datos", "Validar pago", "Rechazar" (the last two only for `en_validacion`)
- [x] 6.3 `CompraDatosModal.tsx`: fixed data, profile fields and form answers rendered as text; image answers open through signed URLs
- [x] 6.4 `ValidarCompraModal.tsx` and `RechazarCompraModal.tsx` (required `motivo`, 1–500 chars, with a counter): inline errors; `onSuccess` reloads
- [x] 6.5 `EventoComprasPage.tsx`:
  - header with the event name and "Vendidas: X / {cupo | ilimitado}";
  - stats, filters (estado + search), table, pagination;
  - loading / error-with-retry / empty states
- [x] 6.6 `compras/index.ts` barrel

## 7. Management, wizard and navigation updates

- [x] 7.1 `EventoActionsMenu.tsx`: a "Ver compras" item (icon `receipt_long`) for published events only, via a new `onVerCompras` callback
- [x] 7.2 Wire `onVerCompras` → `router.push('/portal/orgs/{t}/gestion-eventos/{id}/compras')` in `GestionEventosPage.tsx`, `EventosGrid.tsx`, `EventosTable.tsx` and `EventosCalendar.tsx`
- [x] 7.3 `EliminarEventoModal.tsx`: show the `has_purchases` message inline (the modal stays open)
- [x] 7.4 `wizard/EventoMetodosPagoStep.tsx`: tag cash methods with "No disponible para compra en línea"; warn "Los compradores no podrán pagar en línea" when a paid event has only cash methods checked (not blocking)
- [x] 7.5 `wizard/EventoConfiguracionStep.tsx`: helper "Déjalo vacío si las entradas no admiten cancelación ni reembolso." under `cancelacion_antelacion_horas`
- [x] 7.6 `PortalBreadcrumb.tsx`: labels `mis-entradas` → "Mis entradas" and `compras` → "Compras"
- [x] 7.7 `src/types/portal.types.ts`: `MIS_ENTRADAS_MENU_ITEM` ("Mis Entradas", `/portal/mis-entradas`, icon `confirmation_number`) right after `MIS_RESERVAS_MENU_ITEM` in the no-tenant menu

## 8. Hooks

- [x] 8.1 `src/hooks/portal/eventos/useEventoCompra.ts`:
  - step state;
  - loading: sellable tickets (`listEntradasVendibles` + `entradaVendible`), bundle names, form snapshot (`getFormularioEvento`; cancellation hours come from the listing item), existing ticket (`getMiTicketEnEvento`, registered), prefill from `usuarios` / `perfil_deportivo` (registered);
  - coupon validate/clear;
  - buyer data, form values and validation;
  - method (non-cash filter) and proof validation;
  - submit sequence `iniciarCompra` → uploads → `finalizarCompra`, with retry that reuses `compraId`, and the 30-min expiry → restart at step 1;
  - the step 4 result;
  - reset when the event or `open` changes;
  - `console.error` for unexpected errors
- [x] 8.2 `src/hooks/portal/mis-entradas/useMisEntradas.ts`:
  - load: `vincularComprasInvitado()` then `listMisCompras()`;
  - tabs + estado filter;
  - `puedeCancelar`;
  - cancel / re-upload actions with per-item pending state and errors, then reload
- [x] 8.3 `src/hooks/portal/gestion-eventos/useEventoCompras.ts`: the list + `contarVendidas` + derived stats, filters, 20-row pagination, reload
- [x] 8.4 `src/hooks/portal/gestion-eventos/useValidarCompraEvento.ts`: validate/reject with `isSubmitting` / `error` / `onSuccess`

## 9. Service

- [x] 9.1 Create `src/services/supabase/portal/eventos-compras.service.ts`:
  - `eventoComprasService` with every function listed in the spec, including `getFormularioEvento` (the `vigente` `evento_formularios` row) and `listComprasEvento` embedding `evento_formulario_respuestas` + its snapshot;
  - `subirArchivoCompra` uploads to `compras-eventos/{t}/{c}/{kind}-{Date.now()}.{ext}` with `upsert: false`;
  - `getArchivoUrl` uses `storageService.getSignedUrl(path, 300)`;
  - `mapCompraError` parses `CODE[:detail]`
- [x] 9.2 `src/services/supabase/portal/eventos.service.ts`: add `cancelacion_antelacion_horas` to `EVENTOS_PUBLICOS_LIST_SELECT` (map it into the list item; keep the detail select valid); in `deleteEvento`, map `23503` → `EventoServiceError('has_purchases', 'No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar.')` before the generic `invalid_reference` mapping

## 10. Types and lib

- [x] 10.1 Create `src/types/portal/eventos-compras.types.ts`:
  - `EventoCompraEstado` + `EVENTO_COMPRA_ESTADO_LABELS`, `EventoTicketEstado`;
  - `EntradaVendible`, `CuponValidacion`, `EventoFormularioSnapshot` (+ `EventoFormularioCampo`), `EventoFormularioRespuesta`, `CompradorInput`, `IniciarCompraInput`;
  - `CompraResultado`, `TicketResultado`, `MiCompra`, `CompraAdminItem`, `TicketPdfData`;
  - `EventoCompraServiceErrorCode` + the `EventoCompraServiceError` class
- [x] 10.2 `src/types/portal/eventos.types.ts`: add `has_purchases` to `EventoServiceErrorCode`; move `cancelacionAntelacionHoras` from `EventoPublicoDetalle` to `EventoPublicoListItem` (update `toDetallePreviewItem` if needed)
- [x] 10.3 Create `src/lib/portal/eventos-compra.utils.ts`: an adapter from `EventoFormularioSnapshot.campos` to the shape `FormularioSeccionesGrouped` expects, `entradaVendible(entrada, evento, now)`, `ventaCerradaPorAntelacion`, `puedeCancelarCompra(...)`, `slugify`, file validation (types, 5 MB), and the `MiCompra` / `CompraResultado` → `TicketPdfData[]` mappers
- [x] 10.4 Create `src/lib/portal/eventos-ticket-pdf.ts`:
  - `politicaCancelacionTexto(horas)`;
  - `descargarEntradasPdf(tickets, fileName)` with dynamic `import('jspdf')` / `import('qrcode')`;
  - A5, one page per ticket, Bogotá date/time;
  - QR only for `activa`; the pending banner for `pendiente`; `anulada` tickets skipped
- [x] 10.5 Add the dependencies: `npm install jspdf qrcode` and `npm install -D @types/qrcode`

## 11. Database (local only — never push to remote)

- [x] 11.0 `supabase/migrations/20261001115000_evento_formularios.sql`:
  - the `evento_formularios` table (versioned snapshot: `nombre`, `perfil_campos_requeridos`, `campos`, `contenido_hash`, `vigente`, `formulario_plantilla_id` on delete set null), `uq_evento_formularios_vigente`;
  - RLS: select for anon + authenticated via readable `eventos`, insert/update for tenant trainers/admins, no delete;
  - re-create `guardar_evento_completo` (same signature, grants and security invoker) adding the snapshot sync (hash compare → retire + insert; null form → retire);
  - backfill a `vigente` snapshot for every existing event with `formulario_id`
- [x] 11.1 `supabase/migrations/20261001120000_eventos_compras.sql`: `evento_compras` (no form columns), `evento_tickets`, `evento_formulario_respuestas` (`compra_id` unique, `evento_formulario_id` on delete restrict, select for staff or buyer) and `evento_notificaciones` with all checks, indexes (including `uq_evento_tickets_evento_email`), `updated_at` triggers, RLS, revokes, `select` grants and the two select policies
- [x] 11.2 `supabase/migrations/20261001120100_eventos_compras_rpc.sql`:
  - private helpers `_evento_visible_para_compra`, `_expirar_compras_pendientes`, `_generar_codigo_ticket`, `_encolar_notificacion`;
  - public RPCs `validar_cupon_evento`, `iniciar_compra_evento`, `finalizar_compra_evento`, `reenviar_comprobante_compra_evento`, `cancelar_compra_evento`, `validar_compra_evento`, `vincular_compras_invitado`, `expirar_compras_evento_pendientes`;
  - all `security definer` with `set search_path = public`; `revoke all … from public`, then the grants per the spec;
  - lock events `for update` in id order; re-raise `23505` as `ENTRADA_DUPLICADA`;
  - form validation and the answers row use only the `vigente` `evento_formularios` snapshot (never the templates); `finalizar` writes form image paths to `evento_formulario_respuestas.archivos`
- [x] 11.3 `supabase/migrations/20261001120200_eventos_compras_storage_cron.sql`: the `evento_compra_acepta_archivo` helper, the `evento_compra_upload` (insert, anon + authenticated) and `evento_compra_read` (select, authenticated) policies, no update/delete policies, and the `expirar-compras-eventos` cron (`*/5 * * * *`, unscheduled first if it exists)
- [x] 11.4 Apply locally (`supabase migration up`) and verify in SQL, as anon / guest / registered / other user / member / staff:
  - direct writes denied, and the read scopes;
  - storage upload/read rules, including `org_member_read` not exposing `compras-eventos/`;
  - each RPC error branch;
  - concurrency of the last seat (two sessions);
  - bundle rollback, lazy + cron expiry, snapshot versioning on event save (unchanged → no new row; template edited → new version; answers keep their version; anon reads only visible events' snapshots), linking only with `email_confirmed_at`, and the outbox rows per transition

## 12. Verification

- [x] 12.1 Guest paid purchase → the admin validates → the guest signs up with the same email → "Mis Entradas" shows it confirmed → the PDF has a QR code
- [x] 12.2 Registered free purchase (single RPC call, "¡Entrada confirmada!"); 100 % coupon; `omitir_confirmacion_compra` auto-confirm
- [x] 12.3 *Múltiple* purchase (two tickets, two PDF pages); bundle full → nothing written
- [x] 12.4 Coupon valid / invalid / other ticket; capacity exhausted; duplicate email; cash-only event; sale window and lead-time blocking
- [x] 12.5 Proof upload failure + "Reintentar" (same codes); expiry after 30 min (message + restart)
- [x] 12.6 Reject → re-upload; cancel within the window and outside it; null cancellation policy (no "Cancelar")
- [x] 12.7 Admin page: sold count, stats, filters, pagination, "Ver comprobante", "Ver datos", stale-state error; a trainer is redirected
- [x] 12.8 Form snapshot: guest sees the event form; edit the template without re-saving the event → checkout unchanged; re-save → new version; "Ver datos" of an older purchase still shows its original labels
- [x] 12.9 "Ya tienes una entrada" on the portal event page and in step 1; deleting an event with sales shows the inline message; wizard cash tag, warning and cancellation helper
- [x] 12.10 Regression: US-0120 listing, detail and get-ticket flows; "Continuar sin registro" now leads to a working checkout; mobile full-screen modal with the sticky footer

## 13. Documentation

- [x] 13.1 Update `projectspec/03-project-structure.md`:
  - the routes `/portal/mis-entradas` and `/gestion-eventos/[evento_id]/compras`;
  - the slices `components/portal/eventos/compra`, `components/portal/mis-entradas`, `components/portal/gestion-eventos/compras`, the new hooks, `eventos-compras.service.ts`, and the lib files;
  - the tables `evento_formularios` (versioned snapshot; template edits apply only when the event is saved again) / `evento_formulario_respuestas` / `evento_compras` / `evento_tickets` / `evento_notificaciones`, the snapshot sync in `guardar_evento_completo`, the RPCs, the storage folder `compras-eventos/`, and the `expirar-compras-eventos` cron;
  - the `jspdf` / `qrcode` dependencies;
  - the email-confirmation dependency of guest linking

## 14. Quality checks, commit and PR

- [x] 14.1 Run the type check (`npx tsc --noEmit`), lint (`npm run lint` on the changed files) and the tests (`npm test`, if configured); fix any failures. Do **not** run the build.
- [x] 14.2 Write the commit message (Conventional Commits, e.g. `feat(team-events-management-phase-four): add ticket purchase, mis entradas and purchase validation`) and the pull request description: summary, US-0121 link, migration notes (local only), new dependencies, the deviations from the user story (the `evento_formularios` / `evento_formulario_respuestas` tables, the corrected no-email copy), a screenshots checklist, and a test plan

## 15. Múltiple bundles limited to one form (added after review)

- [x] 15.1 `supabase/migrations/20261002120000_eventos_bundle_formulario.sql`: `guardar_evento_completo` rejects, on final saves, a bundled event with a different form (`BUNDLE_FORMULARIO_DISTINTO`) and a bundled event switching to another form (`FORMULARIO_EN_PAQUETE_DISTINTO`); applied locally and verified in SQL
- [x] 15.2 `EventoListItem.formularioId` (service mapper + wizard card preview); map both error codes in `eventos.service.ts`
- [x] 15.4 Form template editor (`FormularioEditorPage`): notice with the number of events that use the template and a link to the events page (`eventosService.listEventosPorFormulario`, `useEventosConFormulario`) and telling the admin to save each event again after editing the template
- [x] 15.3 `EventoBundleSelector`: notice, conflicting events disabled with "Formulario distinto", inline error for already selected conflicts; `EventoEntradasEditor` passes the event's current form
