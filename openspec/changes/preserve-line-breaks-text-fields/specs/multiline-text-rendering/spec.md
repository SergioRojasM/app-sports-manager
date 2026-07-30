## ADDED Requirements

### Requirement: Line breaks preserved in multi-line text display
Any read-only UI element that displays a string value originating from a `<textarea>` form field (e.g., `descripcion`, `notas`) SHALL visually preserve line breaks and consecutive blank lines exactly as entered by the user, using a whitespace-preserving rendering (`white-space: pre-wrap` or equivalent) instead of default text-flow rendering that collapses newlines.

#### Scenario: Multi-line description renders with line breaks intact
- **WHEN** a user saves a `descripcion`/`notas` value containing multiple line breaks (e.g., "Line one\nLine two\nLine three") through any affected form (servicios, escenarios, disciplinas, planes, planes públicos, formularios plantillas, entrenamientos, member novedades)
- **THEN** the corresponding read-only display (table row, card, or detail modal) shows the text broken across separate visual lines matching the original input

#### Scenario: Consecutive blank lines are preserved
- **WHEN** a saved multi-line text value contains two or more consecutive line breaks (a blank line between paragraphs)
- **THEN** the display renders a visible blank line in that position rather than collapsing it into a single line break

#### Scenario: Long text without manual line breaks still wraps normally
- **WHEN** a saved text value has no embedded line breaks but exceeds the width of its container
- **THEN** the text wraps at the container edge exactly as it did before this change, with no horizontal overflow

#### Scenario: Empty or missing value falls back to existing empty state
- **WHEN** a `descripcion`/`notas` value is `null`, `undefined`, or an empty string
- **THEN** the display renders that call site's existing empty-state treatment (e.g., "Sin descripción", an em-dash, or no element) unchanged from current behavior

### Requirement: Existing truncation behavior remains line-break-aware
Where a display site already truncates multi-line text for compact presentation (character-count truncation or CSS line-clamp), the truncation SHALL continue to limit the amount of text shown, while the retained portion still preserves any line breaks it contains.

#### Scenario: Character-count truncated card preserves line breaks in the visible portion
- **WHEN** a card view truncates a `descripcion` value to a maximum character count for compact display
- **THEN** the truncated text is truncated at the character limit as before, and any line breaks within the retained characters are still rendered as visual line breaks

#### Scenario: Line-clamped card preserves line breaks within the clamped lines
- **WHEN** a card view uses a CSS line-clamp (e.g., limiting the description to 2 visible lines)
- **THEN** the line-clamp still limits the description to that number of visible lines, and a manual line break within those lines is honored as a line break rather than treated as ordinary wrapped text

### Requirement: Textarea input capture is unaffected
This capability governs display/rendering only. `<textarea>` form inputs SHALL continue to capture the `Enter` key as a newline character exactly as before, with no change to input, validation, submission, or storage behavior.

#### Scenario: Typing Enter in a textarea still inserts a newline
- **WHEN** a user presses `Enter` while typing in any `descripcion`/`notas` `<textarea>` field
- **THEN** the input behaves exactly as it did before this change (a newline character is inserted into the field's value) and the saved value is unchanged in structure
