# US-0124 — Deprecate the Public Trainings Module (Phase 2: Database Clean-up)

## ID
US-0124

## Name
Permanent clean-up after the public trainings deprecation — drop the `entrenamientos_publicos` table and its dependants, drop the visibility columns and the `public` tenant, simplify the booking RPC, remove the public/private breakdown from analytics and delete the publication banners.

## As a
Platform owner (developer maintaining the database)

## I Want
Every database object, RPC parameter, analytics metric and stored file that only existed for public trainings to be removed.

## So That
The schema matches the product (trainings are internal to the organization), there is no dormant cross-tenant surface left to maintain or audit, and future work on trainings and bookings does not have to account for dead code paths.

---

## Description

### Current State
After US-0123:
- No frontend code reads or writes `entrenamientos_publicos`. Every row has `activo = false` and no role can write to it.
- `entrenamientos.visibilidad` is `'privado'` on every row and `visible_para` equals `tenant_id`. No policy reads either column.
- `entrenamientos_publicos_view` and `entrenamientos_publicos_servicios_view` exist with no grants.
- `bi.dim_entrenamientos` still joins `entrenamientos_publicos` to compute `es_publico`, and `get_tenant_bi_dashboard` still returns a "Público / Privado" booking breakdown, shown in the analytics page as "Reservas por tipo de entrenamiento".
- `book_and_deduct_service_units` still accepts `p_permitir_pendiente` and `p_plan_purchase`; the frontend always sends `false` and `null`.
- The system tenant named `public` (`2a089688-3cfc-4216-9372-33f50079fbd1`) still exists, and three queries filter it out by name.
- Publication banners remain in `org-assets` under `orgs/{tenantId}/entrenamientos-publicos/`.

### Proposed Changes

#### Prerequisite
US-0123 is deployed to production and has been stable for at least one release. This story is destructive and cannot be reverted without a database backup.

#### Scope
| In scope | Out of scope |
|----------|--------------|
| Drop `entrenamientos_publicos`, its two views, triggers and functions | Any change to the events module |
| Rebuild BI views and `get_tenant_bi_dashboard` without `es_publico` | Public plans (`planes.es_publico`, `planes-publicos/`), which stay |
| Remove the public/private breakdown from the analytics page | Editing historical migration files |
| Drop `entrenamientos.visibilidad` and `visible_para` | Exporting an archive of the dropped data beyond the normal backup |
| Delete the `public` tenant and its name filters | |
| Simplify `book_and_deduct_service_units`; drop `confirm_pending_reservas_for_suscripcion` | |
| Delete publication banners from storage | |

#### 1. Pre-checks (run against production before merging)
Each must return 0. If any does not, stop and resolve it first.
```sql
select count(*) from public.entrenamientos_publicos where activo;
select count(*) from public.entrenamientos where visibilidad = 'publico';
select count(*) from public.entrenamientos where visible_para is distinct from tenant_id;
select count(*) from public.reservas where estado = 'pendiente';
select count(*) from public.miembros_tenant where tenant_id = '2a089688-3cfc-4216-9372-33f50079fbd1';
```
Also confirm in the codebase whether the `reservas` states `'pendiente'` and `'rechazada'` and the `motivo_rechazo` columns on `reservas` and `pagos` (added in `20260813180000_omitir_confirmacion_plan.sql`) are used by anything other than the removed skip-plan flow:
```
git grep -n -E "pendiente|rechazada|motivo_rechazo" -- src
```
- `pagos.motivo_rechazo` is expected to be in use by payment validation: keep it.
- If `reservas` never reaches `'pendiente'` / `'rechazada'` any more, remove those two values from `reservas_estado_ck`, drop `reservas.motivo_rechazo`, and remove the matching values from `ReservaStatusBadge` and `reservas.types.ts`. If they are still used, leave them and record that in the migration comment.

#### 2. Analytics
- Database: recreate `bi.dim_entrenamientos` and `bi.fct_reservas` without `es_publico` and without the join to `entrenamientos_publicos`. Recreate `get_tenant_bi_dashboard` from its latest definition (`20260924120000_analitica_pestanas_detalle.sql`) without the CTEs `capacity_by_public_status`, `booking_by_public_status`, `public_status_metrics`, `public_status_session_averages` and without the `bookingByPublicStatus` key in the returned JSON. Keep the `bi` schema grants as they are (`revoke all ... from public, anon, authenticated`).
- Frontend: remove `bookingByPublicStatus` from `AnaliticaOperations` in `src/types/portal/analitica.types.ts`, from the mapping in `src/services/supabase/portal/analitica.service.ts`, and remove the "Reservas por tipo de entrenamiento" panel from `src/components/portal/analitica/AnaliticaPage.tsx`. The surrounding grid must not leave an empty cell.

