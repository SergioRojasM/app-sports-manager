# US-0130 — Event- and Ticket-Specific Payment Methods

## ID
US-0130

## Name
Let the admin add payment methods per event and per ticket in the event wizard, including one-off methods that are never stored in the tenant's payment methods

## As a
Tenant administrator (or trainer with access to the event wizard)

## I Want
To build the list of payment methods of an event myself — for all tickets and for one specific ticket — choosing an existing tenant method or creating a new one that only exists for that event

## So That
I can charge an event (or one ticket of it) through accounts, links or QR codes that are different from the organization's fixed payment methods, without polluting the tenant's payment method catalog

---

## Description

### Current State

- Step 3 of the event wizard ([EventoMetodosPagoStep.tsx](../../src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx)) lists **every active row of `tenant_metodos_pago`** as a checkbox card. The admin can only tick or untick them ("Seleccionar todos" / "Quitar todos").
- The ticked methods are copied as snapshots (`EventoMetodoPagoSnapshot`: `id, nombre, tipo, valor, url, comentarios, qr_url`) into `eventos.metodos_pago` (jsonb array) by the `guardar_evento_completo` RPC.
- There is no way to create a payment method that belongs only to the event, and no way to attach a payment method to a single ticket. `evento_entradas` has no payment method column.
- At checkout ([useEventoCompra.ts](../../src/hooks/portal/eventos/useEventoCompra.ts)), the "Pago" step shows `evento.metodosPago` minus cash. `iniciar_compra_evento` validates the chosen method against `eventos.metodos_pago` only.

### Proposed Changes

#### 1. Data model

- New column `evento_entradas.metodos_pago jsonb not null default '[]'`, same format as `eventos.metodos_pago` (array of `EventoMetodoPagoSnapshot`).
- `eventos.metodos_pago` keeps its meaning: methods valid for **all tickets** of the event.
- `EventoMetodoPagoSnapshot` gets one new optional field:
  - `origen?: 'tenant' | 'evento'` — `'tenant'` when copied from `tenant_metodos_pago`, `'evento'` when created inside the wizard. Absent on snapshots saved before this story and treated as `'tenant'`.
- A method created in the wizard (`origen: 'evento'`):
  - Gets a client-generated `id` (`crypto.randomUUID()`), so the checkout and `iniciar_compra_evento` keep identifying methods by `id`.
  - Is **never** inserted into `tenant_metodos_pago`. It lives only in the snapshot (`eventos.metodos_pago` or `evento_entradas.metodos_pago`).
  - Has no `activo` and no `orden` (order is the array order).

#### 2. Wizard — Step 3 "Métodos de pago"

Replace the checkbox list with two sections. Both start **empty** on a new event. On an existing event they load what is stored (`eventos.metodos_pago` → section 1, each `evento_entradas.metodos_pago` → section 2), so already-published events keep working without a data migration.

**Section 1 — "Métodos para todas las entradas"**
- Description: "Estos métodos se muestran a quienes compren cualquier entrada del evento."
- Empty state: "Aún no has agregado métodos de pago para todas las entradas."
- Button "Agregar método de pago".

**Section 2 — "Métodos para una entrada específica"**
- Description: "Estos métodos solo se muestran a quienes compren la entrada indicada."
- One block per ticket of `draft.entradas` (in on-screen order), titled with the ticket name (fallback "Entrada sin nombre") and its price. Each block has its own list, its own empty state ("Sin métodos específicos") and its own "Agregar método de pago" button.
- When the event has no tickets: "Agrega entradas en el paso anterior para asignarles métodos de pago." and no button.

**"Agregar método de pago" (same behavior in both sections)** opens a small menu/dialog with two options:

1. **"Elegir un método existente"** — lists the tenant's active payment methods (`options.metodosPago`), excluding those already present in the target list and, for a ticket, those already in section 1. Selecting one appends `toSnapshot(metodo)` with `origen: 'tenant'`. When nothing is left to pick: "No hay más métodos de tu organización para agregar."
2. **"Crear un método solo para este evento"** — opens `MetodoPagoFormModal` in a new `variant="evento"`:
   - Same fields and validations as the tenant form: `nombre` (required), `tipo` (required: transferencia / efectivo / tarjeta / pasarela / otro), `valor`, `url` (http/https only), `comentarios`, "Imagen QR" (JPEG/PNG/WebP ≤ 2 MB).
   - The "Activo" toggle is hidden; title "Nuevo método de pago del evento"; helper text "Este método solo existe en este evento. No se guarda en los métodos de pago de tu organización."
   - On submit: generate the `id`; if a QR file was chosen, upload it with the existing `storageService.uploadMetodoPagoQr(supabase, tenantId, id, file)` and store the signed URL in `qr_url`; append the snapshot with `origen: 'evento'` to the target list. A failed upload keeps the modal open with the error and adds nothing.
   - No call to `metodosPagoService` is made.

