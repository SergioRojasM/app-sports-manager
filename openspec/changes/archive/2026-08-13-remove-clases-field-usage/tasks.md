## 1. Branch Setup

- [x] 1.1 Create branch `feat/remove-clases-field-usage` from current HEAD
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop`

## 2. Types

- [x] 2.1 Update `src/types/portal/planes.types.ts`: remove `clases_incluidas` from `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, and `PlanTipoFormValues`
- [x] 2.2 Update `src/types/portal/gestion-suscripciones.types.ts`: remove `plan_tipo_clases_incluidas` from `SuscripcionAdminRow`; remove `clases_restantes` from `SuscripcionAdminRow`, `ValidarSuscripcionFormValues`, `EditarSuscripcionFormValues`, and `CrearSuscripcionAdminFormValues`; remove `clases_plan` and `clases_restantes` from `CrearSuscripcionAdminPayload` and `EditarSuscripcionFormValues`
- [x] 2.3 Update `src/types/portal/suscripciones.types.ts`: remove `clases_restantes` and `clases_plan` from `Suscripcion`; remove `clases_plan` from `SuscripcionInsert`
- [x] 2.4 Update `src/types/portal/mis-suscripciones-y-pagos.types.ts`: remove `clases_restantes` and `clases_plan` from `MiSuscripcionRow`
- [x] 2.5 Update `src/types/portal/inicio.types.ts`: remove `clases_restantes` and `clases_plan` from `InicioSuscripcion`

## 3. Services

- [x] 3.1 Update `src/services/supabase/portal/planes.service.ts`: remove `clases_incluidas` from internal `PlanTipoRow` type; remove from the `createPlanTipo` insert payload; remove the conditional update `payload.clases_incluidas = input.clases_incluidas` line
- [x] 3.2 Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: remove `clases_incluidas` from the nested `plan_tipo` shape in `RawSuscripcionRow` and from the DB select string; remove `clases_restantes` and `clases_plan` from `RawSuscripcionRow`; remove them from the DB `select` string; remove from `mapRawRow`; remove from the `aprobar` and `editar` write payloads; remove `plan_tipo_clases_incluidas` from `mapRawRow` output; remove `clases_plan` and `clases_restantes` from the `create` payload
- [x] 3.3 Update `src/services/supabase/portal/suscripciones.service.ts`: remove `clases_restantes` and `clases_plan` from the select string in `getById` (or equivalent)
- [x] 3.4 Update `src/services/supabase/portal/mis-suscripciones.service.ts`: remove `clases_restantes` and `clases_plan` from the internal row type, from the `select` string, and from the mapper
- [x] 3.5 Update `src/services/supabase/portal/inicio.service.ts`: remove `clases_restantes` and `clases_plan` from the subscription sub-select and from the mapper function

## 4. Hooks

- [x] 4.1 Update `src/hooks/portal/planes/usePlanForm.ts`: remove `clases_incluidas` from `EMPTY_TIPO` initial state; remove from the `fromPlanTipo` mapper; remove from the tipo validation block (the `clases_incluidas.trim()` check); remove from the create-payload builder (`parseInt(entry.clases_incluidas, 10)`); remove from the diff/update-payload builder
- [x] 4.2 Update `src/hooks/portal/planes/useSuscripcion.ts`: remove `clases_plan: selectedTipo?.clases_incluidas ?? null` from the `SuscripcionInsert` payload
- [x] 4.3 Update `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`: remove `clasesRestantes` state variable; remove the `useEffect` / callback that auto-fills it from `tipo.clases_incluidas`; remove `clases_plan` and `clases_restantes` fields from the submission payload; remove the `clasesRestantes` field from `formValues`
- [x] 4.4 Update `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: remove `clases_restantes` from `computeDefaults`; remove `clasesRestantes` state variable and its `setClasesRestantes` setter; remove `clases_restantes` from the `formValues` object and from the approval payload passed to the service
- [x] 4.5 Update `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts`: remove `clases_restantes: null` from the initial state object; remove `clases_restantes: row.clases_restantes` from the load-from-row reset block; remove `clases_plan` similarly

## 5. Components

- [x] 5.1 Update `src/components/portal/planes/PlanFormModal.tsx`: remove the "Clases incluidas" number input, its `<label>`, its `value`/`onChange` binding, and its inline error `<p>`; adjust the enclosing grid or flex layout if the removed input leaves an odd column
- [x] 5.2 Update `src/components/portal/planes/SuscripcionModal.tsx`: remove the class-count badge from plan_tipo option cards (`tipo.clases_incluidas != null ? \`${tipo.clases_incluidas} clases\` : 'Ilimitadas'`); remove the class count line from the review/summary step
- [x] 5.3 Update `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`: remove the `· ${t.clases_incluidas} clases` suffix from plan_tipo option labels; remove the `clasesRestantes` display section if present
- [x] 5.4 Update `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`: remove the `clases_restantes` number input and its surrounding guard block (`row.plan_tipo_clases_incluidas !== null`)
- [x] 5.5 Update `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx`: remove the `clases_restantes` number input (`value={formValues.clases_restantes ?? ''}`) and its label; remove the `clases_plan` companion field if present
- [x] 5.6 Update `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`: remove the "Clases" column header `<th>` and the corresponding cell (`row.clases_restantes === null && row.clases_plan === null ? ... : \`${cell(row.clases_restantes)} / ${cell(row.clases_plan)}\``)
- [x] 5.7 Update `src/components/portal/inicio/InicioSuscripciones.tsx`: remove the class count `<span>` (lines referencing `s.clases_restantes`) and the `<div>` containing the progress bar (the block computing `((s.clases_restantes ?? 0) / s.clases_plan) * 100`); remove any conditional that gates visibility on `s.clases_restantes`
- [x] 5.8 Update `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`: remove `clases_restantes` and `clases_plan` from the destructured props; remove `showClases` guard variable; remove the `Clases: {clases_restantes} / {clases_plan}` display line

## 6. Type Check

- [x] 6.1 Run `npx tsc --noEmit` and fix all remaining type errors caused by removed fields

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: remove any mention of `clases_incluidas` in `plan_tipos` descriptions and `clases_restantes` / `clases_plan` from subscription service/type descriptions

## 8. Commit

- [x] 8.1 Stage all changes and commit with message: `feat: remove clases_incluidas and clases_restantes from application layer (US-0065)` — body should note that DB columns are preserved, all unit tracking now via suscripcion_servicios
