# US-0076 — Refactor Landing Hero To Match New Brand Direction

## ID
US-0076

## Name
Refactor Landing Hero To Match GRIT Arena Reference Design

## As a
Anonymous visitor evaluating the platform

## I Want
to see a premium, high-clarity landing hero that matches the new GRIT Arena visual direction

## So That
I immediately understand the product value and feel confident enough to explore the platform or sign in

---

## Description

### Current State
The landing page is already split into reusable components under `src/components/landing`, and the home route is composed in `src/app/page.tsx`. However, the current hero and header do not match the new GRIT Arena reference design located in `projectspec/designs/landing_new_dessign/`.

Current gaps:

- The hero uses a generic product screenshot (`/app-demo.png`) instead of the new sport-focused branded background.
- The header uses the old icon + text treatment and a sticky glass bar that does not match the reference composition.
- Typography is based on Lexend, while the reference design requires Rajdhani for hero/display text and Montserrat for body copy.
- The hero copy, CTA styling, spacing, and bottom value proposition row do not match the new reference.
- Some top navigation items shown in the design do not currently map to active landing anchors.

### Proposed Changes
Refactor only the landing header + hero experience to align with the provided references:

- Visual reference: `projectspec/designs/landing_new_dessign/landing_render.png`
- Design system reference: `projectspec/designs/landing_new_dessign/DESIGN.md`
- Logo asset source: `projectspec/designs/landing_new_dessign/logo_navbar.png`
- Background asset source: `projectspec/designs/landing_new_dessign/landing_hero_background.png`

#### 1. Header Refactor
- Replace the current sticky glass navbar with a hero-overlay navigation that visually matches the reference.
- Use the provided GRIT Arena logo asset instead of the current `icono_2.png` + text combination.
- Desktop navigation must display these labels in this order:
  - `Plataforma`
  - `Funciones`
  - `Para equipos`
  - `Precios`
  - `Recursos`
- The right-side CTA must read `Iniciar sesión` and navigate to `/auth/login`.
- Navigation links must resolve to real landing anchors in this story:
  - `Plataforma` -> `#hero`
  - `Funciones` -> `#features`
  - `Para equipos` -> `#trusted-by`
  - `Precios` -> `#pricing`
  - `Recursos` -> `#footer`
- On mobile and tablet, the header must remain usable without horizontal overflow. A full hamburger menu is not required for this story; it is acceptable to reduce the visible navigation to the logo and login CTA below the desktop breakpoint.

#### 2. Hero Refactor
- Rebuild `HeroSection` to match the new composition from the reference render.
- Replace the current right-column app preview card with the branded full-bleed sports background treatment using the supplied background artwork.
- Keep the hero content left-aligned on desktop with strong contrast over dark overlays.
- Use the following copy exactly unless the design owner changes it later:
  - Heading: `Donde el deporte evoluciona`
  - Body: `La plataforma que impulsa a atletas y equipos a alcanzar su máximo potencial a través de tecnología, comunidad y conocimiento.`
  - Primary CTA: `Comenzar ahora`
  - Secondary CTA: `Conocer más`
- The word `deporte` in the heading must use the primary turquoise accent treatment.
- Include the short turquoise divider line below the heading block, as shown in the reference.
- Primary CTA must navigate to `/auth/login`.
- Secondary CTA must scroll to `#features`.

#### 3. Value Proposition Row
- Add the five supporting value items shown at the bottom of the hero.
- Each item must contain an icon, a short uppercase title, and a one-line description.
- Content to implement:
  - `Procesos` — `Operación deportiva más ágil.`
  - `Seguimiento` — `Visibilidad total del progreso.`
  - `Comunidad` — `Todos alineados en una sola plataforma.`
  - `Enfoque` — `Menos fricción, más rendimiento.`
  - `Analítica` — `Decisiones basadas en datos.`
- Prefer inline SVG or the already-loaded Material Symbols set; do not add a new icon dependency just for this row.
- On smaller breakpoints, the items must wrap cleanly without clipping or collapsing into unreadable columns.

#### 4. Typography And Theme Tokens
- Implement the typography direction from `DESIGN.md`:
  - Rajdhani Bold Italic for hero/display headings
  - Montserrat for body and supporting text
- Do not globally replace portal typography in a way that changes authenticated screens unintentionally.
- Introduce landing-specific font tokens or utility classes so the landing can adopt the new brand typography without regressing portal pages.
- Update or add landing-specific CSS variables/utilities for:
  - dark background surfaces
  - turquoise accent states
  - subtle glow/overlay effects
  - button styles matching the reference

#### 5. Asset Handling
- Do not reference image files directly from `projectspec/designs/...` at runtime.
- Copy and optimize the required assets into `public/landing/` for production usage.
- Use `next/image` where appropriate to reduce layout shift and improve image loading behavior.
- Preserve readable text contrast by layering gradients/overlays above the background image.