**Method cards (both sections)** show name, tipo label, `valor`, `url`, `comentarios`, the "QR" tag, and:
- Tag "Solo este evento" when `origen === 'evento'`.
- Tag "No disponible para compra en línea" when `tipo === 'efectivo'` (existing rule).
- Note "(inactivo o eliminado)" when `origen !== 'evento'` and the `id` is no longer in the tenant's active methods (existing stale behavior). It stays until removed.
- "Quitar" button on every card.
- "Editar" button only on `origen: 'evento'` cards: reopens the form pre-filled; saving replaces the snapshot in place keeping its `id`. Tenant-origin snapshots are not editable in the wizard.

**Consistency rules**
- A method `id` may appear at most once per list.
- Adding a method to section 1 removes the same `id` from every ticket list (it already applies to all tickets).
- Deleting a ticket in step 2 discards its methods. Reordering tickets does not affect them.
- "Seleccionar todos" / "Quitar todos" are removed.

**Validation (final save / publish only; drafts are not blocked)**
- For every ticket with `valor > 0`: `eventos.metodos_pago` ∪ that ticket's `metodos_pago` must contain at least one method. Otherwise:
  - If section 1 is empty and no ticket has methods: existing error on `ERROR_KEYS.metodosPago` — "Agrega al menos un método de pago para las entradas con costo."
  - Otherwise, per uncovered ticket: new key `ERROR_KEYS.metodosPagoEntrada(clientKey)` — "Esta entrada tiene costo y no tiene métodos de pago." (mapped to step 3 by `stepOfErrorKey`).
- Non-blocking warning (replaces the current `soloEfectivo` warning), shown per paid ticket whose effective methods are all cash: "Los compradores de «{entrada}» no podrán pagar en línea: el efectivo no se ofrece en la compra de entradas."
- Free tickets need no methods (existing text kept when all tickets are free).

**Summary panel**: "Métodos de pago" shows `{n} para todas las entradas · {m} por entrada` (or "Ninguno").

**Duplicate event (US-0122)**: `draftFromEventoDuplicado` copies both the event-level and the per-ticket methods unchanged (snapshot ids are not table rows, so they need no new identity).

#### 3. Checkout — "Pago" step

- The buyer sees one single list: event-level methods followed by the methods of the **selected ticket**, cash excluded, de-duplicated by `id`. Nothing indicates which section a method came from (transparent to the buyer).
- `listEntradasVendibles` also returns each ticket's `metodos_pago`.
- If the buyer changes the ticket and the previously chosen method is not in the new list, the selection is cleared.
- "Confirmar compra" stays disabled when the merged list is empty (existing behavior, now computed on the merged list).
- `iniciar_compra_evento` accepts a `p_metodo_pago_id` found in `eventos.metodos_pago` **or** in the purchased ticket's `evento_entradas.metodos_pago` (non-cash). The matched snapshot is stored in `evento_compras.metodo_pago` as today, so the admin purchases page and "Mis entradas" need no change.

---

## Database Changes

Migration `supabase/migrations/20261007120000_evento_entradas_metodos_pago.sql`:

```sql
alter table public.evento_entradas
  add column if not exists metodos_pago jsonb not null default '[]'::jsonb;

alter table public.evento_entradas
  add constraint evento_entradas_metodos_pago_array_ck
    check (jsonb_typeof(metodos_pago) = 'array');

comment on column public.evento_entradas.metodos_pago is
  'Payment method snapshots valid only for this ticket (US-0130). Same format as eventos.metodos_pago.';
comment on column public.eventos.metodos_pago is
  'Payment method snapshots valid for all tickets of the event: copied from tenant_metodos_pago or created only for the event (US-0119, US-0130).';
```

In the same migration, `create or replace` two functions (copy the latest full definitions, keep signatures and grants):

1. **`public.guardar_evento_completo`** (latest definition: `20261002120000_eventos_bundle_formulario.sql`)
   - In the always-on per-ticket loop, validate `v_entrada->'metodos_pago'` like the event-level one: must be an array of objects each with `id` and `nombre`; otherwise `raise exception 'METODOS_PAGO_INVALIDOS' using errcode = '23514'`.
   - Replace the final-save check `v_any_paid and jsonb_array_length(p_evento->'metodos_pago') = 0` with a per-ticket check: for each ticket with `valor > 0`, `jsonb_array_length(event methods) + jsonb_array_length(ticket methods) = 0` → `METODO_PAGO_REQUERIDO`.
   - Add `metodos_pago` to the `insert into evento_entradas (...)` column list (`coalesce(v_entrada->'metodos_pago', '[]'::jsonb)`) and to the `on conflict (id) do update set` list.

