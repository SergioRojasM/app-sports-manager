# US-0123 — Deprecate the Public Trainings Module (Phase 1: Remove Code and Close Access)

## ID
US-0123

## Name
Deprecate the public trainings marketplace — remove its routes, UI, hooks and service, decouple the code that stays, and ship a migration that unpublishes every training and closes cross-tenant access, keeping the historical data.

## As a
Tenant administrator (and platform owner)

## I Want
Trainings to be visible and bookable only by members of my organization, with the public trainings marketplace removed from the product.

## So That
There is a single public offering (the events module, US-0118 to US-0122), trainings stay an internal organization feature, and nobody outside the organization can read or book them.

---

## Description

### Current State
- The public trainings marketplace (US-0089 to US-0117) is still live: `/entrenamientos-publicos`, `/entrenamientos-publicos/{entrenamiento_id}` and `/portal/entrenamientos-publicos`, about 4,000 lines across routes, components, hooks, one service and one types file.
- An administrator or trainer can publish a training from `EntrenamientoActionModal` → `PublicarEntrenamientoModal`. Publishing writes a row to `entrenamientos_publicos`; the trigger `sync_entrenamiento_visibilidad_on_publicacion` flips `entrenamientos.visibilidad` to `'publico'`.
- Several RLS policies have a "public training" branch that lets any authenticated user read the training, its categories and restrictions, and insert a booking, without being a member of the tenant.
- The events module replaced this feature, but it still imports three types (`CronogramaItem`, `IncluyeItem`, `PrecioItem`) from `entrenamientos-publicos.types.ts`.
- The "skip plan confirmation" booking path (US-0106 / US-0110) has a single caller: `PublicTrainingReservaModal`.

### Proposed Changes

#### Scope
| In scope | Out of scope (US-0124) |
|----------|------------------------|
| Delete all public-trainings routes, components, hooks, lib and service | Dropping `entrenamientos_publicos`, its views, triggers and functions |
| Move the three shared types into `eventos.types.ts` | Dropping `entrenamientos.visibilidad` / `visible_para` and the `public` tenant |
| Remove the Publish action and every visibility indicator from trainings management | Changing the `book_and_deduct_service_units` RPC signature |
| Remove the skip-plan-confirmation path from the frontend | Removing the "Público / Privado" breakdown from analytics |
| Remove the guided booking flow from login and signup | Deleting publication banners from storage |
| One migration: unpublish everything and close public RLS branches | Redirects from the old URLs (they return 404 by decision) |
| OpenSpec and `DESIGN.md` clean-up | |

#### Decisions already taken
- **Database:** code is removed and access is closed now; the table and columns stay as history until US-0124.
- **Live data:** every training is unpublished. Existing bookings made by non-members are kept, and each non-member can still see their own bookings.
- **Old URLs:** no redirect. They return the standard 404.
- **Skip plan confirmation:** removed from the frontend only. The RPC keeps its optional parameters.

#### 1. Files and folders to delete
- `src/app/entrenamientos-publicos/` (list page and `[entrenamiento_id]/`)
- `src/app/portal/entrenamientos-publicos/`
- `src/components/landing/entrenamientos-publicos/` (including `detalle/`)
- `src/components/portal/entrenamientos-publicos/`
- `src/hooks/landing/entrenamientos-publicos/`
- `src/hooks/portal/entrenamientos-publicos/`
- `src/lib/portal/entrenamientos-publicos/`
- `src/services/supabase/portal/entrenamientos-publicos.service.ts`
- `src/types/portal/entrenamientos-publicos.types.ts` (after step 2)
- `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx`
- `src/components/ui/GuidedBookingStepper.tsx`

Remove the matching re-exports from `src/components/portal/entrenamientos/index.ts`, `src/components/ui/index.ts` and `src/services/supabase/portal/index.ts` (if present).

