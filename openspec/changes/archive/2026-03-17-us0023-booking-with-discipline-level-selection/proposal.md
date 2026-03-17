## Why

US0022 introduced per-level capacity categories (`entrenamiento_categorias`) and added the nullable `entrenamiento_categoria_id` column to `reservas`, but the booking UX was intentionally excluded. Athletes can currently book any training without awareness of levels, causing spots from the wrong skill group to be consumed. This story closes that gap by wiring the existing schema into the booking flow.

## What Changes

- When a training instance has one or more rows in `entrenamiento_categorias`, a **level selector** is shown inside the booking form before the athlete confirms the reservation.
- Each level option displays its remaining available spots; fully booked levels are shown as disabled.
- If the athlete has an assigned discipline level (`usuario_nivel_disciplina`), their level is **pre-selected** automatically (when available).
- The service validates **per-category capacity** before inserting the reservation.
- On successful booking, `reservas.entrenamiento_categoria_id` is persisted with the chosen category id.
- Trainings without categories configured retain the existing booking flow unchanged (`entrenamiento_categoria_id = null`).

## Capabilities

### New Capabilities

_(none — all schema changes were delivered by US0022; no new tables or routes needed)_

### Modified Capabilities

- `training-booking`: Requirements change — the booking flow gains a mandatory level-selection step when categories exist, per-category capacity validation in the service layer, and the athlete's assigned level is auto-selected. New scenarios must be added for: level selector visibility, pre-selection, disabled full levels, validation when no level chosen, and concurrency guard.

## Impact

**Files modified:**
- `src/types/portal/reservas.types.ts` — add `CategoriaDisponibilidad` type
- `src/services/supabase/portal/reservas.service.ts` — add `getCategoriasConDisponibilidad()`; extend `createReserva()` with per-category capacity guard
- `src/hooks/portal/entrenamientos/reservas/useReservas.ts` — add `categorias`, `loadingCategorias`, `refetchCategorias`
- `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts` — add `entrenamiento_categoria_id` to form state, auto-select logic, validation
- `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — add level selector UI section
- `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` — wire new props; call `refetchCategorias` after mutations

**No new migration required** — the `entrenamiento_categorias` table and `reservas.entrenamiento_categoria_id` column were created in `20260311000100_entrenamiento_categorias_niveles.sql`.

**No new pages or routes.**

## Non-goals

- Editing or reassigning the level on an existing booking after creation.
- Displaying per-level attendance statistics in the booking panel.
- Enforcing minimum level access (e.g., blocking athletes below a threshold) — access control by level is a separate future story.
- Changes to the training series form or `entrenamiento_categorias` management (covered by US0022).
