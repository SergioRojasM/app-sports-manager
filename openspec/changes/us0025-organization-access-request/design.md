## Context

The portal organizations page (`/portal/orgs`) currently renders organization cards via `TenantDirectoryList`. For non-members, cards render a "Suscribirse" placeholder button that fires a local toast and performs no persistence. There is no mechanism for users to formally request access, and no workflow for administrators to review and onboard new members.

The `gestion-equipo` page is a single-view component (`EquipoPage`) rendering stats, filters, and a member table. It has no tabs.

The `miembros_tenant` table is the single source of truth for tenant access. Any new member row inserted there will immediately satisfy the existing RLS membership gate at `[tenant_id]/layout.tsx`.

The `PortalTenantListItem` type (passed as `organizations` prop to `TenantDirectoryList`) includes `canAccess: boolean` and `userMembershipRole`. This is the discriminator used to decide which CTA to render per card.

## Goals / Non-Goals

**Goals:**
- Allow any authenticated user to submit an access request per organization, with a per-user hard cap of 3 rejections.
- Show the user's last 3 requests to a given organization (with admin rejection note if applicable) directly on the org card.
- Allow `administrador` role users to review, accept (with role assignment), and reject requests — including a free-text rejection note.
- Accepting a request automatically creates the `miembros_tenant` record — no separate member-creation step.
- Replace the non-persistent "Suscribirse" placeholder with a functional request CTA.
- Follow the existing hexagonal slice pattern: types → service → hooks → components.

**Non-Goals:**
- Email or push notifications to admins when a request arrives.
- A dedicated "Mis solicitudes" dashboard for the requesting user.
- Bulk accept/reject of multiple requests at once.
- Admin ability to delete request history records.
- Resetting the 3-rejection cap from the UI (admin must add the user directly via `miembros_tenant`).

## Decisions

### 1. Unique constraint strategy: full-row uniqueness vs. partial index

**Decision**: Use a **partial unique index** `UNIQUE (tenant_id, usuario_id) WHERE estado = 'pendiente'` to allow multiple historical records per user/tenant while preventing duplicate pending requests.

**Why this changed from original US**: The product requirement is to display the user's **last 3 requests** to an organization (with admin rejection notes) and enforce a hard cap of **3 rejections** before blocking further requests. This requires preserving request history as separate rows — in-place state transitions on a single row cannot satisfy these requirements.

**Enforcement rules in `createSolicitud`**:
1. Reject if an active `pendiente` row exists → error code `'duplicate'`.
2. Count rows with `estado = 'rechazada'` for this `(tenant_id, usuario_id)`. If count ≥ 3 → error code `'max_rejections'`.
3. Otherwise insert a new `pendiente` row.

**History display**: `getUserSolicitudesForTenant(tenantId, userId)` returns the last 3 rows ordered by `created_at DESC`, regardless of `estado`. The `SolicitarAccesoButton` uses these to render the history panel and determine which CTA state to show.

**Cap behaviour**: After 3 rejections the button renders a locked state — "Acceso bloqueado" — explaining the user must contact the organization directly. The only path to membership at that point is the admin inserting directly into `miembros_tenant`.

**DB change from original US spec**: Remove the table-level `UNIQUE (tenant_id, usuario_id)` constraint. Replace with:
```sql
create unique index miembros_tenant_solicitudes_pendiente_uk
  on public.miembros_tenant_solicitudes (tenant_id, usuario_id)
  where estado = 'pendiente';
```

**New column**: `nota_revision text` — admin-supplied note when rejecting, surfaced in the user history panel.

---

### 2. Accept flow: client-side sequential calls vs. DB function (RPC)

**Decision**: Sequential service calls from the client hook — first update `miembros_tenant_solicitudes`, then insert into `miembros_tenant`.