#### 6. Existing Landing Sections
- Keep the rest of the landing page structure intact.
- Re-enable the existing `PricingSection` in `src/app/page.tsx` so the `Precios` header link has a live destination.
- Add missing IDs to existing sections as needed:
  - `TrustedBySection` must expose `id="trusted-by"`
  - `Footer` must expose `id="footer"`
- This story does not require redesigning features, pricing, trusted-by, or footer content beyond what is necessary to support the header anchors and visual continuity.

---

## Database Changes
None. This is a frontend-only refactor. No migrations, tables, columns, constraints, indexes, or RLS policy changes are required.

---

## API / Server Actions
None. This story must not introduce new server actions, API routes, or Supabase service methods.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Layout | `src/app/layout.tsx` | Load Rajdhani and Montserrat fonts in a way that does not regress portal typography |
| Style | `src/app/globals.css` | Add landing-specific design tokens, overlay utilities, and button/font helpers for the new hero |
| Config | `tailwind.config.ts` | Extend landing font families and any reusable brand color tokens needed by the refactor |
| Page | `src/app/page.tsx` | Keep landing composition and re-enable `PricingSection` so the header anchor resolves |
| Component | `src/components/landing/Header.tsx` | Rebuild the landing header to match the reference layout and anchor behavior |
| Component | `src/components/landing/HeroSection.tsx` | Rebuild hero layout, copy, CTA styling, background treatment, and responsive behavior |
| Component | `src/components/landing/HeroValueProps.tsx` | New extracted component for the five value proposition items |
| Component | `src/components/landing/TrustedBySection.tsx` | Add `id="trusted-by"` anchor support |
| Component | `src/components/landing/Footer.tsx` | Add `id="footer"` anchor support |
| Asset | `public/landing/logo-navbar.png` | Add optimized runtime copy of the provided navbar logo |
| Asset | `public/landing/landing-hero-background.png` | Add optimized runtime copy of the provided hero background |

---

## Acceptance Criteria

1. The landing header and hero visually follow the reference in `projectspec/designs/landing_new_dessign/landing_render.png`, including dark premium background treatment, turquoise highlights, left-aligned copy, and branded logo usage.
2. The desktop header displays the labels `Plataforma`, `Funciones`, `Para equipos`, `Precios`, `Recursos`, plus the `Iniciar sesión` CTA, with no horizontal overflow at `1280px` width.
3. Header links resolve to working landing anchors: `#hero`, `#features`, `#trusted-by`, `#pricing`, and `#footer`; `Iniciar sesión` navigates to `/auth/login`.
4. The hero heading renders `Donde el deporte evoluciona`, with `deporte` highlighted in the primary turquoise accent, and the supporting body copy matches the story text exactly.
5. The primary CTA `Comenzar ahora` navigates to `/auth/login`, and the secondary CTA `Conocer más` scrolls to `#features`.
6. The hero uses production assets from `public/landing/` and does not load images directly from `projectspec/designs/...`.
7. The new hero remains readable and usable on mobile and tablet: no clipped text, no overlapping CTAs, no horizontal scroll, and the value proposition row wraps cleanly.
8. Landing-specific Rajdhani and Montserrat styling is applied to the hero/header without visually regressing authenticated portal screens.
9. The existing `PricingSection` is re-enabled so the `Precios` navigation item has a real destination.
10. No database migrations, no API routes, and no Supabase service changes are introduced by this story.

---

## Implementation Steps

- [ ] Copy the provided logo and hero background into `public/landing/` and optimize filenames for runtime usage
- [ ] Load Rajdhani and Montserrat in `src/app/layout.tsx` and expose landing-safe font hooks/classes
- [ ] Add landing-specific style tokens/utilities in `src/app/globals.css` and `tailwind.config.ts`
- [ ] Rebuild `src/components/landing/Header.tsx` to match the new navigation layout and CTA
- [ ] Rebuild `src/components/landing/HeroSection.tsx` to match the new copy, CTA hierarchy, and background composition
- [ ] Create `src/components/landing/HeroValueProps.tsx` and wire it into the hero
- [ ] Re-enable `PricingSection` in `src/app/page.tsx`
- [ ] Add missing section IDs to `TrustedBySection` and `Footer`
- [ ] Test manually on desktop, tablet, and mobile breakpoints
- [ ] Verify login CTA routing and in-page anchor behavior
- [ ] Confirm no portal page typography or layout regressions were introduced

---

## Non-Functional Requirements

- **Security**: No auth flow changes are allowed. All CTAs that enter the app must continue using the existing `/auth/login` route. Do not expose internal design-source paths in runtime code.
- **Performance**: Use optimized static assets from `public/landing/`. Avoid layout shift on hero image render. Prefer `next/image` and responsive sizing. Reuse existing CSS utilities where possible.
- **Accessibility**: Keep a single semantic `h1` in the hero, provide meaningful `alt` text for logo/background usage, maintain visible focus states on buttons/links, and ensure keyboard users can reach all header actions and CTAs.
- **Error handling**: If an image fails to load, the hero must still present readable text over a dark fallback background. In-page anchor links must fail gracefully without causing JavaScript errors.