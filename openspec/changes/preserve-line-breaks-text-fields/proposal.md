## Why

Multi-line `descripcion`/`notas` text entered via `<textarea>` fields across the portal (servicios, escenarios, disciplinas, planes, planes públicos, formularios plantillas, entrenamientos, member novedades) is stored correctly with `\n` characters, but every read-only display renders it inside a plain `<p>`/`<span>` with no `white-space` handling. Browsers collapse `\n` in normal-flow text, so the line breaks the user typed are visually lost in tables, cards, and detail modals. This is a pure rendering bug (US-0099) — one place in the codebase (`FormularioRespuestaViewerModal.tsx`) already renders free text correctly with `whitespace-pre-wrap`, but the pattern was never generalized.

No new visual design is required: this introduces no new page, layout, or interactive element — it standardizes an existing, already-shipped Tailwind pattern (`whitespace-pre-wrap`) as a small shared wrapper component, matching the one correct instance already in the codebase.

## What Changes

- Add a new shared presentational component, `MultilineText`, that renders a string with `whitespace-pre-wrap` (preserving line breaks, repeated spaces, and normal wrapping), with optional character-count truncation (`maxLength`) and an `as` tag prop (`p` | `span` | `div`, default `p`).
- Replace ad hoc text rendering at 9 existing display sites with `MultilineText` (or an equivalent `whitespace-pre-wrap` class addition where a full component swap is unnecessary), so previously-lost line breaks are now shown:
  - `ServiciosTable.tsx` (servicio `descripcion`)
  - `ScenarioCard.tsx` (escenario `descripcion` — replaces the local `truncateText` helper for this field only)
  - `DisciplinesTable.tsx` (disciplina `descripcion`)
  - `PlanesTable.tsx` (plan `descripcion`)
  - `PlanPublicoCard.tsx` (subtipo `descripcion` and plan `descripcion`)
  - `FormulariosTable.tsx` (plantilla `descripcion`)
  - `EntrenamientoDetalleModal.tsx` (training `descripcion` and restriction row `descripcion`)
  - `PublicTrainingCard.tsx` (public training `descripcion`, keeping its existing `line-clamp-2` truncation)
  - `NovedadesMiembroModal.tsx` (member `notas`)
- No changes to any `<textarea>` input — `Enter` already produces a newline character natively; this change is display-only.

**Non-goals**

- No changes to how text is captured, validated, or stored (no service/hook/DB changes).
- No change to truncation *limits* (character counts, line-clamp values) — only making existing truncation line-break-aware.
- No rich-text/Markdown support — this is plain-text newline preservation only, not a WYSIWYG or Markdown rendering feature.
- No changes to single-line fields (`direccion`, `coordenadas`, plan/service names, etc.) that were never textareas.

## Capabilities

### New Capabilities
- `multiline-text-rendering`: A shared `MultilineText` component and the rule that any UI element displaying a value sourced from a `<textarea>` field must preserve line breaks/whitespace visually, with optional truncation.

### Modified Capabilities
(none — no existing spec currently documents description/notes rendering behavior; this adds a new cross-cutting capability rather than changing a documented requirement of the individual feature specs it touches)

## Impact

- **Affected code**: 9 display components across `servicios`, `scenarios`, `disciplines`, `planes`, `planes-publicos`, `formularios`, `entrenamientos`, `entrenamientos-publicos`, and `gestion-equipo` feature slices, plus one new shared component under `src/components/ui/`.
- **Affected APIs/services**: None.
- **Affected dependencies**: None — uses existing Tailwind `whitespace-pre-wrap` utility already present in the project.
- **Risk**: Low — purely additive/presentational; no data model or contract changes.