2. **`public.iniciar_compra_evento`** (latest definition: `20261001120100_eventos_compras_rpc.sql`, step "4. Payment method")
   ```sql
   select m.value into v_metodo
     from jsonb_array_elements(v_evento.metodos_pago || v_entrada.metodos_pago) as m(value)
    where m.value->>'id' = p_metodo_pago_id::text
      and coalesce(m.value->>'tipo', '') <> 'efectivo'
    limit 1;
   ```
   `METODO_PAGO_INVALIDO` is still raised when nothing matches.

**RLS / grants**: no new objects. `evento_entradas` keeps its policies (`evento_entradas_select_anon`, `evento_entradas_select_authenticated`, insert/update/delete for trainer/admin); the table-level `grant select ... to anon` already covers the new column, which guests need at checkout. `tenant_metodos_pago` is not written by this story. QR images reuse the `org-assets` path `orgs/{tenant_id}/metodos-pago/{id}/qr-{ts}.{ext}` and its existing storage policies.

No backfill: existing rows get `'[]'`.

---

## API / Server Actions

No new routes or services; existing functions change.

- **`src/services/supabase/portal/eventos.service.ts`**
  - `getEventoCompleto(...)`: already selects `evento_entradas(*)`; the returned `EventoEntrada` now includes `metodos_pago: EventoMetodoPagoSnapshot[]` (normalize non-arrays to `[]`).
  - `guardarEventoCompleto(...)` → RPC `guardar_evento_completo`: each item of `p_entradas` carries `metodos_pago`. Update the message for `METODO_PAGO_REQUERIDO` to "Agrega al menos un método de pago para las entradas con costo."
  - Auth: SECURITY INVOKER; admin/trainer of the tenant (unchanged).
- **`src/services/supabase/portal/eventos-compras.service.ts`**
  - `listEntradasVendibles(eventoId: string): Promise<EntradaVendible[]>`: add `metodos_pago` to the select and map to `metodosPago: EventoMetodoPagoSnapshot[]`.
  - `iniciarCompra(...)` → RPC `iniciar_compra_evento`: same parameters; server now also accepts ticket-level method ids.
  - Auth: readable by `anon` and `authenticated` through existing RLS; the RPC is SECURITY DEFINER and re-validates.
