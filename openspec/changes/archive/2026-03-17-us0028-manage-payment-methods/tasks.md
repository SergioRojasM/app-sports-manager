## 1. Branch Setup

- [x] 1.1 Create a new branch: `feat/us0028-manage-payment-methods`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/<timestamp>_tenant_metodos_pago.sql`
- [x] 2.2 Add `CREATE TABLE tenant_metodos_pago` with all columns: `id`, `tenant_id`, `nombre`, `tipo` (CHECK constraint), `valor`, `url`, `comentarios`, `activo`, `orden`, `created_at`, `updated_at`
- [x] 2.3 Add UNIQUE constraint `tenant_metodos_pago_tenant_nombre_uk` on `(tenant_id, nombre)`
- [x] 2.4 Add index `idx_tenant_metodos_pago_tenant_id` on `(tenant_id)`
- [x] 2.5 Add FK `tenant_metodos_pago.tenant_id → tenants(id) ON DELETE CASCADE`
- [x] 2.6 Attach `set_updated_at()` trigger as `tenant_metodos_pago_set_updated_at`
- [x] 2.7 Enable RLS on `tenant_metodos_pago`
- [x] 2.8 Create RLS policy `tenant_metodos_pago_select_member` (SELECT for authenticated tenant members)
- [x] 2.9 Create RLS policy `tenant_metodos_pago_insert_admin` (INSERT for tenant administrators)
- [x] 2.10 Create RLS policy `tenant_metodos_pago_update_admin` (UPDATE for tenant administrators)
- [x] 2.11 Create RLS policy `tenant_metodos_pago_delete_admin` (DELETE for tenant administrators)
- [x] 2.12 Add column `metodo_pago_id uuid` to `pagos`
- [x] 2.13 Drop constraint `pagos_metodo_pago_ck` from `pagos`
- [x] 2.14 Add FK `pagos_metodo_pago_id_fkey`: `pagos.metodo_pago_id → tenant_metodos_pago(id) ON DELETE SET NULL`
- [x] 2.15 Add index `idx_pagos_metodo_pago_id` on `pagos(metodo_pago_id)`
- [x] 2.16 Apply migration locally with `npx supabase db reset` and verify with `npx supabase db lint`

## 3. Types

- [x] 3.1 Create `src/types/portal/metodos-pago.types.ts` with `MetodoPagoTipo`, `MetodoPago`, `CreateMetodoPagoInput`, `UpdateMetodoPagoInput`
- [x] 3.2 Update `src/types/portal/pagos.types.ts`: add `metodo_pago_id?: string | null` to `PagoInsert` and `Pago`

## 4. Services

- [x] 4.1 Create `src/services/supabase/portal/metodos-pago.service.ts` with `getMetodosPago(tenantId, onlyActive?)` ordered by `orden ASC, nombre ASC`
- [x] 4.2 Add `createMetodoPago(payload: CreateMetodoPagoInput)` to `metodos-pago.service.ts`
- [x] 4.3 Add `updateMetodoPago(id: string, payload: UpdateMetodoPagoInput)` to `metodos-pago.service.ts`
- [x] 4.4 Add `deleteMetodoPago(id: string)` to `metodos-pago.service.ts`
- [x] 4.5 Update `src/services/supabase/portal/pagos.service.ts`: accept `metodo_pago_id` in `createPago` payload and include it in the insert

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/tenant/useMetodosPago.ts` with full CRUD state: `metodos`, `loading`, `error`, `formOpen`, `editTarget`, `deleteTarget`, `isSubmitting`, `openCreate`, `openEdit`, `closeForm`, `submitForm`, `openDelete`, `closeDelete`, `confirmDelete`
- [x] 5.2 Update `src/hooks/portal/planes/useSuscripcion.ts`: add `metodosPago: MetodoPago[]` and `metodosPagoError: string | null` state slices
- [x] 5.3 In `useSuscripcion.openModal`: fetch active payment methods via `getMetodosPago(tenantId, true)` concurrently with the duplicate-subscription check (non-blocking on failure)
- [x] 5.4 In `useSuscripcion`: update `SuscripcionSubmitData` type to include `metodo_pago_id: string`
- [x] 5.5 In `useSuscripcion.submit`: pass `metodo_pago_id` from submit data to `pagosService.createPago()`
- [x] 5.6 Expose `metodosPago` and `metodosPagoError` in `UseSuscripcionResult` return type

## 6. Components

- [x] 6.1 Create `src/components/portal/tenant/MetodoPagoFormModal.tsx` — right-side controlled modal with all form fields (`nombre`, `tipo` select, `valor`, `url`, `comentarios`, `activo` toggle), client-side validation (required `nombre` and `tipo`; valid URL if non-empty), field-level error display, loading state on submit
- [x] 6.2 Create `src/components/portal/tenant/TenantPaymentMethodsCard.tsx` — client component receiving `tenantId`, using `useMetodosPago`, rendering: card title "Métodos de Pago", sorted list of methods with name, type badge, value, URL link icon, status badge, edit/delete actions; empty state; loading state; delete confirmation dialog; composing `MetodoPagoFormModal`
- [x] 6.3 Update `src/components/portal/planes/SuscripcionModal.tsx`: add `metodosPago: MetodoPago[]` and `metodosPagoError: string | null` props; add required payment method `<select>` dropdown (active methods ordered by `orden ASC, nombre ASC`); display selected method's `valor`, `url` (clickable link, new tab), and `comentarios` below the dropdown; show no-methods message when list is empty; include `metodo_pago_id` in `onConfirm` payload; disable Confirm if no method selected

## 7. Page

- [x] 7.1 Update `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`: import `TenantPaymentMethodsCard` and render it below `<TenantInfoCards tenantId={tenantId} />`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: add `TenantPaymentMethodsCard.tsx` and `MetodoPagoFormModal.tsx` to the `tenant/` component slice; add `useMetodosPago.ts` to `hooks/portal/tenant/`; add `metodos-pago.service.ts` to `services/supabase/portal/`

## 9. Wrap-up

- [x] 9.1 Run `npx tsc --noEmit` and resolve any type errors
- [x] 9.2 Manually test admin flow: create → edit → delete a payment method on `gestion-organizacion`
- [x] 9.3 Manually test subscription flow: verify payment method dropdown appears in modal, Confirm disabled without selection, `pagos.metodo_pago_id` populated on submission
- [x] 9.4 Verify empty-methods state in `SuscripcionModal` when tenant has no active payment methods
- [x] 9.5 Write commit message: `feat(us0028): add tenant payment methods management and subscription flow integration`
- [x] 9.6 Write PR description summarising: DB migration, new `tenant_metodos_pago` table, admin CRUD card, required payment method selection in subscription modal, `pagos.metodo_pago_id` FK
