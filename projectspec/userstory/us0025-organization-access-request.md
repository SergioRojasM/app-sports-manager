# User Story: Organization Access Request Flow (`organization_access_request`)

---

## Title
Organization Access Request Flow

## ID
US0025

## Name
`organization_access_request`

## As a
Authenticated user without membership in an organization

## I Want
To submit an access request to an organization from the organizations discovery page, and for administrators to be able to review, accept, or reject those requests from the team management section.

## So That
Users can proactively request to join an organization, and administrators can onboard new members by assigning them a role when accepting the request.

---

## Description

Currently, users without membership in an organization see a "Suscribirse" placeholder button in the `PortalTenantsPage` (src/app/portal/orgs/page.tsx). This story replaces that placeholder with a functional **"Solicitar acceso"** flow.

### User-side flow
1. The user visits `/portal/orgs` and sees organization cards.
2. For organizations where they do **not** have membership, the card shows a **"Solicitar acceso"** button.
3. Clicking the button opens a lightweight confirmation dialog (or inline confirmation) asking if they want to send an access request to that organization.
4. On confirmation, a record is inserted into the new `miembros_tenant_solicitudes` table.
5. Only one pending request per user per tenant is allowed at a time. If a pending request already exists, the button changes to **"Solicitud enviada"** (disabled).
6. If a request was previously rejected, the user can re-submit after the rejection (a new record is created and the previous rejected one is replaced/superseded).

### Admin-side flow
1. The administrator navigates to `/portal/orgs/[tenant_id]/gestion-equipo`.
2. A new tab **"Solicitudes"** appears next to the existing team listing tab.
3. The Solicitudes tab shows a table of pending access requests with user details and request date.
4. The admin can **Accept** (opens a modal to select a role) or **Reject** a request.
5. On **Accept**: the selected role is assigned and a new record is created in `miembros_tenant`; the request record status is updated to `aceptada`.
6. On **Reject**: the request record status is updated to `rechazada`; no membership is created.
7. Accepted and rejected requests are hidden from the pending list and can optionally be seen in a "Historial" filter.

---

## Database Changes

### New table: `miembros_tenant_solicitudes`

```sql
create table if not exists public.miembros_tenant_solicitudes (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  usuario_id    uuid not null,
  estado        varchar(20) not null default 'pendiente',
  mensaje       text,                          -- optional user-supplied note
  rol_solicitado_id  uuid,                     -- optional: user hints at desired role
  revisado_por  uuid,                          -- admin/entrenador who took action
  revisado_at   timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint miembros_tenant_solicitudes_tenant_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_solicitudes_usuario_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint miembros_tenant_solicitudes_revisado_por_fkey
    foreign key (revisado_por) references public.usuarios(id) on delete set null,
  constraint miembros_tenant_solicitudes_estado_ck
    check (estado in ('pendiente', 'aceptada', 'rechazada')),
  constraint miembros_tenant_solicitudes_tenant_usuario_pendiente_uk
    unique (tenant_id, usuario_id)             -- one active request per user/tenant
);
```

**Columns:**

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `tenant_id` | uuid FK → tenants | Target organization |
| `usuario_id` | uuid FK → usuarios | Requesting user |
| `estado` | varchar(20) | `pendiente` \| `aceptada` \| `rechazada` |
| `mensaje` | text | Optional note from the user |
| `rol_solicitado_id` | uuid FK → roles (nullable) | Optional preferred role |
| `revisado_por` | uuid FK → usuarios (nullable) | Admin who took action |
| `revisado_at` | timestamptz (nullable) | Timestamp of the review |
| `created_at` | timestamptz | Request creation time |
| `updated_at` | timestamptz | Last update time |

> **Note**: The unique constraint `(tenant_id, usuario_id)` prevents duplicate pending requests. When a request is accepted or rejected, the state changes in-place, freeing the unique slot for a future re-request only if needed via explicit delete + reinsert (or an upsert strategy evaluated during implementation).

### RLS Policies required

