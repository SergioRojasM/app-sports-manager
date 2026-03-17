## Why

Users can request a plan subscription but are never shown how or where to pay for it. Each organization uses different payment channels (bank transfers, mobile wallets, payment gateways), yet the system only stores generic payment type labels. This feature closes that gap by letting admins configure their real payment channels and surfacing them as a required selection when a user subscribes to a plan.

## What Changes

- New `tenant_metodos_pago` table storing per-organization payment methods (name, type, value, URL, comments, display order, active flag).
- New **"Métodos de Pago"** admin CRUD card added to the Organization Management page (`gestion-organizacion`), below existing info cards.
- `SuscripcionModal` extended with a **required** payment method dropdown (active methods only); selected method is persisted on subscription creation.
- `pagos` table updated: new `metodo_pago_id` FK column pointing to `tenant_metodos_pago`; legacy `pagos_metodo_pago_ck` constraint dropped (legacy `metodo_pago varchar` column kept for backward compatibility, no longer written to by new code).
- New DB migration covering DDL, RLS policies, updated-at trigger, and FK changes.
- New service, hook, types, and two new components to support the feature.

## Capabilities

### New Capabilities

- `payment-methods-management`: Full admin CRUD for organization-specific payment methods on the Organization Management page. Covers the `tenant_metodos_pago` table, its RLS policies, the admin card component, the form modal, the service, and the hook.
- `subscription-payment-method`: Required payment method selection in the Subscription Modal when a user subscribes to a plan. Covers changes to `SuscripcionModal`, `useSuscripcion`, `pagos.service.ts`, and the `pagos` schema update.

### Modified Capabilities

- `plan-management`: The subscription flow (`SuscripcionModal` + `useSuscripcion`) now requires a payment method selection before submitting. `pagos` records will capture `metodo_pago_id`. This is a behavioral requirement change (new required field in the subscription form) on top of the existing plan subscription capability.

## Impact

**Database**
- New table `tenant_metodos_pago` with RLS (member SELECT, admin INSERT/UPDATE/DELETE).
- `pagos` schema: add `metodo_pago_id uuid FK ON DELETE SET NULL`, drop `pagos_metodo_pago_ck`.

**Services**
- New: `src/services/supabase/portal/metodos-pago.service.ts`
- Modified: `src/services/supabase/portal/pagos.service.ts` — accept `metodo_pago_id` in `createPago`

**Hooks**
- New: `src/hooks/portal/tenant/useMetodosPago.ts`
- Modified: `src/hooks/portal/planes/useSuscripcion.ts` — fetch active payment methods on open, pass `metodo_pago_id` on submit

**Components**
- New: `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`
- New: `src/components/portal/tenant/MetodoPagoFormModal.tsx`
- Modified: `src/components/portal/planes/SuscripcionModal.tsx` — add required payment method dropdown with detail display

**Types**
- New: `src/types/portal/metodos-pago.types.ts`
- Modified: `src/types/portal/pagos.types.ts` — add `metodo_pago_id` to `CreatePagoInput`

**Pages**
- Modified: `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` — render `<TenantPaymentMethodsCard>`

**No new external dependencies required.**

## Non-goals

- Payment processing or gateway integration — the URL field is informational only (shown to the user as a link).
- Retroactively backfilling `metodo_pago_id` on existing `pagos` records.
- Displaying payment method details on the admin subscriptions page `gestion-suscripciones`.
- Removing or migrating the legacy `metodo_pago varchar` column from `pagos`.

## Files to Create

| Layer     | Path                                                               | Purpose                                            |
| --------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Migration | `supabase/migrations/<ts>_tenant_metodos_pago.sql`                 | DDL, trigger, RLS, and pagos FK changes            |
| Type      | `src/types/portal/metodos-pago.types.ts`                           | `MetodoPago`, `CreateMetodoPagoInput`, `UpdateMetodoPagoInput` |
| Service   | `src/services/supabase/portal/metodos-pago.service.ts`             | `getMetodosPago`, `createMetodoPago`, `updateMetodoPago`, `deleteMetodoPago` |
| Hook      | `src/hooks/portal/tenant/useMetodosPago.ts`                        | List + CRUD state, optimistic updates for admin card |
| Component | `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`        | Admin card: list, empty state, add/edit/delete actions |
| Component | `src/components/portal/tenant/MetodoPagoFormModal.tsx`             | Controlled right-side modal for create/edit         |

## Files to Modify

| Path                                                                                               | Change                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`                    | Import and render `<TenantPaymentMethodsCard tenantId={...} />`     |
| `src/components/portal/planes/SuscripcionModal.tsx`                                                | Add required payment method `<select>` + selected method detail     |
| `src/hooks/portal/planes/useSuscripcion.ts`                                                        | Fetch active methods on open; include `metodo_pago_id` in submit    |
| `src/services/supabase/portal/pagos.service.ts`                                                    | Accept optional `metodo_pago_id` in `createPago` payload            |
| `src/types/portal/pagos.types.ts`                                                                  | Add `metodo_pago_id?: string | null` to `CreatePagoInput`           |

## Step-by-step Implementation Plan

Following the **page → component → hook → service → types** methodology:

1. **Migration** — Create `supabase/migrations/<ts>_tenant_metodos_pago.sql` with all DDL, trigger, RLS, and `pagos` FK changes.
2. **Types** — Create `metodos-pago.types.ts`; add `metodo_pago_id` to `pagos.types.ts`.
3. **Service** — Create `metodos-pago.service.ts` (list active, full list, create, update, delete).
4. **Service** — Update `pagos.service.ts` to pass `metodo_pago_id` on insert.
5. **Hook** — Create `useMetodosPago.ts` with list + CRUD state for the admin card.
6. **Hook** — Update `useSuscripcion.ts` to fetch active methods when modal opens and include `metodo_pago_id` on submit.
7. **Component** — Create `MetodoPagoFormModal.tsx` (shared create/edit modal with all form fields and validation).
8. **Component** — Create `TenantPaymentMethodsCard.tsx` (card with sorted list, empty state, add/edit/delete actions using the form modal).
9. **Page** — Update `gestion-organizacion/page.tsx` to import and render `<TenantPaymentMethodsCard>`.
10. **Component** — Update `SuscripcionModal.tsx` to add required payment method dropdown with detail display below the selection.
