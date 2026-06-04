## Context

The `ReservaFormModal` component (`src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx`) already has a `showAtletaPicker` prop that, when `true`, renders an athlete selector for admin/entrenador roles. Currently this is implemented as a plain HTML `<select>` element populated from `miembros_tenant` joined to `usuarios`. The query does not fetch `numero_identificacion` or `tipo_identificacion`, so admins cannot search by cédula. For organisations with many members the unfiltered dropdown is impractical.

All layers below the component (hook, service, RLS) already correctly support admin-created bookings with an arbitrary `atleta_id`.

## Goals / Non-Goals

**Goals:**
- Replace the `<select>` with an accessible inline combobox (text input + filtered dropdown list).
- Add `numero_identificacion` and `tipo_identificacion` to the athlete fetch query.
- Filter the dropdown client-side by name or identification number.
- Full keyboard navigation (↑/↓, Enter, Escape) and ARIA combobox pattern.
- Auto-focus the search input when the modal opens in admin create mode.

**Non-Goals:**
- Server-side search or pagination of the athlete list.
- Changes to the edit-mode form, hook, service, types, or migrations.
- Changes to the `entrenador` role flow (it already goes through the same `showAtletaPicker` path).

## Decisions

### D1 — Inline combobox instead of a library component

**Decision**: Build the combobox directly inside `ReservaFormModal.tsx` using React state (`searchInput`, `isDropdownOpen`, `highlightedIndex`) and a `useRef` for auto-focus.

**Rationale**: The codebase does not use a headless UI library (Radix, Headless UI, etc.). Introducing a dependency for a single-use combobox would be over-engineering. The implementation is small (~80 lines of JSX + handlers) and the component already owns local state for `atletaOptions`.

**Alternative considered**: Extracting a generic `<ComboboxField>` component — rejected because this is the only use case at present and abstraction would add unnecessary indirection.

---

### D2 — Client-side filtering on a pre-built `searchText` field

**Decision**: When the athlete list is fetched, build a `searchText = "${label} ${numero_identificacion ?? ''}".toLowerCase()` field on each option. The filter at render time is `option.searchText.includes(term)`.

**Rationale**: The full name + ID is small text. Pre-building `searchText` once avoids repeated string concatenation on every keystroke. No debounce is needed.

---

### D3 — `onBlur` with 150 ms delay to close the dropdown

**Decision**: The dropdown closes in the `onBlur` handler of the input, delayed by `setTimeout(..., 150)` so that a `mousedown` on a list item fires before the blur dismisses the dropdown.

**Rationale**: Standard combobox pattern to avoid the race between click and blur. `onMouseDown + preventDefault` on list items is an alternative, but the delay is simpler and well-understood.

---

### D4 — Clearing the search input resets `atleta_id`

**Decision**: Any time the user types in the search input, `onUpdateField('atleta_id', '')` is called, invalidating any previously selected athlete. The `atleta_id` is only set when the user explicitly selects an option.

**Rationale**: Prevents a stale `atleta_id` being submitted when the user edited the text after selecting someone.

## Risks / Trade-offs

- **Large teams (>500 members)**: Client-side filtering of a 500-item list is negligible CPU-wise, but the rendered DOM could be large if all items are shown at once. Mitigation: limit the dropdown to the first 50 matches with a "…and N more" indicator (can be deferred to a follow-up).
- **Accessibility gap**: A fully conformant ARIA combobox with `aria-activedescendant` requires stable `id` attributes on list items. This implementation must assign `id="atleta-option-{index}"` to each `<li>` and set `aria-activedescendant` on the input. Missing this would make screen reader navigation broken.
