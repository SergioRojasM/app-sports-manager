# User Story: Blocked Access Request Control (`blocked_access_request_control`)

---

## Title
Blocked Access Request Control

## ID
US0026

## Name
`blocked_access_request_control`

## As a
Organization administrator

## I Want
To configure the maximum number of access request rejections per organization, to persist blocked users in a dedicated table, and to manage the blocked user list (view + unblock) from the team management section, with admins also able to manually block users directly from the requests view.

## So That
Administrators have full control over who can request access to their organization, with a configurable threshold, a persistent block record, and a dedicated admin panel to manage blocked users individually.

---

## Description

US0025 implemented the full access request flow. The blocking logic is currently hardcoded in the `useSolicitudRequest` hook (`rejectionCount >= 3`). This story extends it with four improvements:

1. **Configurable rejection threshold per tenant** — a new `max_solicitudes` column on the `tenants` table replaces the hardcoded constant.
2. **Persistent block table** — when a user reaches the rejection threshold (or is manually blocked by an admin), a record is inserted into a new `miembros_tenant_bloqueados` table. This record is the authoritative source for blocking decisions.
3. **Blocked users tab** — a new "Bloqueados" tab in `gestion-equipo` displays all blocked users for the organization, with an unblock action per row.
4. **Manual block action in the Solicitudes tab** — admins can block a user directly from the existing requests table, regardless of the rejection count.

---

## Database Changes

### 1. Alter `tenants` — add `max_solicitudes`

```sql
alter table public.tenants
  add column if not exists max_solicitudes smallint not null default 2
  constraint tenants_max_solicitudes_ck check (max_solicitudes >= 1 and max_solicitudes <= 10);
```

| Column | Type | Description |
|---|---|---|
| `max_solicitudes` | smallint | Maximum rejections before block. Default **2**. Range 1–10. |

> The existing `gestion-organizacion` edit form should expose this field so admins can adjust it per organization.

---

### 2. New table: `miembros_tenant_bloqueados`

```sql
create table if not exists public.miembros_tenant_bloqueados (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  usuario_id      uuid not null,
  bloqueado_por   uuid,                          -- admin who triggered the block (null = auto-blocked by threshold)
  bloqueado_at    timestamptz not null default timezone('utc', now()),
  motivo          text,                          -- optional admin-supplied reason
  created_at      timestamptz not null default timezone('utc', now()),
  constraint miembros_tenant_bloqueados_tenant_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_bloqueados_usuario_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint miembros_tenant_bloqueados_bloqueado_por_fkey
    foreign key (bloqueado_por) references public.usuarios(id) on delete set null,
  constraint miembros_tenant_bloqueados_tenant_usuario_uk
    unique (tenant_id, usuario_id)               -- one active block per user per tenant
);
```

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `tenant_id` | uuid FK → tenants | Organization the block applies to |
| `usuario_id` | uuid FK → usuarios | Blocked user |
| `bloqueado_por` | uuid FK → usuarios (nullable) | Admin who triggered block; null = auto-blocked by threshold |
| `bloqueado_at` | timestamptz | When the block was created |
| `motivo` | text (nullable) | Optional free-text reason |
| `created_at` | timestamptz | Row creation |

**Indexes:**
```sql
create index idx_bloqueados_tenant on public.miembros_tenant_bloqueados (tenant_id);
create index idx_bloqueados_usuario_tenant on public.miembros_tenant_bloqueados (usuario_id, tenant_id);
```

**RLS Policies:**
- `SELECT (user)`: User can read own block records (`usuario_id = auth.uid()`). Used to render the "blocked" state on the `SolicitarAccesoButton`.
- `SELECT (admin)`: Admin of the tenant can select all block records for their tenant.
- `INSERT (admin)`: Admin of the tenant can insert block records.
- `DELETE (admin)`: Admin of the tenant can delete block records (= unblock).
- No user-level INSERT, UPDATE, or DELETE.

```sql
grant select, insert, delete on public.miembros_tenant_bloqueados to authenticated;
```

---

## Feature Changes

### Migration file

Create a new migration file:
```
supabase/migrations/YYYYMMDDHHMMSS_blocked_access_request_control.sql
```

Contents:
1. `ALTER TABLE tenants ADD COLUMN max_solicitudes`.
2. `CREATE TABLE miembros_tenant_bloqueados` with indexes and RLS policies.
3. Supabase RPC function `bloquear_usuario_tenant(p_tenant_id, p_usuario_id, p_bloqueado_por, p_motivo)` — inserts into `miembros_tenant_bloqueados` in a single atomic call. Returns void. Admin-only via RLS.

