## Context

`validateBookingRestrictions` in `src/services/supabase/portal/reservas.service.ts` pre-fetches athlete data before evaluating restriction rows. Step **4a** currently queries `usuarios.activo` (a global boolean) to determine whether the athlete's account is active:

```typescript
// Current (step 4a)
const { data: usuario } = await supabase
  .from('usuarios')
  .select('activo')
  .eq('id', atletaId)
  .single();
const isActivo = usuario?.activo === true;
```

Step **5a** evaluates it as:
```typescript
if (row.usuario_estado === 'activo' && !isActivo) { /* reject */ }
```

US-0037 introduced `miembros_tenant.estado` (`activo | mora | suspendido | inactivo`) as the authoritative per-tenant membership status. The current check is global — it crosses tenant boundaries — making it semantically incorrect in a multi-tenant context.

`tenantId` is already a parameter of `validateBookingRestrictions`, so no interface change is needed. The function already operates server-side with the authenticated user's Supabase client. `miembros_tenant` has SELECT RLS policies for authenticated tenant members, so no additional privilege is required.

## Goals / Non-Goals

**Goals:**
- Replace the `usuarios.activo` query with a `miembros_tenant.estado` query scoped to `tenantId` + `atletaId`
- Update step 5a to compare `row.usuario_estado` (string) against `miembroEstado` (string) instead of converting to a boolean
- Handle the missing-membership edge case (null `miembro`) explicitly
- Update the `USUARIO_INACTIVO` error message to include the required and actual status

**Non-Goals:**
- No changes to `entrenamiento_restricciones` schema or the DB check constraint
- No changes to the restriction form UI or the values available for `usuario_estado`
- No changes to cancellation, timing, plan, disciplina, or level restriction logic
- No changes to the function signature or return type

## Decisions

### Decision: Query `miembros_tenant` instead of `usuarios` for step 4a

**Chosen**: Replace the `usuarios` query in step 4a with a `miembros_tenant` query scoped to both `tenant_id` and `usuario_id`.

**Rationale**: `miembros_tenant.estado` is the correct tenant-scoped status introduced by US-0037. The restriction row's `usuario_estado` column is semantically tied to a member's operational state within a tenant, not their global account flag.

**Alternative considered**: Keep querying `usuarios.activo` and additionally query `miembros_tenant.estado` for a combined check. Rejected — the global `usuarios.activo` flag is an account-level lock (e.g., fraud/abuse), unrelated to the per-tenant access control that `entrenamiento_restricciones` is designed for.

---

### Decision: String equality check (`miembroEstado !== row.usuario_estado`) instead of boolean check

**Chosen**: Compare the string value of `miembroEstado` directly against `row.usuario_estado`.

**Rationale**: `miembros_tenant.estado` is a multi-value enum (`activo | mora | suspendido | inactivo`). The restriction row already stores the required string value. Direct equality is the most precise and extensible check. The DB check constraint on `usuario_estado` already limits values to `null | 'activo'`, so in practice this only resolves to `'activo'` for now, but the check is future-proof.

**Alternative considered**: Map `miembros_tenant.estado` back to a boolean (`estado === 'activo'`). Rejected — loses the ability to surface the actual status in the error message and doesn't align with the multi-value enum.

---

### Decision: Reject on missing membership row

**Chosen**: If `miembro` is `null` (no `miembros_tenant` row for the athlete in this tenant), immediately return a rejection with a descriptive message — do not fall through to evaluate restriction row columns.

**Rationale**: An athlete without a membership row in the tenant is in an undefined state. Allowing the booking in this case would be a security gap. The edge case should not occur when RLS is correctly enforced, but the defensive path is warranted.

---

### Decision: Include required and actual status in the error message

**Chosen**: Error message template: `'Tu estado en esta organización no permite reservar este entrenamiento. Estado requerido: {required}. Tu estado actual: {actual}. Contacta al administrador.'`

**Rationale**: Provides actionable information to the athlete without requiring them to contact support to understand why they were rejected. Uses Spanish to be consistent with existing error messages in the service.

## Risks / Trade-offs

- **[Risk] RLS on `miembros_tenant`** — If RLS policies on `miembros_tenant` do not permit the server-side client to read the row for the given athlete and tenant, the query will return null and the booking will be incorrectly rejected with a membership-not-found error.  
  → **Mitigation**: Existing RLS permits authenticated tenant members to SELECT their own row. The service runs as the authenticated user. No change needed.

- **[Risk] Athletes with no `miembros_tenant` row** — An athlete that was added directly to a training without going through the normal membership flow may have no `miembros_tenant` row, causing false rejections.  
  → **Mitigation**: This scenario is already a data integrity issue. The defensive rejection with a descriptive message is appropriate. This should not occur in normal operation.

## Migration Plan

1. Update `validateBookingRestrictions` in `reservas.service.ts` (step 4a and 5a only)
2. No DB migration required
3. No API surface change
4. Deploy as normal — no rollback complexity since the change is isolated to a single function

## Open Questions

None — the approach is fully defined by US-0039 and the existing codebase.
