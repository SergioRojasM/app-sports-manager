## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/admin-booking-athlete-search`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Component — ReservaFormModal.tsx

- [x] 2.1 Read `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` in full to understand all existing state, props, and JSX before editing
- [x] 2.2 Extend the `AtletaOption` type to add `identificacion: string` and `searchText: string` fields
- [x] 2.3 Update the Supabase `select` query inside the `useEffect` that loads `atletaOptions` to also fetch `numero_identificacion` and `tipo_identificacion` from `usuarios`
- [x] 2.4 Build `searchText` as `"${label} ${numero_identificacion ?? ''}".toLowerCase()` and `identificacion` as `"${tipo}: ${numero}"` (empty string when null) for each mapped option
- [x] 2.5 Add local state variables: `searchInput: string`, `isDropdownOpen: boolean`, `highlightedIndex: number`
- [x] 2.6 Add a `useRef` for the search input element to support auto-focus
- [x] 2.7 Add a `useEffect` that auto-focuses the search input when `open && showAtletaPicker && mode === 'create'`
- [x] 2.8 Replace the `<select id="reserva-atleta">` block with a combobox `<div>` containing:
  - A text `<input>` with `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
  - A `<ul role="listbox">` shown only when `isDropdownOpen && filteredOptions.length >= 0`
  - Each `<li role="option">` with a stable `id="atleta-option-{index}"`, primary name line, and optional secondary identification line
  - A "Sin resultados" `<li>` when `filteredOptions.length === 0` and `searchInput` is non-empty
- [x] 2.9 Implement `onChange` on the input: update `searchInput`, call `onUpdateField('atleta_id', '')`, open dropdown
- [x] 2.10 Implement `onFocus` on the input: open the dropdown
- [x] 2.11 Implement `onBlur` on the input: close the dropdown after 150 ms delay (to allow item click to register)
- [x] 2.12 Implement `onKeyDown` on the input for `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`
- [x] 2.13 Implement option click handler: call `onUpdateField('atleta_id', option.id)`, set `searchInput` to `option.label`, close dropdown, reset `highlightedIndex` to -1
- [x] 2.14 Compute `filteredOptions` as `atletaOptions.filter(o => o.searchText.includes(searchInput.toLowerCase()))` (show all when `searchInput` is empty)
- [x] 2.15 Verify the validation error for empty `atleta_id` still renders beneath the combobox field

## 3. Manual Testing

- [ ] 3.1 Open `gestion-entrenamientos` as an `administrador`, click a training, open bookings panel, click "Nueva reserva"
- [ ] 3.2 Confirm the search input auto-focuses on modal open
- [ ] 3.3 Search by partial name — confirm only matching athletes appear
- [ ] 3.4 Search by partial cédula number — confirm only matching athletes appear
- [ ] 3.5 Confirm the secondary line shows `{tipo}: {numero}` for athletes with identification data
- [ ] 3.6 Select an athlete by click — confirm `atleta_id` is set and dropdown closes
- [ ] 3.7 Select an athlete by keyboard (ArrowDown + Enter) — confirm same result
- [ ] 3.8 Press Escape — confirm dropdown closes without selecting
- [ ] 3.9 Edit text after selecting — confirm `atleta_id` resets (submit shows validation error)
- [ ] 3.10 Submit with athlete selected — confirm booking appears in the reservas list with correct athlete name
- [ ] 3.11 Repeat the above flow as `entrenador` role to confirm parity
- [ ] 3.12 Log in as `atleta` role — confirm the "Nueva reserva" button is replaced by "Reservar" (self-booking only)

## 4. Commit and PR

- [ ] 4.1 Stage and commit with message: `feat(reservas): replace atleta select with searchable combobox (US-0058)`
- [ ] 4.2 Write PR description:
  - **Title**: `feat(reservas): searchable athlete picker for admin bookings (US-0058)`
  - **Summary**: Replaces the plain `<select>` in `ReservaFormModal` with an accessible combobox. Fetches `numero_identificacion` and `tipo_identificacion` so admins can filter athletes by name or cédula. No database or service changes.
  - **Files changed**: `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx`
  - **Testing**: Manual — happy path, keyboard nav, empty state, loading state, role guard
