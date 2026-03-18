## 1. Branch Setup

- [x] 1.1 Create branch `feat/us0034-training-booking-restrictions` from `develop` (no `main` branch exists)
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Types

- [x] 2.1 Create `src/types/entrenamiento-restricciones.types.ts` with:
  - `EntrenamientoRestriccion` interface (all DB columns)
  - `EntrenamientoRestriccionInput` type (omit `id`, `tenant_id`, `created_at`, `updated_at`)
  - `EntrenamientoGrupoRestriccion` interface
  - `BookingRejectionCode` union type: `'TIMING_RESERVA' | 'TIMING_CANCELACION' | 'USUARIO_INACTIVO' | 'PLAN_REQUERIDO' | 'DISCIPLINA_REQUERIDA' | 'NIVEL_INSUFICIENTE'`
  - `BookingRejection` type: `{ ok: false; code: BookingRejectionCode; message: string }`
  - `BookingResult` discriminated union: `{ ok: true } | BookingRejection`
- [x] 2.2 Update `Entrenamiento` type in the existing training types file to include `reserva_antelacion_horas: number | null`, `cancelacion_antelacion_horas: number | null`, and `restricciones?: EntrenamientoRestriccion[]`

## 3. Database Migration

- [x] 3.1 Create `supabase/migrations/20260319000100_entrenamiento_restricciones.sql` with:
  - `ALTER TABLE public.entrenamientos ADD COLUMN reserva_antelacion_horas integer CHECK (≥ 0)` (nullable)
  - `ALTER TABLE public.entrenamientos ADD COLUMN cancelacion_antelacion_horas integer CHECK (≥ 0)` (nullable)
  - `ALTER TABLE public.entrenamientos ADD CONSTRAINT entrenamientos_tenant_id_id_uk UNIQUE (tenant_id, id)` (if not present)
  - `ALTER TABLE public.entrenamientos_grupo ADD COLUMN reserva_antelacion_horas integer CHECK (≥ 0)` (nullable)
  - `ALTER TABLE public.entrenamientos_grupo ADD COLUMN cancelacion_antelacion_horas integer CHECK (≥ 0)` (nullable)
- [x] 3.2 Add `CREATE TABLE public.entrenamiento_restricciones` to the migration:
  - Columns: `id`, `tenant_id`, `entrenamiento_id`, `usuario_estado` (varchar, check 'activo'), `plan_id` (FK → planes ON DELETE SET NULL), `disciplina_id` (FK → disciplinas ON DELETE SET NULL), `validar_nivel_disciplina` (bool default false), `orden` (int check > 0), `created_at`, `updated_at`
  - Composite FK: `(tenant_id, entrenamiento_id)` → `entrenamientos(tenant_id, id)` ON DELETE CASCADE
  - Indexes: `idx_ent_restricciones_entrenamiento`, `idx_ent_restricciones_tenant`
- [x] 3.3 Add `CREATE TABLE public.entrenamiento_grupo_restricciones` to the migration:
  - Same columns but with `entrenamiento_grupo_id` FK; composite FK → `entrenamientos_grupo(tenant_id, id)` ON DELETE CASCADE
  - Index: `idx_eg_restricciones_grupo`
