## Context

The public landing page is implemented in `src/app/page.tsx` and composed from presentation components under `src/components/landing`. The current implementation uses a generic glass-style header, Lexend display typography, and a screenshot-based hero card that no longer reflects the approved GRIT Arena visual system described in `projectspec/designs/landing_new_dessign/DESIGN.md`.

This change is frontend-only, but it spans several layers of the landing slice:

- `page` composition in `src/app/page.tsx`
- `component` work in `src/components/landing/*`
- shared landing `style` tokens in `src/app/globals.css`
- font and token `config` in `src/app/layout.tsx` and `tailwind.config.ts`
- runtime `asset` relocation into `public/landing/`

The key constraint is to adopt the new brand direction without unintentionally changing the look and feel of authenticated portal screens, which currently rely on existing global font and color choices.

## Goals / Non-Goals

**Goals:**
- Deliver a branded landing header and hero aligned with the approved GRIT Arena reference render and design rules.
- Preserve clean separation between landing-specific typography/tokens and the portal UI so authenticated pages do not regress.
- Use runtime-safe static assets under `public/landing/` and avoid direct dependencies on design-source paths.
- Ensure the new header links and hero CTAs resolve to working anchors and login navigation targets.
- Keep the hero readable and usable across mobile, tablet, and desktop breakpoints without horizontal overflow.

**Non-Goals:**
- Redesign the full landing page beyond the header, hero, anchor support, and pricing-section re-enable.
- Introduce new API routes, server actions, analytics services, or database changes.
- Replace the authenticated portal typography or global component styling across unrelated areas.
- Add a new mobile menu pattern beyond the simplified responsive header behavior defined in the user story.

## Decisions

### Decision 1: Isolate brand typography to landing-specific classes

**Choice**: Load Rajdhani and Montserrat in `src/app/layout.tsx`, but expose them through landing-specific class names or CSS variables rather than replacing the global `font-display` behavior used elsewhere.

**Rationale**:
- The landing needs Rajdhani Bold Italic for hero/headline emphasis and Montserrat for body copy.
- The portal already uses global font wiring; replacing it wholesale would create a broad visual regression risk.
- Landing-scoped typography utilities let the hero adopt the new identity while keeping the rest of the application stable.

**Alternatives considered**:
- Replacing the global display font with Rajdhani: rejected because it would change authenticated screens unintentionally.
- Importing fonts directly inside components: rejected because it duplicates loading concerns and makes reuse harder.

### Decision 2: Keep the hero as a component-level refactor, not a new page layout

**Choice**: Refactor `Header.tsx` and `HeroSection.tsx` in place, adding a small extracted component `HeroValueProps.tsx` for the value proposition row.

**Rationale**:
- The landing page is already split into dedicated components under `src/components/landing`.
- Extracting only the value-proposition row keeps the hero readable without over-fragmenting a small slice.
- This follows the project methodology of page -> component -> hook -> service -> types while avoiding unnecessary hook/service churn for a presentation-only change.

**Alternatives considered**:
- Rebuilding the landing as a monolithic page component: rejected because it would reduce reuse and make iteration harder.
- Splitting the hero into many micro-components: rejected because it would add indirection without clear functional benefit.

### Decision 3: Use optimized assets from `public/landing/` with layered overlays

**Choice**: Copy the approved logo and hero background into `public/landing/` and render them through `next/image` where appropriate, with dark overlays and accent glows handled in CSS.

**Rationale**:
- Files inside `projectspec/designs/...` are design references, not runtime assets.
- `public/landing/` keeps deployment-safe static paths and predictable caching.
- The reference design depends on legible text over photography, so overlays must be first-class styling elements rather than image edits.

**Alternatives considered**:
- Using CSS `background-image` directly from design folders: rejected because those paths are not runtime-safe.
- Embedding the background as an unoptimized `<img>`: rejected because it increases layout shift and reduces control.

### Decision 4: Restore navigation targets by wiring existing sections instead of inventing new pages

**Choice**: Re-enable `PricingSection` and add missing `id` attributes to `TrustedBySection` and `Footer`.

**Rationale**:
- The requested desktop navigation expects working in-page destinations.
- Existing landing sections already cover the needed destinations with minimal code change.
- This avoids scope expansion into new marketing routes or empty placeholders.

**Alternatives considered**:
- Pointing links to placeholder `#` anchors: rejected because it fails the user-story acceptance criteria.
- Creating separate pages for pricing/resources: rejected because the story explicitly scopes the work to the landing hero/header slice.

## Risks / Trade-offs

**[Risk] Global font changes leak into portal screens**
→ Mitigation: Use landing-specific font classes/variables and validate unaffected portal surfaces after wiring the new fonts.

**[Risk] The photographic hero background reduces text readability on smaller screens**
→ Mitigation: Apply layered dark gradients, keep copy width constrained, and verify contrast on mobile/tablet breakpoints.

**[Risk] Header navigation labels exceed available space on intermediate widths**
→ Mitigation: Collapse to a simplified header below the desktop breakpoint instead of forcing a cramped multi-link layout.

**[Trade-off] Re-enabling `PricingSection` restores an older section design beneath a newer hero treatment**
→ Mitigation: Accept the temporary visual mismatch because the story only requires anchor continuity, not a full landing redesign.

## Migration Plan

No database or backend migration is required.

Rollout steps:
1. Copy assets into `public/landing/`.
2. Update landing font/token wiring.
3. Refactor the header and hero components.
4. Restore anchors and pricing section composition.
5. Validate responsive behavior and portal non-regression locally before merge.

Rollback strategy:
- Revert the landing component, token, and asset-path changes in the same branch; no data restoration is needed.

## Open Questions

None. The user story defines the copy, assets, anchors, responsive expectation, and product-differentiator value row with enough specificity to implement.