---

### Types

**File to modify:** `src/types/portal/solicitudes.types.ts`

Add the following new types:

```typescript
export type BloqueadoRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  bloqueado_por: string | null;
  bloqueado_at: string;
  motivo: string | null;
  created_at: string;
  // joined from usuarios:
  nombre: string | null;
  apellido: string | null;
  email: string;
  foto_url: string | null;
};

export type BloquearUsuarioInput = {
  tenant_id: string;
  usuario_id: string;
  bloqueado_por: string;
  motivo?: string;
};
```

---

### Service

**File to modify:** `src/services/supabase/portal/solicitudes.service.ts`

Add the following methods:

- `getUserBloqueadoForTenant(tenantId: string, userId: string): Promise<boolean>` — returns `true` if a block record exists for `(tenant_id, usuario_id)`. Used by `useSolicitudRequest` to replace the hardcoded `rejectionCount >= 3` check.
- `getBloqueadosByTenant(tenantId: string): Promise<BloqueadoRow[]>` — returns all blocked users for a tenant, joined with `usuarios`. Used by admin panel.
- `bloquearUsuario(input: BloquearUsuarioInput): Promise<void>` — inserts a new record in `miembros_tenant_bloqueados`. Throws `SolicitudesServiceError` with code `'duplicate'` if already blocked.
- `desbloquearUsuario(tenantId: string, usuarioId: string): Promise<void>` — deletes the block record for `(tenant_id, usuario_id)`.

**File to modify:** `src/services/supabase/portal/tenant.service.ts`

- `getTenantMaxSolicitudes(tenantId: string): Promise<number>` — selects `max_solicitudes` from `tenants` for the given `tenant_id`. Used by `useSolicitudRequest`.
- Modify `updateTenant(...)` to include `max_solicitudes` in the allowed update payload.

---

### Hooks

#### `useSolicitudRequest` — modify blocking logic

**File to modify:** `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`

Replace the hardcoded `rejectionCount >= 3` check with a two-step server-side approach:

1. Add a call to `solicitudesService.getUserBloqueadoForTenant(tenantId, userId)` within `loadData`.
2. Store a new `isBanned` boolean in state (from the `miembros_tenant_bloqueados` table lookup).
3. The derived `isBlocked` value becomes `isBanned` (primary) OR `rejectionCount >= maxSolicitudes` (as a secondary guard while the auto-block write occurs).
4. On submit, if `isBlocked` is true, throw immediately without making any service call.

Updated hook return type:
```typescript
type UseSolicitudRequestResult = {
  solicitudes: SolicitudRow[];
  loading: boolean;
  hasPending: boolean;
  rejectionCount: number;
  isBlocked: boolean;
  isBanned: boolean;          // NEW: true if a record exists in miembros_tenant_bloqueados
  submit: (mensaje?: string) => Promise<void>;
  submitting: boolean;
};
```

#### `useSolicitudesAdmin` — add block action

**File to modify:** `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts`

Add a `bloquear(solicitud: SolicitudRow, motivo?: string)` method that calls `solicitudesService.bloquearUsuario(...)` and then calls `refresh()`.

#### New hook: `useBloqueados`

**File to create:** `src/hooks/portal/gestion-solicitudes/useBloqueados.ts`

```typescript
type UseBloqueadosResult = {
  bloqueados: BloqueadoRow[];
  loading: boolean;
  error: string | null;
  desbloquear: (usuarioId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useBloqueados({ tenantId }: { tenantId: string }): UseBloqueadosResult
```

- Loads all blocked users via `solicitudesService.getBloqueadosByTenant(tenantId)`.
- `desbloquear(usuarioId)` calls `solicitudesService.desbloquearUsuario(tenantId, usuarioId)` then `refresh()`.

---

### Auto-block on threshold

When a request is rejected and the new rejection count equals the `tenants.max_solicitudes` value, automatically insert a record into `miembros_tenant_bloqueados` (with `bloqueado_por = revisadoPor`, `motivo = 'Límite de solicitudes rechazadas alcanzado'`).

This logic lives in `solicitudesService.rechazarSolicitud`:
1. After updating the request to `rechazada`, call `solicitudesService.getUserSolicitudesForTenant(tenantId, userId)` to count rejections.
2. Fetch `getTenantMaxSolicitudes(tenantId)`.
3. If `rejectedCount >= maxSolicitudes`, call `bloquearUsuario(...)`.

