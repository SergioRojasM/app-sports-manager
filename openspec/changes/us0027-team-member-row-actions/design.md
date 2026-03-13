## Context

The `Gestión de Equipo` page (`/portal/orgs/[tenant_id]/gestion-equipo`) already renders a paginated, filterable table of active team members with an `Acciones` column containing one button: _Asignar Nivel_. The feature follows the project's hexagonal-style layering — a Next.js page thin-wrapper → `EquipoPage` component (orchestration) → `useEquipo` hook (application logic) → `equipoService` (Supabase client calls) → Supabase DB with RLS.

Adjacent features already handle access-request acceptance (`solicitudes.service.ts`) and member blocking after rejection (`miembros_tenant_bloqueados`), providing reusable patterns. However, no mutation paths exist yet in the equipo slice — the service only queries.

This design adds three write operations (edit profile, remove, block) scoped to the existing equipo feature slice, keeping architectural consistency.

---

## Goals / Non-Goals

**Goals:**
- Add three row-level admin actions to `EquipoTable`: Edit Profile, Remove from Team, Block from Team.
- Implement the service, hook, modal, and RLS layers for each action.
- Reuse `BloquearUsuarioInput` / block logic pattern from `solicitudes.service.ts` instead of re-importing.
- Ensure all mutations are protected at the DB level via RLS.

**Non-Goals:**
- Changing the user's auth email (read-only; managed by Supabase Auth).
- Bulk operations on multiple members.
- Inline editing (all edits happen in modals).
- New navigation routes or pages.

---

## Decisions

### Decision 1 — Block logic: replicate inline in `equipo.service.ts`, do not import from `solicitudes.service.ts`

**Chosen:** Implement `bloquearMiembroDelEquipo` directly in `equipo.service.ts` with its own Supabase call instead of calling `bloquearUsuario` from `solicitudes.service.ts`.

**Rationale:** Cross-service imports at the service layer violate single-responsibility and create coupling — the equipo service would depend on the solicitudes service's internal error types and Supabase client instance. The block operation itself is a single `INSERT` into `miembros_tenant_bloqueados` followed by a `DELETE` from `miembros_tenant`; both are straightforward enough to express inline. The `BloquearUsuarioInput` type is imported from `solicitudes.types.ts` (a shared type boundary), which is acceptable.

**Alternative considered:** Re-export a shared `bloquearUsuario` from a new `shared/miembros.service.ts`. Rejected — premature abstraction for a single shared operation.

---

### Decision 2 — `bloquearMiembroDelEquipo` sequencing: INSERT first, then DELETE

**Chosen:** Insert into `miembros_tenant_bloqueados` first. Only if it succeeds, delete from `miembros_tenant`.

**Rationale:** If the block INSERT fails (e.g., duplicate — user already blocked, or RLS rejection), the membership is preserved and the admin sees an error without data loss. Reversing the order (delete then insert) would leave the user in limbo with no membership and no block record if the insert fails.

**Alternative considered:** A DB transaction (RPC function). Rejected as over-engineering for a two-step sequential operation where both steps are low-risk indexed operations.

---

### Decision 3 — Edit Profile fetches `perfil_deportivo` separately via the hook, not joined in `getEquipo`

**Chosen:** The `EditarPerfilMiembroModal` opens pre-filled using data already in `MiembroTableItem` for `usuarios` fields. For `perfil_deportivo` (`peso_kg`, `altura_cm`), the modal fires a separate lightweight `SELECT` on mount (`equipoService.getPerfilDeportivo(usuario_id)`).

**Rationale:** `getEquipo` is the hot path called on every page load/refresh; adding a `LEFT JOIN` to `perfil_deportivo` for every row to support an infrequently-opened modal increases payload and query cost unnecessarily. The modal is opened once per user action, so a lazy fetch is the right trade-off.

**Alternative considered:** Joining `perfil_deportivo` in `getEquipo`. Rejected to avoid bloating the list query.

---

### Decision 4 — `editarPerfilMiembro` updates `usuarios` unconditionally; upserts `perfil_deportivo` only when at least one sports field is non-null

**Chosen:** Always UPDATE `public.usuarios` (even if only `nombre` changed). UPSERT `public.perfil_deportivo` only when `peso_kg` or `altura_cm` is provided (not both null/undefined).

**Rationale:** This avoids creating an empty `perfil_deportivo` row for members who have never filled in sports data. A null → null upsert is a no-op but wastes a round-trip and could confuse auditing.

