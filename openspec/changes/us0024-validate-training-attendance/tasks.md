## 1. Branch Setup

- [x] 1.1 Create a new feature branch: `git checkout -b feat/us0024-validate-training-attendance`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260312000100_asistencias_rls_policies.sql` with the four RLS policies for `public.asistencias` (SELECT, INSERT, UPDATE, DELETE) using `get_trainer_or_admin_tenants_for_authenticated_user()`, plus the `grant` statement for the `authenticated` role
- [x] 2.2 Apply the migration locally: `npx supabase db reset` (or `npx supabase migration up`) and verify no errors

## 3. Types

- [x] 3.1 Create `src/types/portal/asistencias.types.ts` with `Asistencia`, `AsistenciaFormValues`, and `UpsertAsistenciaInput` types as specified in the user story

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/asistencias.service.ts` with:
  - `getAsistenciasByEntrenamiento(tenantId, entrenamientoId)` — joins `asistencias` through `reservas`, returns `Record<string, Asistencia>` keyed by `reserva_id`
  - `upsertAsistencia(input: UpsertAsistenciaInput)` — uses `.upsert()` with `onConflict: 'reserva_id'`, scoped by `tenant_id`
  - `deleteAsistencia(tenantId, asistenciaId)` — hard-delete by `id`, scoped by `tenant_id`
- [x] 4.2 Update `src/services/supabase/portal/index.ts` — export functions or the service object from `asistencias.service.ts`

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/entrenamientos/reservas/useAsistencias.ts` with:
  - Input: `{ tenantId, entrenamientoId, isEnabled }` — when `isEnabled` is `false`, return empty map and no-ops without querying
  - State: `asistenciaMap: Record<string, Asistencia>`, `isLoading`, `error`
  - Actions: `upsertAsistencia(values, reservaId)` — enriches with `validado_por = currentUserId`, `fecha_asistencia = new Date().toISOString()` before calling service
  - Actions: `deleteAsistencia(asistenciaId)` — calls service delete
  - Method: `refresh()` — re-fetches the map

## 6. Components

- [x] 6.1 Create `src/components/portal/entrenamientos/reservas/AsistenciaStatusBadge.tsx` — renders:
  - No entry in map → grey badge "Sin registrar"
  - `asistio = true` → green badge "Asistió"
  - `asistio = false` → red badge "No asistió"
- [x] 6.2 Create `src/components/portal/entrenamientos/reservas/AsistenciaFormModal.tsx` with props `{ open, reservaId, atletaNombre, existing, onSave, onDelete, onClose, saving }`:
  - Header: "Verificar Asistencia — {atletaNombre}"
  - Toggle/radio group for `asistio`: "Asistió" (default `true`) / "No asistió"
  - Optional `observaciones` textarea (max 500 chars)
  - Footer: "Guardar" (primary), "Eliminar registro" (destructive, only when `existing !== null` with inline confirmation step), "Cancelar" link
- [x] 6.3 Update `src/components/portal/entrenamientos/reservas/index.ts` — add exports for `AsistenciaFormModal` and `AsistenciaStatusBadge`

## 7. ReservasPanel Integration

- [x] 7.1 Modify `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`:
  - Import `useAsistencias`, `AsistenciaStatusBadge`, `AsistenciaFormModal`
  - Add `selectedReservaForAsistencia: ReservaView | null` state variable
  - Call `useAsistencias({ tenantId, entrenamientoId: instance?.id ?? null, isEnabled: isAdmin })`
  - On each booking row: append `<AsistenciaStatusBadge>` (from `asistenciaMap[reserva.id]`) and an action button (`isAdmin` only) that sets `selectedReservaForAsistencia`
  - Mount `<AsistenciaFormModal>` once at panel level driven by `selectedReservaForAsistencia`
  - `onSave`: call `asistenciasHook.upsertAsistencia(values, reserva.id)` then `asistenciasHook.refresh()`
  - `onDelete`: call `asistenciasHook.deleteAsistencia(asistencia.id)` then `asistenciasHook.refresh()`
  - `onClose`: clear `selectedReservaForAsistencia`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` — add `AsistenciaFormModal.tsx`, `AsistenciaStatusBadge.tsx` to the `reservas/` component slice, `useAsistencias.ts` to the hooks section, `asistencias.service.ts` to the services section, and `asistencias.types.ts` to the types section

## 9. Commit & Pull Request

- [x] 9.1 Stage all changes and create a commit with message:
  ```
  feat(us0024): validate training attendance

  - Add RLS policies migration for asistencias table
  - Add Asistencia types, service, and useAsistencias hook
  - Add AsistenciaStatusBadge and AsistenciaFormModal components
  - Integrate attendance recording into ReservasPanel (admin/coach only)
  - Athletes excluded via RLS and isEnabled guard
  ```
- [x] 9.2 Push branch and open a Pull Request to `develop` with description:
  ```
  ## Summary
  Implements US-0024: Training Attendance Verification.

  Admins and coaches can now record, edit, and delete attendance per booking
  directly from the ReservasPanel slide-over. Athletes cannot view or
  manipulate attendance data (enforced by RLS + isEnabled guard in useAsistencias).

  ## Changes
  - Migration: RLS policies for `public.asistencias`
  - New: `asistencias.types.ts`, `asistencias.service.ts`, `useAsistencias.ts`
  - New: `AsistenciaStatusBadge`, `AsistenciaFormModal` components
  - Modified: `ReservasPanel` — attendance badge + action button per booking row

  ## Testing
  - Open bookings panel as admin/coach → badges show "Sin registrar"
  - Record attendance → badge updates to "Asistió" or "No asistió"
  - Edit existing attendance → values pre-filled, save updates record
  - Delete attendance → badge reverts to "Sin registrar"
  - Log in as athlete → no attendance badges or action buttons visible
  ```
