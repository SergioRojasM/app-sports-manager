## Context

US0025 introduced the `miembros_tenant_solicitudes` table and the full access request flow. The blocking signal was derived client-side by counting `rechazada` rows against a hardcoded constant of 3. The current implementation has three structural weaknesses:

1. `isBlocked` is recomputed on every render from local state — it is not persisted, so a page reload or a different device sees a fresh state that could diverge.
2. `createSolicitud` in the service has a secondary guard `count >= 3` but it also uses the hardcoded constant, not a per-tenant value.
3. There is no way for an admin to manually block a user or to review and lift existing blocks.

This design introduces the `miembros_tenant_bloqueados` table as the canonical, persistent blocking authority, and a configurable `max_solicitudes` per tenant.

## Goals / Non-Goals

**Goals:**
- Make blocked status persistent and authoritative (stored in DB, not computed locally).
- Replace the hardcoded `3` with a configurable per-tenant `max_solicitudes` (default 2).
- Allow admins to manually block and unblock users from the `gestion-equipo` UI.
- Auto-block a user when their rejection count reaches `max_solicitudes` upon any rejection.
- Provide a "Bloqueados" tab in `gestion-equipo` with unblock capability.
- Add a "Bloquear" action per row in the existing `SolicitudesTable`.

**Non-Goals:**
- Notification emails or push alerts when a user is blocked.
- Audit log for block/unblock events beyond what `bloqueado_por` and `bloqueado_at` already capture.
- Tenant-to-tenant blocking (blocks are always scoped to one tenant).
- Bulk block/unblock operations.
- Migration of existing hardcoded-threshold data (existing rejected requests count toward the new default of 2 transparently).

## Decisions

### 1. Block authority: dedicated table vs. computed flag

**Decision**: New `miembros_tenant_bloqueados` table with a unique constraint on `(tenant_id, usuario_id)`.

**Alternatives considered**:
- Add a `bloqueado` boolean to `miembros_tenant_solicitudes`. Rejected because there is no single "current" row per user (multiple rejected requests can exist), making a single flag ambiguous.
- Add `bloqueado_hasta` / `bloqueado_por` columns to `usuarios`. Rejected because blocks are tenant-scoped; a user can be blocked in one org and not another.

**Rationale**: A dedicated table with a unique constraint is clean, naturally idempotent (`on conflict do nothing`), easy to delete on unblock, and exposes a simple boolean lookup (`select count(*) where tenant_id = X and usuario_id = Y`).

---

### 2. Where auto-block fires: service layer, not hook or DB trigger

**Decision**: Auto-block logic lives inside `solicitudesService.rechazarSolicitud`, after updating the request status to `rechazada`.

Sequence:
1. Update `miembros_tenant_solicitudes` row → `rechazada`.
2. Count all `rechazada` rows for the same `(tenant_id, usuario_id)`.
3. Fetch `tenants.max_solicitudes` for the tenant.
4. If `count >= max_solicitudes`, insert into `miembros_tenant_bloqueados` using `on conflict (tenant_id, usuario_id) do nothing`.

**Alternatives considered**:
- DB trigger on `miembros_tenant_solicitudes` UPDATE: triggers are harder to test, debug, and make migrations order-sensitive. Rejected.
- Client hook: would require multiple round-trips and puts business logic in the presentation layer. Rejected.
- Supabase Edge Function / RPC: adds deployment complexity for logic that can live in the service. Rejected for now.

**Impact on `RechazarSolicitudInput`**: The current type only carries `{ solicitud_id, revisado_por, nota_revision? }`. Auto-block requires `tenant_id` and `usuario_id` to fetch count and insert block. These will be added to the input type.

```typescript
// BEFORE
export type RechazarSolicitudInput = {
  solicitud_id: string;
  revisado_por: string;
  nota_revision?: string;
};

// AFTER
export type RechazarSolicitudInput = {
  solicitud_id: string;
  tenant_id: string;      // NEW — needed for auto-block threshold check
  usuario_id: string;     // NEW — needed for auto-block threshold check
  revisado_por: string;
  nota_revision?: string;
};
```

All callers of `rechazarSolicitud` already have the `SolicitudRow` in scope, so `tenant_id` and `usuario_id` are available without an extra fetch.

---

### 3. Block lookup in `useSolicitudRequest`: parallel call alongside solicitudes fetch

**Decision**: In `loadData`, run `solicitudesService.getUserBloqueadoForTenant` in parallel with `getUserSolicitudesForTenant` using `Promise.all`. Store the boolean result as `isBanned` state.

```typescript
const [data, banned] = await Promise.all([
  solicitudesService.getUserSolicitudesForTenant(tenantId, userId),
  solicitudesService.getUserBloqueadoForTenant(tenantId, userId),
]);
```

`isBlocked` becomes `isBanned` (primary). The rejection-count secondary guard in `createSolicitud` is also updated to use `max_solicitudes` fetched from the tenant row, but the hook itself no longer drives the blocked state.

