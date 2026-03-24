## Context

The `equipo.service.ts` currently queries `miembros_tenant` joined with `usuarios` and reads `usuarios.estado` as the member's status. This is a global account-level column, not a membership-level column, so it cannot model tenant-specific operational states (e.g., a member suspended for debt in Tenant A but active in Tenant B). Three migrations, a service rewrite, a new hook surface, and two new modals are required to decouple and properly scope the state.

**Current data flow:**
```
miembros_tenant JOIN usuarios → usuarios.estado surfaced as MiembroRow.estado
```

**Target data flow:**
```
v_miembros_equipo (view) → miembros_tenant.estado + inasistencias_recientes (lateral)
cambiar_estado_miembro (RPC) → atomic UPDATE + INSERT in one DB transaction
```

## Goals / Non-Goals

**Goals:**
- Introduce `miembros_tenant.estado` as the authoritative tenant-scoped status per membership.
- Provide an immutable audit trail in `miembros_tenant_novedades` for every admin-initiated status change.
- Expose admin UI in Gestión de Equipo to change status and view history.
- Show a "Fallas (30d)" absence counter per member row without additional round-trips.
- Enforce authorization server-side so no client-only bypass is possible.

**Non-Goals:**
- Removing or altering `usuarios.estado` (global flag retained for login/account-level use).
- Automated status transitions triggered by system events (absences, payment failures).
- Surfacing novedades outside Gestión de Equipo.
- Bulk status changes.

## Decisions

### Decision 1: `SECURITY DEFINER` RPC for atomic status change

**Decision:** Use a single Postgres function `cambiar_estado_miembro` (SECURITY DEFINER) to perform both the `UPDATE` on `miembros_tenant` and the `INSERT` into `miembros_tenant_novedades` within one implicit transaction.

**Why:** A status update without a corresponding novedad is an incomplete operation — the novedad is the audit record that justifies the change. A two-step client call (service calls update, then insert) could leave the system in a half-written state if the network drops between the two calls or if a transient RLS denial hits only one operation. The RPC wraps both in a single transaction and also centralises the admin-role authorization check.

**Alternatives considered:**
- *Two sequential Supabase client calls:* Simpler to write but not atomic. Any failure after the UPDATE and before the INSERT leaves `estado` changed with no audit record. Rejected.
- *Supabase client transaction (Postgres `BEGIN`/`COMMIT`)  via raw SQL:* Not supported through the Supabase JS client in the standard way. Rejected.

**Security implication:** Because the function is `SECURITY DEFINER`, it runs as the function owner (postgres) and can bypass RLS. The authorization check inside the function body (verify caller is `administrador` for the tenant) is therefore *the* enforcing guard — not RLS. This is intentional: it keeps the authorization logic in one place and prevents any policy gap from granting UPDATE access through a different path.

---

### Decision 2: `v_miembros_equipo` view instead of enriching the service query

**Decision:** Introduce a Postgres view `v_miembros_equipo` that flattens the `miembros_tenant + usuarios + roles` join and computes `inasistencias_recientes` via a correlated subquery. The service switches from `.from('miembros_tenant').select(...)` to `.from('v_miembros_equipo').select('*')`.

**Why:** The `inasistencias_recientes` counter requires a correlated subquery over `asistencias + reservas`. Expressing that in the PostgREST select syntax is awkward; expressing it in Postgres SQL is natural. Moving the flattening into the view also simplifies `RawMiembroRow` — it becomes a flat object instead of a nested relational structure with `usuarios: { ... }` nesting, removing the impedance mismatch between the Supabase JS return shape and our domain type.

**Alternatives considered:**
- *Compute `inasistencias_recientes` in the service layer as a separate query:* Would require N+1 queries (one per member) or a single batch query followed by a client-side join. Less efficient and more code. Rejected.
- *Use a Postgres function instead of a view:* Similar benefits but views are simpler to query via PostgREST and do not require RPC plumbing for a read operation. Rejected.

**RLS note:** The view does **not** use `SECURITY DEFINER`. It inherits RLS from underlying tables (`miembros_tenant`, `usuarios`, `asistencias`, `reservas`), so existing policies continue to apply transparently.

---

### Decision 3: Three separate migration files (ordered)

**Decision:** Split the DB changes into three migration files:
1. `..._miembros_tenant_estado.sql` — ADD COLUMN + backfill + check constraint + RLS UPDATE policy
2. `..._miembros_tenant_novedades.sql` — CREATE TABLE + indexes + RLS + `cambiar_estado_miembro` RPC
3. `..._v_miembros_equipo.sql` — CREATE VIEW (depends on both above objects existing)

**Why:** The view references the `estado` column (migration 1) and the `cambiar_estado_miembro` RPC lives alongside the novedades table (migration 2). Running the view migration first would fail. Keeping each concern in its own file makes rollback easier — each file can be reverted independently.

---

### Decision 4: `RawMiembroRow` becomes a flat type; `mapRawRow` is simplified

