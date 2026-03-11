# User Story: Validate Training Attendance

## ID
US0024

## Title
Training Attendance Verification — Allow Admins and Coaches to Record and Manage Athlete Attendance per Booking

## As a
**Administrator (Administrador)** or **Coach (Entrenador)** member of a tenant

## I Want
To be able to verify, record, edit, and delete attendance for each athlete who made a booking for a training session, including optional observations per athlete.

## So That
- The organization has an accurate record of actual attendance vs. registered bookings.
- Coaches and administrators can annotate why an athlete did or did not attend.
- Regular athletes cannot view or manipulate attendance data, preserving the integrity of the records.

---

## Description

The database already contains the `asistencias` table (from migration `20260221000100_migracion_inicial_bd.sql`). This story implements the full UI and service layer to interact with it, as well as the required RLS policies.

### Scope of the Feature

1. **ReservasPanel enhancement**: Inside the training bookings panel (used by admins and coaches), each booking row must display an attendance status indicator and an action button to record/edit attendance. This control is **invisible to athletes**.
2. **AsistenciaFormModal**: A modal dialog that allows the admin/coach to:
   - Confirm whether the athlete attended (`asistio: boolean`).
   - Enter optional free-text observations.
   - Submit to insert or update the corresponding `asistencias` row.
3. **Edit/Delete**: A recorded attendance can be modified or deleted exclusively by users with role `administrador` or `entrenador`.
4. **Read restriction**: Regular athletes (`atleta` role) cannot read or query the `asistencias` table. RLS policies enforce this.

### `asistencias` Table (existing, no new migration for structure)

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated. |
| `tenant_id` | `uuid` FK → tenants | Row-level scoping. |
| `reserva_id` | `uuid` FK → reservas (UNIQUE) | One attendance record per booking. |
| `validado_por` | `uuid` FK → usuarios (nullable) | The admin/coach who verified the attendance. |
| `fecha_asistencia` | `timestamptz` (nullable) | When the record was validated. |
| `asistio` | `boolean` | Whether the athlete actually attended. |
| `observaciones` | `text` (nullable) | Free-text notes from the coach/admin. |
| `created_at` | `timestamptz` | Auto-set. |

> **Unique constraint**: `asistencias_reserva_id_uk unique (reserva_id)` — only one attendance record per booking. Use upsert or check for existence before inserting.

---

## Expected Results

1. In the bookings panel for any training session opened by an admin or coach:
   - Each booking row shows an **attendance badge** (`AsistenciaStatusBadge`) indicating: `Sin registrar` / `Asistió` / `No asistió`.
   - An **action button** (e.g., pencil icon or "Verificar") is shown per row to open the attendance modal.
2. The `AsistenciaFormModal` allows:
   - Toggle for `asistio` (Yes / No).
   - Optional `observaciones` textarea.
   - "Save" button → inserts a new attendance record or updates an existing one.
   - "Delete" button (only if a record already exists) → removes the attendance record.
3. After any mutation (create/update/delete), the panel refreshes the attendance state for the relevant booking row without a full page reload.
4. Athletes logged into the portal **cannot** see attendance data in the bookings panel or query the `asistencias` table via the API.

---

## Database Migration

A new migration file must be created for the **RLS policies** of the `asistencias` table:

**File**: `supabase/migrations/20260312000100_asistencias_rls_policies.sql`

```sql
-- =============================================
-- Migration: RLS policies for public.asistencias
-- US-0024: Validate Training Attendance
-- =============================================

begin;

-- Grant DML permissions to authenticated role
grant select, insert, update, delete on table public.asistencias to authenticated;

-- -------------------------------------------------------
-- SELECT: only admins and coaches of the tenant can read.
-- Athletes are explicitly excluded.
-- -------------------------------------------------------
drop policy if exists asistencias_select_trainer_or_admin on public.asistencias;
create policy asistencias_select_trainer_or_admin on public.asistencias
  for select to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- -------------------------------------------------------
-- INSERT: only admins and coaches of the tenant.
-- validado_por must equal auth.uid().
-- -------------------------------------------------------
drop policy if exists asistencias_insert_trainer_or_admin on public.asistencias;
create policy asistencias_insert_trainer_or_admin on public.asistencias
  for insert to authenticated
  with check (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
    and validado_por = auth.uid()
  );

-- -------------------------------------------------------
-- UPDATE: only admins and coaches of the tenant.
-- -------------------------------------------------------
drop policy if exists asistencias_update_trainer_or_admin on public.asistencias;
create policy asistencias_update_trainer_or_admin on public.asistencias
  for update to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- -------------------------------------------------------
-- DELETE: only admins and coaches of the tenant.
-- -------------------------------------------------------
drop policy if exists asistencias_delete_trainer_or_admin on public.asistencias;
create policy asistencias_delete_trainer_or_admin on public.asistencias
  for delete to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

commit;
```

