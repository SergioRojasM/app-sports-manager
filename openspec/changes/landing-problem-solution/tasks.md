## 1. Branch Setup

- [x] 1.1 Create feature branch `feat/landing-problem-solution`
- [x] 1.2 Validate that the current working branch is not `main`, `master`, or `develop`

## 2. Problem-Solution Section Implementation

- [x] 2.1 Create `src/components/landing/ProblemSolutionSection.tsx`
- [x] 2.2 Build the top `Problema` surface with label, divider, headline, turquoise emphasis on `sin sistema`, and supporting copy
- [x] 2.3 Build the three structured pain items covering dispersed information, low operational control, and higher administrative effort
- [x] 2.4 Ensure the exact phrase `y cargas de trabajo por seguimiento de atletas` does not appear in the problem block or supporting items
- [x] 2.5 Build the bottom `Solución` surface with label, divider, headline, turquoise emphasis on `profesionalizar`, and supporting copy
- [x] 2.6 Build the four connected solution items for `Atleta`, `Entrenador`, `Operación`, and `Dirección`
- [x] 2.7 Add the closing summary treatment equivalent to `Todo conectado. Todo bajo control.`

## 3. Landing Composition And Styling

- [x] 3.1 Update `src/app/page.tsx` to replace `TrustedBySection` with `ProblemSolutionSection` directly below `HeroSection`
- [x] 3.2 Preserve the `#trusted-by` anchor on the replacement section so header navigation continues to work
- [x] 3.3 Remove the placeholder `WOLFPACK-SXH` ticker from the landing flow
- [x] 3.4 Add landing-scoped utilities in `src/app/globals.css` for problem/solution surfaces, separators, connectors, and badge treatments
- [x] 3.5 Extend `tailwind.config.ts` only if new reusable landing-safe tokens are required by the section implementation

## 4. Validation And Regression Checks

- [x] 4.1 Verify the new problem-solution section renders immediately below the hero and before the features section
- [x] 4.2 Verify `#trusted-by` navigation scrolls to the new replacement section
- [x] 4.3 Test the section on desktop to confirm two-surface layout, pain rows, role flow, and closing summary render correctly
- [x] 4.4 Test the section on tablet and mobile to confirm stacked layout, no horizontal overflow, and readable copy/connectors
- [x] 4.5 Confirm the placeholder ticker is no longer visible anywhere in the landing experience
- [x] 4.6 Confirm no backend, auth, or portal behavior changed as part of this landing-only refactor

## 5. Documentation And Quality

- [x] 5.1 Review whether `projectspec/03-project-structure.md` must be updated to reflect the new landing component structure and update it only if the implementation changes documented structure materially
- [x] 5.2 Run the relevant lint or local verification command for the touched landing files
- [x] 5.3 Review the final diff to confirm the change stayed scoped to landing/OpenSpec artifacts and did not affect unrelated backend or portal files

## 6. Commit And Pull Request

- [x] 6.1 Prepare a commit message for the implementation, for example: `feat(landing): add problem-solution narrative section`
- [x] 6.2 Prepare a pull request description summarizing the section replacement, removed ticker, responsive validation, and preserved `#trusted-by` navigation