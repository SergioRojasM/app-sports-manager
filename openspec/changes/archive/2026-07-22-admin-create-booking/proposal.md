## Why

Administrators need to register athletes in training sessions on their behalf (walk-ins, phone bookings, bulk registration), but the current athlete picker in the booking modal is a plain `<select>` with no search capability and omits identification numbers, making it impractical for teams with many members.

## What Changes

- Replace the plain `<select>` atleta picker inside `ReservaFormModal` with an accessible searchable combobox.
- Extend the athlete data fetch to include `numero_identificacion` and `tipo_identificacion` from `usuarios`.
- Display each athlete option with their full name (primary) and identification number (secondary line) for quick lookup.
- Support filtering by name **or** cédula/identification number (case-insensitive client-side filter).
- Add full keyboard navigation (`↑` / `↓` to navigate, `Enter` to select, `Escape` to close).
- Implement accessible ARIA markup (`role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-activedescendant`).
- Auto-focus the search input when the modal opens in admin create mode.

No database migrations, no new API routes — this is a pure UI improvement.

## Capabilities

### New Capabilities

- `admin-booking-athlete-search`: Searchable combobox that lets admin/entrenador find and select a team athlete by name or identification number when creating a booking on their behalf.

### Modified Capabilities

- `training-booking`: The booking creation flow for admin/entrenador roles changes from a plain select to a searchable combobox; existing booking submission logic and RLS policies are unchanged.

## Impact

- **Component**: `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — only file changed.
- **No service/hook/type/migration changes** — `reservasService`, `useReservaForm`, `useReservas`, and all Supabase policies remain untouched.
- **Non-goals**:
  - Server-side search (client-side filtering is sufficient for typical team sizes).
  - Pagination of the athlete list.
  - Changes to the edit-mode form or any other form field.
  - New RLS policies (existing policies already allow admin to insert bookings for any `atleta_id`).
