# US-0039 — Validate Booking Restriction Status Against Tenant Member Status

## ID
US-0039

## Name
Validate Training Booking Restriction Status Using Tenant-Scoped Member Status

## As a
Athlete who belongs to multiple organizations

## I Want
The training booking restriction `usuario_estado` to be validated against my membership status within the specific tenant (`miembros_tenant.estado`) rather than my global user account flag (`usuarios.activo`)

## So That
An administrator's decision to suspend or deactivate me in one organization does not incorrectly block my bookings in other organizations where I am still active, and the restriction system accurately reflects the tenant-scoped member status introduced in US-0037

---

## Description

### Current State

US-0034 introduced the `entrenamiento_restricciones` system. When a restriction row has `usuario_estado = 'activo'`, the `validateBookingRestrictions` function in `reservas.service.ts` (line ~338-342) fetches the **global** user record:

```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('activo')
  .eq('id', atletaId)
  .single();
const isActivo = usuario?.activo === true;
```

This checks `usuarios.activo` (a boolean), which is a global account-level flag that applies across all tenants.

However, US-0037 introduced `miembros_tenant.estado` — a tenant-scoped status column with values `activo | mora | suspendido | inactivo`. This is the authoritative source for a member's operational status within a specific organization. The team management UI (`EquipoTable`, `EquipoStatusBadge`) already surfaces `miembros_tenant.estado` instead of `usuarios.activo`.

The validation is now conceptually incorrect: an athlete might be `activo` at the global level but `suspendido` in tenant A, or vice versa. The restriction should evaluate the member's status **within the tenant where the training belongs**.

### Proposed Changes

#### 1. Change the status data source in `validateBookingRestrictions`

Replace the query to `usuarios.activo` with a query to `miembros_tenant.estado` scoped by `tenant_id` and `usuario_id`.

**Before:**
```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('activo')
  .eq('id', atletaId)
  .single();
const isActivo = usuario?.activo === true;
```

**After:**
```typescript
const { data: miembro } = await supabase
  .from('miembros_tenant')
  .select('estado')
  .eq('tenant_id', tenantId)
  .eq('usuario_id', atletaId)
  .single();
const miembroEstado = (miembro?.estado as string) ?? null;
```

#### 2. Update the restriction evaluation logic

**Before (step 5a):**
```typescript
if (row.usuario_estado === 'activo' && !isActivo) {
```

**After (step 5a):**
```typescript
if (row.usuario_estado && miembroEstado !== row.usuario_estado) {
```

This makes the comparison generic: the restriction row specifies the required `miembros_tenant.estado` value, and the athlete's actual tenant-scoped status must match it.

#### 3. Update the error message

**Before:**
```
'Tu cuenta está inactiva. Contacta al administrador para reactivar tu acceso.'
```

**After:**
```
'Tu estado en esta organización no permite reservar este entrenamiento. Estado requerido: {estado}. Tu estado actual: {miembroEstado}. Contacta al administrador.'
```

The message now includes both the required and actual status, which is more informative for the athlete.

#### 4. Add additional `miembros_tenant.estado` values to the UI restriction select (optional enhancement)

Currently the `EntrenamientoRestriccionesSection` only offers `"— Sin requisito —"` and `"Activo"` for the `usuario_estado` select. Since tenants can now set members to `mora`, `suspendido`, or `inactivo`, it's debatable whether the admin should be able to require a non-`activo` status for booking. However:

- The most common use case is requiring `activo`. Keep `activo` as the primary option.
- No new options needed in the UI — the admin only sees `activo` as a bookable state restriction. The check constraint in the DB already only allows `'activo'` for this column.

**No UI change needed** — the select keeps offering only `activo` as a requirement, but now the validation correctly checks `miembros_tenant.estado` instead of `usuarios.activo`.

#### 5. Handle missing membership edge case

