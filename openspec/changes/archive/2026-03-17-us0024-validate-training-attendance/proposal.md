## Why

The `asistencias` table is already present in the database but has no UI or service layer — bookings and attendance are treated as the same concept, leaving no way to distinguish a registered booking from an actual attendance event. Administrators and coaches need to record, edit, and delete per-athlete attendance for each training session, with role-based access control so that athletes cannot read or manipulate attendance data.

## What Changes

- **New RLS policies** for `public.asistencias`: only `administrador` and `entrenador` roles can SELECT, INSERT, UPDATE, or DELETE attendance rows; `atleta` role is explicitly excluded.
- **New types** for the `asistencias` domain (`Asistencia`, `AsistenciaFormValues`, `UpsertAsistenciaInput`).
- **New service** (`asistencias.service.ts`) with `getAsistenciasByEntrenamiento`, `upsertAsistencia`, and `deleteAsistencia` functions, all scoped by `tenant_id`.
- **New hook** (`useAsistencias`) that fetches the attendance map for a given training, exposes mutation handlers, and short-circuits to a no-op for the `atleta` role.
- **New component** `AsistenciaStatusBadge` — inline badge on each booking row showing `Sin registrar` / `Asistió` / `No asistió`.
- **New component** `AsistenciaFormModal` — modal for create/edit/delete of a single attendance record, restricted to admins and coaches.
- **Modified component** `ReservasPanel` — integrates `useAsistencias`, renders `AsistenciaStatusBadge` per booking row, and mounts `AsistenciaFormModal`.

## Capabilities

### New Capabilities

- `training-attendance`: Full UI and service layer for recording, editing, and deleting athlete attendance per training booking, including RLS enforcement and role-gated display in the bookings panel.

### Modified Capabilities

- `training-booking`: The `ReservasPanel` component gains attendance state display and admin/coach action controls. No booking _requirements_ change, but the panel's rendered output and data dependencies expand.

## Impact

- **Database**: New migration `20260312000100_asistencias_rls_policies.sql` adds RLS policies to `public.asistencias`. No schema changes (table already exists). Reuses helper function `get_trainer_or_admin_tenants_for_authenticated_user()` from `20260302000200_reservas_rls_policies.sql`.
- **Types**: New file `src/types/portal/asistencias.types.ts`.
- **Services**: New file `src/services/supabase/portal/asistencias.service.ts`; update barrel `src/services/supabase/portal/index.ts`.
- **Hooks**: New file `src/hooks/portal/entrenamientos/reservas/useAsistencias.ts`.
- **Components**: New `AsistenciaFormModal.tsx` and `AsistenciaStatusBadge.tsx` under `src/components/portal/entrenamientos/reservas/`; modify `ReservasPanel.tsx` in the same slice; update barrel `src/components/portal/entrenamientos/reservas/index.ts`.
- **Docs**: Update `projectspec/03-project-structure.md` to reflect new files.
- **No breaking changes** to existing routes, APIs, or booking workflows.

## Non-goals

- Athletes will **not** gain any read or write access to attendance data — not in this change, not via a future toggle.
- This change does **not** introduce attendance reporting, export, or analytics features.
- No changes to the `asistencias` table schema — the existing structure from `20260221000100_migracion_inicial_bd.sql` is used as-is.
- No email or push notifications on attendance validation.
- No bulk attendance recording (e.g., "mark all as attended") — records are created one at a time per booking.