> The auto-block insert uses `on conflict (tenant_id, usuario_id) do nothing` to be idempotent.

---

### Components

#### Blocklist panel

**File to create:** `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTab.tsx`

Props:
```typescript
type BloqueadosTabProps = {
  bloqueados: BloqueadoRow[];
  loading: boolean;
  error: string | null;
  desbloquear: (usuarioId: string) => Promise<void>;
  refresh: () => Promise<void>;
};
```

Renders:
- Loading state (same pattern as `SolicitudesTab`).
- Error state with retry.
- Empty state: "No hay usuarios bloqueados."
- Table with columns: User avatar, Full name, Email, Block date (`bloqueado_at`), Reason (`motivo`), Actions.
- Per-row action: **Desbloquear** button (destructive-secondary style, with inline confirmation before calling `desbloquear`).

**File to create:** `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTable.tsx`

Table presentation component. Same visual pattern as `SolicitudesTable`. Columns: avatar+name, email, `bloqueado_at` (formatted), `motivo` (or "—"), Actions (Desbloquear with inline confirm).

---

#### Bloquear action in `SolicitudesTable`

**File to modify:** `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx`

Add a **Bloquear** action button per row. It should:
- Only appear for rows whose `estado` is `pendiente` or `rechazada`.
- Show an inline confirmation (same `rechazandoId` pattern already used for reject) asking for an optional `motivo`.
- On confirm: call `onBloquear(solicitud, motivo?)`.

Update `SolicitudesTableProps`:
```typescript
type SolicitudesTableProps = {
  rows: SolicitudRow[];
  onAceptar: (solicitud: SolicitudRow) => void;
  onRechazar: (solicitud: SolicitudRow, notaRevision?: string) => void;
  onBloquear: (solicitud: SolicitudRow, motivo?: string) => void;   // NEW
};
```

---

#### `SolicitudesTab` — pass `onBloquear`

**File to modify:** `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx`

Update `SolicitudesTabProps` to accept `bloquear: (solicitud: SolicitudRow, motivo?: string) => Promise<void>` and thread it through to `SolicitudesTable` as `onBloquear`.

---

#### `EquipoPage` — add "Bloqueados" tab

**File to modify:** `src/components/portal/gestion-equipo/EquipoPage.tsx`

1. Add `'bloqueados'` to the `ActiveTab` union type.
2. Instantiate `useBloqueados({ tenantId })` hook.
3. Add a **"Bloqueados"** tab button in the tab nav bar (after the existing "Solicitudes" button).
4. Render `<BloqueadosTab />` when `activeTab === 'bloqueados'`, passing the state from `useBloqueados`.
5. Pass the `bloquear` handler from `useSolicitudesAdmin` down to `SolicitudesTab`.

---

#### `gestion-organizacion` edit form — expose `max_solicitudes`

**File to identify and modify:** The admin edit form for organization settings (likely `src/components/portal/gestion-equipo/` or `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/`).

Add a numeric input field for `max_solicitudes`:
- Label: "Máximo de solicitudes rechazadas antes de bloqueo"
- Type: number, min 1, max 10.
- Shown only in the admin edit view of the organization.
- Saved via `tenant.service.ts` `updateTenant(...)`.

---

### `SolicitarAccesoButton` — use persistent block state

**File to modify:** `src/components/portal/tenant/SolicitarAccesoButton.tsx`

- The `isBlocked` flag now comes from `useSolicitudRequest`, which uses `isBanned` (from `miembros_tenant_bloqueados`) as the primary signal.
- The blocked UI message remains: "No puedes hacer más solicitudes. Contacta directamente al administrador de la organización."

No visual change is required for the user-facing message.

---

## URL and Route changes

No new routes are added. The new "Bloqueados" tab is part of the existing:
```
/portal/orgs/[tenant_id]/gestion-equipo
```

---

## Files Summary

