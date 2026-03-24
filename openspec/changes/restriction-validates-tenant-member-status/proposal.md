## Why

US-0034 introduced `usuario_estado` restriction validation using `usuarios.activo` — a global boolean flag. US-0037 introduced `miembros_tenant.estado` as the authoritative, tenant-scoped member status (`activo | mora | suspendido | inactivo`). The validation is now semantically incorrect: an athlete suspended in tenant A should not be blocked in tenant B, and vice versa.

## What Changes

- Replace the `usuarios.activo` query in `validateBookingRestrictions` with a `miembros_tenant.estado` query scoped to `tenantId` + `atletaId`
- Update the `usuario_estado` evaluation from a boolean check (`isActivo`) to a string equality check against `miembros_tenant.estado`
- Update the `USUARIO_INACTIVO` error message to include the required status and the athlete's actual tenant status
- Handle the edge case where no `miembros_tenant` row exists for the athlete in the tenant (rejected with membership-not-found message)

## Non-goals

- No changes to the `entrenamiento_restricciones` schema or the DB check constraint (only `'activo'` remains valid for `usuario_estado`)
- No changes to the UI restriction form (`EntrenamientoRestriccionesSection` keeps offering only `activo` as a requirement option)
- No new restriction types or additional `usuario_estado` accepted values
- No changes to cancellation or timing restriction logic

## Capabilities

### New Capabilities
<!-- None — this change does not introduce new standalone capabilities -->

### Modified Capabilities

- `training-booking-restrictions`: The `usuario_estado` restriction requirement now checks `miembros_tenant.estado` (tenant-scoped member status) instead of `usuarios.activo` (global boolean). Scenarios for `USUARIO_INACTIVO` must reflect the tenant-scoped evaluation, handle missing membership, and show updated error message content.

## Files to Create or Modify

| File | Change |
|------|--------|
| `src/services/supabase/portal/reservas.service.ts` | Replace `usuarios.activo` query with `miembros_tenant.estado` query in `validateBookingRestrictions`; update evaluation and error message |

## Implementation Plan

1. In `validateBookingRestrictions`, locate the `usuario_estado = 'activo'` block (step 4a)
2. Replace the `usuarios` query with `miembros_tenant` query scoped to `tenantId` + `atletaId`
3. Update the condition from `!isActivo` to `miembroEstado !== row.usuario_estado`
4. Handle the case where `miembro` is null (no membership row found)
5. Update the `USUARIO_INACTIVO` error message to include required and actual status

## Impact

- **Service**: `src/services/supabase/portal/reservas.service.ts` — `validateBookingRestrictions` function only
- **No DB migration** — `miembros_tenant.estado` column already exists from US-0037
- **No UI changes** — restriction form is unchanged
- **Spec delta**: `openspec/specs/training-booking-restrictions/spec.md` — `usuario_estado` scenarios updated
