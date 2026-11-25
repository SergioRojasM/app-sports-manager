## Why

The public trainings marketplace (US-0089 to US-0117) was replaced by the events module (US-0118 to US-0122). Trainings are now an internal organization feature, but the marketplace is still live: three routes, about 4,000 lines of frontend, and RLS branches that let any authenticated user read and book another organization's trainings. US-0123 removes the feature and closes that access.

Source: `projectspec/userstory/us0123-deprecate-public-trainings-module.md`.

## What Changes

- **BREAKING** Remove the routes `/entrenamientos-publicos`, `/entrenamientos-publicos/{entrenamiento_id}` and `/portal/entrenamientos-publicos`. They return 404; there is no redirect.
- **BREAKING** Remove the "Publicar" / "Gestionar publicación" action and every visibility badge, legend and field from trainings management. Trainings are always private to the tenant.
- **BREAKING** Non-members can no longer read or book a tenant's trainings. They keep read access to their own existing bookings, the trainings those bookings point to, and their own uploaded form files.
- Remove the "skip plan confirmation" booking path from the frontend. The RPC `book_and_deduct_service_units` is not changed.
- Remove the guided booking flow (stepper and `guiado` params) from login and signup. `?next=` keeps working.
- Remove the "Entrenamientos Públicos" portal menu item, its breadcrumb label and the landing header entry "Calendario de Entrenamientos".
- Move `CronogramaItem`, `IncluyeItem` and `PrecioItem` from `entrenamientos-publicos.types.ts` to `eventos.types.ts`. Events behaviour does not change.
- One migration: set every publication inactive, return every training to `privado`, revoke writes on `entrenamientos_publicos`, revoke the two public views, and rewrite the policies that had a public-training branch. No row, table or column is deleted.

## Non-goals

- Dropping `entrenamientos_publicos`, its views, triggers or functions (US-0124).
- Dropping `entrenamientos.visibilidad` / `visible_para` or the `public` tenant (US-0124).
- Changing the signature of `book_and_deduct_service_units`, or the pending / rejected reservation states and their auto-confirm and reject cascades (US-0124).
- Removing the "Público / Privado" breakdown from analytics (US-0124). It keeps showing history.
- Deleting publication banners from storage (US-0124).
- Redirects from the old URLs.
- Any change to public plans (`planes.es_publico`, `components/portal/planes-publicos/`) or to the events module's behaviour.
- New pages or components. This change only removes UI, so no design input is required.

## Capabilities

### New Capabilities
- `training-member-only-access`: trainings are readable and bookable only by members of the owning tenant; non-members keep access to their own historical bookings; the public trainings routes, publish action and public views are gone.

### Modified Capabilities
- `training-management`: remove the six visibility requirements (visibility assignment, `visible_para` computation, cross-tenant access, series propagation, list badge, calendar legend).
- `public-training-detail-visual`: remove all requirements; the page no longer exists.
- `plan-skip-confirmation-booking`: remove the publish-time toggle, the pending-booking continuation and the server-side flag re-verification. The reservation-state requirements stay until US-0124.
- `training-booking-restrictions`: a service or units rejection always blocks the booking; the skip-confirmation exception is removed.
- `portal-role-navigation`: the global sidebar no longer has "Entrenamientos Públicos", and the position of "Eventos" is no longer defined relative to it.
- `team-events-discovery`: navigation entries no longer reference public trainings; the "independent of public trainings" requirement is removed.
- `team-events-wizard`: remove the "Public trainings unchanged" scenario from the event page layout.
- `portal-dashboard-layout`: the breadcrumb label list no longer includes `entrenamientos-publicos`.

## Impact

### Files to delete
- `src/app/entrenamientos-publicos/**`, `src/app/portal/entrenamientos-publicos/page.tsx`
- `src/components/landing/entrenamientos-publicos/**`, `src/components/portal/entrenamientos-publicos/**`
- `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx`
- `src/components/ui/GuidedBookingStepper.tsx`
- `src/hooks/landing/entrenamientos-publicos/**`, `src/hooks/portal/entrenamientos-publicos/**`
- `src/lib/portal/entrenamientos-publicos/guidedBooking.ts`
- `src/services/supabase/portal/entrenamientos-publicos.service.ts`
- `src/types/portal/entrenamientos-publicos.types.ts`

### Files to modify
| Layer | File | Change |
|-------|------|--------|
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Remove publish flow |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | Remove Publish button and props |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx`, `EntrenamientoDetalleModal.tsx`, `EntrenamientosCalendar.tsx`, `EntrenamientoWizard.tsx`, `index.ts` | Remove visibility UI and export |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | Remove `onSubscribed` |
| Component | `src/components/portal/PortalBreadcrumb.tsx`, `src/components/landing/Header.tsx` | Remove label and nav entry |
| Component | `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` | Remove guided flow |
| Component | `src/components/ui/index.ts` | Remove stepper export |
| Component | `src/components/portal/eventos/detalle/EventoDetalle{Cronograma,Entradas,Incluye}.tsx` | Update type import |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts`, `useEntrenamientoForm.ts` | Remove published ids and `visibilidad` |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Remove `onSubscribed` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | Update type import |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Remove `resolveVisiblePara` and `visibilidad` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Remove skip-plan path |
| Service | `src/services/supabase/portal/storage.service.ts` | Remove banner upload |
| Types | `src/types/portal/eventos.types.ts` | Own the three shared types |
| Types | `src/types/portal/entrenamientos.types.ts`, `entrenamiento-plantillas.types.ts`, `reservas.types.ts`, `suscripciones.types.ts`, `storage.types.ts`, `src/types/portal.types.ts` | Remove public-training fields and menu item |
| Lib | `src/lib/portal/eventos.utils.ts`, `eventos-wizard.utils.ts`, `src/lib/constants.ts` | Update type import; delete `PUBLIC_TENANT_ID` |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Remove public-training references |

### Files to create
- `supabase/migrations/{timestamp}_deprecar_entrenamientos_publicos.sql`

### Systems
- Supabase RLS on `entrenamientos`, `reservas`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `servicios`, `storage.objects`; grants on `entrenamientos_publicos` and its two views.
- Obsolete open changes to close without implementing: `public-training-detail-page`, `marketplace-default-60-day-window`, `defer-plan-purchase-until-booking-completes`.

## Implementation plan

1. Move the three shared types to `eventos.types.ts` and update importers.
2. Pages: delete the three routes.
3. Components: remove the publish flow, visibility UI, menu and nav entries, guided auth flow; delete the module's component folders.
4. Hooks: strip `visibilidad`, published ids and `onSubscribed`; delete the module's hooks.
5. Services: strip `visibilidad`, the skip-plan path and the banner upload; delete the module's service.
6. Types and constants: remove the leftover fields, the old types file and `PUBLIC_TENANT_ID`.
7. Write the migration and apply it locally only.
8. Verify RLS and the manual flows, then type-check and lint.
9. Update documentation and close the obsolete changes.
