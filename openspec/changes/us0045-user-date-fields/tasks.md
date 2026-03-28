## 1. Branch Setup

- [x] 1.1 Create a new git branch: `git checkout -b feat/us0045-user-date-fields`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop`: `git branch --show-current`

## 2. Database Migrations

- [x] 2.1 Create `supabase/migrations/20260328000100_add_fecha_exp_identificacion_usuarios.sql` — add `fecha_exp_identificacion date` nullable column to `public.usuarios`
- [x] 2.2 Create `supabase/migrations/20260328000200_v_miembros_equipo_add_dates.sql` — recreate `v_miembros_equipo` view including `fecha_nacimiento` and `fecha_exp_identificacion` columns; re-grant `SELECT` to `authenticated`
- [x] 2.3 Create `supabase/migrations/20260328000300_reservas_reporte_view_add_dates.sql` — recreate `reservas_reporte_view` including `a.fecha_nacimiento` and `a.fecha_exp_identificacion` for the athlete join; re-grant `SELECT` to `authenticated`
- [x] 2.4 Apply migrations locally: `npx supabase db reset` (or push each file)
- [x] 2.5 Verify new column exists in `usuarios` table and both views return the new columns

## 3. Types

- [x] 3.1 `src/types/portal/perfil.types.ts` — add `fecha_exp_identificacion: string | null` to `PerfilUsuario`; add `fecha_exp_identificacion: string` to `PerfilFormValues`; add `fecha_exp_identificacion` to `PerfilFormField` (derived automatically from `keyof PerfilFormValues`)
- [x] 3.2 `src/types/portal/equipo.types.ts` — add `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` to `MiembroRow`; add `fecha_exp_identificacion?: string | null` to `EditarPerfilMiembroInput`
- [x] 3.3 `src/types/portal/reservas.types.ts` — add `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` to `ReservaReportRow`

## 4. Services

- [x] 4.1 `src/services/supabase/portal/perfil.service.ts` (`getPerfil`) — add `fecha_exp_identificacion` to the `select()` column string
- [x] 4.2 `src/services/supabase/portal/equipo.service.ts` — add `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` to the `RawMiembroRow` type; propagate both fields in `mapRawRow`

## 5. Hook

- [x] 5.1 `src/hooks/portal/perfil/usePerfil.ts` — add `fecha_exp_identificacion: usuario.fecha_exp_identificacion ?? ''` to `toFormValues`; add `fecha_exp_identificacion: ''` to `EMPTY_FORM`

## 6. Components

- [x] 6.1 `src/components/portal/perfil/PerfilPersonalForm.tsx` — add a `<FormField>` for `fecha_exp_identificacion` with label "Fecha Expedición ID", icon `calendar_today`, and `<input type="date">`, placed immediately after the N° Identificación field
- [x] 6.2 `src/components/portal/gestion-equipo/EquipoTable.tsx` — replace the separate `Tipo ID` and `N° Identificación` headers with a single **"Identificación"** `<th>`; update the cell to render tipo · número on one line and "Exp: {fecha_exp_identificacion}" (or `—`) below; add a **"F. Nacimiento"** `<th>` after RH and render `fecha_nacimiento` (YYYY-MM-DD) or `—`
- [x] 6.3 `src/components/portal/gestion-equipo/EditarPerfilMiembroModal.tsx` — add `fechaExpIdentificacion` state; pre-fill `fechaNacimiento` from `miembro.fecha_nacimiento`; pre-fill `fechaExpIdentificacion` from `miembro.fecha_exp_identificacion`; add `<input type="date">` labelled "Fecha expedición ID" in the Document fieldset below the N° Identificación row; pass `fecha_exp_identificacion: fechaExpIdentificacion || null` in the `onSave` payload
- [x] 6.4 `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` — insert `'fecha_nacimiento'` and `'fecha_exp_identificacion'` into `csvHeaders` (after `atleta_telefono` and after `numero_identificacion` respectively); add `fecha_nacimiento: r.fecha_nacimiento ?? ''` and `fecha_exp_identificacion: r.fecha_exp_identificacion ?? ''` to the mapped row object

## 7. Validation

- [x] 7.1 Run `npx tsc --noEmit` and confirm zero TypeScript errors
- [ ] 7.2 Test **Perfil** page: save a `fecha_exp_identificacion` value, reload, verify it persists
- [ ] 7.3 Test **Gestion Equipo** table: confirm Identificación column shows grouped ID + exp date; confirm F. Nacimiento column shows birth date or `—`
- [ ] 7.4 Test **Editar perfil** modal: open for a member with existing dates, verify pre-fill; set new dates, save, reopen and verify persistence
- [ ] 7.5 Test **CSV export**: trigger download from ReservasPanel, open in Excel, verify `fecha_nacimiento` and `fecha_exp_identificacion` columns appear in the correct position

## 8. Documentation

- [ ] 8.1 Update `projectspec/03-project-structure.md` — in the `v_miembros_equipo` migration note and `reservas_reporte_view` descriptions, mention the new columns; in the `EquipoTable` component description update the column list

## 9. Commit and Pull Request

- [ ] 9.1 Stage all changes: `git add -A`
- [ ] 9.2 Create commit: `git commit -m "feat(us0045): add fecha_exp_identificacion and fecha_nacimiento to profile, team, and CSV export"`
- [ ] 9.3 Push branch: `git push origin feat/us0045-user-date-fields`
- [ ] 9.4 Open a Pull Request with title: `feat: US-0045 — Add ID issue date and birth date fields` and description summarising: migrations (3 files), types (3 files), services (2 files), hook (1 file), components (4 files); reference US-0045 acceptance criteria