**Service method**:
```typescript
async getUserBloqueadoForTenant(tenantId: string, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('miembros_tenant_bloqueados')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('usuario_id', userId);
  return (count ?? 0) > 0;
}
```

---

### 4. `createSolicitud` guard: replace hardcoded `3` with DB `max_solicitudes`

**Decision**: Replace the `count >= 3` guard in `createSolicitud` with a check against `miembros_tenant_bloqueados`. If a block record exists, throw `SolicitudesServiceError('blocked', ...)`. Remove the rejection-count guard from `createSolicitud` entirely — the block table is now the single source of truth.

**Rationale**: The old guard was a secondary defense. With a persistent block table enforced at both the DB (RLS INSERT policy checks only apply to admin inserts; the block insert is done by admin or auto-trigger in service) and the service layer, the count check in `createSolicitud` is redundant and would require fetching `max_solicitudes` on every submit.

New `SolicitudesServiceError` code to add: `'blocked'`.

---

### 5. `max_solicitudes` on `tenants`: column vs. separate settings table

**Decision**: Add `max_solicitudes smallint NOT NULL DEFAULT 2` directly to `public.tenants`.

**Rationale**: It is a single scalar, tenant-wide configuration value. A separate settings table would be over-engineered for one field. The check constraint `(max_solicitudes >= 1 AND max_solicitudes <= 10)` prevents invalid values at the DB level.

`TenantRow` (local type in `tenant.service.ts`) and `TenantEditPayload` / `TenantEditFormValues` (in `tenant.types.ts`) must include `max_solicitudes`.

---

### 6. `getBloqueadosByTenant` join: inline Supabase select, not RPC

**Decision**: Use a standard Supabase `.select()` with a join on `usuarios` (same pattern as `SOLICITUD_SELECT`).

```typescript
const BLOQUEADO_SELECT =
  'id, tenant_id, usuario_id, bloqueado_por, bloqueado_at, motivo, created_at, usuarios!usuario_id(nombre, apellido, email, foto_url)';
```

---

### 7. Component layer: follow existing slot pattern

`EquipoPage` currently has `ActiveTab = 'equipo' | 'solicitudes'`. Extend to `'equipo' | 'solicitudes' | 'bloqueados'`. The `BloqueadosTab` component is a sibling to `SolicitudesTab` under the same `gestion-solicitudes/` directory.

The "Bloquear" action in `SolicitudesTable` reuses the same inline confirm pattern already implemented for "Rechazar" (a separate `bloqueandoId` state variable + optional motivo text input).

## Risks / Trade-offs

- **Auto-block race condition** — two concurrent `rechazarSolicitud` calls for the same user/tenant could both try to insert into `miembros_tenant_bloqueados`. Mitigated by the unique constraint + `on conflict do nothing`; only one insert will succeed and neither call will error.
- **Existing data with old threshold** — tenants with users who already have 2 rejections will be auto-blocked on the next rejection under the new default, which is consistent. However, users with exactly 2 existing rejections are not retroactively blocked on migration (no trigger on migration). This is acceptable: the next rejection by that user will trigger the auto-block path.
- **`RechazarSolicitudInput` is a breaking type change** — existing callers in `useSolicitudesAdmin` must be updated to pass `tenant_id` and `usuario_id`. Both are available on the `SolicitudRow`, so this is a low-risk, mechanical change.
- **`createSolicitud` removing the rejection count guard** — any direct API caller (future automated scripts) bypassing the `miembros_tenant_bloqueados` check would be unguarded by count. Mitigated by the RLS INSERT policy on `miembros_tenant_bloqueados` and the service-level `getUserBloqueadoForTenant` check added to `createSolicitud`.

## Migration Plan

1. Create migration file `YYYYMMDDHHMMSS_blocked_access_request_control.sql`:
   - `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_solicitudes smallint NOT NULL DEFAULT 2 CONSTRAINT tenants_max_solicitudes_ck CHECK (max_solicitudes >= 1 AND max_solicitudes <= 10);`
   - `CREATE TABLE public.miembros_tenant_bloqueados` (DDL, unique constraint, indexes).
   - RLS: `ENABLE ROW LEVEL SECURITY`, `GRANT select, insert, delete`, four policies (user SELECT own, admin SELECT, admin INSERT, admin DELETE).
2. Apply locally: `npx supabase db reset` or `npx supabase migration up`.
3. No data backfill required — the block table starts empty; blocks accumulate on the first post-migration rejection that crosses the threshold.
4. **Rollback**: Drop the `miembros_tenant_bloqueados` table and the `max_solicitudes` column. Restore the hardcoded `3` in the service. Low disruption since no production data is yet stored in the new table.

## Open Questions

- Should a blocked user see a list of which organizations they are blocked from, or only the per-org blocked message they already see on `SolicitarAccesoButton`? (Current spec: only the per-org message — no change needed.)
- Should unblocking a user also clear their previous rejection records so they start fresh, or only remove the block entry? (Current spec: only delete the block record; rejection history is preserved.)
