# US-0077 — Add Landing Problem-Solution Section

## ID
US-0077

## Name
Add Problem-Solution Section To Landing Page

## As a
Anonymous visitor evaluating the platform

## I Want
to understand the operational problems the platform solves and how the product connects the full sports operation

## So That
I can quickly recognize the business value of the platform and see how it replaces fragmented manual workflows

---

## Description

### Current State
The landing page currently includes a narrow trust band rendered by `src/components/landing/TrustedBySection.tsx`, with the heading `Confían en nuestra tecnología`, a short supporting sentence, and a ticker with repeated placeholder names. That section does not clearly explain the operational pain points faced by clubs or how the platform resolves them through connected workflows.

The current landing structure in `src/app/page.tsx` renders:

- `Header`
- `HeroSection`
- `TrustedBySection`
- `FeaturesSection`
- `PricingSection`
- `Footer`

This means the landing goes from hero directly into a lightweight social-proof strip instead of a stronger narrative section that frames the problem and the solution.

### Proposed Changes
Create a new landing section that visually follows the reference `projectspec/designs/landing_new_dessign/problem-solution.png` and replaces the current trust/ticker strip with a more intentional problem-solution narrative.

#### 1. Section Purpose And Placement
- Replace the current `TrustedBySection` in `src/app/page.tsx` with a new `ProblemSolutionSection` placed immediately below `HeroSection` and before `FeaturesSection`.
- Preserve the section anchor `id="trusted-by"` or introduce an equivalent stable anchor so the existing header navigation target `#trusted-by` continues to work without breaking the landing navigation.
- The new section must feel like a continuation of the hero visual system, using the same GRIT Arena dark premium styling direction from `DESIGN.md`.

#### 2. Visual Layout
- Build the section as two stacked content surfaces inspired by the reference image:
  - **Problem block** on top
  - **Solution block** below
- Each block must use rounded containers, subtle borders, tonal depth, and turquoise highlights instead of heavy shadows.
- Layout should follow the reference composition:
  - Left column: small label, divider, large statement, supporting paragraph
  - Right column: structured items/diagram-like explanatory content
- The solution block should visually communicate connected operational flow across roles or modules.
- The section must remain readable and coherent on mobile and tablet. On smaller breakpoints, the two-column content must stack cleanly without clipped copy or broken decorative connectors.

#### 3. Problem Block Content
- Add a top label: `Problema`
- Add a hero-style statement aligned with the reference concept:
  - `Cuando tu club crece, operar sin sistema empieza a costar caro`
- Apply turquoise emphasis to the phrase `sin sistema`.
- Add supporting body copy explaining the operational pain points of fragmented tools and manual coordination.
- The problem explanation must communicate these themes:
  - scattered communication
  - spreadsheet dependency
  - hard-to-track reservations, payments, and trainings
  - higher operational error risk
  - less time to focus on growth

#### 4. Problem Evidence / Pain Items
- The right side of the problem block must include three concise pain items styled as structured rows/cards/steps, based on the reference image.
- Required themes for the three items:
  1. Information dispersed across chats, spreadsheets, and manual processes
  2. Low control over subscriptions, payments, statuses, or attendance
  3. More administrative work and less focus on sports operations
- Important copy constraint:
  - Do **not** include the phrase `y cargas de trabajo por seguimiento de atletas`
  - Any wording that implies the same idea must be expressed more clearly and naturally, but without that exact phrase

#### 5. Solution Block Content
- Add a top label: `Solución`
- Add a large statement aligned with the reference concept:
  - `Un sistema pensado para profesionalizar la gestión deportiva`
- Apply turquoise emphasis to the word `profesionalizar`.
- Add a supporting paragraph explaining that the platform connects administrative, commercial, and sports operations into one traceable flow.
- The explanation must communicate that:
  - athletes reserve according to their plan
  - coaches manage sessions and workloads
  - operations controls payments, bookings, attendance, and communication
  - leadership gets visibility for faster and better decisions

#### 6. Solution Flow / Connected Roles
- Add a structured visual row or grid for four connected operational roles/capabilities, following the reference composition:
  - `Atleta`
  - `Entrenador`
  - `Operación`
  - `Dirección`
- Each item must include:
  - an icon
  - uppercase title
  - a short descriptive sentence
- Add a final connected-summary badge or closing statement equivalent to:
  - `Todo conectado. Todo bajo control.`
- Use CSS and existing iconography/material symbols or inline SVG only. Do not add a new dependency just for diagrams or icons.

#### 7. Replace Placeholder Trust Ticker
- Remove the repeated placeholder `WOLFPACK-SXH` ticker from the landing flow.
- If any social-proof or trust label remains, it must support the new problem-solution narrative instead of functioning as a standalone placeholder marquee.
- The old ticker must not remain visible in the final section.

