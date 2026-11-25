## 1. Branch setup

- [x] 1.1 Create the branch `feat/public-trainings-database-cleanup` from the branch that contains US-0123
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Baseline (local database)

- [x] 2.1 Run the three pre-check queries (active publications, public trainings, `visible_para` different from `tenant_id`); all must return 0
- [x] 2.2 Save the output of `get_tenant_bi_dashboard` for one tenant and a fixed date range to the scratchpad, to compare Resumen fields later
- [x] 2.3 List what depends on the objects to drop: `pg_depend` for `bi.fct_entrenamientos` and `bi.fct_reservas`, and a search of `pg_proc`, `pg_views`, `pg_policies` for `entrenamientos_publicos`, `visibilidad`, `visible_para`
- [x] 2.4 Record the `public` tenant row, its `admin_tenants` row and its membership count, and the count of `pendiente` bookings

## 3. Components

- [x] 3.1 `AnaliticaPage.tsx`: remove the "Reservas por tipo de entrenamiento" panel and make "Reservas por disciplina" span the full row; narrow `bookingBreakdownRow` to `bookingByDiscipline`

## 4. Services

- [x] 4.1 `analitica.service.ts`: remove any mapping or default for `bookingByPublicStatus`
- [x] 4.2 `reservas.service.ts`: remove `p_permitir_pendiente` and `p_plan_purchase` from the `book_and_deduct_service_units` call; keep `p_suscripcion_id`
- [x] 4.3 `entrenamientos.service.ts`: remove `visible_para` from inserts, from the row mapper and from the explicit select column lists

## 5. Types

- [x] 5.1 `analitica.types.ts`: remove `bookingByPublicStatus` from `AnaliticaOperations`
- [x] 5.2 `entrenamientos.types.ts`: remove `visible_para`
- [x] 5.3 Run `git grep -n -E "visible_para|bookingByPublicStatus|p_permitir_pendiente|p_plan_purchase" -- src` and confirm it returns nothing

## 6. Database migration (local only)

- [x] 6.1 Create `supabase/migrations/{timestamp}_limpieza_entrenamientos_publicos.sql` in one transaction, starting with the guard block (public trainings, active publications)
- [x] 6.2 Drop and recreate `bi.fct_entrenamientos` and `bi.fct_reservas` (and any dependant found in 2.3) without `es_publico` and without the join to `entrenamientos_publicos`; keep `bi` grants revoked
- [x] 6.3 Recreate `get_tenant_bi_dashboard` from its current body without the four `*public_status*` CTEs and the `bookingByPublicStatus` key
- [x] 6.4 Drop the 11-argument `book_and_deduct_service_units` and recreate it without `p_permitir_pendiente`, `p_plan_purchase` and the deferred plan purchase block; keep `security definer`, `search_path` and the `authenticated` execute grant
- [x] 6.5 Drop the two views, the table `entrenamientos_publicos` and the functions `sync_entrenamiento_visibilidad_on_publicacion`, `check_entrenamiento_publico_restricciones_membresia`, `check_entrenamiento_publico_sin_restriccion_servicio`, without `cascade`
- [x] 6.6 Drop `idx_entrenamientos_visibilidad`, `idx_entrenamientos_visible_para`, `entrenamientos_visibilidad_ck`, `entrenamientos_visible_para_fkey` and the columns `visibilidad`, `visible_para`
- [x] 6.7 Remove the `visibilidad` key from `entrenamiento_plantillas.contenido`
- [x] 6.8 Apply locally with `supabase migration up`; never push the migration to the remote Supabase project
- [x] 6.9 Confirm the migration does not touch `confirm_pending_reservas_for_suscripcion`, `reject_pending_reservas_for_suscripcion`, `reservas_estado_ck`, `motivo_rechazo`, or the `public` tenant

## 7. Storage

- [x] 7.1 Create `scripts/delete-public-training-banners.sh`: service-role key and URL from the environment, lists `org-assets/orgs/*/entrenamientos-publicos/*`, prints target and count, deletes only with `--confirm`
- [x] 7.2 Run it against the local stack and confirm `storage.objects` has no matching names while other `org-assets` objects remain

## 8. Verification

- [x] 8.1 Catalog: the table, two views and three functions do not exist; `entrenamientos` has neither column; exactly one `book_and_deduct_service_units` overload without the two parameters; no function, view or policy in `public` / `bi` references the dropped names
- [x] 8.2 Guard: on a scratch copy or inside a rolled-back transaction, set one training to `publico` before the columns are dropped and confirm the guard raises
- [x] 8.3 Dashboard RPC: every Resumen field equals the baseline from 2.2 and `operations` has no `bookingByPublicStatus`
- [x] 8.4 Preserved data: `public` tenant, its `admin_tenants` row and membership count equal 2.4; the `pendiente` booking count is unchanged; both cascade functions exist
- [x] 8.5 Browser as administrator: analytics page loads with no "Reservas por tipo de entrenamiento", no empty cell and no console errors; create, edit and delete a training; load a saved template
- [x] 8.6 Browser as administrator: approve a pending subscription that has a linked `pendiente` booking and confirm the booking becomes `confirmada` (skip and report if no such data can be prepared)
- [x] 8.7 Browser as member athlete: book a training without restriction (stored as `confirmada`) and one with a service they do not hold (rejected, no row)
- [x] 8.8 "Organizaciones Disponibles" and "Inicio" do not list the `public` tenant

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md`: new `book_and_deduct_service_units` signature, remove `check_entrenamiento_publico_restricciones_membresia`, mention the banner script

## 10. Quality checks and delivery

- [x] 10.1 Run `npx tsc --noEmit` and fix every error
- [x] 10.2 Run `npm run lint` and confirm no new errors or warnings against the baseline
- [x] 10.3 Run tests if a test script exists (none today); do not run `npm run build`
- [x] 10.4 Write the commit message and the pull request description, including the backup requirement, the same-release deployment note and the rollback note from `design.md`