#### 3. Booking RPC
- Recreate `book_and_deduct_service_units` from its latest definition (`20260831120000_defer_plan_purchase_until_reserva.sql`, or a later one if it exists) without `p_permitir_pendiente` and `p_plan_purchase`, and without the deferred plan purchase block (inserts into `suscripciones`, `suscripcion_servicios`, `pagos`). Bookings are always inserted as `'confirmada'`. Drop the old signature first, so PostgREST does not see two overloads.
- Drop `confirm_pending_reservas_for_suscripcion` and any trigger or caller that invokes it (check `gestion-suscripciones.service.ts` and the payment-validation functions).
- `src/services/supabase/portal/reservas.service.ts`: stop sending the two parameters.

#### 4. Table, views, triggers and functions
Drop, in dependency order: the two views, the three triggers on `entrenamientos_publicos`, the table, then the functions `sync_entrenamiento_visibilidad_on_publicacion`, `check_entrenamiento_publico_restricciones_membresia` and `check_entrenamiento_publico_sin_restriccion_servicio`.

#### 5. Visibility columns
Drop `entrenamientos.visibilidad` and `entrenamientos.visible_para` with `entrenamientos_visibilidad_ck`, `entrenamientos_visible_para_fkey`, `idx_entrenamientos_visibilidad` and `idx_entrenamientos_visible_para`. Before dropping, search every function and view for the two column names (`reservas_reporte_view`, training group/series functions, BI views) and recreate any that select them. Remove the `visibilidad` key from saved template JSON.
- `src/services/supabase/portal/entrenamientos.service.ts`: remove `visible_para` from inserts and `visibilidad` / `visible_para` from the explicit `select` column lists.

#### 6. `public` tenant
Delete the tenant row and its `admin_tenants` row. Remove the name filters:
- `src/services/supabase/portal/inicio.service.ts` — two `.neq('tenants.nombre', 'public')` calls
- `src/services/supabase/portal/tenant.service.ts` — one `.neq('nombre', 'public')` call

Remove the tenant and its `admin_tenants` row from `supabase/seed.sql`.

