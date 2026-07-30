# US-0099 — Preserve Line Breaks When Rendering Multi-line Text Fields

## ID
US-0099

## Name
Preserve Line Breaks When Rendering Multi-line Text Fields

## As a
User of the platform (admin, coach, or athlete) who fills out multi-line text fields (e.g., `descripcion`, `notas`) in forms

## I Want
The line breaks ("Enter" key presses) I type into `<textarea>` fields to be visually preserved wherever that saved text is displayed elsewhere in the app

## So That
Read-only views of my descriptions/notes retain the formatting I intended, instead of collapsing into a single run-on paragraph that loses readability and meaning (e.g., numbered steps, separate paragraphs)

---

## Description

### Current State
Several forms across the portal use `<textarea>` inputs to capture multi-line text (e.g., `descripcion` on servicios, escenarios, disciplinas, planes, formularios plantillas, entrenamientos, and `notas` on member "novedades"). Browsers and the DB correctly store the raw string with embedded `\n` characters. However, when that saved value is rendered back in read-only views (tables, cards, detail modals), it is placed inside a plain `<p>`/`<span>` with no `white-space` handling. Standard CSS/HTML collapses `\n` characters in normal-flow text, so all line breaks the user entered are visually lost — multi-line descriptions render as one flattened line/paragraph.

One existing instance already handles this correctly: `src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx:87` and `:118` render free-text formulario answers with `className="whitespace-pre-wrap ..."`. This is the pattern to standardize on — there is currently no shared component or utility for it; each display site applies (or fails to apply) the Tailwind class independently.

### Proposed Changes

1. **Create a shared presentational component** `MultilineText` that wraps any text value needing line-break-aware rendering. It renders the given string inside an element with `whitespace-pre-wrap` (preserves both line breaks and repeated spaces, and still wraps long lines), optionally truncating with a `maxLength`/`clampLines` prop for card/table contexts that previously used ad hoc truncation (e.g., `truncateText` in `ScenarioCard.tsx`, `line-clamp-2` in `PublicTrainingCard.tsx`).
   - Renders `null`/a dash or nothing when the value is `null`/`undefined`/empty, matching each call site's existing empty-state convention.
   - Accepts `as` prop (`p` | `span` | `div`) to match the surrounding markup at each call site, defaulting to `p`.
   - Accepts `className` to merge with the base `whitespace-pre-wrap` class (via existing `cn`/`clsx` utility if present in `src/lib`, otherwise plain string concatenation).

