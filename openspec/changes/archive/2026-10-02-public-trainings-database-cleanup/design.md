## Context

After US-0123 no application code reads `entrenamientos_publicos` or writes `visibilidad`. What is left in the local database (checked against the catalog):

```
public.entrenamientos_publicos            table, 3 triggers, no write grants
public.entrenamientos_publicos_view       view, no grants
public.entrenamientos_publicos_servicios_view
public.sync_entrenamiento_visibilidad_on_publicacion()
public.check_entrenamiento_publico_restricciones_membresia()
public.check_entrenamiento_publico_sin_restriccion_servicio()   (if still present)
entrenamientos.visibilidad / visible_para + ck, fk, 2 indexes
bi.fct_entrenamientos, bi.fct_reservas    expose es_publico (join to entrenamientos_publicos)
public.get_tenant_bi_dashboard(uuid,date,date)   returns bookingByPublicStatus
public.book_and_deduct_service_units(…11 args…)  p_permitir_pendiente, p_plan_purchase
org-assets/orgs/*/entrenamientos-publicos/*      banner files
```

No RLS policy references these objects any more. The matches for "visible_para" in the event purchase functions are the unrelated helper `_evento_visible_para_compra`.

Still alive and used: `confirm_pending_reservas_for_suscripcion` and `reject_pending_reservas_for_suscripcion` are called from `gestion-suscripciones.service.ts`; four bookings are `pendiente` and linked to a subscription locally; `reservas.suscripcion_id` is read by `reservas_reporte_view`.

Constraints: no test suite; migrations are applied locally only from this change.

## Goals / Non-Goals

**Goals:**
- Remove every object, column, parameter and file that existed only for public trainings.
- Keep bookings, the pending-booking cascade, analytics Resumen values and the system tenant exactly as they are.
- Fail safely: the migration aborts untouched if phase 1 assumptions do not hold.

**Non-Goals:**
- Deleting the `public` tenant or its filters.
- Removing the cascade functions, reservation states or `motivo_rechazo`.
- Remote deployment.

## Decisions

### 1. One guarded transaction, ordered by dependency
```
guards → BI views + dashboard RPC → booking RPC → views → table → functions → columns → template JSON
```
BI objects are rebuilt first because `bi.fct_entrenamientos` joins `entrenamientos_publicos`; dropping the table first would fail (or cascade into the BI schema). No `drop ... cascade` is used, so an unexpected dependant makes the migration fail instead of disappearing silently.
- *Alternative:* several small migrations. Rejected: a partial apply would leave the BI schema pointing at a dropped table.

### 2. Guards check phase 1, not pending bookings
The migration raises if any training is `publico` or any publication is active. Pending bookings are legitimate data handled by the cascade, so they do not block.

### 3. Keep the pending-booking cascade
Decided by the product owner. Only `p_permitir_pendiente` and `p_plan_purchase` (and the block that inserts `suscripciones`, `suscripcion_servicios`, `pagos`) leave `book_and_deduct_service_units`. `p_suscripcion_id` stays. New bookings are always `confirmada`; existing `pendiente` bookings keep being resolved by the two cascade functions.
- *Alternative:* drop the cascade and the `rechazada` state. Rejected: it would strand pending bookings and requires manual resolution in production first.

### 4. Rebuild the booking RPC from its latest body
Source: `20260831120000_defer_plan_purchase_until_reserva.sql`. The old 11-argument signature is dropped explicitly before creating the new one, so PostgREST never sees two overloads. `security definer`, `set search_path = public` and `grant execute ... to authenticated` are carried over.

### 5. Rebuild BI from its latest definitions
`bi.fct_entrenamientos` and `bi.fct_reservas` come from `20260921130000_tenant_bi_phase_one.sql` (or a later redefinition; the implementer takes the current one with `pg_get_viewdef`). `get_tenant_bi_dashboard` comes from `20260924120000_analitica_pestanas_detalle.sql` minus the CTEs `capacity_by_public_status`, `booking_by_public_status`, `public_status_metrics`, `public_status_session_averages` and the `bookingByPublicStatus` key. `bi` grants stay revoked from `public, anon, authenticated`.
Because the two views lose a column, they are dropped and recreated (`create or replace view` cannot remove a column), together with any `bi` view that depends on them.

### 6. Analytics UI: remove the panel, do not replace it
Row 4 of the Operación tab keeps only "Reservas por disciplina" at full width.
- *Alternative:* keep the panel with a single "Privado" row. Rejected: it carries no information.

### 7. `visible_para` leaves the application before the column is dropped
`entrenamientos.service.ts` still sends `visible_para = tenantId` on insert and reads it in the row mapper and select lists (phase 1 left it there). Those references are removed in the same release as the migration.

### 8. System tenant stays
The tenant `public` and the three `.neq(... 'public')` filters are untouched. Dropping `visible_para` removes the only foreign key from trainings to it.

### 9. Banners are deleted through the Storage API
A one-off script lists and removes `orgs/*/entrenamientos-publicos/*` with the service-role key read from the environment. Deleting rows from `storage.objects` in SQL would leave the files in the bucket.

### 10. Work order follows page → component → hook → service → types
There is no page or hook change; the order is component, services, types, then database.

## Risks / Trade-offs

- [Irreversible data loss] → Take a database backup before applying anywhere that matters. Locally, record `select count(*) from entrenamientos_publicos` in the PR notes.
- [Hidden dependant on a dropped object] → No `cascade`; catalog search for `entrenamientos_publicos`, `visibilidad`, `visible_para` in `pg_proc`, `pg_views`, `pg_policies` before and after.
- [Old frontend calls the RPC with removed parameters] → PostgREST returns "function not found". Ship frontend and migration together, in low traffic.
- [Dashboard RPC rewritten by hand] → Capture the RPC output for one tenant and range before the migration and compare every Resumen field after it.
- [A `bi` view depends on `fct_entrenamientos` / `fct_reservas`] → Check `pg_depend` first and recreate dependants in order.
- [`reservas_reporte_view` or another view selects `visibilidad`] → Catalog search shows none today; the drop without `cascade` fails loudly if one appears.
- [Templates saved between phases contain `visibilidad`] → The JSON update removes the key; the form already ignores it.
- [Banner script run against the wrong project] → It prints the target URL and the number of objects found, and requires an explicit `--confirm` flag to delete.

## Migration Plan

1. Backup.
2. Run the three pre-check queries; all must return 0.
3. Deploy frontend and apply the migration in the same window (locally: `supabase migration up`).
4. Run the catalog checks and the manual flows.
5. Run the banner script.

**Rollback:** restore from the backup. The migration cannot be reverted by SQL because the table data and column values are gone.

## Open Questions

- None blocking.
