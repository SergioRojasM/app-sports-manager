# US-0045 — Add ID Issue Date and Birth Date Fields to User Profile

## ID
US-0045

## Name
Add `fecha_exp_identificacion` and `fecha_nacimiento` Fields to User Profile, Team Management, and Attendance Report

> `fecha_exp_identificacion` stores the **date the ID was issued** (fecha de expedición), not an expiry date.

## As a
Admin, Coach, or Athlete (depending on the context)

## I Want
To record and view each user's identification document issue date (`fecha_exp_identificacion`) and birth date (`fecha_nacimiento`) across all relevant views: the self-service profile editor, the admin team-member editor, the team table, and the attendance CSV export.

## So That
Organisations can keep complete, up-to-date member document information, record when each ID was issued, and export athlete demographics alongside attendance data.

---

## Description

### Current State

The `usuarios` table already has a `fecha_nacimiento date` column (added in the initial schema migration). However:

- `fecha_nacimiento` is **not exposed** in the `v_miembros_equipo` view, so admin team-member editors (`EditarPerfilMiembroModal`) cannot pre-fill or save it.
- `fecha_exp_identificacion` does **not exist** anywhere in the schema.
- Neither field appears in the `reservas_reporte_view` used for CSV exports.
- The `EquipoTable` shows `Tipo ID` and `N° Identificación` as separate columns but does not group them or show expiry/DOB.

### Proposed Changes

#### 1. Database

- Add column `fecha_exp_identificacion date` to `public.usuarios`.
- Recreate `v_miembros_equipo` view to include `fecha_nacimiento` and `fecha_exp_identificacion`.
- Recreate `reservas_reporte_view` to include `a.fecha_nacimiento` and `a.fecha_exp_identificacion` for the athlete.

#### 2. Types (`src/types/portal/`)

- `perfil.types.ts`: Add `fecha_exp_identificacion: string | null` to `PerfilUsuario`; add `fecha_exp_identificacion: string` to `PerfilFormValues`.
- `equipo.types.ts`: Add `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` to `MiembroRow`; add `fecha_exp_identificacion: string | null` to `EditarPerfilMiembroInput`.
- `reservas.types.ts`: Add `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` to `ReservaReportRow`.

#### 3. Services (`src/services/supabase/portal/`)

- `perfil.service.ts` (`getPerfil`): add `fecha_exp_identificacion` to the `select()` column list.
- `equipo.service.ts` (`RawMiembroRow` type and `mapRawRow`): add `fecha_nacimiento` and `fecha_exp_identificacion`.

#### 4. Hooks (`src/hooks/portal/perfil/`)

- `usePerfil.ts` (`toFormValues`, `EMPTY_FORM`): add `fecha_exp_identificacion` string field.

#### 5. UI — Profile edit (`src/components/portal/perfil/`)

- `PerfilPersonalForm.tsx`: Add a new date input for `fecha_exp_identificacion` (label: **"Fecha Expedición ID"**, icon: `calendar_today`), placed immediately after the `N° Identificación` field.

> **Note**: `fecha_nacimiento` already has a working input in this form. No change needed there.

#### 6. UI — Team management (`src/components/portal/gestion-equipo/`)

- `EquipoTable.tsx`:
  - Replace the separate `Tipo ID` and `N° Identificación` columns with a single **"Identificación"** column that renders: `{tipo} · {numero}` with a secondary line showing `Exp: {fecha_exp_identificacion}` (em-dash when null).
  - Add a **"F. Nacimiento"** column after `RH`, showing the ISO date or `—`.
- `EditarPerfilMiembroModal.tsx`:
  - Pre-fill `fechaNacimiento` from `miembro.fecha_nacimiento` (currently always reset to `''`).
  - Add `fechaExpIdentificacion` state variable.
  - Pre-fill `fechaExpIdentificacion` from `miembro.fecha_exp_identificacion`.
  - Add a `<input type="date">` field for **Fecha expedición ID** inside the `Document` fieldset, below the `Tipo ID` / `N° Identificación` row.
  - Pass `fecha_exp_identificacion` in the `onSave` call payload.