- [x] 3.4 Add RLS to both new tables:
  - `ENABLE ROW LEVEL SECURITY`
  - SELECT policy: any authenticated `miembros_tenant` member of the tenant
  - INSERT / UPDATE / DELETE policy: admin only via `get_admin_tenants_for_authenticated_user()`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON both tables TO authenticated`
- [ ] 3.5 Apply migration to local Supabase (`supabase db reset` or `supabase migration up`) and verify no errors

## 4. Service — `entrenamientos.service.ts`

- [x] 4.1 Update `createEntrenamiento` to persist `reserva_antelacion_horas` and `cancelacion_antelacion_horas` on the `entrenamientos` insert
- [x] 4.2 After creating the training, batch-insert `entrenamiento_restricciones` rows from `input.restricciones` (skip if array is empty)
- [x] 4.3 Update `updateEntrenamiento` to persist timing columns; delete all existing `entrenamiento_restricciones` for the training and re-insert the current set from `input.restricciones`
- [x] 4.4 Update `getEntrenamientoById` to include a nested select of `entrenamiento_restricciones` rows
- [x] 4.5 Update group-session generation logic: when inserting a generated `entrenamientos` row, copy `reserva_antelacion_horas` and `cancelacion_antelacion_horas` from the group; after inserting the session, copy `entrenamiento_grupo_restricciones` rows into `entrenamiento_restricciones` for that session
- [x] 4.6 Update group CRUD (`createEntrenamientoGrupo`, `updateEntrenamientoGrupo`) to persist timing columns and replace `entrenamiento_grupo_restricciones` rows using the same delete-and-reinsert pattern

## 5. Service — `reservas.service.ts`

- [x] 5.1 Implement `validateBookingRestrictions(entrenamientoId: string, atletaId: string, tenantId: string): Promise<BookingResult>`:
  - Load training record (timing columns + `fecha_hora`)
  - Check `reserva_antelacion_horas`: if non-null and `now() > fecha_hora - N hours`, return `{ ok: false, code: 'TIMING_RESERVA', message: '...' }`
  - Load `entrenamiento_restricciones` rows for the training
  - If zero rows, return `{ ok: true }`
  - For each row (OR evaluation): evaluate all non-null conditions (AND); on first fully-passing row return `{ ok: true }`
  - If no row passes, return rejection with code and message from the first unmet condition of the first row
  - Fetch plan/discipline names needed for message interpolation during evaluation
- [x] 5.2 Implement `validateCancellationRestriction(entrenamientoId: string, isAdminOrCoach: boolean): Promise<BookingResult>`:
  - If `isAdminOrCoach` is true, return `{ ok: true }` immediately
  - Load `cancelacion_antelacion_horas` and `fecha_hora`
  - If non-null and `now() > fecha_hora - N hours`, return `{ ok: false, code: 'TIMING_CANCELACION', message: '...' }`
  - Otherwise return `{ ok: true }`
- [x] 5.3 Call `validateBookingRestrictions` inside `createReserva` before the capacity check and the `INSERT`; return the `BookingRejection` instead of inserting if `ok === false`
- [x] 5.4 Call `validateCancellationRestriction` inside the self-cancellation flow in `cancelReserva`; return the `BookingRejection` if `ok === false`

## 6. Hook — `useEntrenamientoForm.ts`

- [x] 6.1 Add state fields `reserva_antelacion_horas: number | null` and `cancelacion_antelacion_horas: number | null` to the form state; include in initial/reset values
- [x] 6.2 Add `restricciones: EntrenamientoRestriccionInput[]` array to form state (initial: `[]`)
- [x] 6.3 Expose handlers: `addRestriccion()`, `duplicateRestriccion(index: number)`, `removeRestriccion(index: number)`, `updateRestriccion(index: number, patch: Partial<EntrenamientoRestriccionInput>)`
- [x] 6.4 On load of an existing training, hydrate `reserva_antelacion_horas`, `cancelacion_antelacion_horas`, and `restricciones` from the fetched training data
- [x] 6.5 Include timing fields and `restricciones` in the submit payload passed to `createEntrenamiento` / `updateEntrenamiento`
- [x] 6.6 Fetch `planes` (active, current tenant) and `disciplinas` (active, current tenant) needed by the restriction row dropdowns; expose them from the hook

## 7. Hook — `useReservas.ts`

- [x] 7.1 Add `bookingRejection: BookingRejection | null` state; initialize to `null`
- [x] 7.2 In `handleCreateReserva`: if the service returns `ok === false`, set `bookingRejection` and do not proceed; clear it on successful booking
- [x] 7.3 In `handleCancelReserva` (atleta self-cancel path): if the service returns `ok === false` for timing, set `bookingRejection`; clear it on success
- [x] 7.4 Clear `bookingRejection` when the panel is closed (tie to panel open/close state or expose a `clearRejection()` function)

## 8. Component — `EntrenamientoRestriccionesSection.tsx`

- [x] 8.1 Create `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx`:
  - Props: `restricciones`, `planes`, `disciplinas`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras`, and all handlers from the hook
  - Render two number inputs for timing fields (label + nullable number, min 0)
  - Render an info banner: "Cada fila es una condición alternativa (OR). Dentro de una fila, todas las condiciones seleccionadas deben cumplirse a la vez (AND)."
  - Render the restriction row table: one row per item in `restricciones`
  - Each row: `usuario_estado` select, `plan_id` select, `disciplina_id` select, `validar_nivel_disciplina` toggle, duplicate icon button, delete icon button
  - Show inline warning per row when `validar_nivel_disciplina = true` and `disciplina_id` is null
  - Render "+ Añadir restricción" button at bottom
- [x] 8.2 Wrap the entire section in a collapsible (`Collapsible` Shadcn component); default open when `restricciones.length > 0` or timing fields are non-null, closed otherwise

## 9. Component — `EntrenamientoFormModal.tsx`

- [ ] 9.1 Import `EntrenamientoRestriccionesSection` and add it after the last existing form section
- [ ] 9.2 Connect all restriction-related props and handlers from `useEntrenamientoForm`

## 10. Component — `ReservasPanel.tsx`

- [x] 10.1 Accept `bookingRejection: BookingRejection | null` and `onClearRejection` as props (or read from a shared hook context)
- [x] 10.2 Render a Shadcn `Alert` (variant `destructive` or `warning`) above the action buttons when `bookingRejection` is non-null, displaying `bookingRejection.message`
- [x] 10.3 Ensure the alert is hidden when `bookingRejection` is null; clear it on panel close

## 11. Documentation

- [x] 11.1 Update `projectspec/03-project-structure.md`:
  - Add `EntrenamientoRestriccionesSection.tsx` to the `entrenamientos/` component slice
  - Update `reservas.service.ts` description to mention `validateBookingRestrictions` and `validateCancellationRestriction`
  - Update `useEntrenamientoForm.ts` description to mention restriction row state

## 12. Wrap-up

- [x] 12.1 Run `supabase db reset` (or equivalent) and verify migration applies cleanly
- [ ] 12.2 Smoke-test: create a training with one restriction row requiring a specific plan → verify athlete without that plan cannot book and sees the rejection message
- [ ] 12.3 Smoke-test: set `reserva_antelacion_horas = 1` on a training scheduled in 30 minutes → verify booking is blocked with `TIMING_RESERVA` message
- [ ] 12.4 Smoke-test: set `cancelacion_antelacion_horas = 2` on a training 1 hour away → verify atleta cannot self-cancel but admin can
- [x] 12.5 Verify TypeScript compiles with no errors (`tsc --noEmit`)
- [x] 12.6 Commit with message: `feat(us0034): add training booking restrictions with access conditions and timing enforcement`
- [ ] 12.7 Open pull request: title `[US-0034] Training Booking Restrictions`, body summarising the two new DB tables, timing columns, restriction row editor in the form, and the `BookingRejection` inline feedback in `ReservasPanel`
