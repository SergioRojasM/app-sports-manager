## Why

The landing page still relies on a lightweight trust strip and placeholder ticker instead of explaining the operational problems sports clubs face and how GRIT Arena resolves them. This change is needed now because the visual reference and copy direction already exist, and the current landing flow misses a key narrative section that turns product value into a concrete before/after story.

## What Changes

- Replace the current landing trust band/ticker with a new problem-solution section rendered directly in code.
- Add a top problem block that explains why operating a growing club without a system becomes expensive and error-prone.
- Add a bottom solution block that shows how GRIT Arena connects athletes, coaches, operations, and leadership in one traceable flow.
- Preserve the existing `#trusted-by` landing navigation target while replacing the underlying section implementation.
- Remove the repeated `WOLFPACK-SXH` placeholder ticker from the landing experience.
- Add any landing-scoped styling utilities needed to support the new two-surface layout, connectors, and role flow visuals.

## Capabilities

### New Capabilities
- `landing-problem-solution`: Defines a narrative landing section that presents the operational problem, the connected-platform solution, and the supporting role/capability flow below the hero.

### Modified Capabilities
- None. No existing OpenSpec capability currently defines this landing problem-solution behavior.

## Impact

**Affected code**:
- `src/app/page.tsx`
- `src/components/landing/ProblemSolutionSection.tsx` (new)
- `src/components/landing/TrustedBySection.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`

**No impact to**:
- Database schema, migrations, or RLS policies
- API routes, server actions, or Supabase services
- Authentication flows or portal business logic
- External dependencies, provided the section is recreated using existing CSS/Tailwind patterns and iconography

## Non-Goals

- Redesigning the hero, pricing, features, or footer sections as part of this change
- Introducing real customer logos, testimonials, or backend-driven social proof data
- Adding a new diagramming library, animation framework, or marketing CMS integration
- Changing any portal page, authenticated route, or server-side behavior

## Files to be Modified or Created

| File | Type | Change |
|------|------|--------|
| `src/app/page.tsx` | Modify | Replace `TrustedBySection` with the new problem-solution section in landing composition |
| `src/components/landing/ProblemSolutionSection.tsx` | Create | Implement the full problem/solution narrative section |
| `src/components/landing/TrustedBySection.tsx` | Modify | Remove legacy ticker usage or deprecate the component from landing flow |
| `src/app/globals.css` | Modify | Add landing-scoped utilities for surfaces, connectors, and problem-solution accents |
| `tailwind.config.ts` | Modify | Add reusable landing-safe tokens only if the section requires them |

## Step-by-Step Implementation Plan

1. Create the new `ProblemSolutionSection` component using the approved layout and copy direction from the user story.
2. Replace the old trust/ticker section in `src/app/page.tsx` while preserving the `#trusted-by` anchor contract.
3. Add any landing-only styling helpers needed for the two stacked surfaces, row items, role flow, and summary badge.
4. Remove the placeholder ticker from the landing experience.
5. Validate responsive behavior, navigation continuity, and copy constraints, including removal of the excluded phrase.