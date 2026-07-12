## 1. Branch Setup

- [x] 1.1 Create feature branch `feat/refactor-landing-hero`
- [x] 1.2 Validate that the current working branch is not `main`, `master`, or `develop`

## 2. Asset And Theme Setup

- [x] 2.1 Copy `projectspec/designs/landing_new_dessign/logo_navbar.png` to `public/landing/logo-navbar.png`
- [x] 2.2 Copy `projectspec/designs/landing_new_dessign/landing_hero_background.png` to `public/landing/landing-hero-background.png`
- [x] 2.3 Update `src/app/layout.tsx` to load Rajdhani and Montserrat without replacing portal typography globally
- [x] 2.4 Extend `tailwind.config.ts` with landing-specific font families and any reusable brand tokens needed by the hero refactor
- [x] 2.5 Add landing-only utilities in `src/app/globals.css` for overlays, hero surfaces, CTA styling, and scoped typography classes

## 3. Page And Component Refactor

- [x] 3.1 Update `src/app/page.tsx` to re-enable `PricingSection` and preserve the landing section composition
- [x] 3.2 Refactor `src/components/landing/Header.tsx` to render the branded desktop navigation labels, anchor links, and `Iniciar sesión` CTA
- [x] 3.3 Refactor `src/components/landing/Header.tsx` responsive behavior so smaller breakpoints avoid horizontal overflow without introducing a hamburger menu
- [x] 3.4 Create `src/components/landing/HeroValueProps.tsx` for the five differentiator items: Procesos, Seguimiento, Comunidad, Enfoque, and Analítica
- [x] 3.5 Refactor `src/components/landing/HeroSection.tsx` to use the approved heading, body copy, CTA hierarchy, and accent divider
- [x] 3.6 Update `src/components/landing/HeroSection.tsx` to use the runtime background asset, dark overlays, and the new `HeroValueProps` component
- [x] 3.7 Add `id="trusted-by"` to `src/components/landing/TrustedBySection.tsx`
- [x] 3.8 Add `id="footer"` to `src/components/landing/Footer.tsx`

## 4. Validation And Regression Checks

- [x] 4.1 Verify desktop header navigation order is `Plataforma`, `Funciones`, `Para equipos`, `Precios`, `Recursos`, plus `Iniciar sesión`
- [x] 4.2 Verify header links and hero CTAs resolve to `#hero`, `#features`, `#trusted-by`, `#pricing`, `#footer`, and `/auth/login` as specified
- [x] 4.3 Test the landing hero on mobile and tablet to confirm no horizontal scrolling, no overlapping text, and clean wrapping of differentiator items
- [x] 4.4 Test the landing hero on desktop to confirm branded logo usage, approved copy, turquoise word highlight, and readable contrast over the background
- [x] 4.5 Verify portal screens do not regress in typography or layout after font/token changes
- [x] 4.6 Confirm landing assets load from `public/landing/` and no runtime code references files under `projectspec/designs/...`

## 5. Documentation And Quality

- [x] 5.1 Review whether `projectspec/03-project-structure.md` must be updated to reflect new landing component structure or font conventions, and update it if the implemented changes affect that documentation
- [x] 5.2 Run the relevant lint, typecheck, or local verification command for the touched landing files
- [x] 5.3 Review the final diff to confirm no unrelated portal or backend files changed

## 6. Commit And Pull Request

- [x] 6.1 Prepare a commit message for the implementation, for example: `feat(landing): refactor hero to match new brand direction`
- [x] 6.2 Prepare a pull request description summarizing the landing header/hero redesign, runtime asset migration, responsive validation, and portal non-regression checks