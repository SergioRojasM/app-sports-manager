## Why

The form-templates module (US-0084/US-0085) and the training-form-attachment feature (US-0086) are both fully implemented, but together they only let an admin *define* a form and *attach* it to a training — nothing in the product ever lets an athlete actually fill one out, and nothing persists an answer anywhere. The `formulario_obligatorio` flag on a training is purely cosmetic today (an informational badge/note in `ReservasPanel`). This change closes that gap: it captures structured form answers at the moment they matter — booking — and links each submission to the specific reservation it was collected for, so organizations can finally use the templates they built (medical waivers, check-in surveys, equipment sign-off) and staff can review what an athlete answered.

## What Changes

- New `public.formulario_respuestas` table storing one JSON answer set per submission (`tenant_id`, `formulario_plantilla_id`, `atleta_id`, `entrenamiento_id`, `respuesta` jsonb).
- New `reservas.formulario_respuesta_id` column (nullable, unique) linking a reservation to its submitted response.
- **BREAKING (DB function signature)**: the existing `book_and_deduct_service_units` RPC gains two new optional trailing parameters (`p_formulario_plantilla_id`, `p_formulario_respuesta`) and now atomically validates required fields, inserts the response, and links it to the reservation it creates — existing callers that omit the new params are unaffected (both default to `null`, preserving today's behavior exactly).
- New RLS: `formulario_respuestas` is readable by the owning athlete or tenant staff (admin/entrenador); it has **no** direct-insert policy — the only write path is the `SECURITY DEFINER` RPC.
- New Supabase Storage policies (reusing the existing `org-assets` bucket) so an `imagen`-type form field can be uploaded under a new `orgs/{tenant}/users/{atleta}/formularios/...` path, by the athlete themself or by staff booking on their behalf.
- Booking flow becomes a two-step modal whenever a training's attached form is internal (`formulario_id` set): the existing `ReservaFormModal` step is followed by a new fill-out step (`FormularioRespuestaModal`) rendering the template's sections as real editable inputs (text, textarea, number, date, select, file-upload). Self-booking with `formulario_obligatorio = true` has no skip option; every other case (self-booking optional, or any staff-created booking regardless of the flag) offers a "Reservar sin formulario" skip action.
- New read-only "Ver respuesta" viewer (`FormularioRespuestaViewerModal`) surfaced from each reservation row for staff (any row) and the athlete (their own row).
- `formulario_externo` (the external-URL case) and no-form trainings are entirely unaffected — no new modal, no new fields written.

## Capabilities

### New Capabilities
- `form-responses`: capturing, storing, and viewing structured `formulario_respuestas` answer sets tied to a reservation, including the atomic booking+response RPC contract and its RLS/storage rules.

### Modified Capabilities
- `training-booking`: the booking creation flow (`ReservaFormModal` → `useReservaForm` → `useReservas` → `reservasService.create`) now branches into a mandatory or skippable form fill-out step when the training has an internal form attached, and the created `reservas` row may carry a `formulario_respuesta_id`.

## Impact

- **Database**: two new migrations — `formulario_respuestas` table + RLS + extended `book_and_deduct_service_units` function; storage policies for the new `formularios` path segment on the existing `org-assets` bucket.
- **Types**: `reservas.types.ts`, `entrenamiento-restricciones.types.ts`, `formularios.types.ts`, `storage.types.ts`.
- **Services**: `reservas.service.ts` (`create`), `formularios.service.ts` (`getRespuestaById`), `storage.service.ts` (`uploadFormularioRespuestaImage`).
- **Hooks**: `useReservaForm.ts` (extended), new `useFormularioRespuestaForm.ts`.
- **Components**: `ReservaFormModal.tsx` and `ReservasPanel.tsx` (extended); new `FormularioRespuestaModal.tsx` and `FormularioRespuestaViewerModal.tsx` under `components/portal/entrenamientos/reservas/`.
- **No changes** to `formulariosService`'s template-authoring functions, `EntrenamientoFormularioSection.tsx`, or any `entrenamientos`/`entrenamientos_grupo` column — those were already delivered by US-0086 and are reused as-is.

## Non-goals

- Editing or re-submitting a form response after the reservation exists.
- Enforcing `formulario_obligatorio` at the database layer — it stays a client-side gate only, since staff bookings must always be able to skip it.
- Any change to `formulario_externo` behavior (still link + informational note, no fill flow).
- A dedicated admin report/export of form responses across trainings (only a single-reservation viewer is in scope).
- Deleting a `formulario_respuestas` row from the UI (no delete action; historical submissions are kept — see design.md for the `on delete restrict` trade-off on `formulario_plantilla_id`).

## Design Input

No visual mockup/sketch was provided for the two new modals. Per [US-0087](../../../projectspec/userstory/us0087-form-response-on-booking.md), their layout is fully specified in prose (which fields render as which input per `campo_tipo`, button placement/labels, skip-action visibility rules) and that specification is treated as the agreed design surface for this fast-forward — the User Story is the source of truth for every field, button, and validation rule below.