2. **Replace the plain text rendering with `MultilineText`** (or add `whitespace-pre-wrap` directly, if a full component is overkill for a single site — see decision below) at every display site that renders a saved multi-line (`<textarea>`-sourced) field:
   - `src/components/portal/servicios/ServiciosTable.tsx:53` — `descripcion` column
   - `src/components/portal/scenarios/ScenarioCard.tsx:51` — `descripcion` (replaces `truncateText` call; keep truncation behavior via `MultilineText`'s `maxLength` prop, still cutting on character count but no longer stripping the newlines from the retained portion)
   - `src/components/portal/disciplines/DisciplinesTable.tsx:49` — `descripcion` column
   - `src/components/portal/planes/PlanesTable.tsx:77-78` — plan `descripcion`
   - `src/components/portal/planes-publicos/PlanPublicoCard.tsx:47-48` (subtipo `descripcion`) and `:78-79` (plan `descripcion`)
   - `src/components/portal/formularios/FormulariosTable.tsx:48` — plantilla `descripcion`
   - `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx:167` — training `descripcion`, and `:330` — restriction row `descripcion`
   - `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx:94-95` — public training `descripcion` (keep the existing `line-clamp-2` truncation behavior; add `whitespace-pre-wrap` alongside it so the two lines shown respect an intentional break instead of always wrapping mid-sentence)
   - `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx:103` — `notas` field

3. **Do not change the `<textarea>` inputs themselves** — they already handle `Enter` natively as a newline character (this is default `<textarea>` behavior); no change is needed in `ServicioFormModal.tsx`, `ScenarioFormModal.tsx`, `DisciplineFormModal.tsx`, `PlanFormModal.tsx`, `FormularioFormModal.tsx`, or `EntrenamientoWizard.tsx`. This story is purely about display/rendering, not capture.

4. **No database, API, or service-layer changes.** The stored strings already contain `\n`; this is a front-end rendering-only fix.

---

## Database Changes
None. No migrations, no new columns, no RLS changes — the raw text already includes `\n` characters as typed.

---

## API / Server Actions
None. No service or hook changes are required; all affected fields are already fetched and passed through as plain strings.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Shared UI | `src/components/ui/MultilineText.tsx` | New component: renders a string with `whitespace-pre-wrap`, optional `maxLength` truncation, optional `as` tag, optional `className` |
| Shared UI | `src/components/ui/index.ts` | Export `MultilineText` (create the file if it doesn't exist yet) |
| Component | `src/components/portal/servicios/ServiciosTable.tsx` | Wrap `descripcion` cell in `MultilineText` |
| Component | `src/components/portal/scenarios/ScenarioCard.tsx` | Replace local `truncateText` usage for `descripcion` with `MultilineText maxLength={50}`; leave `direccion`/`coordenadas` truncation as-is (single-line fields, not textareas) |
| Component | `src/components/portal/disciplines/DisciplinesTable.tsx` | Wrap `descripcion` cell in `MultilineText` |
| Component | `src/components/portal/planes/PlanesTable.tsx` | Wrap plan `descripcion` cell(s) in `MultilineText` |
| Component | `src/components/portal/planes-publicos/PlanPublicoCard.tsx` | Wrap subtipo and plan `descripcion` in `MultilineText` |
| Component | `src/components/portal/formularios/FormulariosTable.tsx` | Wrap plantilla `descripcion` cell in `MultilineText` |
| Component | `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx` | Wrap training `descripcion` and restriction row `descripcion` in `MultilineText` |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Add `whitespace-pre-wrap` to the existing `line-clamp-2` description element (or use `MultilineText` with a `clampLines` prop if added) |
| Component | `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx` | Wrap `notas` field in `MultilineText` |

---

## Acceptance Criteria

1. Entering a `descripcion`/`notas` value with multiple line breaks (e.g., "Line one\nLine two\nLine three") in any of the affected forms (servicios, escenarios, disciplinas, planes, planes públicos, formularios plantillas, entrenamientos, novedades de miembro) and saving it, then viewing that value in its corresponding read-only display (table row, card, detail modal), shows the text on separate visual lines matching what was typed — not collapsed into one line.
2. Consecutive blank lines (double `Enter`) are preserved as visible blank lines in the display (not collapsed to a single break), consistent with `white-space: pre-wrap` semantics.
3. Existing truncation behavior (`ScenarioCard`'s 50-character limit, `PublicTrainingCard`'s `line-clamp-2`) still limits the amount of text shown in cards — truncation logic is not removed, only made line-break-aware.
4. Long single-line text without any manual line breaks still wraps normally within its container (no horizontal overflow, no regression versus current wrapping behavior).
5. A `null`, `undefined`, or empty-string `descripcion`/`notas` value renders each site's existing empty state (e.g., "Sin descripción", em-dash, or hidden element) — unchanged from current behavior.
6. No visual regression in single-line fields (`direccion`, `coordenadas`, plan names, etc.) that are not backed by a `<textarea>` — those are untouched by this story.
7. Typing and submitting a value with line breaks in any of the six form modals listed above continues to work exactly as before (this story does not touch the input side).

---

## Implementation Steps

- [ ] Create `src/components/ui/MultilineText.tsx` with `whitespace-pre-wrap` base styling, `maxLength`, `as`, and `className` props
- [ ] Add/update `src/components/ui/index.ts` to export it
- [ ] Update `ServiciosTable.tsx` to use `MultilineText` for `descripcion`
- [ ] Update `ScenarioCard.tsx` to use `MultilineText` for `descripcion` (remove now-unused local `truncateText` if no longer referenced elsewhere in the file)
- [ ] Update `DisciplinesTable.tsx` to use `MultilineText` for `descripcion`
- [ ] Update `PlanesTable.tsx` to use `MultilineText` for `descripcion`
- [ ] Update `PlanPublicoCard.tsx` to use `MultilineText` for both subtipo and plan `descripcion`
- [ ] Update `FormulariosTable.tsx` to use `MultilineText` for `descripcion`
- [ ] Update `EntrenamientoDetalleModal.tsx` to use `MultilineText` for training `descripcion` and restriction `descripcion`
- [ ] Update `PublicTrainingCard.tsx` to add `whitespace-pre-wrap` alongside its existing `line-clamp-2` class
- [ ] Update `NovedadesMiembroModal.tsx` to use `MultilineText` for `notas`
- [ ] Manually test: create/edit a record in each affected form with multi-line text (including consecutive blank lines), verify the read-only view preserves formatting
- [ ] Manually test empty/null values still show the existing empty state at each site
- [ ] Manually test truncated card views (`ScenarioCard`, `PublicTrainingCard`) still limit visible text length correctly

---

## Non-Functional Requirements

- **Security**: None — no new inputs, no new data access, purely presentational; text is already rendered as React children (auto-escaped), so no new XSS surface is introduced by preserving whitespace.
- **Performance**: None — no additional queries or re-renders; `MultilineText` is a stateless presentational component.
- **Accessibility**: `white-space: pre-wrap` does not affect screen-reader semantics (it is a visual-only CSS property); no ARIA changes needed.
- **Error handling**: N/A — no new failure modes; falsy values fall back to each site's existing empty-state rendering.
