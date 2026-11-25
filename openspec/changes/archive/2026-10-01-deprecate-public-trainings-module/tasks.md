## 1. Branch setup

- [x] 1.1 Create the branch `feat/deprecate-public-trainings-module` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Shared types (prerequisite for every deletion)

- [x] 2.1 Move `CronogramaItem`, `IncluyeItem` and `PrecioItem` unchanged into `src/types/portal/eventos.types.ts` and export them; remove its import from `entrenamientos-publicos.types`
- [x] 2.2 Update the type import in `src/lib/portal/eventos.utils.ts`, `src/lib/portal/eventos-wizard.utils.ts` and `src/hooks/portal/gestion-eventos/useEventoWizard.ts`
- [x] 2.3 Update the type import in `src/components/portal/eventos/detalle/EventoDetalleCronograma.tsx`, `EventoDetalleEntradas.tsx` and `EventoDetalleIncluye.tsx`

## 3. Pages

- [x] 3.1 Delete `src/app/entrenamientos-publicos/` (list page and `[entrenamiento_id]/`)
- [x] 3.2 Delete `src/app/portal/entrenamientos-publicos/`

## 4. Components

- [x] 4.1 `EntrenamientosPage.tsx`: remove `usePublicarEntrenamiento`, the `getPublishRestrictionSummary` effect, the `blockingRestrictionById` / `requiredServicioIdsById` states, `openPublicarModal` and the `<PublicarEntrenamientoModal>` element
- [x] 4.2 `EntrenamientoActionModal.tsx`: remove the "Publicar" / "Gestionar publicación" button and the props `canPublish`, `isPublished`, `publishDisabledReason` and the publish callback; leave no empty group or dangling `aria-describedby`
- [x] 4.3 Remove `VisibilidadBadge` from `EntrenamientosList.tsx` and its use in `EntrenamientoDetalleModal.tsx`
- [x] 4.4 Remove the "Visibilidad" legend and the `isPublic` styling from `EntrenamientosCalendar.tsx`, and the "Visibilidad" block with its helper text from `EntrenamientoWizard.tsx`
- [x] 4.5 Delete `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` and its export in `src/components/portal/entrenamientos/index.ts`
- [x] 4.6 `PlanesPublicosModal.tsx`: remove the `onSubscribed` prop and its pass-through to `useSuscripcion`
- [x] 4.7 `LoginForm.tsx` and `SignupForm.tsx`: remove `parseGuidedParams`, `GUIDED_LOGIN_STEPS` / `GUIDED_SIGNUP_STEPS`, `guidedTarget` and the stepper; keep the `next` handling as is
- [x] 4.8 Delete `src/components/ui/GuidedBookingStepper.tsx` and its export in `src/components/ui/index.ts`
- [x] 4.9 Remove the `'entrenamientos-publicos'` label from `PortalBreadcrumb.tsx` and the "Calendario de Entrenamientos" entry from `src/components/landing/Header.tsx`
- [x] 4.10 Delete `src/components/landing/entrenamientos-publicos/` and `src/components/portal/entrenamientos-publicos/`

## 5. Hooks

- [x] 5.1 `useEntrenamientos.ts`: remove the `listPublishedEntrenamientoIds` call, the `publishedEntrenamientoIds` state and return value, and every `visibilidad` assignment
- [x] 5.2 `useEntrenamientoForm.ts`: remove `visibilidad` from the defaults, validation, payload, template mapping and field list; a template containing `visibilidad` must still load
- [x] 5.3 `useSuscripcion.ts`: remove the `onSubscribed` option and the deferred-purchase branch
- [x] 5.4 Delete `src/hooks/landing/entrenamientos-publicos/` and `src/hooks/portal/entrenamientos-publicos/`

## 6. Services

- [x] 6.1 `entrenamientos.service.ts`: remove `resolveVisiblePara` and the `PUBLIC_TENANT_ID` import; stop sending and mapping `visibilidad`; send `visible_para = tenantId` on insert
- [x] 6.2 `reservas.service.ts`: remove `pendienteSinPlan` and step 1a that reads `entrenamientos_publicos.omitir_confirmacion_plan`; call the RPC with `p_permitir_pendiente: false` and `p_plan_purchase: null`
- [x] 6.3 `storage.service.ts`: remove the public-training banner upload function
- [x] 6.4 Delete `src/services/supabase/portal/entrenamientos-publicos.service.ts` and its export in `src/services/supabase/portal/index.ts` if present

## 7. Types, lib and constants

