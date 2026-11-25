# Spec Delta

## ADDED Requirements

### Requirement: Switch primitive
The kit SHALL provide a switch control rendered as a 36×20 pill with a 16px knob, exposed as `role="switch"` with `aria-checked`, and requiring an accessible label by type. It SHALL toggle with click, Space and Enter, and SHALL support a disabled state.

#### Scenario: Keyboard toggle
- **WHEN** a focused switch with `aria-checked="false"` receives Space
- **THEN** it SHALL call its change handler with `true`

#### Scenario: Disabled switch
- **WHEN** the switch is disabled
- **THEN** it SHALL ignore activation and expose `aria-disabled="true"`

#### Scenario: Label is required
- **WHEN** a developer renders the switch without a label
- **THEN** the type check SHALL fail

### Requirement: Drawer primitive
The kit SHALL provide a right-side drawer shell with a backdrop, a titled panel (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to its title), a close button named "Cerrar", a scrollable body and a footer slot. It SHALL close on Escape, on backdrop click and on the close button, except while `busy`.

#### Scenario: Open and focus
- **WHEN** the drawer opens
- **THEN** focus SHALL move into the panel and stay within it while it is open

#### Scenario: Close and focus return
- **WHEN** the administrator presses Escape
- **THEN** the drawer SHALL close and focus SHALL return to the element that opened it

#### Scenario: Busy drawer
- **WHEN** the drawer is `busy` and the administrator presses Escape or clicks the backdrop
- **THEN** the drawer SHALL stay open

#### Scenario: Narrow screens
- **WHEN** the viewport is 375px wide
- **THEN** the panel SHALL take the full width and the page SHALL not scroll horizontally

### Requirement: Confirmation dialog primitive
The kit SHALL provide a centered confirmation dialog (`role="alertdialog"`) with a title, a message, a confirm action (danger tone by default) and a cancel action. Initial focus SHALL go to the cancel action, Escape SHALL cancel, and a pending confirmation SHALL disable both actions.

#### Scenario: Default focus
- **WHEN** the confirmation dialog opens
- **THEN** focus SHALL be on the cancel action

#### Scenario: Pending confirmation
- **WHEN** the confirm handler is pending
- **THEN** both actions SHALL be disabled and the confirm action SHALL show a loading label

### Requirement: Add tile primitive
The kit SHALL provide an "add" tile: a dashed-outline button with a round icon ring, a title and an optional subtitle, which fills the cell of the grid or row it is placed in.

#### Scenario: Add tile is a button
- **WHEN** the add tile renders with the title "Agregar escenario"
- **THEN** it SHALL be a single `button` whose accessible name includes "Agregar escenario"

### Requirement: Section heading icon
The section heading SHALL accept an optional icon rendered as a 36px round chip with a 16px accent icon before the title, without changing headings that omit it.

#### Scenario: Heading with icon
- **WHEN** a section heading renders with the icon `wallet`
- **THEN** the chip SHALL render before the title and SHALL be hidden from assistive technology

#### Scenario: Existing headings unchanged
- **WHEN** a section heading renders without an icon
- **THEN** its markup and styles SHALL be the same as before this change