- **INSERT**: Authenticated user can insert a row only when `usuario_id = auth.uid()`.
- **SELECT (user)**: User can read their own requests (`usuario_id = auth.uid()`).
- **SELECT (admin)**: Admin members of the tenant can read all requests for that tenant (join with `miembros_tenant` to verify admin role).
- **UPDATE (admin)**: Admin members of the tenant can update `estado`, `revisado_por`, `revisado_at`.
- No DELETE policy for users (only admins or cascade from tenant/user deletion).

---

## Feature Slice: `gestion-solicitudes` (inside `gestion-equipo`)

Create all hexagonal layers for the new sub-feature under the existing `gestion-equipo` feature slice.

### Files to create

#### Types
```
src/types/portal/solicitudes.types.ts
```
Contracts:
- `SolicitudEstado`: `'pendiente' | 'aceptada' | 'rechazada'`
- `SolicitudRow`: domain view-model with user display fields joined from `usuarios`
- `CreateSolicitudInput`: `{ tenant_id, usuario_id, mensaje? }`
- `AceptarSolicitudInput`: `{ solicitud_id, tenant_id, usuario_id, rol_id, revisado_por }`
- `RechazarSolicitudInput`: `{ solicitud_id, revisado_por }`
- `SolicitudesServiceError`: typed error class (codes: `'forbidden' | 'duplicate' | 'unknown'`)

#### Service
```
src/services/supabase/portal/solicitudes.service.ts
```
Methods:
- `createSolicitud(input: CreateSolicitudInput): Promise<void>` — inserts a new pending request; throws `SolicitudesServiceError` with code `'duplicate'` on unique constraint violation.
- `getSolicitudesByTenant(supabase, tenantId): Promise<SolicitudRow[]>` — returns all requests for a tenant, joined with `usuarios` for display fields. Used by admin.
- `getUserSolicitudForTenant(supabase, tenantId, userId): Promise<SolicitudRow | null>` — returns the user's own pending request for a specific tenant.
- `aceptarSolicitud(input: AceptarSolicitudInput): Promise<void>` — updates `estado = 'aceptada'`, sets `revisado_por` / `revisado_at`, then inserts into `miembros_tenant`. Both operations run within a Supabase RPC or sequential calls with error handling.
- `rechazarSolicitud(input: RechazarSolicitudInput): Promise<void>` — updates `estado = 'rechazada'`, sets `revisado_por` / `revisado_at`.

#### Hooks
```
src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts
src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts
```

`useSolicitudesAdmin({ tenantId })`:
- Loads all `pendiente` requests for the tenant (with optional `estadoFilter` for historial).
- Exposes `solicitudes`, `loading`, `error`, `aceptar(solicitud, rolId)`, `rechazar(solicitud)`, `refresh`.
- The `aceptar` handler calls `solicitudesService.aceptarSolicitud` and then `refresh()`.
- The `rechazar` handler calls `solicitudesService.rechazarSolicitud` and then `refresh()`.

`useSolicitudRequest({ tenantId })`:
- Loads the current user's existing solicitud for the tenant (if any).
- Exposes `solicitud`, `loading`, `hasPendingSolicitud`, `submit(mensaje?)`, `submitting`.
- Calls `solicitudesService.createSolicitud` on submit.

#### Components
```
src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx
src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx
src/components/portal/gestion-equipo/gestion-solicitudes/AceptarSolicitudModal.tsx
src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudEstadoBadge.tsx
```

`SolicitudesTab({ tenantId })`:
- Shell component that orchestrates `useSolicitudesAdmin`.
- Includes header, `SolicitudesTable`, and renders `AceptarSolicitudModal` when accept action is triggered.
- Shows empty state when no pending requests.

`SolicitudesTable({ solicitudes, onAceptar, onRechazar })`:
- Table with columns: User avatar, Full name, Email, Identification (optional), Request date (`created_at`), `SolicitudEstadoBadge`, Actions.
- Action buttons: **Aceptar** (primary) and **Rechazar** (destructive, with inline confirmation).
- Pagination if list is long (reuse pattern from `EquipoTable`).