| Action | File |
|---|---|
| **CREATE** migration | `supabase/migrations/YYYYMMDDHHMMSS_blocked_access_request_control.sql` |
| **MODIFY** types | `src/types/portal/solicitudes.types.ts` |
| **MODIFY** service | `src/services/supabase/portal/solicitudes.service.ts` |
| **MODIFY** service | `src/services/supabase/portal/tenant.service.ts` |
| **MODIFY** hook | `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts` |
| **MODIFY** hook | `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts` |
| **CREATE** hook | `src/hooks/portal/gestion-solicitudes/useBloqueados.ts` |
| **MODIFY** component | `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx` |
| **MODIFY** component | `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx` |
| **CREATE** component | `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTab.tsx` |
| **CREATE** component | `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTable.tsx` |
| **MODIFY** component | `src/components/portal/gestion-equipo/EquipoPage.tsx` |
| **MODIFY** component | `SolicitarAccesoButton.tsx` (verify `isBanned` wiring) |
| **MODIFY** component | Organization edit form (add `max_solicitudes` field) |
| **UPDATE** docs | `projectspec/03-project-structure.md` — add `BloqueadosTab`, `BloqueadosTable`, `useBloqueados` |

---

## Acceptance Criteria

1. **max_solicitudes column** — `tenants.max_solicitudes` exists with default 2; the admin can change it via the organization edit form (range 1–10); the new value takes effect immediately for subsequent rejection checks.
2. **Auto-block** — when a request is rejected and the user's rejection count for that tenant equals `max_solicitudes`, a record is automatically inserted into `miembros_tenant_bloqueados`.
3. **Manual block** — an admin can click "Bloquear" on any pending or rejected request in the Solicitudes tab; the block record is created and the user can no longer submit new requests.
4. **Blocked user can't submit** — `SolicitarAccesoButton` renders the blocked state message and the submit button is disabled when a block record exists in `miembros_tenant_bloqueados` for the user's tenant.
5. **Bloqueados tab** — a "Bloqueados" tab appears in `gestion-equipo`; it lists all blocked users with their name, email, block date, and optional reason.
6. **Unblock** — clicking "Desbloquear" on any row in the Bloqueados tab (with inline confirmation) deletes the block record; the user can submit new requests immediately after.
7. **Idempotent block** — attempting to block an already-blocked user (auto or manual) does nothing (upsert `on conflict do nothing`).
8. **RLS** — only admins of the tenant can insert, delete, or list block records for their organization. Users can only read their own block status.

---

## Non-Functional Requirements

- **Security**: All RLS policies enforce tenant isolation. No user can read or modify block records for tenants other than their own membership. Admin-only actions verified via `get_admin_tenants_for_authenticated_user()` function (existing pattern).
- **Performance**: The `miembros_tenant_bloqueados` table must have an index on `(tenant_id)` and `(usuario_id, tenant_id)` to support admin list and user-side block-check queries efficiently.
- **Consistency**: The auto-block insertion within `rechazarSolicitud` must guard against race conditions with `on conflict (tenant_id, usuario_id) do nothing` to be idempotent.
- **No data loss**: Deleting a block record (unblock) does not delete the user's rejection history in `miembros_tenant_solicitudes`. The admin can re-block manually if needed.
- **Backward compatibility**: The `max_solicitudes` default of 2 is lower than the previously hardcoded 3. Existing tenants will inherit default 2 on migration. If desired, the migration can set it to 3 for existing rows to preserve previous behavior — document this decision in the migration.

---

## Steps Required for Completion

1. Write and apply the migration (`ALTER TABLE tenants`, `CREATE TABLE miembros_tenant_bloqueados`, RLS policies, indexes).
2. Extend `solicitudes.types.ts` with `BloqueadoRow` and `BloquearUsuarioInput`.
3. Add service methods to `solicitudes.service.ts` (`getUserBloqueadoForTenant`, `getBloqueadosByTenant`, `bloquearUsuario`, `desbloquearUsuario`) and to `tenant.service.ts` (`getTenantMaxSolicitudes`, update `updateTenant`).
4. Modify `useSolicitudRequest` to query block status from database instead of computing locally.
5. Modify `useSolicitudesAdmin` to include `bloquear` action.
6. Create `useBloqueados` hook.
7. Modify `SolicitudesTable` to include "Bloquear" action column and update props/callbacks.
8. Modify `SolicitudesTab` to receive and forward the `bloquear` handler.
9. Create `BloqueadosTable` and `BloqueadosTab` components.
10. Modify `EquipoPage` to add "Bloqueados" tab, wire `useBloqueados`, and pass `bloquear` handler to `SolicitudesTab`.
11. Add `max_solicitudes` field to the organization edit form.
12. Update `projectspec/03-project-structure.md` to reflect new files.
13. Verify `SolicitarAccesoButton` renders the blocked state correctly using `isBanned`.
