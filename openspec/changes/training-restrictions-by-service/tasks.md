## 1. Branch Setup

- [x] 1.1 Create branch `feat/training-restrictions-by-service` from the current base branch
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260612000100_restricciones_por_servicio.sql`
- [x] 2.2 Add `ADD COLUMN descripcion text` to `entrenamiento_restricciones` (keep `plan_id`/`disciplina_id` in place)
- [x] 2.3 Add `ADD COLUMN servicio_1_id…servicio_4_id uuid REFERENCES servicios(id) ON DELETE SET NULL` to `entrenamiento_restricciones`
- [x] 2.4 Repeat same additions for `entrenamiento_grupo_restricciones`
- [x] 2.5 Add partial indexes on `servicio_1_id` and `servicio_2_id` for both tables (`WHERE column IS NOT NULL`)
- [x] 2.6 Create `reserva_servicios` table with columns `id`, `reserva_id` (FK ON DELETE CASCADE), `suscripcion_id` (nullable FK ON DELETE SET NULL), `servicio_id` (FK ON DELETE RESTRICT), `created_at`, and UNIQUE constraint on `(reserva_id, servicio_id)`
- [x] 2.7 Add indexes on `reserva_servicios(reserva_id)` and `reserva_servicios(suscripcion_id)`
- [x] 2.8 Enable RLS on `reserva_servicios`; grant SELECT to `authenticated`; add SELECT policy (own athlete or tenant admin via reservas join)
- [x] 2.9 Create `book_and_deduct_service_units(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_deductions jsonb)` SECURITY DEFINER function: pre-validate all finite services, then INSERT reservas, then for each deduction decrement `suscripcion_servicios.unidades_restantes` and INSERT `reserva_servicios` row; raise `UNIDADES_AGOTADAS` (ERRCODE P0001) on exhausted unit
- [x] 2.10 Create `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)` SECURITY DEFINER function: mark reservation cancelled, loop `reserva_servicios` to increment `unidades_restantes` (skip NULL `suscripcion_id` and NULL `unidades_restantes`), delete ledger rows
- [x] 2.11 Grant `EXECUTE` on both new RPCs to `authenticated`
- [x] 2.12 Apply migration locally (`npx supabase db reset` or `npx supabase migration up`) — do NOT push to remote

## 3. Types

- [x] 3.1 Update `src/types/portal/entrenamiento-restricciones.types.ts`: add `descripcion: string | null`, `servicio_1_id: string | null`, `servicio_2_id: string | null`, `servicio_3_id: string | null`, `servicio_4_id: string | null` to `EntrenamientoRestriccion` and `EntrenamientoGrupoRestriccion` (keep `plan_id`/`disciplina_id`)
- [x] 3.2 Update `EntrenamientoRestriccionInput` and `EntrenamientoGrupoRestriccionInput` with the same new fields
- [x] 3.3 Add `'SERVICIO_REQUERIDO'` and `'UNIDADES_AGOTADAS'` to `BookingRejectionCode`; mark `'PLAN_REQUERIDO'` and `'DISCIPLINA_REQUERIDA'` as deprecated with a comment
- [x] 3.4 Add `ReservaServicio` type to `src/types/portal/reservas.types.ts`: `{ id: string; reserva_id: string; suscripcion_id: string | null; servicio_id: string; created_at: string }`
- [x] 3.5 Update `validateBookingRestrictions` return type to `{ result: BookingResult; matchedRow: EntrenamientoRestriccion | null }`

## 4. Service Layer

- [x] 4.1 Update `src/services/supabase/portal/reservas.service.ts`: rewrite `validateBookingRestrictions` to pre-fetch athlete's active service entitlements from `suscripcion_servicios` (join `suscripciones`, filter by `estado = 'activa'` and `tenant_id`); evaluate each OR row against the service-entitlement set; return `{ result, matchedRow }`
- [x] 4.2 Add `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds: string[])` function in `reservas.service.ts`: for each service ID, query `suscripcion_servicios JOIN suscripciones` (activa, tenant-scoped); return `Array<{ suscripcionId: string | null; servicioId: string; exhausted: boolean }>` ordered by `unidades_restantes ASC`
- [x] 4.3 Update `create()` in `reservas.service.ts`: call updated `validateBookingRestrictions`; extract non-null service IDs from matched row; call `findServiceSubscriptionsToCharge`; return `UNIDADES_AGOTADAS` rejection if any entry is `exhausted`; build `p_deductions` array; call `book_and_deduct_service_units` RPC
- [x] 4.4 Update `cancel()` in `reservas.service.ts`: call `cancel_and_restore_service_units(reservaId, tenantId)` instead of `cancel_and_restore_class`
- [x] 4.5 Update `src/services/supabase/portal/entrenamientos.service.ts`: update restriction upsert logic to write `servicio_1_id`…`servicio_4_id` and `descripcion` fields; stop writing `plan_id`/`disciplina_id`

## 5. Hook

- [x] 5.1 Update `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`: replace `plan_id`/`disciplina_id` fields in restriction row state with `servicio_1_id`/`servicio_2_id`/`servicio_3_id`/`servicio_4_id` (all nullable) and `descripcion`; update `addRestrictionRow`, `removeRestrictionRow`, `duplicateRestrictionRow`, `updateRestrictionRow` helpers accordingly

## 6. Component

- [x] 6.1 Update `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx`: remove Plan and Discipline dropdowns from each restriction row
- [x] 6.2 Add a `descripcion` text input (single line, max 200 chars, optional) above the service slots per row, with placeholder "Ej: Requerido para clases premium de natación"
- [x] 6.3 Add up to 4 service selector dropdowns per restriction row (labeled "Servicio 1"…"Servicio 4"), populated from tenant's active services catalog; each slot nullable/clearable
- [x] 6.4 Add `aria-label` to each service dropdown identifying slot and row (e.g., "Servicio 1 de la regla 1")
- [x] 6.5 Add inline tooltip or help label with text: "Cada fila es una alternativa (OR). Dentro de la fila, todos los servicios marcados deben cumplirse (AND)."
- [x] 6.6 Wire service selector props from hook state: each slot reads `servicio_X_id` and calls `updateRestrictionRow`

## 7. Validation and Testing

- [ ] 7.1 Verify migration applied cleanly locally: confirm new columns exist on both restriction tables and `reserva_servicios` table is created
- [ ] 7.2 Test admin creates training with 2 restriction rows: row 1 requires service A; row 2 requires service B + service C
- [ ] 7.3 Test athlete with only service A → passes row 1, `unidades_restantes` for A decremented, `reserva_servicios` row inserted
- [ ] 7.4 Test athlete with service B (units) + service C (units) → passes row 2, both B and C decremented, two `reserva_servicios` rows inserted
- [ ] 7.5 Test athlete with service B (1 unit) + service C (0 units) → rejected with `UNIDADES_AGOTADAS`, no write occurs
- [ ] 7.6 Test athlete with neither service → rejected with `SERVICIO_REQUERIDO`
- [ ] 7.7 Test athlete with unlimited service A (`unidades_restantes IS NULL`) → passes, no decrement, `reserva_servicios` row with `suscripcion_id = NULL` inserted
- [ ] 7.8 Test cancellation: `unidades_restantes` restored for finite services; unlimited row skipped; `reserva_servicios` rows deleted
- [ ] 7.9 Test admin bypass (`bypass_restrictions = true`) → booking created, no deduction
- [ ] 7.10 Test training with zero restriction rows → booking created freely, no deduction

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: update `entrenamiento-restricciones.types.ts` description; update `reservas.service.ts` service description; add `reserva_servicios` table note; update `EntrenamientoRestriccionesSection` component description

## 9. Commit and PR

- [x] 9.1 Stage all changes and create commit with message: `feat: replace plan/discipline booking restrictions with service-based model (US-0064)` — include summary of migration, new RPCs, updated service logic, and UI changes in the commit body
- [x] 9.2 Write PR description: title `feat: Training restrictions by service (US-0064)`, body covering motivation (align restrictions with service-unit entitlement model), breaking changes (`book_and_deduct_class` replaced, `clases_restantes` no longer decremented), migration notes (legacy columns kept, admin must reconfigure existing rules), and testing checklist
