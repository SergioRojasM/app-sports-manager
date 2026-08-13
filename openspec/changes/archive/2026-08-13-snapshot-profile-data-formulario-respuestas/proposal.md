## Why

US-0095 (`form-template-profile-data-requirements`) lets a form template request profile fields and validates the athlete's profile is complete at booking time, but it never persists what those values *were*. If the athlete edits their profile afterward, there is no way to know what data was actually true when they booked — the same gap "Datos" section answers already solved via `campos_snapshot` (US-0087), which freezes custom-field answers so historical responses stay accurate even after the template changes. Profile data needs the same treatment now that it can be requested by a template.

## What Changes

- Add `formulario_respuestas.perfil_snapshot jsonb` (default `'{}'`), freezing `{ [campo_key]: value }` for every profile field a template requested, captured at the exact moment the `book_and_deduct_service_units` RPC's existing profile-completeness check (US-0095) succeeds.
- Extend `book_and_deduct_service_units` to build and persist this snapshot using the `usuarios`/`perfil_deportivo` values it already fetches for that completeness check — no new query, no new write path.
- `FormularioRespuestaViewerModal` ("Ver respuesta") gains a "Datos de perfil" section, shown above the existing "Datos" answers, rendering `perfil_snapshot` values resolved to labels via the existing `FORMULARIO_PERFIL_CAMPOS` catalog. Renders nothing when the snapshot is empty (every response before this feature, or templates with no profile requirements).
- "Descargar Respuestas Formulario" (the Excel export in `ReservasPanel`) gains one column per profile key requested across a training's responses (union, catalog order), positioned after the fixed identity columns (`Atleta`/`Apellido`/`Email`/`Fecha de respuesta`) and before the dynamic "Datos" columns.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `form-template-profile-requirements`: extends the profile-data-requirements capability introduced by the (not yet archived) `form-template-profile-data-requirements` change — adds the requirement that requested profile values are snapshotted into `formulario_respuestas` at submission time, and surfaced in both the response viewer and the Excel export. No existing requirement text from that change is altered; this is purely additive, so the delta below uses `ADDED Requirements` (there is no archived base spec yet to diff against — `openspec/specs/form-template-profile-requirements/` does not exist until that sibling change is archived).

## Impact

- **Database**: new migration adding `formulario_respuestas.perfil_snapshot` and redefining `book_and_deduct_service_units` again. Must be sequenced after the US-0095 migration (`..._formulario_plantilla_perfil_requerido.sql`) — if that migration is still unmerged, fold this change into the same migration file instead of stacking a second `create or replace function`. No RLS changes: the column is covered by the existing `formulario_respuestas_select_staff_or_owner` policy, and all writes remain exclusively through the `security definer` RPC (no direct-write policy exists for `authenticated`, same as `campos_snapshot` today).
- **Types**: `formularios.types.ts` — `FormularioRespuesta.perfil_snapshot` added.
- **Services**: `formularios.service.ts`'s `getRespuestasByEntrenamiento` explicit select list gains the new column (`getRespuestaById` already uses `select('*')`, no change needed there).
- **Components**: `FormularioRespuestaViewerModal.tsx` (new section), `ReservasPanel.tsx` (`handleOpenRespuestaViewer` builds the viewer's profile list; `handleExportFormularioRespuestas` adds the export columns).
- **No changes** to booking behavior, `BookingRejectionCode`, or any rejection/validation outcome — the profile-completeness gate itself (US-0095) is untouched; this change only persists and surfaces what was already validated.
- **No changes** to `campos_snapshot`/"Datos" section logic, RLS policies, or the fill-out flow's client-side gate.

## Non-goals

- No backfill of `perfil_snapshot` for responses submitted before this feature ships — they simply keep `'{}'` and render/export with no profile section/columns, exactly like a template with no profile requirements.
- No change to what profile fields can be requested (still the fixed 9-key `FORMULARIO_PERFIL_CAMPOS` catalog from US-0095).
- No inline editing of snapshotted values from the viewer — it is read-only, matching the existing "Datos" answers display.
- No change to the booking fill-out flow's UI (summary strip / warning panel) — that already exists from US-0095 and is unaffected by this change, which only concerns what happens AFTER a successful submission.