---

### Decision 5 — `isSubmitting` is a single shared flag per modal, not per action in the hook

**Chosen:** Each modal manages its own local `isSubmitting` state as a `boolean`. The hook exposes stateless mutation functions (`editarPerfil`, `eliminarDelEquipo`, `bloquearDelEquipo`) that return `Promise<void>` and call `refresh()` on success.

**Rationale:** Modals are rendered one at a time (only one can be open). A shared hook-level loading state would require extra bookkeeping to distinguish which action is running. Since each modal is independent, local state is simpler and sufficient.

---

### Decision 6 — `Acciones` column is always rendered (not conditional on `onAsignarNivel`)

**Chosen:** Remove the `{onAsignarNivel ? <th>Acciones</th> : null}` guard. The column always renders; individual buttons render only if their callback prop is provided.

**Rationale:** With four possible action buttons, the conditional column header becomes awkward. Since `EquipoPage` always passes all callbacks, the column is always visible in practice. Aligning the heading unconditionally avoids a mismatched column count and simplifies the component.

---

### Decision 7 — `EliminarMiembroModal` and `BloquearMiembroModal` are standalone components, not inline confirmation patterns

**Chosen:** Dedicated modal components matching the `AsignarNivelModal` and `AceptarSolicitudModal` patterns (right-side slide-in for Edit, centred dialog for Remove/Block).

**Rationale:** Inline confirmations (like in `SolicitudesTable`) work well for simple yes/no actions on a table that already has full horizontal space. The Equipo table has 9 columns and its rows are dense; floating a confirmation inline would require a row expansion mechanism not present in the current component. Modals are more accessible (focus-trapped, keyboard-dismissable) and consistent with how existing complex confirmations are handled.

---

## Component / Data Flow

```
EquipoPage
  ├── useEquipo (tenantId)
  │     ├── equipoService.getEquipo()           [read]
  │     ├── equipoService.editarPerfilMiembro() [write]
  │     ├── equipoService.eliminarMiembro()     [write]
  │     └── equipoService.bloquearMiembroDelEquipo() [write]
  │
  ├── EquipoTable
  │     └── onEditarPerfil / onEliminar / onBloquear → setXxxTarget(row)
  │
  ├── EditarPerfilMiembroModal (editTarget)
  │     └── equipoService.getPerfilDeportivo() [lazy read on open]
  ├── EliminarMiembroModal (removeTarget)
  └── BloquearMiembroModal (blockTarget)
```

---

## Risks / Trade-offs

- **RLS policy on `usuarios_update_admin` is broad**: it allows admins to UPDATE any column of `public.usuarios` for members of their tenant. We mitigate this by never including `id`, `email`, or `created_at` in the UPDATE payload at the service layer — but the DB itself does not column-restrict the policy. If a future mutation accidentally includes sensitive fields, the DB will accept it. Mitigation: the service function explicitly builds a typed `UpdatePayload` with only allowed fields; a future improvement could use a DB function with column-level control.
- **Sequential INSERT + DELETE for block is not atomic**: a crash between the two steps could leave the user blocked but still a member, or (less likely) unblocked but removed. The first scenario (blocked + still member) is the safe failure mode — the admin can retry. Mitigation: the service checks whether the user is already blocked before proceeding, and the `miembros_tenant_bloqueados` unique constraint prevents duplicate insertions.
- **`perfil_deportivo` lazy fetch adds a waterfall**: opening the Edit modal triggers a second network request. For users on slow connections this may add visible latency. Mitigation: show a skeleton loader inside the modal while `peso_kg`/`altura_cm` load; the rest of the form (pre-filled from `MiembroTableItem`) renders immediately.

---

## Migration Plan

1. Create `supabase/migrations/<timestamp>_equipo_admin_actions.sql` with:
   - `CREATE POLICY usuarios_update_admin ON public.usuarios FOR UPDATE TO authenticated`
   - `CREATE POLICY miembros_tenant_delete_admin ON public.miembros_tenant FOR DELETE TO authenticated`
   - `GRANT DELETE ON TABLE public.miembros_tenant TO authenticated`
2. Apply migration locally: `supabase db reset` or `supabase migration up`.
3. Test RLS with an admin session and a non-admin session.
4. Deploy migration to staging before merging the feature branch.

**Rollback:** Drop the two new policies. No data migrations are involved; rollback is instantaneous.

---

## Open Questions

- None at this time.
