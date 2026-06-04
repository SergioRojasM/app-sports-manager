# US-0058 — Admin Create Booking on Behalf of Athlete

## ID
US-0058

## Name
Admin Create Booking on Behalf of Athlete with Searchable Athlete Picker

## As a
Tenant administrator (administrador)

## I Want
To create a booking for any athlete in the team directly from the bookings panel in the training management page, with a searchable dropdown that lets me find the athlete by name or identification number (cédula).

## So That
I can register an athlete's spot in a training session without requiring them to book it themselves, which is especially useful for walk-ins, telephone bookings, or bulk registration.

---

## Description

### Current State

The `ReservasPanel` in `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` already shows a **"Nueva reserva"** button for admin and entrenador roles. Clicking it opens `ReservaFormModal` with `showAtletaPicker={isAdmin}`, which renders a plain `<select>` HTML element populated with team members (loaded from `miembros_tenant` joined to `usuarios` via `activo: true` filter).

**Gaps:**
1. The existing athlete picker is a non-searchable `<select>` element. For teams with many members, finding an athlete requires scrolling through the full list.
2. The `numero_identificacion` field (cédula) is **not included** in the fetch query, so admins cannot filter by ID number.
3. The `atleta_id` validation error is only shown when the admin submits without selecting an athlete — there is no inline search feedback.

### Proposed Changes

#### 1. `ReservaFormModal.tsx` — Replace plain `<select>` with an inline searchable combobox

Replace the `<select id="reserva-atleta">` block (active when `showAtletaPicker && mode === 'create'`) with an accessible combobox pattern:

- A controlled text `<input>` that accepts free text (search term).
- A dropdown list (`<ul>`) that appears below the input when focused/non-empty, filtered client-side.
- Filter logic: matches if the search term appears in the athlete's full name (case-insensitive) **or** in their `numero_identificacion`.
- Each list item displays: `{nombre} {apellido}` on the primary line and `{tipo_identificacion}: {numero_identificacion}` as secondary text (shown only when `numero_identificacion` is not null).
- Selecting a list item sets `atleta_id` on the form and fills the search input with the athlete's display name (closing the dropdown).
- Clearing the search input resets `atleta_id` to `''`.
- The dropdown closes on outside click (via `onBlur` with a short delay to allow item click to register).
- Empty state: shows "Sin resultados" when no athletes match.
- Loading state: input is disabled and shows placeholder "Cargando atletas…".
- Keyboard accessibility: `↑` / `↓` navigate, `Enter` selects, `Escape` closes.

#### 2. `ReservaFormModal.tsx` — Fetch `numero_identificacion` in the athlete data load

Update the Supabase query inside the `useEffect` that loads `atletaOptions` to include `numero_identificacion` and `tipo_identificacion` from `usuarios`.

Change the `select` to:
```sql
usuario_id,
usuarios!miembros_tenant_usuario_id_fkey (
  nombre,
  apellido,
  email,
  numero_identificacion,
  tipo_identificacion
)
```

Add `numero_identificacion` and `tipo_identificacion` to the `AtletaOption` type inside the component:
```ts
type AtletaOption = {
  id: string;
  label: string;           // "{nombre} {apellido}" or email
  identificacion: string;  // "{tipo}: {numero}" or ''
  searchText: string;      // lowercase concat of label + numero_identificacion for fast filtering
};
```

#### 3. No database migration required

All fields (`numero_identificacion`, `tipo_identificacion`) already exist on `public.usuarios` (added in migration `20260304000100_add_identificacion_cols_usuarios.sql`). RLS already allows tenant members to read `miembros_tenant` and its joined `usuarios` data.

---

## Database Changes

No new migrations are required.

Existing relevant schema:
- `public.reservas` — `(id, tenant_id, atleta_id, entrenamiento_id, fecha_reserva, estado, notas, created_at)` with RLS that allows `administrador` / `entrenador` to insert bookings for any `atleta_id` in the tenant.
- `public.usuarios` — includes `nombre`, `apellido`, `email`, `numero_identificacion`, `tipo_identificacion`.
- `public.miembros_tenant` — `activo` boolean filter already used to restrict the list to active members.

---

## API / Server Actions

No new API routes or server actions. The existing `reservasService.createReserva()` in `src/services/supabase/portal/reservas.service.ts` already handles admin-created bookings with a different `atleta_id` than the current user (backed by the RLS INSERT policy `reservas_insert_authenticated` which checks `get_trainer_or_admin_tenants_for_authenticated_user()`).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | Replace `<select>` atleta picker with inline searchable combobox; update `atletaOptions` query to include `numero_identificacion` and `tipo_identificacion`; add `AtletaOption.searchText` field; add keyboard navigation and outside-click close |