#### 2. Shared types (do this first)
Move `CronogramaItem`, `IncluyeItem` and `PrecioItem` unchanged into `src/types/portal/eventos.types.ts` and export them from there. Update the importers:
- `src/types/portal/eventos.types.ts` (drop its own import)
- `src/lib/portal/eventos.utils.ts`
- `src/lib/portal/eventos-wizard.utils.ts`
- `src/hooks/portal/gestion-eventos/useEventoWizard.ts`
- `src/components/portal/eventos/detalle/EventoDetalleCronograma.tsx`
- `src/components/portal/eventos/detalle/EventoDetalleEntradas.tsx`
- `src/components/portal/eventos/detalle/EventoDetalleIncluye.tsx`

No behaviour change in events.

#### 3. Trainings management
- `EntrenamientosPage.tsx`: remove `usePublicarEntrenamiento`, the `getPublishRestrictionSummary` effect, the `blockingRestrictionById` and `requiredServicioIdsById` states, `openPublicarModal`, and the `<PublicarEntrenamientoModal>` element.
- `EntrenamientoActionModal.tsx`: remove the "Publicar" / "Gestionar publicación" button and the props `canPublish`, `isPublished`, `publishDisabledReason` and the publish callback.
- `useEntrenamientos.ts`: remove the `listPublishedEntrenamientoIds` call and `publishedEntrenamientoIds` from state and from the returned object.
- Visibility UI: remove `VisibilidadBadge` (`EntrenamientosList.tsx`) and its use in `EntrenamientoDetalleModal.tsx`; remove the "Visibilidad" legend and the `isPublic` styling in `EntrenamientosCalendar.tsx`; remove the read-only "Visibilidad" block and its helper text in `EntrenamientoWizard.tsx`.
- `entrenamientos.service.ts`: remove `resolveVisiblePara` and the `PUBLIC_TENANT_ID` import. Stop sending `visibilidad`. On insert, send `visible_para = tenantId` (the column default for `visibilidad` is `'privado'`). Stop mapping `visibilidad` when reading rows.
- Remove `visibilidad` and `TrainingVisibility` from `entrenamientos.types.ts`, `entrenamiento-plantillas.types.ts`, `useEntrenamientoForm.ts` (default value, validation, payload, template mapping) and `useEntrenamientos.ts`.
- **Templates:** saved templates (`entrenamiento_plantillas.contenido`) may still contain a `visibilidad` key. Loading such a template must work and ignore the key.
- Delete `PUBLIC_TENANT_ID` from `src/lib/constants.ts`.

#### 4. Bookings and plans
- `reservas.service.ts`: remove the `pendienteSinPlan` variable and step "1a" that reads `entrenamientos_publicos.omitir_confirmacion_plan`; a failed restriction check always returns the restriction result. Call the RPC with `p_permitir_pendiente: false` and `p_plan_purchase: null`.
- `reservas.types.ts`: remove `permitir_pendiente_sin_plan` and `plan_pendiente_compra` from the create-booking input.
- `useSuscripcion.ts` and `PlanesPublicosModal.tsx`: remove the `onSubscribed` option/prop and the deferred-purchase branch. Remove `PendingPlanPurchaseDraft` from `suscripciones.types.ts`.
- `src/components/portal/planes-publicos/` stays. It is used by `TenantDirectoryList` (`VerPlanesButton`) and does not depend on public trainings.

#### 5. Navigation, auth and storage
- `src/types/portal.types.ts`: remove `PUBLIC_TRAININGS_MENU_ITEM` and every place it is added to a menu.
- `PortalBreadcrumb.tsx`: remove the `'entrenamientos-publicos'` label.
- `src/components/landing/Header.tsx`: remove the "Calendario de Entrenamientos" child of "Plataforma". "Eventos" stays.
- `LoginForm.tsx` and `SignupForm.tsx`: remove `parseGuidedParams`, `GUIDED_LOGIN_STEPS` / `GUIDED_SIGNUP_STEPS`, `guidedTarget` and the stepper. The `next` parameter keeps working exactly as today.
- `storage.service.ts` and `storage.types.ts`: remove the public-training banner upload function and its path builder.

