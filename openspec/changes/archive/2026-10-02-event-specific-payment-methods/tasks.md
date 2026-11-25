## 1. Branch

- [x] 1.1 Create branch `feat/event-specific-payment-methods` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Database (local only)

- [x] 2.1 Create `supabase/migrations/20261007120000_evento_entradas_metodos_pago.sql`: add `evento_entradas.metodos_pago jsonb not null default '[]'`, constraint `evento_entradas_metodos_pago_array_ck`, and column comments (`evento_entradas.metodos_pago`, `eventos.metodos_pago`)
- [x] 2.2 In the same migration, re-create `guardar_evento_completo` from its latest definition (`20261002120000_eventos_bundle_formulario.sql`): validate each ticket's `metodos_pago` shape (`METODOS_PAGO_INVALIDOS`), replace the `v_any_paid` check with the per-paid-ticket coverage check (`METODO_PAGO_REQUERIDO`), and write `metodos_pago` in the `evento_entradas` insert and `on conflict` update; keep signature and grant
- [x] 2.3 In the same migration, re-create `iniciar_compra_evento` from its latest definition (`20261001120100_eventos_compras_rpc.sql`): look the method up in `v_evento.metodos_pago || v_entrada.metodos_pago`; keep signature and grants
- [x] 2.4 Diff both new function bodies against their source definitions to confirm only the intended lines changed
- [x] 2.5 Apply the migration to the local Supabase only (never push to remote) and confirm `anon` can select `evento_entradas.metodos_pago` of a public published event

## 3. Components

- [x] 3.1 `src/components/portal/tenant/MetodoPagoFormModal.tsx`: add `variant?: 'tenant' | 'evento'` (default `'tenant'`); event variant hides "Activo", uses the titles "Nuevo método de pago del evento" / "Editar método de pago del evento" and the helper text; tenant behavior unchanged
- [x] 3.2 Create `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoList.tsx`: method cards (name, tipo label, valor, url, comentarios; tags "Solo este evento", "No disponible para compra en línea", "QR"; "(inactivo o eliminado)" note), "Quitar" on all, "Editar" only for `origen: 'evento'`, empty state text prop, "Agregar método de pago" button, inline `FieldError`
- [x] 3.3 Create `src/components/portal/gestion-eventos/wizard/EventoMetodoPagoAgregarModal.tsx` (on `EventoModalShell`): options "Elegir un método existente" (filtered active tenant methods, empty message) and "Crear un método solo para este evento" (opens `MetodoPagoFormModal` `variant="evento"`); on submit generate the id, upload the QR with `storageService.uploadMetodoPagoQr`, build the snapshot with `origen: 'evento'`; upload failure keeps the form open; also handles edit of an event-only snapshot (keeps `id`, supports QR change/remove)
- [x] 3.4 Rebuild `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx`: sections "Métodos para todas las entradas" and "Métodos para una entrada específica" (one block per ticket, no-tickets hint), per-ticket cash-only warnings, free-event note, summary "{n} para todas las entradas · {m} por entrada"; remove "Seleccionar todos" / "Quitar todos"
- [x] 3.5 Wizard `index.ts` only exports `EventoWizardPage`; the new components are internal to the step and imported directly (no export needed)
- [ ] 3.6 Accessibility: labelled groups per section/ticket, focus trap and focus return in the add modal, accessible names on "Editar"/"Quitar" including the method name, error focus through `fieldDomId`

## 4. Hooks

- [x] 4.1 `src/hooks/portal/gestion-eventos/useEventoWizard.ts`: replace `toggleMetodoPago` / `setMetodosPago` with `addMetodoPago(target, snapshot)`, `updateMetodoPago(target, snapshot)`, `removeMetodoPago(target, id)`; enforce no duplicate id per list and removal from ticket lists when added to the event; new tickets start with `metodosPago: []`
- [x] 4.2 `src/hooks/portal/eventos/useEventoCompra.ts`: `metodosOnline` = event methods + selected ticket methods, without cash, de-duplicated by `id`; clear `metodoPagoId` when it is not in the list after a ticket change

## 5. Lib and services

- [x] 5.1 `src/lib/portal/eventos-wizard.utils.ts`: map ticket `metodos_pago` ⇄ `metodosPago` in `draftFromEventoCompleto` and `draftToPayload`; keep them in `draftFromEventoDuplicado`; default `[]` in the new-ticket factory
- [x] 5.2 `src/lib/portal/eventos-wizard.utils.ts`: add `ERROR_KEYS.metodosPagoEntrada(clientKey)` mapped to step 3 in `stepOfErrorKey`; replace the step-3 rule with the per-paid-ticket coverage validation and the new messages
- [x] 5.3 `src/services/supabase/portal/eventos.service.ts`: normalize each ticket's `metodos_pago` to an array in `getEventoCompleto`; update the `METODO_PAGO_REQUERIDO` message to "Agrega al menos un método de pago para las entradas con costo."
- [x] 5.4 `src/services/supabase/portal/eventos-compras.service.ts`: add `metodos_pago` to the `listEntradasVendibles` select and map it to `metodosPago`

## 6. Types

- [x] 6.1 `src/types/portal/eventos.types.ts`: `origen?: 'tenant' | 'evento'` on `EventoMetodoPagoSnapshot`; `metodos_pago` on `EventoEntrada` and on the RPC ticket payload type; `metodosPago` on `EventoEntradaDraft` and `EntradaVendible`; update doc comments

## 7. Verification

- [x] 7.1 Wizard: new event starts with both sections empty; add existing and event-only methods to both sections; picker exclusions; promote-to-all removes from tickets; edit/remove; QR tag; no row created in `tenant_metodos_pago`
- [x] 7.2 Wizard: publish blocked for uncovered paid tickets (both messages, step 3 "Revisar"); draft not blocked; free event publishes with no methods; cash-only warning per ticket
- [x] 7.3 Wizard: reopen a saved event (both sections restored), open an event saved before this change (methods in section 1), delete a ticket with methods, duplicate an event with ticket methods
- [x] 7.4 Checkout as user and as guest: merged list without cash or duplicates, methods of other tickets hidden, ticket change clears the selection, purchase with a ticket-specific method stores the snapshot and shows in "Compras" and "Mis entradas"
- [x] 7.5 Direct RPC calls on local: `guardar_evento_completo` with malformed ticket `metodos_pago` → `METODOS_PAGO_INVALIDOS`, uncovered paid ticket → `METODO_PAGO_REQUERIDO`; `iniciar_compra_evento` with another ticket's method or a cash method → `METODO_PAGO_INVALIDO`

## 8. Documentation and delivery

- [x] 8.1 Update `projectspec/03-project-structure.md`: wizard step 3 components, `MetodoPagoFormModal` variant, `evento_entradas.metodos_pago`, `eventos.metodos_pago` snapshot fields, both RPCs, `useEventoCompra` / `listEntradasVendibles`
- [x] 8.2 Run type check (`npx tsc --noEmit`) and lint (`npm run lint`), plus tests if a test runner is configured (none in `package.json` today); do not run the build
- [x] 8.3 Write the commit message and the pull request description for the implementation
