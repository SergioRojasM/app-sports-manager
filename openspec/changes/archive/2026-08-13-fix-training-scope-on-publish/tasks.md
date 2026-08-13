## 1. Branch setup

- [x] 1.1 Create a new branch `fix/training-scope-on-publish` from `develop`
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database migration

- [x] 2.1 Create `supabase/migrations/20260727010000_entrenamientos_publicos_sync_visibilidad.sql`
- [x] 2.2 Add `sync_entrenamiento_visibilidad_on_publicacion()` trigger function: on `activo = true` set `entrenamientos.visibilidad = 'publico'` and `visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'`; on `activo = false` revert `visibilidad = 'privado'` and `visible_para = tenant_id` (guarded so no-op when already in the target state)
- [x] 2.3 Add `entrenamientos_publicos_sync_visibilidad` trigger (`AFTER INSERT OR UPDATE`) on `entrenamientos_publicos` calling the function above
- [x] 2.4 Add the backfill `UPDATE` statement fixing already-published trainings whose source `visibilidad` was never flipped
- [x] 2.5 Widen `entrenamiento_categorias_select_authenticated` (drop + recreate) with the `visibilidad = 'publico'` OR-branch
- [x] 2.6 Widen `ent_restricciones_select_authenticated` (drop + recreate) with the `visibilidad = 'publico'` OR-branch
- [x] 2.7 Widen `reservas_select_authenticated` (drop + recreate) with the `visibilidad = 'publico'` OR-branch
- [x] 2.8 Widen `reservas_insert_authenticated` (drop + recreate) with the self-booking + `visibilidad = 'publico'` OR-branch
- [x] 2.9 Apply the migration locally (local Supabase instance only — never push to remote)
- [x] 2.10 Widen `athlete_upload_own_formulario_respuestas` (storage.objects INSERT, drop + recreate) with the public-training OR-branch (join through `entrenamientos.formulario_id`)
- [x] 2.11 Add new `public_training_formulario_respuesta_read` (storage.objects SELECT) scoped to the caller's own uploaded file under a published training's formulario path
- [x] 2.12 Re-apply locally via `supabase db reset` to validate the full migration history (including the new section) replays cleanly from scratch

## 3. Database verification

- [x] 3.1 Verify the trigger fires on insert (publish) and update (despublish/republish) of `entrenamientos_publicos`, confirming `entrenamientos.visibilidad`/`visible_para` change as expected in each case
- [x] 3.2 Seed a scenario with an existing `activo = true` publication whose source training is still `visibilidad = 'privado'`; re-apply/verify the backfill flips it
- [x] 3.3 As a non-member session, verify `entrenamiento_categorias`, `entrenamiento_restricciones`, and `reservas` SELECT now return rows for a published training's `entrenamiento_id`, and remain empty for a non-published one
- [x] 3.4 As a non-member session, verify a direct `reservas` insert succeeds for a published training when `atleta_id = auth.uid()`, and is still rejected for a non-published one
- [x] 3.5 As a non-member session, verify uploading (INSERT) and reading back (SELECT) an image object under `orgs/{tenantId}/users/{ownUid}/formularios/{formularioId}/...` succeeds for a published training's `formulario_id`
- [x] 3.6 As the same non-member session, verify the same upload is rejected for a private (non-published) training's `formulario_id` (regression check)
- [x] 3.7 As the publishing tenant's admin, verify they can still read the non-member visitor's uploaded image via the unmodified `org_member_read` policy; as an existing tenant member, verify their own upload still works via the original membership branch

## 4. Component: publish modal button labels

- [x] 4.1 In `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx`, relabel the left destructive button from "Despublicar" to "Quitar publicación" (handler unchanged, `onDespublicar`)
- [x] 4.2 Relabel the right primary button from "Guardar cambios" to "Guardar cambios de la publicación" when `isPublished`, and update the `isSubmitting` loading label to "Guardando cambios..." for that case (handler unchanged, `onSubmit`)
- [x] 4.3 Confirm the not-published state still shows a single "Publicar" button, unchanged

## 5. Manual end-to-end verification

- [x] 5.1 As admin in Tenant A, publish a training with no restrictions; as a user with zero membership in Tenant A, open the marketplace, open the listing, confirm categories/levels load and the booking form is usable
- [x] 5.2 Complete a booking as that non-member visitor; confirm a `reservas` row exists with the correct `atleta_id`/`entrenamiento_id`/`tenant_id`
- [x] 5.3 Publish a training with a `validar_nivel_disciplina` restriction row (no servicio slots); confirm a non-qualifying non-member visitor is correctly rejected, not silently allowed through
- [x] 5.4 Publish a training with an internal `formulario_id`; confirm the non-member visitor is routed through `FormularioRespuestaModal` before booking
- [x] 5.5 Despublish (click "Quitar publicación"); confirm the training reverts to unbookable/invisible for the non-member visitor
- [x] 5.6 Attempt the same non-member booking a second time for the same still-published training; confirm the duplicate-booking rejection fires
- [x] 5.7 Book a published training to full capacity, then attempt one more non-member booking; confirm `capacity_exceeded` is returned
- [x] 5.8 Re-run the existing US-0089 same-tenant booking manual tests to confirm no regression for member bookings
- [x] 5.9 Visually confirm the publish modal footer labels match spec in both the not-published and already-published states
- [x] 5.10 As the non-member visitor, complete a booking for a published training whose form has an image-type field; confirm the image uploads and previews successfully in `FormularioRespuestaModal`, and that the admin can later see the uploaded image when reviewing the response

## 6. Quality gate and delivery

- [x] 6.1 Run type check, lint, and test suite; fix any failures (do not run a full build) — `npx tsc --noEmit` clean; `npm run lint` unchanged at 16 pre-existing errors/18 warnings in unrelated files (this addition is DB-only, no app code touched); no test runner configured in this repo
- [x] 6.2 Write the commit message and pull request description summarizing the scope-sync fix, the storage RLS fix, and the modal label clarification