#### 6. Documentation
Register the change through the repo's OpenSpec flow.
- Remove `openspec/specs/public-training-detail-visual` and `openspec/specs/plan-skip-confirmation-booking`.
- Delta specs removing marketplace mentions: `training-management`, `training-booking-restrictions`, `portal-dashboard-layout`, `portal-visual-migration`, `team-events-discovery`, `team-events-wizard`, `analitica-detail-tabs`, `analitica-visual`.
- Close without implementing: `openspec/changes/public-training-detail-page`, `marketplace-default-60-day-window`, `defer-plan-purchase-until-booking-completes`.
- `DESIGN.md`: remove the public-training scope and frames (front-matter scope, frames `OyIqr` and `ql3Ij`, and the `/entrenamientos-publicos/*` layout note).
- `projectspec/03-project-structure.md`: remove the deleted folders and files from the directory tree.

---

## Database Changes

One new migration, `supabase/migrations/{timestamp}_deprecar_entrenamientos_publicos.sql`, in a single transaction, in this order.

**1. Unpublish everything.** Rows are kept so BI (`es_publico = ep.id is not null`) keeps its history.
```sql
update public.entrenamientos_publicos set activo = false where activo;

-- Safety net: the sync trigger should already have done this.
update public.entrenamientos
   set visibilidad = 'privado', visible_para = tenant_id
 where visibilidad = 'publico';
```

**2. Close writes on `entrenamientos_publicos`.**
```sql
drop policy if exists entrenamientos_publicos_insert_admin on public.entrenamientos_publicos;
drop policy if exists entrenamientos_publicos_update_admin on public.entrenamientos_publicos;
revoke insert, update, delete on public.entrenamientos_publicos from authenticated;
```
The select and delete policies can stay; without grants they are inert for delete.

**3. Close the public views.**
```sql
revoke all on public.entrenamientos_publicos_view from anon, authenticated;
revoke all on public.entrenamientos_publicos_servicios_view from anon, authenticated;
```

**4. Rewrite policies without the public branch.** Start from each policy's latest definition (`20260916120200_miembros_pendiente_activacion.sql` unless noted).

| Policy | Table | New rule |
|--------|-------|----------|
| `entrenamientos_select_authenticated` | `entrenamientos` | Member of the tenant, **or** the caller owns a booking on that training |
| `reservas_select_authenticated` | `reservas` | Member of the tenant, **or** `atleta_id = auth.uid()` |
| `reservas_insert_authenticated` | `reservas` | Member branch only (own booking, or trainer/admin of the tenant) |
| `entrenamiento_categorias_select_authenticated` | `entrenamiento_categorias` | Members only |
| `ent_restricciones_select_authenticated` | `entrenamiento_restricciones` | Members only |
| `servicios_select_authenticated` (latest in `20260729000200`) | `servicios` | Remove the "required by a published training" branch; keep member, public plan and own units |
| `athlete_upload_own_formulario_respuestas` | `storage.objects` | Active members only |
| `public_training_formulario_respuesta_read` | `storage.objects` | Keep, without the `visibilidad` condition: the caller reads only files under their own `users/{auth.uid()}/formularios/` path |
| `public_training_banner_read` | `storage.objects` | Drop |

```sql
create policy entrenamientos_select_authenticated
  on public.entrenamientos for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    or exists (
      select 1 from public.reservas r
      where r.entrenamiento_id = entrenamientos.id
        and r.atleta_id = auth.uid()
    )
  );
```
RLS recursion check: the new `reservas` select policy no longer reads `entrenamientos`, so the two policies do not reference each other. If Postgres still reports infinite recursion, move the booking lookup into a `security definer` function, following `get_member_tenants_for_authenticated_user`.

