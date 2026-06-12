# US-0065 — Remove `clases_incluidas` and `clases_restantes` Field Usage

## ID
US-0065

## Name
Remove deprecated class-count fields from plan types and subscriptions across the full stack

## As a
Developer / System

## I Want
All references to `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` to be removed from types, services, hooks, and UI components — without dropping the underlying database columns.

## So That
The application no longer reads from or writes to these obsolete fields. Unit tracking is now handled exclusively through `suscripcion_servicios.unidades_restantes` (introduced in US-0062 / US-0063), and the codebase reflects that single source of truth.

---

## Description

### Current State
`plan_tipos.clases_incluidas` was a legacy integer field used to declare how many classes a plan subtype included. When a subscription was created, `suscripciones.clases_plan` captured a snapshot of that value and `suscripciones.clases_restantes` tracked the remaining count, decremented on each booking via the `book_and_deduct_class` RPC.

Since US-0062 (services catalog) and US-0063 (subscription service units), entitlement and unit tracking are handled via:
- `servicios` catalog (per-tenant service definitions)
- `plan_tipos_servicios` (service assignments with optional unit cap per plan type)
- `suscripcion_servicios` (per-subscription service allocation: `unidades_incluidas`, `unidades_restantes`)
- `reserva_servicios` ledger (tracks which subscription units were deducted per booking, introduced in US-0064)

The booking and cancellation RPCs have been replaced with `book_and_deduct_service_units` and `cancel_and_restore_service_units` (US-0064), which no longer touch `clases_restantes`.

`clases_incluidas`, `clases_restantes`, and `clases_plan` are therefore dead fields in the application layer. They must be scrubbed from all types, services, hooks, and components. **The DB columns must not be dropped** — they are kept for historical data and a future clean-up migration.

### Proposed Changes

