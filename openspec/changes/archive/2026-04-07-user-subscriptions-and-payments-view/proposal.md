## Why

Users with the `usuario` role have no dedicated page to view their own subscriptions and payments within a tenant organization. The only subscription UI is the admin-scoped `gestion-suscripciones`, leaving athletes with no way to track their subscription status, payment validation state, or upload/re-upload their payment proof.

## What Changes

- New route `(usuario)/mis-suscripciones-y-pagos/page.tsx` with a role guard that redirects non-`usuario` roles to the tenant landing page.
- New service `fetchMisSuscripcionesTenant` to fetch the authenticated user's subscriptions (with plans and payments) scoped to a given tenant.
- Extend `uploadPaymentProof` in `storage.service.ts` to accept an optional `upsert` flag, enabling re-upload of an existing comprobante without creating duplicates.
- New hooks: `useMisSuscripciones` (data fetching + client-side filtering) and `useSubirComprobante` (file validation + upload + DB update).
- New components: `MisSuscripcionesFilters`, `SuscripcionCard`, `PagoCard`, `MisSuscripcionesYPagosPage`.
- Add "Mis Suscripciones" navigation entry (`receipt_long`) to the `usuario` role menu in `ROLE_TENANT_ITEMS`.

**Non-goals:**
- Admin-facing subscription management (stays in `gestion-suscripciones`).
- Creating or cancelling subscriptions from the user side.
- Server-side filtering — all filtering is client-side against a single page-load fetch.
- New database migrations — all required columns and RLS policies already exist.

## Capabilities

### New Capabilities

- `user-subscriptions-and-payments-view`: User-facing page for viewing own subscriptions and payments per tenant, with client-side status filtering and comprobante upload/re-upload.

### Modified Capabilities

- `payment-proof-upload`: `uploadPaymentProof` function signature extended with optional `{ upsert?: boolean }` to support replacing an existing stored file.
- `portal-role-navigation`: New "Mis Suscripciones" entry added to `ROLE_TENANT_ITEMS.usuario` routing config.

## Impact

**Files to create:**
- `src/types/portal/mis-suscripciones-y-pagos.types.ts`
- `src/services/supabase/portal/mis-suscripciones.service.ts`
- `src/hooks/portal/mis-suscripciones-y-pagos/useMisSuscripciones.ts`
- `src/hooks/portal/mis-suscripciones-y-pagos/useSubirComprobante.ts`
- `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesFilters.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/PagoCard.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesYPagosPage.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/index.ts`
- `src/app/portal/orgs/[tenant_id]/(usuario)/mis-suscripciones-y-pagos/page.tsx`

**Files to modify:**
- `src/services/supabase/portal/storage.service.ts` — add `upsert` option to `uploadPaymentProof`
- `src/types/portal.types.ts` — add `mis-suscripciones-y-pagos` nav item to `ROLE_TENANT_ITEMS.usuario`

**Dependencies (reused without modification):**
- `SuscripcionEstadoBadge`, `PagoEstadoBadge` from `gestion-suscripciones`
- `useComprobanteViewer` from `gestion-suscripciones`
- `pagosService.updateComprobantePath`

**RLS / Security:**
- Existing `pagos_select_authenticated` and `pagos_update_own` RLS policies cover the required data access; no new policies needed.
- Page-level role guard ensures non-`usuario` roles cannot access the route even by direct URL.
