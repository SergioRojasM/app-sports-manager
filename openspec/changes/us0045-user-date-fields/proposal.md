## Why

The `usuarios` table stores member identity data (ID type, number, blood type, birth date) but is missing the **ID issue date** (`fecha_exp_identificacion`), and `fecha_nacimiento` is already in the DB yet remains unexposed in the team-management view and the attendance CSV export. Organisations need complete document records for compliance and reporting purposes.

## What Changes

- Add `fecha_exp_identificacion date` column to `public.usuarios` (nullable, no constraint).
- Expose `fecha_nacimiento` and `fecha_exp_identificacion` in the `v_miembros_equipo` view.
- Expose `fecha_nacimiento` and `fecha_exp_identificacion` in the `reservas_reporte_view`.
- Add `fecha_exp_identificacion` input to the self-service **Perfil** edit form (`PerfilPersonalForm`).
- Pre-fill `fecha_nacimiento` and add `fecha_exp_identificacion` input in the admin **Editar perfil** modal (`EditarPerfilMiembroModal`).
- Merge `Tipo ID` + `N° Identificación` into a grouped **Identificación** column in `EquipoTable`; add a **F. Nacimiento** column.
- Add `fecha_nacimiento` and `fecha_exp_identificacion` columns to the attendance CSV export (`ReservasPanel`).

## Capabilities

### New Capabilities

- `user-date-fields`: Introduces the `fecha_exp_identificacion` (ID issue date) field to the database, user profile editor, admin team-member editor, team table display, and attendance CSV export. Also surfaces the existing `fecha_nacimiento` field in the team-management and CSV contexts where it was previously unused.

### Modified Capabilities

- `user-profile-management`: The `PerfilPersonalForm` gains a new `fecha_exp_identificacion` date field; `PerfilUsuario`, `PerfilFormValues` types and `usePerfil` hook are extended.
- `team-management`: `EquipoTable` column layout changes (ID columns merged; DOB column added); `EditarPerfilMiembroModal` pre-fills birth date and adds issue-date field; `MiembroRow`, `EditarPerfilMiembroInput`, `RawMiembroRow` types extended.
- `bookings-csv-export`: `reservas_reporte_view` gains two new columns; `ReservaReportRow` type and `ReservasPanel` CSV mapping are extended.

## Impact

- **Database**: 1 new column (`usuarios`), 2 recreated views (`v_miembros_equipo`, `reservas_reporte_view`).
- **Types**: `src/types/portal/perfil.types.ts`, `src/types/portal/equipo.types.ts`, `src/types/portal/reservas.types.ts`.
- **Services**: `src/services/supabase/portal/perfil.service.ts` (select string), `src/services/supabase/portal/equipo.service.ts` (raw type + mapper).
- **Hooks**: `src/hooks/portal/perfil/usePerfil.ts` (form initialisation).
- **Components**: `src/components/portal/perfil/PerfilPersonalForm.tsx`, `src/components/portal/gestion-equipo/EquipoTable.tsx`, `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx`, `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`.
- **No new npm dependencies** required.
- **No breaking changes** to existing public interfaces — all additions are additive and nullable.
