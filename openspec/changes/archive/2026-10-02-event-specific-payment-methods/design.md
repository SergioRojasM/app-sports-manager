## Context

- `eventos.metodos_pago` (jsonb) stores snapshots (`EventoMetodoPagoSnapshot`) of the tenant methods ticked in wizard step 3. `evento_entradas` has no payment data.
- Saving goes through one atomic RPC, `guardar_evento_completo` (SECURITY INVOKER, latest definition in `20261002120000_eventos_bundle_formulario.sql`). Purchasing goes through `iniciar_compra_evento` (SECURITY DEFINER, `20261001120100_eventos_compras_rpc.sql`), which looks the chosen method up by `id` in `eventos.metodos_pago` and copies it into `evento_compras.metodo_pago`.
- The checkout reads the event through `eventosService` and the tickets through `eventoComprasService.listEntradasVendibles`; `useEventoCompra` derives `metodosOnline` and every consumer (`EventoCompraPasoPago`, `EventoEntradasModal`) renders that list.
- `MetodoPagoFormModal` + `storageService.uploadMetodoPagoQr` already implement the payment method form and QR upload (US-0128). The QR path only needs a tenant id and a method id.
- No mockup exists for the wizard; it uses grit-arena-v2 tokens and the shared `fields.tsx` primitives.

## Goals / Non-Goals

**Goals:**
- Per-event and per-ticket payment methods, including methods that never reach `tenant_metodos_pago`.
- Keep `id`-based method selection at checkout and server-side re-validation.
- Zero data migration for existing events.

**Non-Goals:**
- Changes to tenant payment method CRUD, purchase tables, event detail page, "Compras" or "Mis entradas".
- Promoting an event-only method to the tenant catalog.
- Storage cleanup of unused QR images.

## Decisions

### Data flow

```
Wizard step 3
  section 1 ──► draft.metodosPago ───────────────► p_evento.metodos_pago ──► eventos.metodos_pago
  section 2 ──► draft.entradas[i].metodosPago ───► p_entradas[i].metodos_pago ─► evento_entradas.metodos_pago
                                    (guardar_evento_completo, one transaction)

Checkout
  eventos.metodos_pago ─┐
                        ├─► useEventoCompra.metodosOnline (no cash, dedupe by id) ─► EventoCompraPasoPago
  entrada.metodos_pago ─┘
  iniciar_compra_evento: lookup id in (evento.metodos_pago || entrada.metodos_pago) ─► evento_compras.metodo_pago
```

### 1. Ticket methods as a jsonb column on `evento_entradas`
Same format as `eventos.metodos_pago`, as requested. Alternative: a child table `evento_entrada_metodos_pago` — rejected: the data is a snapshot with no relational use, and a column rides on the existing ticket sync (delete/upsert) of the RPC with no extra statements.

### 2. Event-only methods are plain snapshots with a client-generated id
`crypto.randomUUID()` gives the snapshot an `id`, so the checkout radio group, `p_metodo_pago_id uuid` and the RPC lookup work unchanged. Alternative: store them in `tenant_metodos_pago` with a hidden/`evento_id` flag — rejected: the requirement is that they must not be stored there, and it would leak into every other consumer of that table.

### 3. Optional `origen: 'tenant' | 'evento'` on the snapshot
Needed to tell an event-only method from a tenant method that was deactivated or deleted (which shows "(inactivo o eliminado)" and is not editable). Absent = `'tenant'`, so stored snapshots stay valid. Alternative: infer by "id not in active tenant methods" — rejected: ambiguous with stale tenant methods. The field is display-only for the admin; the checkout ignores it.

### 4. Reuse `MetodoPagoFormModal` with `variant="evento"`
Guarantees the same fields and validations as the tenant form. The variant hides "Activo" and changes title/helper text. The modal keeps its `onSubmit(data, qr)` contract; the caller (`EventoMetodoPagoAgregarModal`) decides what to do: for the event variant it uploads the QR with `uploadMetodoPagoQr(supabase, tenantId, snapshotId, file)` and builds the snapshot, never calling `metodosPagoService`. For editing, the snapshot is adapted to the `editTarget` shape (`activo: true`, `orden: 0`, empty timestamps). Alternative: a new form component — rejected: duplicated validation that would drift.

### 5. QR is uploaded when the form is confirmed, not on event save
The path does not depend on the event id, so it works for unsaved events and keeps `guardar_evento_completo` free of file handling. Trade-off: an abandoned wizard leaves an unused object (same as the banner flow today).

### 6. Wizard state: target-based actions
`useEventoWizard` exposes `addMetodoPago(target, snapshot)`, `updateMetodoPago(target, snapshot)`, `removeMetodoPago(target, id)` with `target = { tipo: 'evento' } | { tipo: 'entrada'; clientKey }`, replacing `toggleMetodoPago` / `setMetodosPago`. The consistency rules live in these reducers: no duplicate `id` in a list; adding to the event removes the `id` from every ticket. `EventoEntradaDraft.metodosPago` travels with the ticket, so deleting a ticket drops its methods and reordering needs no handling.

### 7. Validation per paid ticket, on both sides
Client (`eventos-wizard.utils.ts`, final save only): `ERROR_KEYS.metodosPago` when nothing exists anywhere; `ERROR_KEYS.metodosPagoEntrada(clientKey)` per uncovered paid ticket; both map to step 3 in `stepOfErrorKey`. Server: the single `v_any_paid` check becomes a per-ticket check in the completeness loop, same code `METODO_PAGO_REQUERIDO`. Shape validation (`METODOS_PAGO_INVALIDOS`) is added for ticket arrays in the always-on loop. The cash-only condition stays a non-blocking client warning, now per ticket.

### 8. Server lookup by array concatenation
`jsonb_array_elements(v_evento.metodos_pago || v_entrada.metodos_pago)`: `v_entrada` is already `select *` of the purchased ticket, so methods of other tickets are never candidates. The client mirrors this in `metodosOnline` (event first, then ticket, dedupe by `id`) and clears `metodoPagoId` in an effect when it is no longer in the list.

### 9. One migration, full function replacement
`20261007120000_evento_entradas_metodos_pago.sql` adds the column and re-creates both functions by copying their latest full definitions and applying the edits (the project's established pattern). Signatures and grants do not change.

## Risks / Trade-offs

- [Copying a stale function body would silently revert later fixes] → Copy from the latest definitions listed above; diff the new bodies against them before applying.
- [Client-generated ids could collide with a tenant method id] → UUID v4; lists are de-duplicated by `id` on both sides, so a collision only hides one entry.
- [Signed QR URLs of event-only methods expire like tenant ones] → Same TTL and behavior as US-0128 (`MetodoPagoQrImage` hides on load error); no new risk introduced.
- [Orphaned QR objects from removed or abandoned event-only methods] → Accepted; out of scope.
- [Admins used to the checkbox list find step 3 empty on new events] → Empty states and helper texts explain the add flow; existing events keep their methods in section 1.
- [Payload from an old client tab omits ticket `metodos_pago` after deploy] → The RPC defaults to `[]`; for an existing ticket this would clear its methods, but only event-level methods exist before this change.

## Migration Plan

1. Apply the migration **locally only** (`supabase migration up` / `supabase db reset`); never push it to the remote Supabase project from this change.
2. Deploy order when released: migration first (column default and RPC changes are backward compatible with the old client), then the app.
3. Rollback: redeploy the previous app; restore the two functions from `20261002120000` / `20261001120100`; the column can stay (unused) or be dropped.

## Open Questions

None.
