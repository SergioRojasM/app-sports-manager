# Handoff — deprecate-public-trainings-module (US-0123)

## Commit message

```
feat(trainings): deprecate the public trainings marketplace

Trainings are now internal to the organization; the events module is the
only public offering.

- Remove the /entrenamientos-publicos and /portal/entrenamientos-publicos
  routes with their components, hooks, service and types (404, no redirect)
- Remove the Publish action and every visibility badge, legend and field
  from trainings management
- Remove the skip-plan-confirmation booking path from the frontend; the
  booking RPC is unchanged
- Remove the guided booking flow from login and signup
- Move CronogramaItem, IncluyeItem and PrecioItem to eventos.types.ts
- Migration: unpublish every training and close the cross-tenant RLS
  branches; non-members keep read access to their own bookings
```

## Pull request description

### What
Removes the public trainings marketplace (US-0089 to US-0117), replaced by the events module. Phase 1 of 2: code removal and access closure. Tables and columns stay until US-0124.

### Changes
- **Frontend:** 3 routes, 2 component slices, 2 hook slices, 1 service, 1 types file, `PublicarEntrenamientoModal` and `GuidedBookingStepper` deleted. Trainings management, booking service, auth forms, portal menu, breadcrumb and landing header cleaned up.
- **Events:** only a type import path changed (`eventos.types.ts` now owns the three shared types).
- **Database:** `20261003120000_deprecar_entrenamientos_publicos.sql` sets every publication inactive, returns every training to `privado`, revokes writes on `entrenamientos_publicos` and all access to its two views, and rewrites the select/insert policies on `entrenamientos`, `reservas`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `servicios` and two storage policies. No rows, tables or columns are deleted.

### Deployment order
1. Deploy the frontend.
2. Apply the migration.

An old client against the new policies fails to publish or to book as a non-member.

### Rollback
Restore the previous policy definitions and grants (`20260916120200`, `20260729000200`, `20260727010000`, `20260723010000`) and redeploy the previous frontend. The migration does not record which publications were active; snapshot `select id from entrenamientos_publicos where activo` before applying in production if they may need to be restored.

### Verified
- `npx tsc --noEmit` clean. `npm run lint`: 17 errors / 18 warnings, all pre-existing (baseline on `develop` was 18 / 18); none in files touched by this change.
- Local database, after the migration: 0 active publications (4 rows kept), 0 public trainings (11 before).
- RLS as a non-member with one booking: sees only that booking and its training; no categories or restrictions; insert into `reservas` rejected.
- RLS as a member: all 238 trainings and 782 bookings of the tenant visible.
- `anon` select on `entrenamientos_publicos_view` and `authenticated` update on `entrenamientos_publicos`: permission denied.
- Dev server: the three old URLs return 404; `/eventos`, `/auth/login?next=` and `/auth/signup?next=` return 200 with no stepper.

- Browser as tenant administrator (local): login with `?next=`, portal menu without "Entrenamientos Públicos", create a training from a saved template that contains `visibilidad`, edit it (single instance), book an athlete from the bookings panel (service restriction prompts for confirmation, booking stored as `confirmada`), delete it. No visibility UI, no Publish action, no console errors.
- Browser: event listing, event detail (schedule, includes, tickets, price) and the event wizard render as before.
- Browser as member athlete (local): sees the tenant's trainings with only "Ver detalle" and "Ver reservas"; books an unrestricted training (stored as `confirmada`); a training that requires a service they do not hold is rejected with the existing message and no booking row is created.
- Opening a previously uploaded form file as a non-member (task 9.2) was validated manually by the owner.
- Full migration history loaded into Supabase by the owner.

### Not applicable
- Editing a recurring series (scopes "future" and "series"): not available in the frontend today, so there is nothing to test.

### Follow-up
- US-0124: drop the table, views, columns, `public` tenant, RPC parameters, analytics breakdown and stored banners.
- The obsolete OpenSpec changes `public-training-detail-page`, `marketplace-default-60-day-window` and `defer-plan-purchase-until-booking-completes` were moved to `openspec/deprecated/`.
