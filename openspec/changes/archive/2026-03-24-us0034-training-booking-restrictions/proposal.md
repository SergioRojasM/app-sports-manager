## Why

Any active team member can currently book any training session with available capacity — there is no mechanism to restrict access based on subscription plan, discipline enrollment, athlete level, or advance-notice windows. This change introduces a configurable restriction system so administrators can independently gate bookings per training or recurring group, closing the gap between what a tenant can sell (plans, discipline access) and who may actually attend a session.

## What Changes

- **New columns** on `entrenamientos` and `entrenamientos_grupo`: `reserva_antelacion_horas` and `cancelacion_antelacion_horas` (scalar timing policies that apply to all athletes uniformly).
- **New tables** `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones`: each row is an independent access path (OR between rows; AND within a row across the four condition columns: `usuario_estado`, `plan_id`, `disciplina_id`, `validar_nivel_disciplina`).
- **Create/edit training form** (`EntrenamientoFormModal`) gains a collapsible "Restricciones" section with timing inputs and a dynamic restriction-row table.
- **Booking validation logic** in `reservas.service.ts` enforces timing and access restrictions before inserting a reservation (and timing check on cancellation).
- **Structured rejection feedback**: when a booking or cancellation is blocked, the athlete sees a contextual inline message explaining the exact reason (e.g. "Este entrenamiento requiere el plan Gold" or "Solo puedes cancelar con al menos 24 h de antelación").
- **Group-to-session propagation**: when sessions are generated from a group, restriction rows are copied from the group's restriction table.

## Capabilities

### New Capabilities

- `training-booking-restrictions`: Define and enforce access restrictions on training sessions and groups — including plan requirements, discipline requirements, level validation, and advance-notice timing windows for booking and cancellation. Includes athlete-facing contextual rejection messages.

### Modified Capabilities

- `training-management`: The training create/edit form and its underlying service require new fields (`reserva_antelacion_horas`, `cancelacion_antelacion_horas`) and a new restriction-row editor. The data shape of a training expands.
- `training-booking`: Pre-booking and pre-cancellation validation logic changes — the service must now evaluate restriction rows and timing constraints before accepting or rejecting a booking action. The `ReservasPanel` must display the rejection reason inline.

## Non-goals

- Retroactively updating existing training sessions when a group's restrictions change (existing sync-lock model applies: `bloquear_sync_grupo`).
- Restriction import/export or bulk management.
- Any new role or permission beyond the existing admin/coach/atleta roles.

## Files to Create or Modify

| File | Action |
|---|---|
| `supabase/migrations/{timestamp}_entrenamiento_restricciones.sql` | **Create** — DDL for new tables, alters, indexes, RLS policies |
| `src/types/entrenamiento-restricciones.types.ts` | **Create** — TypeScript interfaces for restriction rows |
| `src/services/supabase/portal/entrenamientos.service.ts` | **Modify** — CRUD + restriction row persistence + group propagation |
| `src/services/supabase/portal/reservas.service.ts` | **Modify** — pre-booking validation + pre-cancellation timing check |
| `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | **Modify** — restriction row state + handlers |
| `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | **Modify** — add "Restricciones" section |
| `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx` | **Create** — standalone restriction-row editor component |

## Impact

- **Database**: Two new tables (`entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`) with RLS. `entrenamientos` and `entrenamientos_grupo` each gain two nullable integer columns. Migration must add a `(tenant_id, id)` unique constraint on `entrenamientos` if not present.
- **Services**: `reservas.service.ts` gets a new validation gate that performs multi-row OR logic with DB queries; failure paths return typed `BookingRejection` objects with a human-readable `message` for UI display.
- **UI — athlete feedback**: `ReservasPanel` and `useReservas` display inline rejection banners explaining why the booking or cancellation was blocked. No new pages are required.
- **UI**: `EntrenamientoFormModal` component and `useEntrenamientoForm` hook gain new state for restriction rows.
- **Backward compatibility**: All new columns default to NULL; all new restriction tables start empty. Existing trainings behave identically — no breaking change for deployed data.
- **Dependencies**: Uses existing `planes`, `disciplinas`, `nivel_disciplina`, `usuario_nivel_disciplina`, `suscripciones`, `planes_disciplina`, and `entrenamiento_categorias` tables — no schema changes to those tables.
