## Context

The public landing page currently transitions from the hero into `TrustedBySection`, a narrow band that contains a heading, a short sentence, and a placeholder marquee ticker. That slice does not communicate the operational pain points faced by sports clubs or explain how GRIT Arena connects the full workflow from athlete actions through leadership visibility.

This change is frontend-only, but it spans multiple layers of the landing slice:

- `page` composition in `src/app/page.tsx`
- a new `component` in `src/components/landing/ProblemSolutionSection.tsx`
- migration/deprecation of the current `TrustedBySection` usage
- landing-scoped `style` extensions in `src/app/globals.css`
- optional reusable token additions in `tailwind.config.ts`

The main constraint is to replace the placeholder trust/ticker experience with a stronger narrative section while preserving the existing `#trusted-by` header navigation contract and staying within the current GRIT Arena landing visual language.

## Goals / Non-Goals

**Goals:**
- Replace the current trust/ticker strip with a code-built problem-solution section based on the approved visual reference.
- Preserve the landing flow order: hero -> problem/solution -> features.
- Keep the `#trusted-by` anchor working after the section replacement.
- Use existing landing typography, colors, and utilities so the new section feels native to the current landing redesign.
- Ensure the two-surface section remains readable and structurally coherent on mobile, tablet, and desktop.

**Non-Goals:**
- Redesigning hero, features, pricing, or footer sections as part of this change.
- Introducing backend-driven trust signals, customer logos, or CMS-managed marketing content.
- Adding external libraries for diagrams, timeline drawing, or icon rendering.
- Changing auth flows, server actions, database structure, or portal-side features.

## Decisions

### Decision 1: Replace `TrustedBySection` in page composition instead of mutating it in place

**Choice**: Create a new `ProblemSolutionSection.tsx` and swap it into `src/app/page.tsx`, rather than stretching `TrustedBySection.tsx` into a fundamentally different section.

**Rationale**:
- The new layout is a narrative, diagram-like section rather than a trust ticker.
- A new component keeps responsibilities clear and avoids carrying placeholder ticker behavior into the future.
- The old section can be deprecated cleanly without coupling new logic to marquee-specific markup.

**Alternatives considered**:
- Reworking `TrustedBySection.tsx` into the new layout: rejected because the new concept is semantically and structurally different.
- Embedding the reference PNG directly: rejected because the user story requires recreating the UI in code.

### Decision 2: Preserve `#trusted-by` as a compatibility anchor

**Choice**: The new `ProblemSolutionSection` will own `id="trusted-by"` to maintain compatibility with existing header navigation.

**Rationale**:
- The current header already points one landing navigation item to `#trusted-by`.
- Preserving the anchor avoids widening scope into header changes for this story.
- This keeps the replacement implementation invisible to navigation consumers.

**Alternatives considered**:
- Renaming the anchor to `#problem-solution`: rejected because it would require coordinated header changes and weaken backward compatibility.

### Decision 3: Use two stacked surfaces with CSS-built connectors and rows

**Choice**: Recreate the reference layout using two rounded containers, grid/flex composition, and lightweight CSS connectors or separators, plus existing Material Symbols or inline SVG.

**Rationale**:
- The reference is structured but not interactive enough to justify a dependency-heavy diagram solution.
- CSS-driven separators and connectors are cheaper, easier to maintain, and match the landing’s current utility-first styling approach.
- The existing landing tokens already cover borders, surfaces, accent colors, and typography.

**Alternatives considered**:
- SVG-first full layout composition: rejected because it makes responsive text flow harder to maintain.
- Canvas/animation library: rejected as unnecessary complexity.

### Decision 4: Keep copy constraints explicit in implementation

**Choice**: Treat the excluded phrase `y cargas de trabajo por seguimiento de atletas` as a hard copy constraint and encode the intended pain themes directly in the section content.

**Rationale**:
- The user story explicitly removes that wording.
- Copy drift is a common failure mode in marketing sections; keeping the constraint explicit reduces accidental reintroduction.

**Alternatives considered**:
- Leaving the copy loosely interpreted: rejected because it invites ambiguity and review churn.

## Risks / Trade-offs

**[Risk] The two-surface desktop composition becomes visually crowded on smaller widths**
→ Mitigation: Use stacked mobile layouts and simplify decorative connectors below desktop breakpoints.

**[Risk] Replacing the old section breaks the existing header anchor behavior**
→ Mitigation: Preserve `id="trusted-by"` directly on the new section root and verify navigation after implementation.

**[Risk] Decorative diagram lines make text harder to scan**
→ Mitigation: Keep connectors low-contrast and non-essential; content blocks must remain readable without them.

**[Trade-off] The new section removes the only explicit “social proof” band in the current landing**
→ Mitigation: Accept this because the goal of the section is narrative clarity, not testimonial proof; social proof can be reintroduced later with real data.

## Migration Plan

No database or backend migration is required.

Rollout steps:
1. Build the new `ProblemSolutionSection` component.
2. Swap it into `src/app/page.tsx` in place of `TrustedBySection`.
3. Add any landing-scoped utilities required for surfaces, separators, and summary badge treatments.
4. Validate responsive behavior and anchor continuity.
5. Remove or stop rendering the placeholder ticker from the landing flow.

Rollback strategy:
- Revert `src/app/page.tsx`, the new component, and any associated landing CSS/token changes. No data rollback is needed.

## Open Questions

None. The user story defines the section purpose, reference layout, copy direction, excluded phrase, and placement constraints with enough specificity to proceed.