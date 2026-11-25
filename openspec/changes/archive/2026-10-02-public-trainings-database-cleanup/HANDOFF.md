# Handoff — public-trainings-database-cleanup (US-0124)

## Commit message

```
feat(trainings): drop the public trainings schema

Phase 2 of the public trainings deprecation (US-0123 removed the feature).

- Migration: drop entrenamientos_publicos with its views, triggers and
  functions; drop entrenamientos.visibilidad / visible_para; remove the
  visibilidad key from saved templates
- Recreate book_and_deduct_service_units without p_permitir_pendiente and
  p_plan_purchase; bookings are always inserted as confirmada
- Recreate the bi.fct_* views and get_tenant_bi_dashboard without
  es_publico / bookingByPublicStatus
- Remove the "Reservas por tipo de entrenamiento" analytics panel
- Stop sending visible_para and the removed RPC parameters
- The migration aborts if a public training or an active publication remains

The pending-booking cascade and the system tenant "public" are kept.
```

## Pull request description

### What
Removes every database object, RPC parameter and analytics metric that only existed for the public trainings marketplace. Irreversible.

### Changes
- **Database:** `20261004120000_limpieza_entrenamientos_publicos.sql`, one transaction, no `cascade`. Order: guards → BI views → dashboard RPC → booking RPC → views, table and functions → columns → template JSON.
- **Booking RPC:** new 9-argument signature; `execute` revoked from `public` and `anon`, granted to `authenticated` and `service_role` (the old function was executable by `anon`).
- **Frontend:** analytics panel removed; `visible_para`, `p_permitir_pendiente`, `p_plan_purchase` and `bookingByPublicStatus` no longer referenced in `src/`.
- **Storage:** `scripts/delete-public-training-banners.sh` (dry run by default, `--confirm` to delete). `scripts/` is git-ignored, so the script is not part of this commit unless force-added.

### Kept on purpose
- `confirm_pending_reservas_for_suscripcion`, `reject_pending_reservas_for_suscripcion`, the `reservas` states `pendiente` / `rechazada`, `motivo_rechazo`, `suscripcion_id`.
- The system tenant `public`, its `admin_tenants` row, its memberships and the name filters that hide it.

### Before applying in production
1. Take a database backup. Rollback is restore-only.
2. The US-0123 migration must already be applied there: the guard aborts if any training is `publico` or any publication is active.
3. Deploy the frontend and apply the migration in the same window: the old frontend calls the booking RPC with parameters that no longer exist.
4. Run the banner script against production afterwards.

### Local data dump
`supabase/seed.sql` (git-ignored, a data dump) still inserts into `entrenamientos_publicos` and into `entrenamientos.visibilidad` / `visible_para`. After this migration a `supabase db reset` will fail at the seed step until the dump is regenerated from a database that already has this migration.

When this change was applied locally the dump had been reloaded after the US-0123 migration, so 3 publications were active and 10 trainings were public again. The guard aborted as designed; the US-0123 unpublish statements were re-run by hand, then the migration applied. A CSV copy of the 47 `entrenamientos_publicos` rows was kept in the session scratchpad only.

### Verified (local)
- `npx tsc --noEmit` clean. `npm run lint`: 17 errors / 18 warnings, same as the baseline; none in files touched here.
- Guard: with public trainings present the migration raised and changed nothing.
- Catalog: table, two views and the two existing functions are gone; `entrenamientos` has neither column; one `book_and_deduct_service_units` overload; no function, view or policy in `public` / `bi` references the dropped names; no `es_publico` in `bi`; `bi` has no grants for `anon` / `authenticated`.
- Dashboard RPC for one tenant and range: output identical to the pre-migration capture except for the removed `bookingByPublicStatus` key.
- Preserved: `public` tenant, its `admin_tenants` row, 130 memberships, 4 `pendiente` bookings, 8 templates (none with `visibilidad`).
- Cascade functions, called inside rolled-back transactions: a linked `pendiente` booking becomes `confirmada` on confirm and `rechazada` with its reason on reject.
- Banner script: 6 objects found and deleted locally; the other 70 `org-assets` objects remain.
- Browser as administrator: analytics Operación tab shows "Reservas por disciplina" at full width and no "Reservas por tipo de entrenamiento"; create a training from a saved template, edit it, delete it; "Organizaciones disponibles" and "Inicio" do not list `public`; no console errors.
- Browser as member athlete: books an unrestricted training (stored as `confirmada` through the new RPC); a training requiring a service they do not hold is rejected with the existing message.
- Task 8.6 (approving a pending subscription with a linked pending booking in the browser) was validated manually by the owner.

### Not verified
- A booking that deducts units from an active subscription through the new RPC; the test athlete has no subscription. That part of the function body is unchanged.
- Applying the full migration history from scratch.