#### 7. UI — Attendance CSV export (`src/components/portal/entrenamientos/reservas/`)

- `ReservasPanel.tsx`:
  - Add `'fecha_nacimiento'` and `'fecha_exp_identificacion'` to `csvHeaders`.
  - Add `fecha_nacimiento` and `fecha_exp_identificacion` to the mapped row object (format dates with the existing `formatDate` helper — these are date-only values, so no time component).

---

## Database Changes

### Migration 1 — Add `fecha_exp_identificacion` column

**File**: `supabase/migrations/20260328000100_add_fecha_exp_identificacion_usuarios.sql`

```sql
-- Add identification expiry date to usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS fecha_exp_identificacion date;
```

No check constraint is needed. The field is optional.

### Migration 2 — Update `v_miembros_equipo` view

**File**: `supabase/migrations/20260328000200_v_miembros_equipo_add_dates.sql`

```sql
CREATE OR REPLACE VIEW public.v_miembros_equipo AS
SELECT
  mt.id,
  mt.tenant_id,
  mt.usuario_id,
  mt.rol_id,
  mt.estado,
  u.nombre,
  u.apellido,
  u.tipo_identificacion,
  u.numero_identificacion,
  u.fecha_exp_identificacion,
  u.fecha_nacimiento,
  u.telefono,
  u.email,
  u.foto_url,
  u.rh,
  r.nombre AS rol_nombre,
  COALESCE(faltas.cnt, 0)::int AS inasistencias_recientes
FROM public.miembros_tenant mt
JOIN public.usuarios u ON u.id = mt.usuario_id
JOIN public.roles r ON r.id = mt.rol_id
LEFT JOIN LATERAL (
  SELECT count(*)::int AS cnt
  FROM public.asistencias a
  JOIN public.reservas rv ON rv.id = a.reserva_id
  WHERE rv.atleta_id = mt.usuario_id
    AND rv.tenant_id = mt.tenant_id
    AND a.asistio = false
    AND a.created_at >= now() - interval '30 days'
) faltas ON true;

GRANT SELECT ON public.v_miembros_equipo TO authenticated;
```

> RLS on `miembros_tenant` and `usuarios` still applies. No new policies required — existing `miembros_tenant_select_authenticated` and `usuarios_select_authenticated` policies cover read access.

### Migration 3 — Update `reservas_reporte_view`

**File**: `supabase/migrations/20260328000300_reservas_reporte_view_add_dates.sql`

```sql
CREATE OR REPLACE VIEW public.reservas_reporte_view AS
SELECT
  r.id                          AS reserva_id,
  r.tenant_id,
  r.entrenamiento_id,
  r.estado                      AS reserva_estado,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.notas                       AS notas_reserva,
  r.created_at,
  -- Athlete
  a.nombre                      AS atleta_nombre,
  a.apellido                    AS atleta_apellido,
  a.email                       AS atleta_email,
  a.telefono                    AS atleta_telefono,
  a.fecha_nacimiento,
  a.tipo_identificacion,
  a.numero_identificacion,
  a.fecha_exp_identificacion,
  -- Training
  e.nombre                      AS entrenamiento_nombre,
  e.fecha_hora                  AS entrenamiento_fecha,
  -- Discipline & Scenario
  d.nombre                      AS disciplina,
  s.nombre                      AS escenario,
  -- Category level
  nd.nombre                     AS nivel_disciplina,
  -- Attendance
  asi.asistio,
  asi.fecha_asistencia,
  asi.observaciones              AS observaciones_asistencia,
  -- Validator
  v.email                       AS validado_por_email
FROM public.reservas r
  INNER JOIN public.usuarios          a   ON a.id  = r.atleta_id
  INNER JOIN public.entrenamientos    e   ON e.id  = r.entrenamiento_id
  LEFT  JOIN public.disciplinas       d   ON d.id  = e.disciplina_id
  LEFT  JOIN public.escenarios        s   ON s.id  = e.escenario_id
  LEFT  JOIN public.entrenamiento_categorias ec ON ec.id = r.entrenamiento_categoria_id
  LEFT  JOIN public.nivel_disciplina  nd  ON nd.id = ec.nivel_id
  LEFT  JOIN public.asistencias       asi ON asi.reserva_id = r.id
  LEFT  JOIN public.usuarios          v   ON v.id  = asi.validado_por;

GRANT SELECT ON public.reservas_reporte_view TO authenticated;
```