**Decision:** After switching to `v_miembros_equipo`, the raw shape returned by Supabase is flat (no nested `usuarios` or `roles` sub-objects). `RawMiembroRow` is replaced with a flat interface. `mapRawRow` reads `row.estado` and `row.inasistencias_recientes` directly. `MiembroRow` gains an `inasistencias_recientes: number` field.

**Why:** The existing nested `RawMiembroRow` was an artefact of the relational join syntax. The view already does the join, so the flat shape is cleaner and type-safe without conditional access.

---

### Decision 5: `CambiarEstadoModal` is a controlled stateless component; state lives in `EquipoPage`

**Decision:** `CambiarEstadoModal` receives `member`, `isOpen`, `onClose`, and `onConfirm` props. It manages its own internal form state (selected `nuevoEstado`, `tipo`, `descripcion`, field-level errors), but the "currently selected member" and "modal open" flags live in `EquipoPage`.

**Why:** Consistent with how `CambiarRolModal` and other existing modals in the codebase are structured — page-level state + stateless modal component. This avoids prop drilling and makes the modal independently testable.

---

### Decision 6: `getNovedades` is lazy and not preloaded

**Decision:** `useEquipo` does **not** preload novedades for all members on mount. `getNovedadesMiembro` is called on demand when the admin opens `NovedadesMiembroModal` for a specific member. The hook exposes a `getNovedades(miembroId)` method that returns a `Promise<MiembroNovedad[]>` (no cached state).

**Why:** Novedades are rarely needed — the admin uses them only when investigating a specific member. Preloading them for the entire team adds unnecessary reads and payload. The lazy model keeps the initial page load fast.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `inasistencias_recientes` correlated subquery scans `asistencias` for every member row on each list load | The existing indexes on `asistencias(reserva_id)` and `reservas(usuario_id, tenant_id)` cover the join. For tenants with large attendance history, a partial index `WHERE asistio = false` can be added if latency regresses. |
| `SECURITY DEFINER` function bypasses RLS — a bug in the function body could allow unauthorized writes | The function starts with an explicit admin-role check (`raise exception 'Forbidden'` on failure) before any mutation. This is the authoritative guard; client-side role checks in the UI are UX-only. The function body must be reviewed on every change. |
| Backfill migration sets `estado = usuarios.estado` for all existing memberships. If `usuarios.estado` has values outside the allowed set, the check constraint will fail | The check constraint on `miembros_tenant.estado` mirrors the existing check on `usuarios.estado`. If the `usuarios` table already enforces the same set, the backfill is safe. Should be verified in a staging environment before production deployment. |
| Novedades cannot be deleted — a mistaken insert is permanent | Append-only is a deliberate design choice (immutable audit trail). Admin corrective actions (e.g., reverting a status) are themselves new novedades with `tipo = 'reactivacion'`. This is acceptable. |
| Switching the service query from `miembros_tenant` to `v_miembros_equipo` is a breaking change for the shape of `RawMiembroRow` | The change is fully contained in `equipo.service.ts`. No other file references `RawMiembroRow` (it is a module-private type). The public `MiembroRow` type gains one field (`inasistencias_recientes`) which is additive and backward-compatible for existing consumers. |

## Migration Plan

### Migration order
1. Apply `..._miembros_tenant_estado.sql`
2. Apply `..._miembros_tenant_novedades.sql`
3. Apply `..._v_miembros_equipo.sql`

### Deployment steps
1. Run migrations against the database (local: `npx supabase db push`; production: migration pipeline).
2. Deploy the updated application bundle (types → service → hook → components).
3. Verify: open Gestión de Equipo, confirm "Estado" column renders values, "Fallas (30d)" column is visible, "Cambiar Estado" button opens the modal.

### Rollback strategy
- Drop the view (`DROP VIEW v_miembros_equipo`), drop the novedades table (`DROP TABLE miembros_tenant_novedades`), drop the column (`ALTER TABLE miembros_tenant DROP COLUMN estado`).
- Redeploy the prior app bundle.
- Data loss: any `miembros_tenant_novedades` rows written between deploy and rollback would be lost. This is acceptable given the feature is new.

## Open Questions

~~**Backfill safety:** Are there any existing `usuarios.estado` values outside `('activo', 'mora', 'suspendido', 'inactivo')`?~~
**RESOLVED:** Migration `20260304000100` already enforces `check (estado in ('activo', 'mora', 'suspendido', 'inactivo'))` on `usuarios`. The allowed sets are identical. Backfill is safe — no constraint violation can occur.

~~**View RLS gap:** Will the `inasistencias_recientes` subquery return `0` incorrectly for some members?~~
**RESOLVED:** The `reservas_select_authenticated` policy grants any tenant member read access to all reservas in the tenant. The `asistencias_select_trainer_or_admin` policy grants admin/coach read access to all asistencias in the tenant. An admin querying the view can read all rows for both tables → the counter is correct.

**CORRECTION (column name bug in US spec):** The US0037 spec writes `rv.usuario_id = mt.usuario_id` in the lateral subquery, but `public.reservas` uses `atleta_id` (not `usuario_id`) as the booker FK. The view migration **must** use `rv.atleta_id = mt.usuario_id` or the counter will always return `0`.