#### 8. Styling And Reuse Constraints
- Follow the existing landing brand tokens already introduced in:
  - `src/app/globals.css`
  - `tailwind.config.ts`
- Reuse the established landing typography direction:
  - Rajdhani for section labels/headlines where appropriate
  - Montserrat for supporting body copy
- Any new utilities must stay landing-scoped and must not regress portal/authenticated areas.

#### 9. Runtime Assets And References
- Use `projectspec/designs/landing_new_dessign/problem-solution.png` as a visual reference only.
- Do not render the PNG itself directly as the final UI.
- Recreate the section in code using HTML/CSS/Tailwind and existing landing utility patterns.
- Use `projectspec/designs/landing_new_dessign/logo_navbar.png` only as a continuity reference for visual language; no new runtime logo placement is required inside this section unless the final implementation needs it.

---

## Database Changes
None. This is a frontend-only landing-content and layout change. No migrations, tables, columns, constraints, indexes, or RLS changes are required.

---

## API / Server Actions
None. This story must not introduce server actions, API routes, or Supabase service changes.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Page | `src/app/page.tsx` | Replace `TrustedBySection` in the landing composition with the new problem-solution section |
| Component | `src/components/landing/ProblemSolutionSection.tsx` | New section implementing the full problem/solution layout and copy |
| Component | `src/components/landing/TrustedBySection.tsx` | Remove from landing flow or deprecate usage if still needed temporarily during migration |
| Style | `src/app/globals.css` | Add any new landing-scoped utilities needed for problem/solution surfaces, connectors, and highlights |
| Config | `tailwind.config.ts` | Extend landing-safe tokens only if the section needs new reusable colors or sizes |

---

## Acceptance Criteria

1. The landing page renders a new problem-solution section immediately below the hero and before the features section.
2. The new section visually follows the structure and styling direction of `projectspec/designs/landing_new_dessign/problem-solution.png`, using code-based UI rather than embedding the image as content.
3. The top block presents the `Problema` label, the statement `Cuando tu club crece, operar sin sistema empieza a costar caro`, and supporting explanatory copy.
4. The phrase `sin sistema` is visually highlighted in the landing turquoise accent.
5. The problem block includes three pain items covering dispersed information, low operational control, and higher administrative burden.
6. The exact phrase `y cargas de trabajo por seguimiento de atletas` does not appear anywhere in the final section.
7. The bottom block presents the `Solución` label, the statement `Un sistema pensado para profesionalizar la gestión deportiva`, and supporting explanatory copy.
8. The word `profesionalizar` is visually highlighted in the landing turquoise accent.
9. The solution block includes four connected role/capability items: `Atleta`, `Entrenador`, `Operación`, and `Dirección`, each with icon and short supporting copy.
10. The section includes a closing connected-summary treatment equivalent to `Todo conectado. Todo bajo control.`
11. The previous `WOLFPACK-SXH` ticker is no longer visible in the landing flow.
12. The `#trusted-by` navigation target continues to resolve correctly after the section replacement.
13. The section is responsive on mobile, tablet, and desktop without horizontal overflow, clipped connectors, or unreadable copy.
14. No backend, database, or auth-flow behavior changes are introduced.

---

## Implementation Steps

- [ ] Create `src/components/landing/ProblemSolutionSection.tsx`
- [ ] Recreate the problem-solution layout from the design reference using HTML/CSS/Tailwind
- [ ] Add the approved problem and solution copy with turquoise emphasis on the required words
- [ ] Build the three problem items on the right side of the top block
- [ ] Build the four connected solution role/capability items in the lower block
- [ ] Add the final connected-summary badge or callout
- [ ] Replace `TrustedBySection` in `src/app/page.tsx` with the new section while preserving the trusted-by anchor behavior
- [ ] Remove the placeholder ticker from the landing experience
- [ ] Add any landing-scoped CSS utilities needed in `src/app/globals.css`
- [ ] Extend `tailwind.config.ts` only if reusable new tokens are required
- [ ] Test manually on desktop, tablet, and mobile breakpoints
- [ ] Verify header navigation to `#trusted-by` still works
- [ ] Verify the excluded phrase does not appear in the section
- [ ] Update any affected documentation if the landing component structure changes materially

---

## Non-Functional Requirements

- **Security**: No auth, routing, database, or RLS changes are allowed. Any in-page links must remain internal and safe. No external script or diagram library should be introduced for this section.
- **Performance**: Recreate the layout using code and existing assets/utilities. Avoid heavy client-side animation or large new dependencies. Keep decorative connectors lightweight and CSS-driven where possible.
- **Accessibility**: Maintain semantic section headings, readable contrast, keyboard-safe links, and responsive text scaling. Decorative lines/connectors must not interfere with screen-reader navigation.
- **Error handling**: The section must degrade gracefully if decorative styling fails. Core copy and structure must remain readable even if icons or non-essential visual accents do not render.