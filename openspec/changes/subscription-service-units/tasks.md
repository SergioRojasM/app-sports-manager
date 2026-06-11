## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/subscription-service-units`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260611000100_suscripcion_servicios.sql` with:
  - `suscripcion_servicios` table (columns: `id`, `suscripcion_id`, `servicio_id`, `unidades_incluidas`, `unidades_restantes`, `created_at`, `updated_at`)
  - Unique constraint on `(suscripcion_id, servicio_id)`
  - Check constraints on `unidades_incluidas` and `unidades_restantes` (null or >= 0)
  - FK: `suscripcion_id` → `suscripciones(id)` ON DELETE CASCADE
  - FK: `servicio_id` → `servicios(id)` ON DELETE RESTRICT
  - Indexes on `suscripcion_id` and `servicio_id`
- [x] 2.2 Add `updated_at` trigger to `suscripcion_servicios` using existing `set_updated_at()` function
- [x] 2.3 Enable RLS on `suscripcion_servicios` and add SELECT policy (own athlete OR tenant admin)
- [x] 2.4 Grant `SELECT` on `suscripcion_servicios` to `authenticated` (no INSERT/UPDATE/DELETE grant)
- [x] 2.5 Create `populate_suscripcion_servicios(p_suscripcion_id uuid, p_plan_tipo_id uuid)` SECURITY DEFINER function with `ON CONFLICT DO NOTHING`
- [x] 2.6 Grant EXECUTE on `populate_suscripcion_servicios` to `authenticated`
- [x] 2.7 Apply migration locally: `npx supabase migration up` (or `npx supabase db reset`)
- [x] 2.8 Verify table and function exist in local Supabase Studio

## 3. Types

- [x] 3.1 Add `SuscripcionServicio` type to `src/types/portal/suscripciones.types.ts`:
  - Fields: `id`, `suscripcion_id`, `servicio_id`, `unidades_incluidas: number | null`, `unidades_restantes: number | null`, `created_at`

## 4. Services

- [x] 4.1 Update `suscripcionesService.createSuscripcion()` in `src/services/supabase/portal/suscripciones.service.ts`:
  - After successful subscription INSERT, if `payload.plan_tipo_id` is set, call `supabase.rpc('populate_suscripcion_servicios', { p_suscripcion_id: data.id, p_plan_tipo_id: payload.plan_tipo_id })`
  - Throw on RPC error
- [x] 4.2 Add `getSuscripcionServicios(suscripcionId: string): Promise<SuscripcionServicio[]>` to `suscripcionesService` in `src/services/supabase/portal/suscripciones.service.ts`
- [x] 4.3 Update `gestionSuscripcionesService.crearSuscripcionAdmin()` in `src/services/supabase/portal/gestion-suscripciones.service.ts`:
  - After successful subscription INSERT, if `payload.plan_tipo_id` is set, call `supabase.rpc('populate_suscripcion_servicios', { p_suscripcion_id: suscripcionData.id, p_plan_tipo_id: payload.plan_tipo_id })`
  - On RPC error, throw `new GestionSuscripcionesServiceError('populate_servicios_failed', 'La suscripción fue creada, pero no se pudo registrar las unidades por servicio.')`

## 5. Verification

- [ ] 5.1 Verify RLS in Supabase Studio: athlete sees only own rows; admin sees tenant rows; no direct INSERT is possible from authenticated
- [ ] 5.2 Manual test — athlete self-service flow: create a subscription for a `plan_tipo` with 2 services → verify 2 rows in `suscripcion_servicios` with correct `unidades_incluidas` and `unidades_restantes`
- [ ] 5.3 Manual test — unlimited service: create a subscription where `plan_tipos_servicios.unidades = NULL` → verify `NULL` values in both columns
- [ ] 5.4 Manual test — no subtype: create a subscription without `plan_tipo_id` → verify 0 rows in `suscripcion_servicios`
- [ ] 5.5 Manual test — admin flow: repeat 5.2 via `CrearSuscripcionModal` → verify same result
- [ ] 5.6 Verify existing booking flow still works: `book_and_deduct_class` deducts `clases_restantes` correctly and is unaffected by this change

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md` to document `suscripcion_servicios` table, `populate_suscripcion_servicios` RPC, `SuscripcionServicio` type, and updated service functions

## 7. Commit and PR

- [ ] 7.1 Stage all changes and create a commit with message:
  ```
  feat(subscriptions): add per-service unit ledger on subscription creation (US-0063)

  - Add suscripcion_servicios table with RLS and updated_at trigger
  - Add populate_suscripcion_servicios SECURITY DEFINER RPC
  - Update createSuscripcion and crearSuscripcionAdmin to call RPC when plan_tipo_id is set
  - Add getSuscripcionServicios service function
  - Add SuscripcionServicio TypeScript type
  ```
- [ ] 7.2 Open a Pull Request with description:
  ```
  ## Summary
  Adds per-service unit entitlement tracking to subscriptions (US-0063).

  When a subscription is created with a plan subtype that has service assignments
  (plan_tipos_servicios), the system now populates a suscripcion_servicios ledger
  row for each service, snapshotting unidades_incluidas and setting unidades_restantes
  to the same value.

  ## Changes
  - New table: suscripcion_servicios
  - New SECURITY DEFINER function: populate_suscripcion_servicios
  - Updated: suscripcionesService.createSuscripcion, gestionSuscripcionesService.crearSuscripcionAdmin
  - New: getSuscripcionServicios service function, SuscripcionServicio type

  ## Testing
  - [ ] Manual test: athlete self-service flow with multi-service plan tipo
  - [ ] Manual test: admin creation flow with multi-service plan tipo
  - [ ] Manual test: plan without subtype leaves suscripcion_servicios empty
  - [ ] Existing booking deduction flow unaffected
  ```