**5. Do not touch:** `book_and_deduct_service_units`, `confirm_pending_reservas_for_suscripcion`, the `bi.*` views, `get_tenant_bi_dashboard`, the `public` tenant, the `entrenamientos_publicos` table structure and its triggers.

No new tables, columns or indexes.

---

## API / Server Actions

No new functions. Changes to existing ones:

- **`src/services/supabase/portal/entrenamientos-publicos.service.ts`** — deleted (`getPublicacionByEntrenamientoId`, `listPublishedEntrenamientoIds`, `publicarEntrenamiento`, `despublicarEntrenamiento`, `listPublicTrainings`, `listPublicTenantOptions`, `listPublicTrainingsForLanding`, `getPublicTrainingDetail`, `getPublishRestrictionSummary`).
- **`src/services/supabase/portal/entrenamientos.service.ts`** — create/update functions no longer accept or send `visibilidad`; inserts set `visible_para = tenantId`. Auth unchanged (trainer or admin of the tenant).
- **`src/services/supabase/portal/reservas.service.ts`** — the create-booking function loses `permitir_pendiente_sin_plan` and `plan_pendiente_compra`. It returns the restriction error whenever restrictions fail. RLS now requires tenant membership to insert.
- **`src/services/supabase/portal/storage.service.ts`** — public-training banner upload removed.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_deprecar_entrenamientos_publicos.sql` | New: unpublish, close writes and views, rewrite policies |
| Page | `src/app/entrenamientos-publicos/**` | Delete |
| Page | `src/app/portal/entrenamientos-publicos/page.tsx` | Delete |
| Component | `src/components/landing/entrenamientos-publicos/**` | Delete |
| Component | `src/components/portal/entrenamientos-publicos/**` | Delete |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | Delete |
| Component | `src/components/ui/GuidedBookingStepper.tsx`, `src/components/ui/index.ts` | Delete component and export |
| Hook | `src/hooks/landing/entrenamientos-publicos/**`, `src/hooks/portal/entrenamientos-publicos/**` | Delete |
| Lib | `src/lib/portal/entrenamientos-publicos/guidedBooking.ts` | Delete |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | Delete |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | Delete after moving shared types |
| Types | `src/types/portal/eventos.types.ts` | Own `CronogramaItem`, `IncluyeItem`, `PrecioItem` |
| Lib | `src/lib/portal/eventos.utils.ts`, `src/lib/portal/eventos-wizard.utils.ts` | Update type import |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | Update type import |
| Component | `src/components/portal/eventos/detalle/EventoDetalle{Cronograma,Entradas,Incluye}.tsx` | Update type import |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Remove publish flow |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | Remove Publish button and props |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx`, `EntrenamientoDetalleModal.tsx`, `EntrenamientosCalendar.tsx`, `EntrenamientoWizard.tsx` | Remove visibility UI |
| Component | `src/components/portal/entrenamientos/index.ts` | Remove export |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts`, `useEntrenamientoForm.ts` | Remove published ids and `visibilidad` |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Remove `resolveVisiblePara` and `visibilidad` |
| Types | `src/types/portal/entrenamientos.types.ts`, `entrenamiento-plantillas.types.ts` | Remove `visibilidad` |
| Constants | `src/lib/constants.ts` | Remove `PUBLIC_TENANT_ID` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Remove skip-plan path |
| Types | `src/types/portal/reservas.types.ts`, `suscripciones.types.ts` | Remove pending-plan fields and `PendingPlanPurchaseDraft` |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Remove `onSubscribed` |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | Remove `onSubscribed` |
| Types | `src/types/portal.types.ts` | Remove `PUBLIC_TRAININGS_MENU_ITEM` |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Remove label |
| Component | `src/components/landing/Header.tsx` | Remove nav entry |
| Component | `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` | Remove guided flow |
| Service | `src/services/supabase/portal/storage.service.ts`, `src/types/portal/storage.types.ts` | Remove banner upload and path |
| Docs | `openspec/specs/**`, `openspec/changes/**`, `DESIGN.md`, `projectspec/03-project-structure.md` | As listed in section 6 |

---

## Acceptance Criteria

1. `/entrenamientos-publicos`, `/entrenamientos-publicos/{id}` and `/portal/entrenamientos-publicos` return 404.
2. The portal menu has no "Entrenamientos Públicos" item for any role, and the landing header has no "Calendario de Entrenamientos" entry. "Eventos" is still present in both.
3. The training actions modal offers no "Publicar" or "Gestionar publicación" option.
4. The trainings list, calendar, detail modal and wizard show no visibility badge, legend or field.
5. An administrator or trainer can create, edit (single, series and scope variants) and delete trainings as before.
6. A saved training template that contains `visibilidad` loads into the wizard without error.
7. A tenant member can book a training with and without service restrictions. When a restriction fails, the booking is rejected with the existing restriction message; no pending booking is created.
8. After the migration, `select count(*) from entrenamientos where visibilidad = 'publico'` and `select count(*) from entrenamientos_publicos where activo` both return 0, and the row count of `entrenamientos_publicos` is unchanged.
9. An authenticated user who is not a member of a tenant cannot select that tenant's trainings, categories or restrictions, and an insert into `reservas` for one of its trainings is rejected by RLS.
10. A non-member who booked a formerly public training still sees that booking, with its training details, in "Mis Reservas" and on "Inicio", and can still open files they uploaded in that booking's form.
11. The `anon` role cannot select from `entrenamientos_publicos_view`.
12. Event listing, event detail (schedule, "includes", tickets) and the event wizard work as before.
13. Login and signup show no guided stepper and still honour `?next=`.
14. `git grep -i -E "entrenamientos-publicos|PublicTraining|usePublicar|guidedBooking|GuidedBookingStepper|PUBLIC_TENANT_ID" -- src` returns nothing.
15. `npx tsc --noEmit`, `npm run lint` and `npm run build` finish without errors.

---

## Implementation Steps

- [ ] Move the three shared types to `eventos.types.ts` and update the seven importers
- [ ] Remove the publish flow and visibility UI from trainings management
- [ ] Remove `visibilidad` from the trainings service, hooks and types; delete `PUBLIC_TENANT_ID`
- [ ] Remove the skip-plan-confirmation path from `reservas.service.ts`, `useSuscripcion` and `PlanesPublicosModal`
- [ ] Remove menu item, breadcrumb label, landing nav entry and the guided flow in login/signup
- [ ] Remove banner upload and path from storage service and types
- [ ] Delete the module folders, the service, the types file, `PublicarEntrenamientoModal` and `GuidedBookingStepper`
- [ ] Write the migration and apply it locally with `supabase db reset`
- [ ] Verify RLS as a member, as a non-member with a previous booking, and as `anon`
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [ ] Manual test: trainings CRUD, member booking, My Bookings for a non-member, events, login/signup
- [ ] Update OpenSpec specs, close obsolete changes, update `DESIGN.md` and `03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: After this story no RLS policy grants access based on `entrenamientos.visibilidad`. Non-members keep read access only to their own bookings, the trainings those bookings point to, and their own uploaded form files. `anon` has no access to any training data.
- **Performance**: The new `entrenamientos` select branch looks up `reservas` by `(entrenamiento_id, atleta_id)`; confirm an index covers it (see `20260302000300_reservas_indexes.sql`) and add one in the migration if not.
- **Data safety**: The migration deletes no rows and drops no tables or columns. It can be reverted by restoring the previous policy definitions and grants.
- **Deployment order**: Deploy the frontend first, then apply the migration. The old frontend would fail to publish or to book as a non-member once the migration is live.
- **Error handling**: No new user-facing errors. Removed routes use the default Next.js 404.
- **Accessibility**: No new UI. Removing the Publish button must not leave an empty group or a dangling `aria-describedby` in `EntrenamientoActionModal`.