#### 1. Types
- Remove `clases_incluidas` from `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, `PlanTipoFormValues`.
- Remove `plan_tipo_clases_incluidas`, `clases_restantes`, `clases_plan` from `SuscripcionAdminRow`.
- Remove `clases_restantes` from `ValidarSuscripcionFormValues`.
- Remove `clases_restantes` and `clases_plan` from `EditarSuscripcionFormValues`.
- Remove `clases_plan` and `clases_restantes` from `CrearSuscripcionAdminPayload` and `CrearSuscripcionAdminFormValues`.
- Remove `clases_restantes` and `clases_plan` from `Suscripcion` and `SuscripcionInsert`.
- Remove `clases_restantes` and `clases_plan` from `MiSuscripcionRow`.
- Remove `clases_restantes` and `clases_plan` from `InicioSuscripcion`.

#### 2. Services
- **`planes.service.ts`**: Remove `clases_incluidas` from internal `PlanTipoRow` type, from the `createPlanTipo` insert payload, and from the `updatePlanTipo` patch payload.
- **`gestion-suscripciones.service.ts`**: Remove `clases_restantes`, `clases_plan` from `RawSuscripcionRow`, from DB `select` strings, from `mapRawRow`, and from the `aprobar` / `editar` / `create` write payloads. Remove `clases_incluidas` from the nested `plan_tipo` shape in `RawSuscripcionRow` and from `mapRawRow`.
- **`suscripciones.service.ts`**: Remove `clases_restantes`, `clases_plan` from the `select` string.
- **`mis-suscripciones.service.ts`**: Remove `clases_restantes`, `clases_plan` from the internal row type, from the `select` string, and from the mapper.
- **`inicio.service.ts`**: Remove `clases_restantes`, `clases_plan` from the subscription sub-select and from the mapper.

#### 3. Hooks
- **`usePlanForm.ts`**: Remove `clases_incluidas` from initial state, from `fromPlanTipo` mapper, from the validation function, and from the submit payload builder (both create and update paths).
- **`useSuscripcion.ts`**: Remove `clases_plan` from the `SuscripcionInsert` payload sent to the service.
- **`useCrearSuscripcion.ts`**: Remove the `clasesRestantes` state variable and the `useEffect` that auto-fills it from `tipo.clases_incluidas`. Remove `clases_plan` and `clases_restantes` from the submission payload.
- **`useValidarSuscripcion.ts`**: Remove `clasesRestantes` state, `computeDefaults.clases_restantes`, and the `clases_restantes` field from the payload passed to the service.
- **`useEditarSuscripcion.ts`**: Remove `clases_restantes` and `clases_plan` from the initial state object and from the form reset on load.

#### 4. Components
- **`PlanFormModal.tsx`**: Remove the "Clases incluidas" number input, its label, its `value`/`onChange` binding, and its inline error display. Adjust the enclosing grid layout if needed.
- **`SuscripcionModal.tsx`** (athlete self-subscription): Remove the class count badge displayed in plan-type option cards (e.g. `${tipo.clases_incluidas} clases` / `Ilimitadas`). Remove the class summary line in the review step.
- **`CrearSuscripcionModal.tsx`** (admin): Remove `· ${t.clases_incluidas} clases` suffix from plan-type option labels. Remove the `clasesRestantes` display section if it exists.
- **`ValidarSuscripcionModal.tsx`**: Remove the `clases_restantes` number input and its surrounding `<div>` block (currently guarded by `row.plan_tipo_clases_incluidas !== null`).
- **`EditarSuscripcionModal.tsx`**: Remove the `clases_restantes` number input and its `clases_plan` companion field.
- **`SuscripcionesTable.tsx`**: Remove the "Clases" column header and its corresponding cell (`clases_restantes / clases_plan`).
- **`InicioSuscripciones.tsx`**: Remove the class count `<span>` and the progress bar section (currently gated on `s.clases_restantes` / `s.clases_plan`).
- **`SuscripcionCard.tsx`**: Remove the `showClases` guard and the `Clases: {clases_restantes} / {clases_plan}` line.

---

## Database Changes
**None.** The columns `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` are intentionally kept in the database. No migration is required for this story.

---

## API / Server Actions
No new API routes or server actions. All changes are removals from existing service functions — no new input/output contracts are created.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Type | `src/types/portal/planes.types.ts` | Remove `clases_incluidas` from `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, `PlanTipoFormValues` |
| Type | `src/types/portal/gestion-suscripciones.types.ts` | Remove `plan_tipo_clases_incluidas`, `clases_restantes`, `clases_plan` from all relevant interfaces |
| Type | `src/types/portal/suscripciones.types.ts` | Remove `clases_restantes`, `clases_plan` from `Suscripcion` and `SuscripcionInsert` |
| Type | `src/types/portal/mis-suscripciones-y-pagos.types.ts` | Remove `clases_restantes`, `clases_plan` from `MiSuscripcionRow` |
| Type | `src/types/portal/inicio.types.ts` | Remove `clases_restantes`, `clases_plan` from `InicioSuscripcion` |
| Service | `src/services/supabase/portal/planes.service.ts` | Remove `clases_incluidas` from internal row type and CRUD payloads |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Remove `clases_incluidas`, `clases_restantes`, `clases_plan` from raw row shape, selects, mapper, and write payloads |
| Service | `src/services/supabase/portal/suscripciones.service.ts` | Remove `clases_restantes`, `clases_plan` from `select` string |
| Service | `src/services/supabase/portal/mis-suscripciones.service.ts` | Remove `clases_restantes`, `clases_plan` from row type, select, and mapper |
| Service | `src/services/supabase/portal/inicio.service.ts` | Remove `clases_restantes`, `clases_plan` from subscription sub-select and mapper |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Remove `clases_incluidas` from initial state, mapper, validation, and submit payload |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Remove `clases_plan` from `SuscripcionInsert` payload |
| Hook | `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts` | Remove `clasesRestantes` state, auto-fill effect, `clases_plan`, `clases_restantes` from payload |
| Hook | `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts` | Remove `clasesRestantes` state and from payload |
| Hook | `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` | Remove `clases_restantes`, `clases_plan` from form state |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Remove "Clases incluidas" input and error display |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Remove class count from plan type cards and review step |
| Component | `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx` | Remove `clases_incluidas` suffix from plan type labels |
| Component | `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx` | Remove `clases_restantes` input block |
| Component | `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` | Remove `clases_restantes` and `clases_plan` inputs |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | Remove "Clases" column |
| Component | `src/components/portal/inicio/InicioSuscripciones.tsx` | Remove class count and progress bar |
| Component | `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx` | Remove class count display |

---

## Acceptance Criteria