**Alternative considered**: A Postgres function (`accept_solicitud(solicitud_id, rol_id, revisado_por)`) would guarantee atomicity. However:
- The project avoids custom RPC proliferation; existing patterns (reservas, suscripciones, asistencias) all use sequential SDK calls.
- A partial failure (update succeeds, insert fails) is recoverable — the admin sees the request still "pendiente" (or can retry).
- RLS on `miembros_tenant` already validates `rol_id`, so no DB function is needed as a security boundary.

**Decision rationale**: Consistency with the codebase pattern outweighs the marginal atomicity benefit at this stage.

---

### 3. "Solicitudes" tab placement: EquipoPage tabs vs. separate route

**Decision**: Add a local `useState`-driven tab bar to `EquipoPage` (no URL change).

**Alternative considered**: A new sub-route `/gestion-equipo/solicitudes`. Rejected because:
- This would require a new page file and route group entry.
- The Solicitudes section is tightly coupled to `gestion-equipo` navigation — it belongs on the same page.
- Local tab state is simpler and consistent with the pattern used in other multi-section pages (e.g., `SuscripcionesPage`).

---

### 4. Pending count badge: separate fetch vs. reuse hook

**Decision**: `EquipoPage` imports `useSolicitudesAdmin` to obtain `solicitudes.length` for the badge count. The hook is instantiated once; `SolicitudesTab` receives props rather than instantiating its own copy.

**Why**: Avoids two concurrent fetches for the same data. `EquipoPage` owns the tab state, so it naturally owns the data needed for the badge.

---

### 5. SolicitarAccesoButton: inline component vs. integrated into TenantDirectoryList

**Decision**: Extract into a standalone `SolicitarAccesoButton` component that calls `useSolicitudRequest` internally. The component renders **both** the action CTA and the collapsible history panel (last 3 requests).

**Why**: `TenantDirectoryList` is a pure presentational component that iterates over `PortalTenantListItem[]`. Adding hook logic directly would violate the separation principle. The button encapsulates all async state; `TenantDirectoryList` only renders it for non-member cards.

`PortalTenantListItem` type does NOT need to change — `canAccess: false` is the discriminator for which CTA to show.

**Button states** (driven by `useSolicitudRequest`):

| Condition | CTA rendered |
|---|---|
| No prior requests | "Solicitar acceso" (active) |
| 1 `pendiente` request exists | "Solicitud en revisión" (disabled) |
| Last request `rechazada`, < 3 rejections total | "Volver a solicitar" (active) + history panel |
| 3 or more rejections | "Acceso bloqueado" (disabled) + history panel |

**History panel**: collapsible section below the CTA button showing each of the last 3 request rows as a compact item — `SolicitudEstadoBadge`, `created_at` date, and `nota_revision` (admin rejection note) when present.

---

### 6. Data flow architecture (page → component → hook → service → types)

```
/portal/orgs (page)
  └── PortalTenantsPage (component)
        └── TenantDirectoryList (component)
              └── TenantIdentityCard [canAccess=true]  → "Ingresar" link (no change)
              └── SolicitarAccesoButton [canAccess=false]
                    │   renders: CTA button + collapsible history panel (last 3 requests)
                    └── useSolicitudRequest (hook)
                          │  loads: getUserSolicitudesForTenant() (last 3, desc)
                          │  exposes: solicitudes[], hasPending, rejectionCount, isBlocked, submit(), submitting
                          └── solicitudes.service.ts (service)

/portal/orgs/[tenant_id]/gestion-equipo (page — no change)
  └── EquipoPage (component — MODIFIED)
        ├── Tab "Equipo" (existing content)
        └── Tab "Solicitudes" [badge = pendingCount from useSolicitudesAdmin]
              └── SolicitudesTab (component)
                    └── SolicitudesTable (component)
                    └── AceptarSolicitudModal (component)
              └── useSolicitudesAdmin (hook)
                    │  loads: getSolicitudesByTenant() filtered to estado='pendiente'
                    │  exposes: solicitudes, loading, error, aceptar(), rechazar(nota?), refresh()
                    └── solicitudes.service.ts (service)
```

