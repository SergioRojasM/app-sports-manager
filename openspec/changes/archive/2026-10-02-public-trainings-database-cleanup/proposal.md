## Why

US-0123 removed the public trainings marketplace from the product but left its database objects in place: an unused table, two ungranted views, three triggers, two dead columns, two unused RPC parameters, an analytics breakdown that only shows history, and orphaned banner files. US-0124 removes them so the schema matches the product and nothing dormant is left to maintain or audit.

Source: `projectspec/userstory/us0124-public-trainings-database-cleanup.md`.

## What Changes

- **BREAKING** Drop `entrenamientos_publicos`, `entrenamientos_publicos_view`, `entrenamientos_publicos_servicios_view`, their triggers and the three functions that served them.
- **BREAKING** Drop `entrenamientos.visibilidad` and `entrenamientos.visible_para` with their constraint, foreign key and indexes; remove the `visibilidad` key from saved template JSON.
- **BREAKING** Recreate `book_and_deduct_service_units` without `p_permitir_pendiente` and `p_plan_purchase` (and without the deferred plan purchase block). The frontend stops sending them.
- **BREAKING** Recreate `bi.fct_entrenamientos`, `bi.fct_reservas` and `get_tenant_bi_dashboard` without `es_publico` / `bookingByPublicStatus`; remove the "Reservas por tipo de entrenamiento" panel from the analytics page.
- Delete publication banners under `org-assets/orgs/*/entrenamientos-publicos/` with a one-off service-role script.
- Guard the migration: it aborts if any training is still public or any publication is still active.

## Non-goals

- Deleting the system tenant `public`, its `admin_tenants` row, its memberships, or the name filters in `inicio.service.ts` and `tenant.service.ts`. They stay.
- Removing the pending-booking cascade: `confirm_pending_reservas_for_suscripcion`, `reject_pending_reservas_for_suscripcion`, the `reservas` states `pendiente` / `rechazada`, `reservas.motivo_rechazo`, `reservas.suscripcion_id` and `pagos.motivo_rechazo` stay, so bookings already pending are still resolved when their payment is validated.
- Any change to the events module or to public plans (`planes.es_publico`).
- Editing historical migration files.
- Applying the migration or running the banner script against the remote Supabase project; this change is applied locally only.
- New pages or components. This change only removes UI, so no design input is required.

## Capabilities

### New Capabilities
- `public-trainings-schema-removal`: the database and storage state after the clean-up — guarded migration, removed objects and columns, simplified booking RPC, preserved cascade and system tenant, removed banners.

### Modified Capabilities
- `analitica-detail-tabs`: the RPC no longer returns `bookingByPublicStatus` and the Operación tab no longer renders "Reservas por tipo de entrenamiento".
- `training-member-only-access`: the visibility columns no longer exist; the two requirements about deactivated publications and closed publication data are removed with the table.

## Impact

### Files to create
- `supabase/migrations/{timestamp}_limpieza_entrenamientos_publicos.sql`
- `scripts/delete-public-training-banners.sh`

### Files to modify
| Layer | File | Change |
|-------|------|--------|
| Component | `src/components/portal/analitica/AnaliticaPage.tsx` | Remove the "Reservas por tipo de entrenamiento" panel; "Reservas por disciplina" spans the row |
| Service | `src/services/supabase/portal/analitica.service.ts` | Remove any `bookingByPublicStatus` mapping |
| Service | `src/services/supabase/portal/reservas.service.ts` | Stop sending `p_permitir_pendiente` and `p_plan_purchase` |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Remove `visible_para` from inserts, mapping and select lists |
| Types | `src/types/portal/analitica.types.ts` | Remove `bookingByPublicStatus` |
| Types | `src/types/portal/entrenamientos.types.ts` | Remove `visible_para` |
| Docs | `projectspec/03-project-structure.md` | Update the database functions section |

### Systems
- Supabase schemas `public` and `bi`, storage bucket `org-assets`.
- PostgREST: the booking RPC signature changes, so frontend and migration must ship together.

## Implementation plan

1. Run the pre-checks locally and take note of the baseline (object list, Resumen values of the dashboard RPC).
2. Component: remove the analytics panel.
3. Services: remove the RPC parameters, `visible_para` and the analytics mapping.
4. Types: remove `bookingByPublicStatus` and `visible_para`.
5. Write the migration: guards → BI rebuild → booking RPC → drops → columns → template JSON.
6. Apply locally, run the catalog checks and the manual flows.
7. Write the banner script and run it against the local stack.
8. Type-check and lint, update documentation, prepare commit and PR text.