- [x] 7.1 Remove `visibilidad` and `TrainingVisibility` from `entrenamientos.types.ts` and `entrenamiento-plantillas.types.ts`
- [x] 7.2 Remove `permitir_pendiente_sin_plan` and `plan_pendiente_compra` from `reservas.types.ts`, and `PendingPlanPurchaseDraft` from `suscripciones.types.ts`
- [x] 7.3 Remove the banner path builder from `storage.types.ts`
- [x] 7.4 Remove `PUBLIC_TRAININGS_MENU_ITEM` and every use of it from `src/types/portal.types.ts`
- [x] 7.5 Delete `src/lib/portal/entrenamientos-publicos/`, `src/types/portal/entrenamientos-publicos.types.ts` and `PUBLIC_TENANT_ID` in `src/lib/constants.ts`
- [x] 7.6 Run `git grep -i -E "entrenamientos-publicos|PublicTraining|usePublicar|guidedBooking|GuidedBookingStepper|PUBLIC_TENANT_ID" -- src` and confirm it returns nothing

## 8. Database migration (local only)

- [x] 8.1 Create `supabase/migrations/{timestamp}_deprecar_entrenamientos_publicos.sql` wrapped in one transaction
- [x] 8.2 Add the unpublish step: `update entrenamientos_publicos set activo = false where activo`, then the safety-net update of `entrenamientos` to `privado` with `visible_para = tenant_id`
- [x] 8.3 Drop `entrenamientos_publicos_insert_admin` and `entrenamientos_publicos_update_admin`; revoke `insert, update, delete` from `authenticated`; revoke all on `entrenamientos_publicos_view` and `entrenamientos_publicos_servicios_view` from `anon, authenticated`
- [x] 8.4 Recreate `entrenamientos_select_authenticated` (member, or owns a booking on the training), `reservas_select_authenticated` (member, or own booking) and `reservas_insert_authenticated` (member branch only), starting from `20260916120200_miembros_pendiente_activacion.sql`
- [x] 8.5 Recreate `entrenamiento_categorias_select_authenticated` and `ent_restricciones_select_authenticated` as members only, and `servicios_select_authenticated` without the published-training branch
- [x] 8.6 Storage: recreate `athlete_upload_own_formulario_respuestas` for active members only, recreate `public_training_formulario_respuesta_read` scoped to the caller's own path without the `visibilidad` condition, drop `public_training_banner_read`
- [x] 8.7 Confirm an index covers `reservas (entrenamiento_id, atleta_id)`; add one in the migration if not
- [x] 8.8 Apply locally with `supabase db reset`; never push the migration to the remote Supabase project
- [x] 8.9 Check: no active publication, no `visibilidad = 'publico'`, row count of `entrenamientos_publicos` unchanged, no RLS recursion error when selecting `entrenamientos` and `reservas`

## 9. Verification

- [x] 9.1 RLS as a non-member without bookings: no trainings, categories or restrictions of another tenant are returned; inserting a booking is rejected
- [x] 9.2 RLS as a non-member with a previous booking: the booking and its training are visible in "Mis Reservas" and "Inicio"; other athletes' bookings are not; an uploaded form file opens
- [x] 9.3 RLS as `anon`: selecting `entrenamientos_publicos_view` is denied
- [x] 9.4 Browser: the three old URLs return 404; no "Entrenamientos Públicos" in the portal menu; no "Calendario de Entrenamientos" in the landing header
- [x] 9.5 Browser as administrator: create, edit (single, series, future) and delete a training; load a template that contains `visibilidad`; no publish option, badge, legend or visibility field
- [x] 9.6 Browser as member athlete: book a training with and without a service restriction; a failed restriction shows the existing message and creates no booking
- [x] 9.7 Browser: event listing, event detail (schedule, includes, tickets) and event wizard work as before; login and signup with `?next=` redirect correctly with no stepper

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`: remove the deleted folders and files from the directory tree and note that the three shared types live in `eventos.types.ts`
- [x] 10.2 Update `DESIGN.md`: remove the public-training scope, the frames `OyIqr` and `ql3Ij`, and the `/entrenamientos-publicos/*` layout note
- [x] 10.3 Close without implementing the obsolete changes `public-training-detail-page`, `marketplace-default-60-day-window` and `defer-plan-purchase-until-booking-completes` (confirm with the owner how to archive them)

## 11. Quality checks and delivery

- [x] 11.1 Run `npx tsc --noEmit` and fix every error
- [x] 11.2 Run `npm run lint` and fix every error
- [x] 11.3 Run tests if a test script exists (none today); do not run `npm run build`
- [x] 11.4 Write the commit message and the pull request description, including the deployment order (frontend first, then the migration) and the rollback note from `design.md`