---

## API / Server Actions

No new server actions or API routes are required. All mutations flow through existing service functions:

| Function | File | Change |
|----------|------|--------|
| `getPerfil` | `src/services/supabase/portal/perfil.service.ts` | Add `fecha_exp_identificacion` to `select()` string |
| `updatePerfil` | `src/services/supabase/portal/perfil.service.ts` | No change — accepts `Partial<Omit<PerfilUsuario, 'id'\|'email'>>`, so the new field passes through automatically once the type is updated |
| `getEquipoMembers` (v_miembros_equipo select) | `src/services/supabase/portal/equipo.service.ts` | Add `fecha_nacimiento`, `fecha_exp_identificacion` to `RawMiembroRow` type and `mapRawRow` |
| `editarPerfilMiembro` | `src/services/supabase/portal/equipo.service.ts` | No change — already accepts `EditarPerfilMiembroInput` as a partial update patch; adding the field to the input type is sufficient |
| `getReservasReport` | `src/services/supabase/portal/reservas.service.ts` | No change — already does `select('*')` from `reservas_reporte_view`; the new columns will be returned automatically once the view is updated and `ReservaReportRow` includes them |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260328000100_add_fecha_exp_identificacion_usuarios.sql` | Add `fecha_exp_identificacion date` column to `usuarios` |
| Migration | `supabase/migrations/20260328000200_v_miembros_equipo_add_dates.sql` | Recreate view with `fecha_nacimiento` + `fecha_exp_identificacion` |
| Migration | `supabase/migrations/20260328000300_reservas_reporte_view_add_dates.sql` | Recreate view with athlete `fecha_nacimiento` + `fecha_exp_identificacion` |
| Type | `src/types/portal/perfil.types.ts` | Add `fecha_exp_identificacion` to `PerfilUsuario` and `PerfilFormValues` |
| Type | `src/types/portal/equipo.types.ts` | Add `fecha_nacimiento`, `fecha_exp_identificacion` to `MiembroRow`; add `fecha_exp_identificacion` to `EditarPerfilMiembroInput` |
| Type | `src/types/portal/reservas.types.ts` | Add `fecha_nacimiento`, `fecha_exp_identificacion` to `ReservaReportRow` |
| Hook | `src/hooks/portal/perfil/usePerfil.ts` | Add `fecha_exp_identificacion` to `toFormValues` and `EMPTY_FORM` |
| Service | `src/services/supabase/portal/perfil.service.ts` | Add `fecha_exp_identificacion` to `select()` in `getPerfil` |
| Service | `src/services/supabase/portal/equipo.service.ts` | Add `fecha_nacimiento`, `fecha_exp_identificacion` to `RawMiembroRow` and `mapRawRow` |
| Component | `src/components/portal/perfil/PerfilPersonalForm.tsx` | Add `fecha_exp_identificacion` date input after N° Identificación |
| Component | `src/components/portal/gestion-equipo/EquipoTable.tsx` | Merge Tipo ID + N° ID + Fecha Exp into one "Identificación" column; add "F. Nacimiento" column |
| Component | `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx` | Pre-fill `fechaNacimiento`; add `fechaExpIdentificacion` state + field + save payload |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Add `fecha_nacimiento` and `fecha_exp_identificacion` to CSV headers and mapped rows |

---

## Acceptance Criteria

1. A new `fecha_exp_identificacion date` column exists on the `public.usuarios` table; it is nullable and has no check constraint.
2. `v_miembros_equipo` exposes `fecha_nacimiento` and `fecha_exp_identificacion`; authenticated users can read both via the existing RLS policies.
3. `reservas_reporte_view` exposes `fecha_nacimiento` (from the athlete join) and `fecha_exp_identificacion`; authenticated users who can already query the view can read the new columns.
4. On the **Portal → Perfil** page, an authenticated user can enter and save their `fecha_exp_identificacion`; the value persists after a page refresh.
5. On the **Portal → Perfil** page, the existing `fecha_nacimiento` input continues to work correctly (no regression).
6. On the **Gestion Equipo** admin page, the team table shows a single **"Identificación"** column displaying `{TipoID} · {N° ID}` with the issue date below (`Exp: {fecha_exp_identificacion}`, `—` when null).
7. On the **Gestion Equipo** admin page, the team table shows a **"F. Nacimiento"** column with the ISO date (YYYY-MM-DD) or `—`.
8. Opening **Editar perfil** for a team member pre-fills `fecha_nacimiento` with the value stored in the DB (if any).
9. Opening **Editar perfil** for a team member shows a **"Fecha expedición ID"** date input; the admin can set/clear it and save successfully; the value persists.
10. Clicking **Descargar CSV** on the Reservas panel produces a file that includes columns `fecha_nacimiento` and `fecha_exp_identificacion` for each row (empty string when null).
11. No regressions in existing perfil, equipo, or reservas functionality.

---

## Implementation Steps

- [ ] Create and apply migration 1: Add `fecha_exp_identificacion date` column to `usuarios`
- [ ] Create and apply migration 2: Recreate `v_miembros_equipo` with the two new columns
- [ ] Create and apply migration 3: Recreate `reservas_reporte_view` with `fecha_nacimiento` + `fecha_exp_identificacion`
- [ ] Update `src/types/portal/perfil.types.ts` — add `fecha_exp_identificacion` to `PerfilUsuario` and `PerfilFormValues`
- [ ] Update `src/types/portal/equipo.types.ts` — add fields to `MiembroRow` and `EditarPerfilMiembroInput`
- [ ] Update `src/types/portal/reservas.types.ts` — add fields to `ReservaReportRow`
- [ ] Update `src/hooks/portal/perfil/usePerfil.ts` — add field to `toFormValues` and `EMPTY_FORM`
- [ ] Update `src/services/supabase/portal/perfil.service.ts` — extend select string in `getPerfil`
- [ ] Update `src/services/supabase/portal/equipo.service.ts` — extend `RawMiembroRow` and `mapRawRow`
- [ ] Update `src/components/portal/perfil/PerfilPersonalForm.tsx` — add `fecha_exp_identificacion` (Fecha Expedición ID) input
- [ ] Update `src/components/portal/gestion-equipo/EquipoTable.tsx` — merge ID columns; add DOB column
- [ ] Update `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx` — pre-fill dates; add exp field
- [ ] Update `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` — extend CSV headers and mapped rows
- [ ] Run `npx supabase db reset` (or apply migrations locally) and verify columns exist
- [ ] Test manually: profile save, team table display, team member edit, CSV export
- [ ] Verify no TypeScript errors (`npx tsc --noEmit`)

---

## Non-Functional Requirements

- **Security**: No new RLS policies are required. The `usuarios` table already has `usuarios_select_authenticated` (all authenticated users can read) and `usuarios_update_own` (users can only update their own row). Admins update member rows via the existing `editarPerfilMiembro` service function which calls `supabase.from('usuarios').update(...)` with the authenticated admin's session — existing admin RLS policies govern this. No new elevated permissions are introduced.
- **Performance**: Both new columns are `date` scalars. No index is needed; they are not used as filter predicates. The view recreation does not change query plans.
- **Accessibility**: New date inputs must have `<label>` elements with matching `htmlFor`/`id` pairs. Use the same `inputClass` / form field pattern already established in `PerfilPersonalForm`. In `EditarPerfilMiembroModal`, follow the same `<label>` + `<input type="date">` pattern used for the existing `fecha_nacimiento` field.
- **Error handling**: Validation errors in the perfil form surface via `fieldErrors` (existing mechanism). No additional validation constraints are required for `fecha_exp_identificacion` beyond it being a valid date (the browser `date` input enforces this). If the Supabase update fails, the existing error toast/message mechanism handles it.