1. `npx tsc --noEmit` passes with zero errors after all changes.
2. The "Clases incluidas" input field no longer appears in `PlanFormModal` when creating or editing a plan type.
3. Plan type option cards in `SuscripcionModal` (athlete) no longer show a class count badge.
4. Plan type options in `CrearSuscripcionModal` (admin) no longer include a `· N clases` suffix.
5. The subscription approval modal (`ValidarSuscripcionModal`) no longer contains a `clases_restantes` field.
6. The subscription edit modal (`EditarSuscripcionModal`) no longer contains `clases_restantes` or `clases_plan` fields.
7. The admin subscriptions table (`SuscripcionesTable`) no longer has a "Clases" column.
8. The athlete home dashboard subscription cards (`InicioSuscripciones`) no longer show a class progress bar or class count.
9. The athlete "Mis suscripciones" view (`SuscripcionCard`) no longer shows a `Clases: X / Y` line.
10. Creating a new plan type via the admin UI does not write `clases_incluidas` to the database.
11. Approving or editing a subscription does not write `clases_restantes` or `clases_plan` to the database.
12. Creating a subscription (both admin and athlete paths) does not write `clases_plan` or `clases_restantes` to the database.
13. All subscription-related queries (`gestion-suscripciones`, `mis-suscripciones`, `inicio`) no longer select `clases_restantes` or `clases_plan` columns.
14. The database columns `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` still exist in the schema (verified via Supabase Studio or `\d` in psql).

---

## Implementation Steps

- [ ] Update `src/types/portal/planes.types.ts`: remove `clases_incluidas` from all four type definitions
- [ ] Update `src/types/portal/gestion-suscripciones.types.ts`: remove fields from `SuscripcionAdminRow`, `ValidarSuscripcionFormValues`, `EditarSuscripcionFormValues`, `CrearSuscripcionAdminPayload`, `CrearSuscripcionAdminFormValues`
- [ ] Update `src/types/portal/suscripciones.types.ts`: remove `clases_restantes`, `clases_plan` from `Suscripcion` and `SuscripcionInsert`
- [ ] Update `src/types/portal/mis-suscripciones-y-pagos.types.ts`: remove `clases_restantes`, `clases_plan` from `MiSuscripcionRow`
- [ ] Update `src/types/portal/inicio.types.ts`: remove `clases_restantes`, `clases_plan` from `InicioSuscripcion`
- [ ] Update `src/services/supabase/portal/planes.service.ts`: strip `clases_incluidas` from `PlanTipoRow`, insert, and update payloads
- [ ] Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: strip `clases_incluidas`, `clases_restantes`, `clases_plan` from raw row type, select strings, mapper, and write payloads
- [ ] Update `src/services/supabase/portal/suscripciones.service.ts`: remove `clases_restantes`, `clases_plan` from select string
- [ ] Update `src/services/supabase/portal/mis-suscripciones.service.ts`: remove `clases_restantes`, `clases_plan`
- [ ] Update `src/services/supabase/portal/inicio.service.ts`: remove `clases_restantes`, `clases_plan`
- [ ] Update `src/hooks/portal/planes/usePlanForm.ts`: remove `clases_incluidas` from all usages
- [ ] Update `src/hooks/portal/planes/useSuscripcion.ts`: remove `clases_plan` from insert payload
- [ ] Update `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`: remove `clasesRestantes` state, auto-fill effect, and payload fields
- [ ] Update `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: remove `clasesRestantes` state and payload field
- [ ] Update `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts`: remove `clases_restantes`, `clases_plan` from form state
- [ ] Update `src/components/portal/planes/PlanFormModal.tsx`: remove "Clases incluidas" input and error
- [ ] Update `src/components/portal/planes/SuscripcionModal.tsx`: remove class count from type cards and review step
- [ ] Update `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`: remove class count suffix from type options
- [ ] Update `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`: remove `clases_restantes` input block
- [ ] Update `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx`: remove `clases_restantes`, `clases_plan` inputs
- [ ] Update `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`: remove "Clases" column
- [ ] Update `src/components/portal/inicio/InicioSuscripciones.tsx`: remove class count display and progress bar
- [ ] Update `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`: remove class count display
- [ ] Run `npx tsc --noEmit` and fix all type errors
- [ ] Manual test: create a plan type → confirm no `clases_incluidas` written
- [ ] Manual test: admin creates a subscription → confirm no `clases_restantes` / `clases_plan` written
- [ ] Manual test: athlete subscribes → confirm no `clases_plan` written
- [ ] Manual test: admin approves / edits subscription → confirm no `clases_restantes` written
- [ ] Verify DB columns still present via Supabase Studio

---

## Non-Functional Requirements

- **No database migration required**: columns are intentionally preserved for historical data integrity.
- **No behaviour change for other features**: subscription validity (by `fecha_fin`), service-unit deduction (via `suscripcion_servicios`), and booking restrictions (via `entrenamiento_restricciones`) are unaffected.
- **Backwards compatibility**: any existing rows that have non-null `clases_restantes` values in the DB will simply not be displayed; that is the intended outcome.
- **Error handling**: no new error states are introduced; all removal paths are purely subtractive — no new logic is added.
- **Accessibility**: removing a table column and form fields does not introduce new accessibility requirements.