**Service methods** (updated from original US):
- `createSolicitud(input)` — guards: duplicate pending → `'duplicate'`; rejections ≥ 3 → `'max_rejections'`; otherwise insert.
- `getSolicitudesByTenant(supabase, tenantId, estado?)` — returns all (or filtered by `estado`) rows for admin view, joined with `usuarios`.
- `getUserSolicitudesForTenant(supabase, tenantId, userId)` — returns last 3 rows ordered by `created_at DESC` (replaces single-row `getUserSolicitudForTenant`).
- `aceptarSolicitud(input)` — updates `estado='aceptada'`, sets `revisado_por`/`revisado_at`, inserts into `miembros_tenant`.
- `rechazarSolicitud(input)` — updates `estado='rechazada'`, sets `revisado_por`/`revisado_at`/`nota_revision`.

## Risks / Trade-offs

- **Race condition on accept**: if two admins accept the same request concurrently, the second `miembros_tenant` insert will fail on the `(tenant_id, usuario_id)` unique constraint. → Mitigation: the service catches the constraint violation error and surfaces it as a friendly message ("Este usuario ya es miembro de la organización"). The `solicitud` record will be left as `aceptada` by the first admin.

- **Stale badge count**: the pending count badge in `EquipoPage` is loaded once on mount. After an accept/reject action it is refreshed via `refresh()`, but concurrent admin sessions are not synced. → Acceptable for this stage; real-time sync is a non-goal.

- **`canAccess` flag in `PortalTenantListItem` does not reflect pending solicitud state**: after a user submits a request their `canAccess` remains `false` and the orgs page still shows the CTA button. `SolicitarAccesoButton` independently fetches the user's solicitud state to show "Solicitud enviada". → No change to the `useTenantView` hook is needed; the button manages its own state.

- **Rejection cap race condition**: two simultaneous submits from the same user could both pass the `rejectionCount < 3` guard before either insert completes. → Mitigation: the partial unique index prevents two `pendiente` rows from existing simultaneously, which is the primary safety net. The cap check is a soft guard sufficient for the intended UX; strict atomic enforcement is deferred.

- **History panel performance**: `getUserSolicitudesForTenant` is called per non-member org card on the orgs page. For users with many non-member orgs this produces N parallel queries. → Mitigation: queries are bounded by `LIMIT 3` plus the index on `(usuario_id, tenant_id, created_at DESC)`. Batching into a single query can be introduced in a future iteration if the orgs list grows large.

- **`nota_revision` visibility**: the rejection note is user-visible. Admins must be aware their note will be shown to the requester. → Considered acceptable; no PII concern beyond what the admin chooses to write.

## Migration Plan

1. Create migration file `supabase/migrations/20260311_miembros_tenant_solicitudes.sql` with:
   - Table DDL with `nota_revision text` column; **no** table-level `UNIQUE (tenant_id, usuario_id)`
   - Partial unique index `WHERE estado = 'pendiente'`
   - Composite indexes on `(tenant_id, estado)`, `(usuario_id, tenant_id)`, and `(usuario_id, tenant_id, created_at DESC)`
   - RLS enable + policies (INSERT self-only, SELECT self + admin, UPDATE admin)
2. Run `npx supabase db reset` locally to verify clean apply.
3. Deploy migration via `npx supabase db push` (or standard CI pipeline).
4. No rollback risk: new table with no FK dependents. Dropping the table restores prior state.

## Open Questions

- Should rejected requests show any indication to the requesting user on the orgs page? → **Resolved**: Yes. `SolicitarAccesoButton` renders a collapsible history panel with the last 3 requests, each showing `estado` badge, date, and `nota_revision`. If the last request was rejected and the cap has not been reached, a "Volver a solicitar" CTA is available. After 3 rejections the button is locked ("Acceso bloqueado") and the user is directed to contact the organization directly.
- Should the admin "Solicitudes" tab also be accessible to the `entrenador` role? → **Resolved**: No, scoped to `administrador` only.