> **Note**: This migration reuses the helper function `get_trainer_or_admin_tenants_for_authenticated_user()` that was introduced in `20260302000200_reservas_rls_policies.sql`.

---

## Types

**File**: `src/types/portal/asistencias.types.ts` *(new)*

```ts
export type Asistencia = {
  id: string;
  tenant_id: string;
  reserva_id: string;
  validado_por: string | null;
  fecha_asistencia: string | null;
  asistio: boolean;
  observaciones: string | null;
  created_at: string;
};

export type AsistenciaFormValues = {
  asistio: boolean;
  observaciones: string;
};

export type UpsertAsistenciaInput = {
  tenant_id: string;
  reserva_id: string;
  validado_por: string;
  fecha_asistencia: string; // ISO string — now()
  asistio: boolean;
  observaciones: string | null;
};
```

---

## Service Layer

**File**: `src/services/supabase/portal/asistencias.service.ts` *(new)*

Implement the following functions using the Supabase browser client:

| Function | Description |
|---|---|
| `getAsistenciasByEntrenamiento(tenantId, entrenamientoId)` | Fetches all `asistencias` rows joined via `reservas` for a given training. Returns a map `{ [reserva_id]: Asistencia }` for O(1) lookup in the panel. |
| `upsertAsistencia(input: UpsertAsistenciaInput)` | Inserts or updates (on `reserva_id` conflict) an attendance record. Uses `.upsert()` with `onConflict: 'reserva_id'`. |
| `deleteAsistencia(tenantId, asistenciaId)` | Deletes an attendance record by `id`. |

All functions must validate that the operation is scoped to `tenant_id` to prevent cross-tenant access.

---

## Hooks

**File**: `src/hooks/portal/entrenamientos/reservas/useAsistencias.ts` *(new)*

```ts
type UseAsistenciasInput = {
  tenantId: string;
  entrenamientoId: string | null;
  isEnabled: boolean; // false for athletes — skip fetching entirely
};
```

Responsibilities:
- Calls `getAsistenciasByEntrenamiento` on mount/refresh.
- Exposes `asistenciaMap: Record<string, Asistencia>` keyed by `reserva_id`.
- Exposes `upsertAsistencia(input)` and `deleteAsistencia(id)` mutation handlers.
- Manages `loading`, `error` state.
- `isEnabled` must be `false` for athlete role — do not execute the query.

---

## Components

### 1. `AsistenciaFormModal.tsx` *(new)*

**File**: `src/components/portal/entrenamientos/reservas/AsistenciaFormModal.tsx`

A controlled modal (similar to `ReservaFormModal`) that handles both create and edit attendance:

**Props**:
```ts
type AsistenciaFormModalProps = {
  open: boolean;
  reservaId: string;
  atletaNombre: string; // Display name shown in the modal header
  existing: Asistencia | null; // Pre-filled if editing
  onSave: (values: AsistenciaFormValues) => Promise<void>;
  onDelete: () => Promise<void>; // Only available if existing !== null
  onClose: () => void;
  saving: boolean;
};
```

**Layout**:
- Modal header: "Verificar Asistencia — {atletaNombre}"
- Toggle / radio group for `asistio`: "Asistió" (true) / "No asistió" (false). Default: `true`.
- Textarea for `observaciones` (optional, max 500 chars).
- Footer: "Guardar" button (primary), "Eliminar registro" button (destructive, only if `existing !== null`), "Cancelar" link.
- Show a confirmation step before deleting.

### 2. `AsistenciaStatusBadge.tsx` *(new)*

**File**: `src/components/portal/entrenamientos/reservas/AsistenciaStatusBadge.tsx`

A small badge component that renders inline within a booking row:

