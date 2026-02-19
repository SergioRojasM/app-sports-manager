## Context

The change implements the approved login UI from `projectspec/designs/login.html` while keeping the existing authentication flow intact. Current auth behavior is already wired through `LoginForm` → `useAuth` → `authService` (Supabase), and this must remain unchanged functionally. Constraints: follow project architecture from `projectspec/03-project-structure.md`, keep login redirect semantics (`next` query param fallback to `/dashboard`), and avoid scope expansion (no OAuth/reset backend work).

## Goals / Non-Goals

**Goals:**
- Deliver a responsive two-panel login experience aligned with the approved design.
- Preserve existing sign-in behavior, loading/error states, and redirect contract.
- Keep responsibilities separated by layer (page composition, presentational components, hook/service auth logic).
- Keep implementation maintainable by splitting large UI blocks where useful.

**Non-Goals:**
- Adding new auth providers or backend endpoints.
- Implementing full forgot-password or signup feature flows.
- Refactoring auth service/hook contracts beyond what is strictly necessary for the redesign.

## Decisions

1. **Page-level composition in `src/app/auth/login/page.tsx` (Server Component) + client form component**
   - Rationale: keeps routing/search-param concerns close to route while preserving a focused interactive form component.
   - Alternative considered: fully client page. Rejected to avoid unnecessary client boundary expansion.

2. **Split presentation into focused auth UI components (`LoginBenefitsPanel`, optional `LoginCard`)**
   - Rationale: keeps `LoginForm` centered on form behavior, error/loading states, and submit wiring; improves readability and future iteration speed.
   - Alternative considered: one large `LoginForm` component. Rejected due to reduced maintainability.

3. **Preserve existing hook/service flow (`useAuth().signIn` and `authService.signInWithPassword`)**
   - Rationale: lowest-risk path; protects auth correctness and existing middleware/session expectations.
   - Alternative considered: direct Supabase call from component. Rejected because it violates architecture boundaries.

4. **Use Tailwind/theme tokens first; add minimal global styles only if needed**
   - Rationale: consistent theming and lower CSS drift.
   - Alternative considered: heavy custom CSS. Rejected to keep system consistency and simplify maintenance.

5. **Keep “Forgot password” and “Sign up” as navigation-only affordances**
   - Rationale: matches scope; avoids introducing incomplete backend workflows.
   - Alternative considered: implementing reset/signup flows now. Rejected as out of scope.

## Risks / Trade-offs

- [Risk] Visual mismatch against approved design due to token differences → Mitigation: map required colors/radius/spacing in `tailwind.config.ts` minimally and validate across breakpoints.
- [Risk] Redirect regression (`next` parameter) during UI refactor → Mitigation: preserve existing redirect code path and verify `/auth/login?next=/dashboard` behavior.
- [Risk] Accessibility regressions from custom-styled inputs/buttons → Mitigation: keep explicit labels, focus-visible states, keyboard navigation checks, and semantic form controls.
- [Trade-off] Splitting into extra components increases file count → Mitigation: only extract stable UI blocks with clear boundaries.

## Migration Plan

1. Update route composition in `src/app/auth/login/page.tsx` to host redesigned layout.
2. Refactor `src/components/auth/LoginForm.tsx` to redesigned form structure while preserving submit/error/loading flow.
3. Add optional presentational components (`LoginBenefitsPanel`, `LoginCard`) if needed for clarity.
4. Add minimal theme token updates in `tailwind.config.ts` (and `globals.css` only if utilities are insufficient).
5. Verify login success/error/loading and redirect semantics manually.
6. Update `README.md` auth section with login route behavior and design reference.

Rollback strategy: revert changed login UI files to previous versions; no data migration is required and auth backend contracts remain unchanged.

## Open Questions

- Should placeholder links target `/auth/forgot-password` and `/auth/signup` immediately even if routes are not implemented, or remain non-breaking placeholders until those routes exist?
- Are Material Symbols acceptable in-app, or should iconography be replaced with existing project icon primitives (if any)?