If the athlete has no row in `miembros_tenant` for the given tenant (shouldn't happen if RLS is correct, but defensively), treat the status check as failed with a specific message: `'No se encontró tu membresía en esta organización.'`

---

## Database Changes

**No database migration required.**

The existing schema already supports this change:
- `miembros_tenant.estado` column exists (from US-0037 migration `20260320000100_miembros_tenant_estado.sql`)
- `entrenamiento_restricciones.usuario_estado` column type is `varchar(30)` with CHECK constraint `usuario_estado IS NULL OR usuario_estado = 'activo'` — this constraint remains valid because required status `'activo'` is one of the allowed `miembros_tenant.estado` values
- No new tables, columns, or constraints needed

---

## API / Server Actions

### `src/services/supabase/portal/reservas.service.ts` — `validateBookingRestrictions`

- **Change**: Replace the `usuarios.activo` query (step 4a) with a `miembros_tenant.estado` query scoped to `tenantId` + `atletaId`
- **Change**: Update the evaluation in step 5a to compare `row.usuario_estado` against `miembroEstado` (string equality) instead of the boolean `isActivo`
- **Change**: Update the error message for code `USUARIO_INACTIVO` to include the required and actual member status
- **Input parameters**: No change (function already receives `tenantId`)
- **Return value**: No change in structure, only the message content of `USUARIO_INACTIVO` result changes
- **Auth / RLS**: No change — the function already operates server-side with the authenticated user's context, and `miembros_tenant` has SELECT policies for authenticated tenant members

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/portal/reservas.service.ts` | Replace `usuarios.activo` query with `miembros_tenant.estado` query in `validateBookingRestrictions`; update evaluation logic and error message |

---

## Acceptance Criteria

1. When a training restriction row has `usuario_estado = 'activo'`, the system checks `miembros_tenant.estado` for the athlete in the training's tenant — not `usuarios.activo`
2. An athlete with `miembros_tenant.estado = 'activo'` in tenant A can book a restricted training in tenant A, even if `usuarios.activo = false`
3. An athlete with `miembros_tenant.estado = 'suspendido'` in tenant B is rejected when booking a restricted training in tenant B, even if `usuarios.activo = true`
4. An athlete with `miembros_tenant.estado = 'mora'` in tenant B is rejected when booking a restricted training with `usuario_estado = 'activo'` requirement in tenant B
5. When no `miembros_tenant` row exists for the athlete in the tenant, the booking is rejected with a descriptive membership-not-found message
6. Error messages include the required status and the athlete's actual tenant status for clear UX
7. Trainings with zero restriction rows (unrestricted) continue to allow any member to book, regardless of their `miembros_tenant.estado`
8. The `EntrenamientoRestriccionesSection` UI select for "Estado usuario" continues to offer only `activo` — no UI change required
9. Timing restrictions (`reserva_antelacion_horas`, `cancelacion_antelacion_horas`) are unaffected by this change

---

## Implementation Steps

- [ ] Update `validateBookingRestrictions` in `src/services/supabase/portal/reservas.service.ts`: replace `usuarios.activo` query with `miembros_tenant.estado` query using `tenantId` + `atletaId`
- [ ] Update the step 5a evaluation: change boolean check `!isActivo` to string comparison `miembroEstado !== row.usuario_estado`
- [ ] Update the `USUARIO_INACTIVO` error message to include required and actual status
- [ ] Add defensive check: if `miembros_tenant` row not found, return a specific rejection with code `MEMBRESIA_NO_ENCONTRADA`
- [ ] Test manually: athlete with `miembros_tenant.estado = 'activo'` can book restricted training
- [ ] Test manually: athlete with `miembros_tenant.estado = 'mora'` or `'suspendido'` is rejected for restricted training
- [ ] Test manually: unrestricted training remains bookable regardless of member status
- [ ] Test manually: athlete active in tenant A but suspended in tenant B — verify bookings behave correctly per tenant

---

## Non-Functional Requirements

- **Security**: No new RLS policies needed. The existing SELECT policy on `miembros_tenant` ensures only members of the tenant can be queried. The `validateBookingRestrictions` function runs in the authenticated user's context.
- **Performance**: The `miembros_tenant` query uses the existing composite index on `(tenant_id, usuario_id)`. No additional indexes needed. This replaces a `usuarios` table lookup with a `miembros_tenant` lookup — equivalent cost.
- **Accessibility**: No UI changes.
- **Error handling**: Booking rejection errors surface as toast messages via the existing `ReservaServiceError` / `BookingResult` mechanism. The improved messages include the required and actual status so the athlete knows exactly why the booking was rejected and what to do (contact the admin).