| State | Display |
|---|---|
| No attendance record | Grey badge: `Sin registrar` |
| `asistio = true` | Green badge: `Asistió` |
| `asistio = false` | Red badge: `No asistió` |

### 3. `ReservasPanel.tsx` *(modify)*

**File**: `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`

Changes:
- Import and use `useAsistencias` hook, passing `isEnabled: isAdmin`.
- For each booking row rendered in the panel:
  - Append `<AsistenciaStatusBadge>` showing the current attendance state (looked up from `asistenciaMap[reserva.id]`).
  - Append a pencil/check icon button (visible only when `isAdmin === true`) to open `AsistenciaFormModal` for that booking.
- Mount `AsistenciaFormModal` once at the panel level, driven by a `selectedReservaForAsistencia` state variable.
- On `onSave`: call `upsertAsistencia` with `validado_por = currentUserId`, `fecha_asistencia = new Date().toISOString()`.
- On `onDelete`: call `deleteAsistencia`.
- After any mutation, call `asistenciasHook.refresh()` to re-fetch the map.

---

## Files to Create

| File | Type | Action |
|---|---|---|
| `supabase/migrations/20260312000100_asistencias_rls_policies.sql` | SQL migration | **Create** |
| `src/types/portal/asistencias.types.ts` | TypeScript types | **Create** |
| `src/services/supabase/portal/asistencias.service.ts` | Service | **Create** |
| `src/hooks/portal/entrenamientos/reservas/useAsistencias.ts` | Hook | **Create** |
| `src/components/portal/entrenamientos/reservas/AsistenciaFormModal.tsx` | Component | **Create** |
| `src/components/portal/entrenamientos/reservas/AsistenciaStatusBadge.tsx` | Component | **Create** |

## Files to Modify

| File | Change |
|---|---|
| `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Add attendance badge + action button per booking row; mount `AsistenciaFormModal`; integrate `useAsistencias` hook. |
| `src/components/portal/entrenamientos/reservas/index.ts` | Export `AsistenciaFormModal`, `AsistenciaStatusBadge`. |
| `src/services/supabase/portal/index.ts` | Export `asistencias.service.ts` functions if applicable. |
| `projectspec/03-project-structure.md` | Add `AsistenciaFormModal.tsx`, `AsistenciaStatusBadge.tsx`, `useAsistencias.ts`, `asistencias.service.ts`, and `asistencias.types.ts` to the respective sections. |

---

## Acceptance Criteria

- [ ] Migration `20260312000100_asistencias_rls_policies.sql` applies cleanly with `npx supabase db reset` and `npx supabase migration up`.
- [ ] An admin or coach can open the bookings panel for any training and see an attendance badge on each booking row.
- [ ] Clicking the verify button on a booking row opens `AsistenciaFormModal` pre-filled with the athlete's name and existing data (if any).
- [ ] Saving the form inserts a new `asistencias` row (or updates via upsert) with `asistio`, `observaciones`, `validado_por = currentUserId`, and `fecha_asistencia = now()`.
- [ ] Deleting from the modal removes the `asistencias` row. The badge reverts to `Sin registrar`.
- [ ] An athlete user cannot see attendance badges, action buttons, or trigger any `asistencias` query. The `useAsistencias` hook is not executed when `isEnabled = false`.
- [ ] Supabase RLS blocks any direct attempt by an `atleta` to `select`, `insert`, `update`, or `delete` rows from `asistencias`.
- [ ] No training management page changes are required — the feature is entirely within the booking panel context (`ReservasPanel`).

---

## Non-Functional Requirements

### Security
- RLS policies on `asistencias` must deny all access by athletes at the database level.
- `validado_por` must always be set to `auth.uid()` (enforced via `with check` in the INSERT policy and in the service layer).
- `tenant_id` is always passed and validated in every service call to prevent cross-tenant data leakage.

### Performance
- `getAsistenciasByEntrenamiento` should use a single query joining `reservas` on `entrenamiento_id` to avoid N+1 fetches.
- Add a DB index on `asistencias(reserva_id)` if not covered by the existing unique constraint (the unique constraint on `reserva_id` implicitly creates a unique index — no additional index needed).

### UX
- Loading state must be shown in the badge area while the attendance map is being fetched (e.g., skeleton or spinner).
- Mutations (save/delete) must disable the action button during processing to prevent double submission.
- Error messages must be displayed inside the modal if the upsert or delete fails.