`AceptarSolicitudModal({ solicitud, onConfirm, onClose })`:
- Modal that loads available roles from `roles` table.
- Dropdown to select role (required).
- On confirm: calls `onConfirm(solicitud, selectedRolId)`.

`SolicitudEstadoBadge({ estado })`:
- Color-coded badge: yellow for `pendiente`, green for `aceptada`, red for `rechazada`.

#### User-facing component (orgs page)
```
src/components/portal/tenant/TenantDirectoryList.tsx   ← MODIFY (or extract a sub-component)
src/components/portal/tenant/SolicitarAccesoButton.tsx ← NEW
```

`SolicitarAccesoButton({ tenantId })`:
- Uses `useSolicitudRequest({ tenantId })`.
- Renders **"Solicitar acceso"** when no pending request exists.
- Renders **"Solicitud enviada"** (disabled) when a pending request exists.
- On click (when no pending request): shows a small confirmation dialog or inline confirm → calls `submit()`.
- Shows spinner while `submitting`.

Modify `TenantDirectoryList.tsx` to pass `SolicitarAccesoButton` for non-member cards instead of the current non-functional "Suscribirse" placeholder.

---

## Gestion Equipo Page: Add "Solicitudes" Tab

### File to modify
```
src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx   ← no change needed (delegates to EquipoPage)
src/components/portal/gestion-equipo/EquipoPage.tsx                        ← MODIFY
```

Update `EquipoPage.tsx` to include a tab bar:
- **Tab 1: "Equipo"** — existing team table (current default view).
- **Tab 2: "Solicitudes"** — renders `SolicitudesTab` component.

Tab state is local (`useState`) — no URL params needed unless specified later.

Show a numeric badge on the "Solicitudes" tab with the count of pending requests (loaded via `useSolicitudesAdmin` internally).

---

## Endpoints and URLs

### App routes (no new routes; behavior change only)
| Route | Change |
|---|---|
| `GET /portal/orgs` | Non-member cards now show "Solicitar acceso" functional button |
| `GET /portal/orgs/[tenant_id]/gestion-equipo` | New "Solicitudes" tab visible to `administrador` role |

### Supabase queries (no new HTTP endpoints)
All DB access is via Supabase JS SDK from service layer:

1. `supabase.from('miembros_tenant_solicitudes').insert(...)` — create request
2. `supabase.from('miembros_tenant_solicitudes').select('*, usuarios(...)').eq('tenant_id', ...).order('created_at', asc)` — list for admin
3. `supabase.from('miembros_tenant_solicitudes').select('id,estado').eq('tenant_id', ...).eq('usuario_id', ...).single()` — check user's own pending request
4. `supabase.from('miembros_tenant_solicitudes').update({ estado, revisado_por, revisado_at }).eq('id', ...)` — accept/reject
5. `supabase.from('miembros_tenant').insert({ tenant_id, usuario_id, rol_id })` — create membership on accept
6. `supabase.from('roles').select('id, nombre')` — load available roles in AceptarSolicitudModal

---

## Files to Create/Modify

### New files
| File | Purpose |
|---|---|
| `supabase/migrations/YYYYMMDD_miembros_tenant_solicitudes.sql` | Migration: new table + RLS policies |
| `src/types/portal/solicitudes.types.ts` | Domain types |
| `src/services/supabase/portal/solicitudes.service.ts` | Data access layer |
| `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts` | Admin hook |
| `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts` | User-side request hook |
| `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx` | Admin tab shell |
| `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx` | Requests table |
| `src/components/portal/gestion-equipo/gestion-solicitudes/AceptarSolicitudModal.tsx` | Role selection modal |
| `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudEstadoBadge.tsx` | Status badge |
| `src/components/portal/tenant/SolicitarAccesoButton.tsx` | Request CTA button on orgs page |