- **`src/services/supabase/portal/storage.service.ts`**
  - `uploadMetodoPagoQr(supabase, tenantId, metodoId, file)`: reused as is, with the client-generated snapshot id as `metodoId`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261007120000_evento_entradas_metodos_pago.sql` | Add `evento_entradas.metodos_pago`; replace `guardar_evento_completo` and `iniciar_compra_evento` |
| Types | `src/types/portal/eventos.types.ts` | `EventoMetodoPagoSnapshot.origen?`; `metodos_pago` on `EventoEntrada` and on the RPC ticket payload type; `metodosPago` on `EventoEntradaDraft` and `EntradaVendible` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Map `metodos_pago` ⇄ `metodosPago` in `draftFromEventoCompleto`, `draftToPayload`, new-ticket defaults; keep them in `draftFromEventoDuplicado`; `ERROR_KEYS.metodosPagoEntrada(clientKey)` + `stepOfErrorKey` → 3; per-ticket coverage validation |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | Replace `toggleMetodoPago` / `setMetodosPago` with `addMetodoPago(target, snapshot)`, `updateMetodoPago(target, snapshot)`, `removeMetodoPago(target, id)` where `target = { tipo: 'evento' } \| { tipo: 'entrada'; clientKey: string }`; enforce the consistency rules |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Rebuild as the two sections + summary |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoList.tsx` | New: method cards (tags, Editar/Quitar), empty state, "Agregar método de pago" |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodoPagoAgregarModal.tsx` | New: "Elegir un método existente" / "Crear un método solo para este evento"; handles QR upload and builds the snapshot |
| Component | `src/components/portal/gestion-eventos/wizard/index.ts` | Export the new components |
| Component | `src/components/portal/tenant/MetodoPagoFormModal.tsx` | Optional `variant?: 'tenant' \| 'evento'` (default `'tenant'`): hides "Activo", changes title and helper text |
| Service | `src/services/supabase/portal/eventos.service.ts` | Normalize ticket `metodos_pago`; update error message |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | `listEntradasVendibles` returns `metodosPago` |
| Hook | `src/hooks/portal/eventos/useEventoCompra.ts` | `metodosOnline` = event + selected ticket methods, non-cash, de-duplicated; clear `metodoPagoId` when it leaves the list |
| Docs | `projectspec/03-project-structure.md` | Update wizard step 3, `evento_entradas`, RPC and checkout notes |

`EventoCompraPasoPago.tsx`, `EventoMetodoPagoCard.tsx` and `EventoEntradasModal.tsx` need no change: they already render `compra.metodosOnline`.

---

## Acceptance Criteria

1. `evento_entradas` has a `metodos_pago jsonb not null default '[]'` column constrained to be a JSON array.
2. On a new event, step 3 shows "Métodos para todas las entradas" and "Métodos para una entrada específica", both empty; no tenant method is pre-selected.
3. Section 2 shows one block per ticket defined in step 2; with no tickets it shows the hint to add tickets and no add button.
4. "Agregar método de pago" → "Elegir un método existente" lists the tenant's active methods not yet in the target list (and, for a ticket, not in section 1) and adds the chosen one as a snapshot.
5. "Agregar método de pago" → "Crear un método solo para este evento" opens the tenant payment method form without the "Activo" toggle, with the same fields and validations (required `nombre` and `tipo`, http/https `url`, QR JPEG/PNG/WebP ≤ 2 MB).
6. After creating a one-off method and saving the event, `tenant_metodos_pago` has no new row and the method does not appear in "Gestión de organización".
7. A method added in section 1 is stored in `eventos.metodos_pago`; a method added to a ticket is stored in that ticket's `evento_entradas.metodos_pago`.
8. One-off methods show the "Solo este evento" tag and can be edited and removed; tenant-origin methods can only be removed.
9. A one-off method with a QR image shows the "QR" tag in the wizard and the QR image at checkout.
10. Adding to section 1 a method that a ticket already has removes it from that ticket's list.
11. Publishing an event where a paid ticket has no method in section 1 nor in its own list is blocked with the messages described above, the stepper marks step 3 "Revisar", and calling the RPC directly with such a payload fails with `METODO_PAGO_REQUERIDO`. "Guardar borrador" is not blocked.
12. A paid ticket whose effective methods are all cash shows the non-blocking warning and can still be published.
13. Reopening a saved event shows both sections exactly as saved; events saved before this story show their methods in section 1 and empty ticket lists.
14. Deleting a ticket in step 2 and saving removes its methods with it.
15. Duplicating an event copies event-level and ticket-level methods to the copy.
16. At checkout, the "Pago" step shows the event-level methods plus the selected ticket's methods in one list, without cash, without duplicates and without any label distinguishing their origin.
17. Choosing a different ticket updates the list; a previously selected method that is no longer listed is deselected.
18. A purchase paid with a ticket-specific method succeeds and `evento_compras.metodo_pago` holds that snapshot; it shows in the admin "Compras" page and in "Mis entradas".
19. Calling `iniciar_compra_evento` with a method id that belongs to **another** ticket of the same event fails with `METODO_PAGO_INVALIDO`.
20. A guest (anon) can complete a purchase with a ticket-specific method.
21. A paid ticket with no online method (event + ticket) keeps "Confirmar compra" disabled with the existing empty message.

---

## Implementation Steps

- [ ] Create migration `20261007120000_evento_entradas_metodos_pago.sql` (column, constraint, comments, both functions) and apply locally
- [ ] Update types in `eventos.types.ts`
- [ ] Update `eventos-wizard.utils.ts` (mapping, duplication, error keys, validation)
- [ ] Update `useEventoWizard.ts` actions
- [ ] Add `variant="evento"` to `MetodoPagoFormModal`
- [ ] Build `EventoMetodosPagoList` and `EventoMetodoPagoAgregarModal`; rebuild `EventoMetodosPagoStep`
- [ ] Update `eventos.service.ts` and `eventos-compras.service.ts`
- [ ] Update `useEventoCompra.ts` (merged list + selection reset)
- [ ] Verify `anon` can read `evento_entradas.metodos_pago` and that no write reaches `tenant_metodos_pago`
- [ ] Test manually: new event, edit of a pre-existing event, draft, duplicate, one-off method with QR, checkout as user and as guest, ticket switch, cash-only ticket, direct RPC calls with invalid payloads
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No new tables or policies. Writes still go only through `guardar_evento_completo` (role check for admin/trainer of the tenant) and `iniciar_compra_evento` (SECURITY DEFINER, re-validates the method against the event and the purchased ticket; cash never accepted). Snapshot shape is validated server-side (`METODOS_PAGO_INVALIDOS`). `url` is rendered only when http/https and `comentarios` as plain text (existing `EventoMetodoPagoCard` behavior). Payment method snapshots are public content for events the reader can see, as today.
- **Performance**: No new queries or indexes; one extra jsonb column on rows already fetched.
- **Accessibility**: Each section is a labelled group with its own heading; the add menu and modal are keyboard operable, trap focus and return it to the trigger on close; "Editar" / "Quitar" buttons have accessible names including the method name; validation errors use the existing `FieldError` + `fieldDomId` focus mechanism; tags convey meaning with text, not color alone.
- **Error handling**: Field errors inline in the form modal; QR upload failure shown inside the modal (nothing is added); step-level errors inline under the affected section/ticket; RPC errors through the existing wizard footer `role="alert"` and the checkout's existing submit error.
