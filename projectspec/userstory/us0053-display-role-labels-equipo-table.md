# US-0053 — Display Role Labels in Team Table

## ID
US-0053

## Name
Display Human-Readable Role Labels in Team Management Table

## As a
Tenant administrator

## I Want
The "Perfil" column in the team management table (`/gestion-equipo`) to show "Atleta" instead of the raw database value "usuario", and the matching stats card to use the same label

## So That
The UI communicates roles in domain language ("Atleta") rather than internal system identifiers, making the table easier to read and more professional for administrators managing their team

---

## Description

### Current State
The `EquipoTable` component renders the `rol_nombre` field directly from the database (`public.roles.nombre`). The stored value for the default member role is `'usuario'`. As a result:
- The "Perfil" column shows the text **"usuario"** — both in the `<select>` dropdown (option labels use `r.nombre`) and in the read-only text fallback (`row.rol_nombre`).
- The stats card in `EquipoStatsCards` shows the label **"Usuarios Activos"** for the `usuariosActivos` counter.

No display label mapping exists anywhere in the codebase. The DB value `'usuario'` flows to the UI unchanged.

### Proposed Changes

**Option A — Display-only mapping (no DB or type changes)**

Add a `ROL_DISPLAY_LABELS` map in `EquipoTable.tsx` to translate raw DB role names to human-readable labels:

```ts
const ROL_DISPLAY_LABELS: Record<string, string> = {
  usuario: 'Atleta',
  administrador: 'Administrador',
  entrenador: 'Entrenador',
};
```

Apply this map in two places within `EquipoTable`:
1. **`<option>` text in the role `<select>` dropdown** — replace `{r.nombre}` with `{ROL_DISPLAY_LABELS[r.nombre] ?? r.nombre}`
2. **Read-only text fallback** — replace `{row.rol_nombre}` with `{ROL_DISPLAY_LABELS[row.rol_nombre] ?? row.rol_nombre}`

Update `EquipoStatsCards.tsx`:
- Change the `ROW_2` stat card label from `'Usuarios Activos'` to `'Atletas Activos'`

No changes to service layer, hooks, types, DB migrations, or role guards. The internal value `'usuario'` remains unchanged throughout the system.

---

## Database Changes

None. This is a presentation-layer-only change.

---

## API / Server Actions

None.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/gestion-equipo/EquipoTable.tsx` | Add `ROL_DISPLAY_LABELS` map; apply it to `<option>` labels in the role `<select>` and to the read-only `rol_nombre` fallback text |
| Component | `src/components/portal/gestion-equipo/EquipoStatsCards.tsx` | Change `ROW_2` stat card label `'Usuarios Activos'` → `'Atletas Activos'` |

---

## Acceptance Criteria

1. In the "Perfil" column, rows whose `rol_nombre` is `'usuario'` display the text **"Atleta"** (not "usuario").
2. Rows whose `rol_nombre` is `'administrador'` display **"Administrador"**.
3. Rows whose `rol_nombre` is `'entrenador'` display **"Entrenador"**.
4. When the role `<select>` dropdown is rendered (admin view), every option label uses the mapped display name (e.g., the option for `'usuario'` shows "Atleta").
5. When the role `<select>` is used to change a member's role, the correct `RolOption` is still passed to `onCambiarRol` — the underlying `id` and `nombre` values are **not** modified.
6. The stats card "Usuarios Activos" is renamed to **"Atletas Activos"**; the value displayed is unchanged.
7. If a future role is added to the DB whose `nombre` is not present in `ROL_DISPLAY_LABELS`, it falls back to the raw `nombre` string — no crash or blank label.
8. No role guards, cookies, services, hooks, or TypeScript types are modified.

---

## Implementation Steps

- [ ] In `src/components/portal/gestion-equipo/EquipoTable.tsx`:
  - Add `const ROL_DISPLAY_LABELS: Record<string, string> = { usuario: 'Atleta', administrador: 'Administrador', entrenador: 'Entrenador' }` near the top of the file (after imports)
  - In the `<option>` inside the role `<select>`, change `{r.nombre}` to `{ROL_DISPLAY_LABELS[r.nombre] ?? r.nombre}`
  - In the read-only fallback, change `{row.rol_nombre}` to `{ROL_DISPLAY_LABELS[row.rol_nombre] ?? row.rol_nombre}`
- [ ] In `src/components/portal/gestion-equipo/EquipoStatsCards.tsx`:
  - In the `ROW_2` array, change the first entry's `label` from `'Usuarios Activos'` to `'Atletas Activos'`
- [ ] Verify manually: navigate to `/gestion-equipo`, confirm "Perfil" column shows "Atleta" for default-role members, dropdown shows mapped labels, and stats card shows "Atletas Activos"
- [ ] Confirm role change action still works end-to-end (select a different role and verify `onCambiarRol` fires correctly)

---

## Non-Functional Requirements

- **Security**: No changes to authorization, RLS, or role-checking logic.
- **Performance**: No additional queries or computation — the map lookup is O(1).
- **Accessibility**: The `<select>` already has `aria-label="Cambiar rol"`. No additional ARIA changes required.
- **Error handling**: The `?? r.nombre` / `?? row.rol_nombre` fallback ensures unknown future roles degrade gracefully without errors.