> **Only one file needs to change.** All other layers (hook, service, page, migration) already support admin booking creation.

---

## Acceptance Criteria

1. When a user with role `administrador` or `entrenador` clicks "Nueva reserva" in the `ReservasPanel`, the form modal opens showing a searchable athlete field (not a plain `<select>`).
2. The athlete search input is focused automatically when the modal opens in create mode with `showAtletaPicker=true`.
3. Typing at least 1 character shows a filtered dropdown list of athletes whose name or `numero_identificacion` contains the search term (case-insensitive).
4. Each dropdown item displays the athlete's full name on the primary line and, when available, the identification type and number (e.g., "CC: 10234567") on a secondary line.
5. Clicking or pressing `Enter` on a list item selects that athlete, closes the dropdown, and fills the search input with the athlete's display name.
6. Clearing the search input also clears the selected `atleta_id`, so the user cannot accidentally submit with stale selection.
7. When no athletes match the search term, the dropdown shows a "Sin resultados" message.
8. While athletes are loading, the input is disabled and shows "Cargando atletas…" as placeholder.
9. Pressing `Escape` closes the dropdown without selecting an athlete.
10. `↑` / `↓` arrow keys navigate the dropdown items; the active item is visually highlighted.
11. The form still shows the validation error "Debes seleccionar un atleta." if submitted without selecting one.
12. Submitting the form with a valid athlete creates a booking with the selected `atleta_id` (not the current user's ID), confirmed by the new booking appearing in the reservas list.
13. The feature works identically for both `administrador` and `entrenador` roles (`isAdmin = role === 'administrador' || role === 'entrenador'`).
14. An `atleta` role user cannot see or trigger the admin booking flow — the "Nueva reserva" button is replaced with the self-booking "Reservar" button for that role.

---

## Implementation Steps

- [ ] Read `ReservaFormModal.tsx` fully to understand all existing state and JSX before editing.
- [ ] Extend the `AtletaOption` type to add `identificacion: string` and `searchText: string`.
- [ ] Update the Supabase select query in the `useEffect` to fetch `numero_identificacion` and `tipo_identificacion`.
- [ ] Build `searchText` as `"${label} ${numero_identificacion ?? ''}".toLowerCase()` for each option.
- [ ] Add local state: `searchInput: string`, `isDropdownOpen: boolean`, `highlightedIndex: number`.
- [ ] Replace the `<select>` block with a combobox: `<div role="combobox">` wrapping a text `<input>` and a `<ul role="listbox">`.
- [ ] Implement filter: `atletaOptions.filter(o => o.searchText.includes(searchInput.toLowerCase()))`.
- [ ] Implement `onFocus` / `onChange` to open dropdown; `onBlur` with 150ms delay to close (allows item click).
- [ ] Implement `onKeyDown` for `ArrowUp`, `ArrowDown`, `Enter`, `Escape`.
- [ ] When an option is selected: call `onUpdateField('atleta_id', option.id)` and set `searchInput` to `option.label`.
- [ ] When the search input changes: call `onUpdateField('atleta_id', '')` to clear any prior selection.
- [ ] Auto-focus the search input when `open && showAtletaPicker && mode === 'create'` (via `useRef` + `useEffect`).
- [ ] Test manually: happy path (search by name, search by cédula, keyboard nav), empty state, loading state, error on submit without selection.
- [ ] Verify that `entrenador` role also gets the picker via `showAtletaPicker={isAdmin}` in `ReservasPanel`.

---

## Non-Functional Requirements

- **Security**: No new RLS changes required. The existing INSERT policy on `reservas` already enforces that only `entrenador` / `administrador` can set an `atleta_id` different from `auth.uid()`. Client-side filtering of athlete names/IDs is display-only and does not bypass server-side authorization.
- **Performance**: The athlete list is fetched once on modal open and filtered client-side. For very large teams (>500 members), consider debouncing the filter or adding pagination; however, for typical tenant sizes this is not required.
- **Accessibility**: The combobox must use `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `role="listbox"` / `role="option"` for screen reader compatibility.
- **Error handling**: If the athlete list fails to load (Supabase error), the input remains disabled with a "No se pudo cargar la lista" placeholder and the error is silently swallowed (consistent with existing behavior). The form can still be submitted if an athlete was previously selected before the error.
