## Why

Step 3 of the event wizard only lets the admin tick the tenant's fixed payment methods (`tenant_metodos_pago`), and they apply to the whole event. Admins need to charge an event, or one ticket of it, through accounts, links or QR codes that are not part of the organization's catalog, without adding them to it (US-0130, `projectspec/userstory/us0130-event-specific-payment-methods.md`).

## What Changes

- New column `evento_entradas.metodos_pago` (jsonb array, default `[]`), same snapshot format as `eventos.metodos_pago`.
- Wizard step 3 is rebuilt as two sections that start empty: "Métodos para todas las entradas" (saved in `eventos.metodos_pago`) and "Métodos para una entrada específica" (one block per ticket, saved in that ticket's `metodos_pago`).
- In both sections, "Agregar método de pago" lets the admin pick an existing tenant method or create a method only for the event, with the same form as the tenant's. Event-only methods live only in the snapshot (`origen: 'evento'`, client-generated `id`) and are never written to `tenant_metodos_pago`.
- **BREAKING** (admin UI): the checkbox list with "Seleccionar todos" / "Quitar todos" is removed; tenant methods are no longer listed until added.
- Publish validation becomes per ticket: every paid ticket needs at least one method between the event-level list and its own (client and `guardar_evento_completo`).
- Checkout "Pago" step shows one list: event-level methods plus the selected ticket's methods (no cash, no duplicates, origin not shown). `iniciar_compra_evento` accepts methods of the event or of the purchased ticket.
- Duplicating an event copies ticket-level methods too.

### Non-goals

- No change to tenant payment method management (`tenant_metodos_pago`, "Gestión de organización").
- No "save this event-only method to my organization" action.
- No backfill or restructuring of existing events: their methods stay at event level.
- No change to the event detail page, the admin "Compras" page, "Mis entradas" or `evento_compras` (the chosen snapshot is stored as today).
- No change to subscriptions/plans payment flows.
- No cleanup of QR images orphaned when an event-only method is removed.
- Cash is still never offered at checkout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `team-events-wizard`: step 3 becomes two add-driven sections; event-only payment methods; per-ticket coverage validation; QR snapshot rule reworded; ticket methods restored on edit and copied on duplicate.
- `team-events-tickets-data`: `evento_entradas.metodos_pago` column; `guardar_evento_completo` validates and stores ticket methods and checks coverage per paid ticket.
- `team-events-purchase-data`: `iniciar_compra_evento` accepts a method from the event or from the purchased ticket.
- `team-events-checkout`: payment step merges event and selected-ticket methods and clears a selection that is no longer offered.

## Impact

Design: no mockup. Confirmed with the user: reuse the existing wizard patterns (`WizardSection`, grit-arena-v2 tokens, `EventoModalShell`, `MetodoPagoFormModal`).

### Files to create or modify (page → component → hook → service → types)

| Area | File | Change |
|------|------|--------|
| Page | — | No route changes (wizard and checkout pages unchanged) |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Rebuild: two sections + summary |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoList.tsx` | New: method cards, tags, Editar/Quitar, empty state, add button |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodoPagoAgregarModal.tsx` | New: pick existing / create event-only; QR upload; builds the snapshot |
| Component | `src/components/portal/gestion-eventos/wizard/index.ts` | Export new components |
| Component | `src/components/portal/tenant/MetodoPagoFormModal.tsx` | Optional `variant?: 'tenant' \| 'evento'` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | `addMetodoPago` / `updateMetodoPago` / `removeMetodoPago` by target; remove `toggleMetodoPago` / `setMetodosPago` |
| Hook | `src/hooks/portal/eventos/useEventoCompra.ts` | Merged `metodosOnline`; clear stale selection |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Draft ⇄ payload mapping, duplication, error keys, per-ticket validation |
| Service | `src/services/supabase/portal/eventos.service.ts` | Normalize ticket `metodos_pago`; `METODO_PAGO_REQUERIDO` message |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | `listEntradasVendibles` returns `metodosPago` |
| Types | `src/types/portal/eventos.types.ts` | `origen?` on snapshot; `metodos_pago` / `metodosPago` on ticket row, payload, draft and `EntradaVendible` |
| Migration | `supabase/migrations/20261007120000_evento_entradas_metodos_pago.sql` | Column + constraint; replace `guardar_evento_completo` and `iniciar_compra_evento` |
| Docs | `projectspec/03-project-structure.md` | Wizard step 3, tickets table, RPCs, checkout notes |

### Step-by-step implementation plan

1. Branch `feat/event-specific-payment-methods` from `develop`.
2. Migration (local only): column, constraint, both functions.
3. Types.
4. Services (`eventos.service.ts`, `eventos-compras.service.ts`).
5. Wizard utils (mapping, validation, error keys, duplication).
6. Hooks (`useEventoWizard`, `useEventoCompra`).
7. Components (`MetodoPagoFormModal` variant, list, add modal, step).
8. Manual verification of wizard, checkout (user and guest) and direct RPC calls.
9. Documentation, typecheck, lint, commit message and PR description.

### Other impact

- APIs: RPC signatures and grants unchanged; payload of `p_entradas` gains `metodos_pago`.
- Security: no new tables or policies; the new column is readable by `anon` through the existing `evento_entradas` select policy and grant, as required by guest checkout.
- Dependencies: none.