#### 7. Storage
- Drop the policy `public_training_formulario_respuesta_read` only if pre-check confirms no non-member still needs their uploaded form files; otherwise keep it (it is scoped to the caller's own path and has no dependency on dropped objects).
- Delete every object under `org-assets/orgs/*/entrenamientos-publicos/`. Do this with a one-off script using the service-role key (`supabase.storage.from('org-assets').list` + `remove`), not with SQL on `storage.objects`, so the files are removed from the bucket as well as the metadata. Record the number of files deleted.

#### 8. Documentation
- `projectspec/03-project-structure.md`: update the "Database Functions" section (new `book_and_deduct_service_units` signature; remove `confirm_pending_reservas_for_suscripcion`).
- OpenSpec: delta specs for `training-booking`, `subscription-class-deduction`, `analitica-detail-tabs` and `bi-member-facts` if they describe the removed objects.

---

## Database Changes

One migration, `supabase/migrations/{timestamp}_limpieza_entrenamientos_publicos.sql`, in a single transaction. Order matters.

```sql
begin;

-- 0. Guards: abort if phase 1 assumptions do not hold.
do $$
begin
  if exists (select 1 from public.entrenamientos where visibilidad = 'publico') then
    raise exception 'There are still public trainings';
  end if;
  if exists (select 1 from public.reservas where estado = 'pendiente') then
    raise exception 'There are still pending bookings';
  end if;
end $$;

-- 1. BI: recreate bi.dim_entrenamientos / bi.fct_reservas without es_publico,
--    then get_tenant_bi_dashboard without the *_public_status* CTEs.
--    (full bodies carried forward from 20260924120000)

-- 2. Booking RPC: drop old signature, recreate without p_permitir_pendiente / p_plan_purchase.
drop function if exists public.confirm_pending_reservas_for_suscripcion(/* current args */);

-- 3. Public trainings objects.
drop view if exists public.entrenamientos_publicos_servicios_view;
drop view if exists public.entrenamientos_publicos_view;
drop table if exists public.entrenamientos_publicos;  -- drops its triggers, policies and indexes
drop function if exists public.sync_entrenamiento_visibilidad_on_publicacion();
drop function if exists public.check_entrenamiento_publico_restricciones_membresia();
drop function if exists public.check_entrenamiento_publico_sin_restriccion_servicio();

-- 4. Visibility columns.
drop index if exists public.idx_entrenamientos_visibilidad;
drop index if exists public.idx_entrenamientos_visible_para;
alter table public.entrenamientos
  drop constraint if exists entrenamientos_visibilidad_ck,
  drop constraint if exists entrenamientos_visible_para_fkey,
  drop column if exists visibilidad,
  drop column if exists visible_para;

update public.entrenamiento_plantillas
   set contenido = contenido - 'visibilidad'
 where contenido ? 'visibilidad';

-- 5. System tenant.
delete from public.admin_tenants where tenant_id = '2a089688-3cfc-4216-9372-33f50079fbd1';
delete from public.tenants       where id        = '2a089688-3cfc-4216-9372-33f50079fbd1';

commit;
```

Notes for the developer:
- Verify the template JSON column name and type (`contenido`, `jsonb`) in `20260614000100_entrenamiento_plantillas.sql` before using the `-` and `?` operators.
- `tenants` has `on delete cascade` children. The pre-check on `miembros_tenant` plus a review of every FK to `tenants(id)` must confirm the `public` tenant owns no rows before deleting it.
- **RLS**: no new objects, so no new policies. The rebuilt `bi` views keep `revoke all ... from public, anon, authenticated`. The recreated RPCs keep `security definer`, `set search_path = public` and their existing `grant execute` to `authenticated`.
- Optional step from pre-check 1: tighten `reservas_estado_ck` and drop `reservas.motivo_rechazo`.

---

## API / Server Actions

- **`public.book_and_deduct_service_units`** (RPC) — same parameters as today minus `p_permitir_pendiente boolean` and `p_plan_purchase jsonb`. Returns `public.reservas`. `security definer`; callable by `authenticated`; membership and restriction checks unchanged.
- **`public.confirm_pending_reservas_for_suscripcion`** (RPC) — removed.
- **`public.get_tenant_bi_dashboard`** (RPC) — same parameters; the returned JSON no longer contains `bookingByPublicStatus`. Administrator of the tenant only, unchanged.
- **`src/services/supabase/portal/reservas.service.ts`** — the create-booking function stops passing the two removed parameters. Input and return types unchanged.
- **`src/services/supabase/portal/analitica.service.ts`** — the dashboard mapper drops `bookingByPublicStatus`.
- **`src/services/supabase/portal/entrenamientos.service.ts`** — inserts and selects no longer reference `visibilidad` / `visible_para`.
- **`src/services/supabase/portal/inicio.service.ts`, `tenant.service.ts`** — remove the `public` tenant filters; results are unchanged because the tenant no longer exists.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_limpieza_entrenamientos_publicos.sql` | New: guards, BI rebuild, RPC rewrite, drops, tenant delete |
| Script | `scripts/delete-public-training-banners.sh` | New one-off script (service role) that deletes `orgs/*/entrenamientos-publicos/*` |
| Seed | `supabase/seed.sql` | Remove the `public` tenant and its `admin_tenants` row |
| Service | `src/services/supabase/portal/reservas.service.ts` | Stop sending `p_permitir_pendiente` / `p_plan_purchase` |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Remove `visibilidad` / `visible_para` from inserts and select lists |
| Service | `src/services/supabase/portal/analitica.service.ts` | Remove `bookingByPublicStatus` mapping |
| Service | `src/services/supabase/portal/inicio.service.ts` | Remove two `public` tenant filters |
| Service | `src/services/supabase/portal/tenant.service.ts` | Remove one `public` tenant filter |
| Types | `src/types/portal/analitica.types.ts` | Remove `bookingByPublicStatus` |
| Component | `src/components/portal/analitica/AnaliticaPage.tsx` | Remove "Reservas por tipo de entrenamiento" panel |
| Types / Component | `src/types/portal/reservas.types.ts`, `src/components/portal/entrenamientos/reservas/ReservaStatusBadge.tsx` | Only if pre-check 1 removes `'pendiente'` / `'rechazada'` |
| Docs | `projectspec/03-project-structure.md`, `openspec/specs/**` | Update RPC list and affected specs |

---

## Acceptance Criteria

1. The migration aborts with a clear error, changing nothing, if any training is still `'publico'` or any booking is still `'pendiente'`.
2. After the migration, `entrenamientos_publicos`, `entrenamientos_publicos_view` and `entrenamientos_publicos_servicios_view` do not exist.
3. `entrenamientos` has no `visibilidad` or `visible_para` column.
4. No function in the `public` or `bi` schema references `entrenamientos_publicos`, `visibilidad` or `visible_para`:
   `select proname from pg_proc where prosrc ilike '%entrenamientos_publicos%' or prosrc ilike '%visible_para%'` returns no rows.
5. Exactly one overload of `book_and_deduct_service_units` exists, without `p_permitir_pendiente` and `p_plan_purchase`. `confirm_pending_reservas_for_suscripcion` does not exist.
6. A tenant member books a training with a service restriction: the booking is created as `'confirmada'` and one unit is deducted, as before.
7. A booking without the required service is rejected with the existing restriction message.
8. Validating a subscription payment as an administrator works and raises no error about a missing function.
9. The analytics page loads for an administrator with no "Reservas por tipo de entrenamiento" panel, no empty grid cell and no console errors; all other panels show the same figures as before the migration.
10. No tenant with id `2a089688-3cfc-4216-9372-33f50079fbd1` exists. "Organizaciones Disponibles" and "Inicio" list the same organizations as before.
11. Administrators and trainers can create, edit and delete trainings, including recurring series and from a saved template that previously contained `visibilidad`.
12. `org-assets` contains no object whose path matches `orgs/%/entrenamientos-publicos/%`.
13. `supabase db reset` applies every migration from scratch without error.
14. `git grep -n -E "visibilidad|visible_para|bookingByPublicStatus|p_permitir_pendiente|p_plan_purchase" -- src` returns only matches that belong to events or plans (`EventosTable`, `EventoConfiguracionStep`, `PlanesTable`, `PlanesPage`, landing copy).
15. `npx tsc --noEmit`, `npm run lint` and `npm run build` finish without errors.

---

## Implementation Steps

- [ ] Confirm US-0123 is in production; take a database backup
- [ ] Run the pre-check queries in production and record the results
- [ ] Decide on `reservas` `'pendiente'` / `'rechazada'` / `motivo_rechazo` from the codebase search
- [ ] Remove `bookingByPublicStatus` from analytics types, service and page
- [ ] Remove the RPC parameters, `visibilidad` / `visible_para` and the `public` tenant filters from the services
- [ ] Write the migration: guards, BI rebuild, RPC rewrite, drops, template JSON clean-up, tenant delete
- [ ] Update `supabase/seed.sql`
- [ ] Apply locally with `supabase db reset`; run the catalog queries from the acceptance criteria
- [ ] Manual test: member booking with and without restriction, payment validation, trainings CRUD and series, template load, analytics page, organizations list
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [ ] Deploy frontend and migration together (the new frontend calls the new RPC signature)
- [ ] Run the banner deletion script against production and record the count
- [ ] Update `03-project-structure.md` and OpenSpec specs

---

## Non-Functional Requirements

- **Security**: Removes the last cross-tenant objects of the feature. Recreated functions keep `security definer` with a fixed `search_path`, and `execute` granted only to `authenticated`. BI objects stay inaccessible to `anon` and `authenticated`. The banner deletion script uses the service-role key and must not be committed with credentials.
- **Data safety**: Destructive and irreversible. A backup is mandatory before applying. The migration runs in one transaction with guard checks, so a failed assumption leaves the database untouched.
- **Deployment order**: Frontend and migration ship in the same release. The old frontend sends RPC parameters that no longer exist, and the new frontend expects them gone; keep the window between the two as short as possible and deploy during low traffic.
- **Performance**: Dropping two indexes and one join in `bi.dim_entrenamientos`; no new queries. No pagination impact.
- **Error handling**: No new user-facing errors. Guard failures surface as migration errors with an explicit message.
- **Accessibility**: Removing the analytics panel must keep heading order and the grid layout intact.
