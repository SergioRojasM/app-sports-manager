## 1. Setup

- [ ] 1.1 Create a new branch named `fix/preserve-line-breaks-text-fields` from the current branch
- [ ] 1.2 Verify the current working branch is not `main`, `master`, or `develop` before making any changes

## 2. Shared Component

- [ ] 2.1 Create `src/components/ui/MultilineText.tsx`: renders its string prop inside an element (default `p`, overridable via `as` prop: `p` | `span` | `div`) with base `whitespace-pre-wrap` class merged with an optional `className` prop; supports an optional `maxLength` prop that truncates the string by character count (applied to the raw string, before rendering, so remaining line breaks are preserved); renders nothing when the value is `null`/`undefined`/empty string
- [ ] 2.2 Create `src/components/ui/index.ts` exporting `MultilineText` (new file/folder — establishes the `components/ui/` convention referenced in `projectspec/03-project-structure.md`)

## 3. Apply to Display Sites

- [ ] 3.1 Update `src/components/portal/servicios/ServiciosTable.tsx` — wrap the `descripcion` cell in `MultilineText`
- [ ] 3.2 Update `src/components/portal/scenarios/ScenarioCard.tsx` — replace the `truncateText(scenario.descripcion)` call with `<MultilineText maxLength={50}>{scenario.descripcion}</MultilineText>`; keep the local `truncateText` helper in place for the `direccion`/`coordenadas` fields (unchanged, single-line values)
- [ ] 3.3 Update `src/components/portal/disciplines/DisciplinesTable.tsx` — wrap the `descripcion` cell in `MultilineText`
- [ ] 3.4 Update `src/components/portal/planes/PlanesTable.tsx` — wrap the plan `descripcion` cell(s) in `MultilineText`
- [ ] 3.5 Update `src/components/portal/planes-publicos/PlanPublicoCard.tsx` — wrap both the subtipo `descripcion` and the plan `descripcion` in `MultilineText`
- [ ] 3.6 Update `src/components/portal/formularios/FormulariosTable.tsx` — wrap the plantilla `descripcion` cell in `MultilineText`
- [ ] 3.7 Update `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx` — wrap the training `descripcion` and the restriction row `descripcion` in `MultilineText`
- [ ] 3.8 Update `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` — add `whitespace-pre-wrap` alongside the existing `line-clamp-2` class on the description element (no `MultilineText` swap here per design.md Decision 3)
- [ ] 3.9 Update `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx` — wrap the `notas` field in `MultilineText`

## 4. Manual Verification

- [ ] 4.1 For each of the 9 updated sites, create/edit a record with a multi-line value (including a blank line between paragraphs) in its form and confirm the read-only view shows the line breaks and blank line intact
- [ ] 4.2 Confirm long single-line text (no manual breaks) still wraps normally with no horizontal overflow at each site
- [ ] 4.3 Confirm `null`/empty `descripcion`/`notas` values still render each site's existing empty state unchanged
- [ ] 4.4 Confirm `ScenarioCard`'s 50-character truncation and `PublicTrainingCard`'s 2-line clamp still limit visible text as before
- [ ] 4.5 Confirm typing `Enter` in each of the six source `<textarea>` fields (servicios, escenarios, disciplinas, planes, formularios plantillas, entrenamientos) still inserts a newline and submits correctly (no regression on the input side)

## 5. Documentation

- [ ] 5.1 Update `projectspec/03-project-structure.md` to list the new `src/components/ui/MultilineText.tsx` file under the `components/ui/` entry (currently shown as an empty placeholder in the directory tree)

## 6. Finalize

- [ ] 6.1 Run type check, lint, and tests; fix any failures (do not run build)
- [ ] 6.2 Write the commit message and pull request description summarizing the fix, referencing US-0099
