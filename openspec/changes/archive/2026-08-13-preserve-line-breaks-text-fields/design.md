## Context

Nine read-only display components across the portal render `descripcion`/`notas` string values that originate from `<textarea>` form inputs. All nine currently render the raw string inside a plain `<p>`/`<span>`, so embedded `\n` characters collapse per normal CSS text flow and the user's line breaks disappear. One existing component, `FormularioRespuestaViewerModal.tsx` (lines 87, 118), already renders free-text answers correctly using the Tailwind `whitespace-pre-wrap` utility class. This design generalizes that existing, already-proven pattern rather than inventing a new one — no new visual design/mockup is needed since it is not introducing any new UI surface, only fixing the whitespace handling of existing text nodes.

## Goals / Non-Goals

**Goals:**
- Preserve user-typed line breaks (and blank lines) when displaying previously-saved multi-line text, everywhere it is currently lost.
- Centralize the fix in one small, reusable component (`MultilineText`) so future multi-line fields use it by default instead of each site reinventing `whitespace-pre-wrap`.
- Preserve existing truncation behavior (`ScenarioCard`'s character-count truncation, `PublicTrainingCard`'s `line-clamp-2`) — only make it line-break-aware, not remove it.

**Non-Goals:**
- No Markdown/rich-text rendering — plain-text whitespace preservation only.
- No change to `<textarea>` inputs, validation, hooks, services, types, or the database — the stored string already contains `\n`.
- No change to single-line fields never backed by a textarea.

## Decisions

**Decision 1: Introduce a shared `MultilineText` component instead of adding `whitespace-pre-wrap` inline at each of the 9 sites.**
- Rationale: keeps the fix consistent and discoverable (one place documents "textarea-sourced text must preserve whitespace"), and gives a single spot to add `maxLength`/truncation behavior instead of duplicating truncation logic (as `ScenarioCard`'s local `truncateText` currently does).
- Alternative considered: add `className="whitespace-pre-wrap"` directly at each call site with no shared component. Rejected — it's marginally less code up front but leaves the convention undocumented and easy to forget on the next new multi-line field (which is exactly how this bug happened the first time).
- Location: `src/components/ui/MultilineText.tsx`, exported via `src/components/ui/index.ts` (new folder — `src/components/ui/` does not exist yet despite being referenced in `03-project-structure.md`'s scaffold; this fix is the first consumer of it and establishes it in line with the documented `components/ui/` convention). Following the project's page → component → hook → service → types methodology, this is a leaf presentational component with no hook/service/type layer needed — it takes a plain string prop and has no state or data access.

**Decision 2: `MultilineText` handles truncation itself via an optional `maxLength` prop, rather than callers pre-truncating the string before passing it in.**
- Rationale: truncating a string *before* it reaches a `whitespace-pre-wrap` container is what currently strips newlines in `ScenarioCard` (its `truncateText` helper does `.slice()` and returns plain text, discarding structure); doing the truncation inside the component after whitespace is already meaningful avoids re-introducing the same class of bug.
- Alternative considered: keep `truncateText` as-is and just add the CSS class around its output. Rejected — `truncateText`'s `.slice(0, maxLength)` still operates on the string fine (slicing doesn't remove embedded `\n`), but keeping two competing truncation helpers (one local to `ScenarioCard`, one in `MultilineText`) invites drift; consolidating into `MultilineText` removes the duplicate.

**Decision 3: `PublicTrainingCard`'s existing `line-clamp-2` truncation is kept as a raw Tailwind class combination (`line-clamp-2 whitespace-pre-wrap`), not routed through `MultilineText`.**
- Rationale: `line-clamp` is a CSS-only multi-line clamp with no character counting, and `MultilineText`'s `maxLength` prop is character-count based — mixing the two truncation strategies in one component would add branching for no real benefit at a single call site. Adding `whitespace-pre-wrap` directly alongside the existing `line-clamp-2` class is the minimal, correct fix there.
- Alternative considered: extend `MultilineText` with a `clampLines` prop to unify all 9 sites under one component. Rejected for now as unnecessary abstraction for a single caller (YAGNI) — can be revisited if a second `line-clamp` site appears.

**Decision 4: Empty/null handling stays owned by each call site, not centralized in `MultilineText`.**
- Rationale: the 9 sites currently have different empty-state conventions (some show "Sin descripción", others render nothing, others render an em-dash). `MultilineText` only needs to safely render `null`/`undefined`/`''` as nothing so it never throws; the surrounding empty-state text/copy decision remains with each component, matching current behavior exactly (no product/copy decision is being made by this refactor).

## Risks / Trade-offs

- [Risk] `white-space: pre-wrap` can interact unexpectedly with `line-clamp` (WebKit line-clamp truncates by rendered line count, which is unaffected by `pre-wrap`, so this is low risk) → Mitigation: manual visual check on `PublicTrainingCard` after the change, per acceptance criteria in US-0099.
- [Risk] Replacing `ScenarioCard`'s local `truncateText` call for `descripcion` could subtly change output if any other field in that file relies on the same helper → Mitigation: `truncateText` is also used for `direccion`/`coordenadas` in the same file (single-line fields); only the `descripcion` call site is swapped to `MultilineText`, the helper itself is left in place and still used for the other two fields.
- [Risk] Introducing a new `src/components/ui/` folder when it doesn't exist yet could be mistaken for a larger UI-library initiative → Mitigation: scope the folder strictly to `MultilineText` + its `index.ts` export for this change; no other components are moved or added.

## Migration Plan

No data migration. Deployment is a standard frontend release:
1. Add `MultilineText` component (additive, unused until wired in).
2. Update the 9 display sites one at a time to use it (each is an independent, isolated change — can ship/rollback individually if needed).
3. Rollback strategy: revert the specific component's usage (or the whole PR) — no state to unwind since no persisted data changes.

## Open Questions

None outstanding — scope, empty-state ownership, and truncation strategy are resolved above.