### Modified files
| File | Change |
|---|---|
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add tab bar with "Equipo" and "Solicitudes" tabs |
| `src/components/portal/tenant/TenantDirectoryList.tsx` | Replace "Suscribirse" placeholder with `SolicitarAccesoButton` for non-member cards |
| `src/types/portal/equipo.types.ts` | No change expected; solicitudes types are in their own file |
| `projectspec/03-project-structure.md` | Add `gestion-solicitudes` sub-slice to directory structure |

---

## Expected Results / Acceptance Criteria

### User-side (Organizations page)
- [ ] A user with no membership in an org sees "Solicitar acceso" button on the org card.
- [ ] Clicking the button inserts a record into `miembros_tenant_solicitudes` with `estado = 'pendiente'`.
- [ ] After submission, the button changes to "Solicitud enviada" (disabled) without a page reload.
- [ ] A user with an active membership in an org still sees the "Ingresar" button (no change).
- [ ] Attempting to submit a second request when one is pending is blocked (unique constraint; UI prevents it).

### Admin-side (Gestión equipo)
- [ ] A "Solicitudes" tab appears in the `gestion-equipo` page for `administrador` role users.
- [ ] The tab shows a badge with the count of pending requests.
- [ ] The Solicitudes table displays: user name, email, request date, estado badge, and action buttons.
- [ ] Clicking "Aceptar" opens `AceptarSolicitudModal` with a role dropdown populated from the `roles` table.
- [ ] Confirming acceptance: sets `estado = 'aceptada'` in `miembros_tenant_solicitudes` AND creates a record in `miembros_tenant` with the selected role.
- [ ] Clicking "Rechazar" (with inline confirmation) sets `estado = 'rechazada'` without creating a membership.
- [ ] After accept/reject, the request disappears from the "pendiente" list and `refresh()` is called.
- [ ] Error states are handled gracefully and displayed to the user.

---

## Steps to Consider the Task Complete

1. **Migration**: New SQL migration file created, applied locally (`supabase db reset` or incremental push), and RLS policies validated.
2. **Types**: `solicitudes.types.ts` created with all required types.
3. **Service**: `solicitudes.service.ts` implemented with all five methods; no Supabase calls outside service layer.
4. **Hooks**: `useSolicitudesAdmin` and `useSolicitudRequest` implemented and tested manually.
5. **Components - Admin**: `SolicitudesTab`, `SolicitudesTable`, `AceptarSolicitudModal`, `SolicitudEstadoBadge` created and integrated into `EquipoPage`.
6. **Components - User**: `SolicitarAccesoButton` created and integrated into `TenantDirectoryList`.
7. **EquipoPage**: Tab bar implemented with pending count badge on "Solicitudes" tab.
8. **End-to-end check**: A test user can request access; an admin can accept or reject it; accepted users gain membership and can log in to the tenant.
9. **Project structure doc**: `projectspec/03-project-structure.md` updated to reflect new slice.

---

## Non-Functional Requirements

### Security
- RLS policies must ensure a user can only create a solicitud for themselves (`usuario_id = auth.uid()`).
- Only tenant admins (verified via `miembros_tenant` join) can read all tenant solicitudes or update their status.
- Acceptance of a request must not allow an admin to assign an invalid `rol_id` — the role must exist in the `roles` table (FK ensures this at DB level).
- No client-side trust: all sensitive mutations validated server-side via RLS.

### Data Integrity
- The unique constraint `(tenant_id, usuario_id)` prevents duplicate pending requests at the DB level.
- FK constraints ensure referential integrity for `tenant_id`, `usuario_id`, `revisado_por`.
- The `estado` check constraint limits values to allowed states.

### Performance
- The `miembros_tenant_solicitudes` table should have composite indexes on `(tenant_id, estado)` and `(usuario_id, tenant_id)` to support the two main query patterns.
- The admin query joins with `usuarios` — use selective column projection to avoid fetching unnecessary data.

### UX
- The "Solicitar acceso" button must provide immediate visual feedback after submission (no reload required).
- The Solicitudes tab badge count must be accurate at page load and refresh after admin actions.
- All loading and error states must be handled gracefully following the existing patterns in `EquipoPage`.
