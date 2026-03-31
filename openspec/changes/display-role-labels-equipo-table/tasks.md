## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/display-role-labels-equipo-table`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop`

## 2. EquipoTable — Role Display Labels

- [x] 2.1 In `src/components/portal/gestion-equipo/EquipoTable.tsx`, add the `ROL_DISPLAY_LABELS` constant after imports:
  ```ts
  const ROL_DISPLAY_LABELS: Record<string, string> = {
    usuario: 'Atleta',
    administrador: 'Administrador',
    entrenador: 'Entrenador',
  };
  ```
- [x] 2.2 In the role `<select>` `<option>`, replace `{r.nombre}` with `{ROL_DISPLAY_LABELS[r.nombre] ?? r.nombre}`
- [x] 2.3 In the read-only text fallback, replace `{row.rol_nombre}` with `{ROL_DISPLAY_LABELS[row.rol_nombre] ?? row.rol_nombre}`

## 3. EquipoStatsCards — Label Update

- [x] 3.1 In `src/components/portal/gestion-equipo/EquipoStatsCards.tsx`, change the first entry in `ROW_2` from `label: 'Usuarios Activos'` to `label: 'Atletas Activos'`

## 4. Verification

- [x] 4.1 Navigate to `/gestion-equipo` and confirm the "Perfil" column shows "Atleta" for default-role members, "Administrador" and "Entrenador" for their respective roles
- [x] 4.2 Confirm the role `<select>` dropdown (admin view) displays mapped labels ("Atleta", "Administrador", "Entrenador")
- [x] 4.3 Confirm a role change via the dropdown still fires `onCambiarRol` correctly (role update persists)
- [x] 4.4 Confirm the stats card now displays "Atletas Activos" with the correct count

## 5. Commit and Pull Request

- [x] 5.1 Stage changes: `git add src/components/portal/gestion-equipo/EquipoTable.tsx src/components/portal/gestion-equipo/EquipoStatsCards.tsx`
- [x] 5.2 Create a commit with message: `feat(gestion-equipo): display role labels — show Atleta instead of usuario`
- [x] 5.3 Write pull request description:
  - **Summary**: Adds a `ROL_DISPLAY_LABELS` display-only map to `EquipoTable.tsx` that translates internal role identifiers (`usuario`, `administrador`, `entrenador`) to human-readable labels (`Atleta`, `Administrador`, `Entrenador`). Updates the "Usuarios Activos" stats card label to "Atletas Activos".
  - **Scope**: Presentation layer only — no DB, service, hook, type, or role guard changes.
  - **AC verified**: All 8 acceptance criteria from US-0053 checked.
