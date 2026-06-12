## Why

When a subscription is created for a plan subtype (`plan_tipo`), the system currently stores only a single flat `clases_restantes` counter on `suscripciones`. Now that plan subtypes can define per-service unit allocations via `plan_tipos_servicios` (US-0062), there is no way to track how many units per service the athlete is entitled to. This capability is a prerequisite for future per-service deduction logic during booking.

## What Changes

- **New table `suscripcion_servicios`**: stores one row per (subscription, service) pair with `unidades_incluidas` (snapshot at purchase time) and `unidades_restantes` (live counter). `NULL` in both columns means unlimited.
- **New SECURITY DEFINER function `populate_suscripcion_servicios(p_suscripcion_id, p_plan_tipo_id)`**: atomically reads `plan_tipos_servicios` for the purchased subtype and inserts the corresponding entitlement rows into `suscripcion_servicios`.
- **Updated `suscripcionesService.createSuscripcion()`**: calls the RPC after inserting the subscription when `plan_tipo_id` is present.
- **Updated `gestionSuscripcionesService.crearSuscripcionAdmin()`**: calls the RPC after inserting the subscription when `plan_tipo_id` is present.
- **New `getSuscripcionServicios()` service function**: reads per-service unit balances for a subscription (used by future deduction UI).
- **New `SuscripcionServicio` type**: TypeScript representation of a `suscripcion_servicios` row.
- The existing `clases_restantes` column on `suscripciones`, and the `book_and_deduct_class` / `cancel_and_restore_class` RPCs, are **NOT modified** in this story.

## Capabilities

### New Capabilities
- `subscription-service-units`: Per-service unit entitlement ledger on subscriptions — tracks how many units per service were included and how many remain, populated automatically at subscription creation time from the purchased plan subtype's service assignments.

### Modified Capabilities
- `subscription-management`: The admin subscription creation flow (`crearSuscripcionAdmin`) gains a post-insert RPC call to populate service units; no spec-level requirement changes to existing subscription management screens.

## Impact

- **Database**: New table `suscripcion_servicios`, new SECURITY DEFINER function `populate_suscripcion_servicios`, new index and RLS policies.
- **Services**: `src/services/supabase/portal/suscripciones.service.ts`, `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Types**: `src/types/portal/suscripciones.types.ts`
- **Migration**: `supabase/migrations/20260611000100_suscripcion_servicios.sql`
- **No UI changes** in this story.
- **No changes** to booking/deduction RPCs — those are scoped to the next user story.

## Non-goals

- Modifying `book_and_deduct_class` / `cancel_and_restore_class` to deduct from `suscripcion_servicios` (next US).
- Any UI for displaying per-service unit balances (next US).
- Backfilling existing subscriptions with service unit rows.
- Removing or deprecating the `clases_restantes` column from `suscripciones`.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260611000100_suscripcion_servicios.sql` | New table, RLS, trigger, SECURITY DEFINER RPC |
| Types | `src/types/portal/suscripciones.types.ts` | Add `SuscripcionServicio` type |
| Service | `src/services/supabase/portal/suscripciones.service.ts` | Update `createSuscripcion`, add `getSuscripcionServicios` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Update `crearSuscripcionAdmin` |

## Step-by-Step Implementation Plan

1. Write and apply migration: table, indexes, RLS, trigger, SECURITY DEFINER function.
2. Add `SuscripcionServicio` type to `suscripciones.types.ts`.
3. Update `suscripcionesService.createSuscripcion()` — call RPC after insert when `plan_tipo_id` is set.
4. Add `getSuscripcionServicios()` to `suscripcionesService`.
5. Update `gestionSuscripcionesService.crearSuscripcionAdmin()` — call RPC after insert when `plan_tipo_id` is set.
6. Verify RLS in Supabase Studio.
7. Manual test: athlete self-service flow + admin flow, with and without subtypes.
