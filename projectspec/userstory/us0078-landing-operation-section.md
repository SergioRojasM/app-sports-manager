# US-0078 — Landing Sports Operation Section

## ID
US-0078

## Name
Landing Sports Operation Section (Operación Deportiva)

## As a
Visitor evaluating GRIT Arena on the public landing page (prospective club/organization administrator)

## I Want
To see a dedicated "Operación deportiva" section, placed right after the Problem/Solution section, that visually explains how the platform centralizes trainings, sports spaces, and athletes/coaches into one connected operation — with a product mockup illustration and a subtle entrance animation when the section scrolls into view

## So That
I can quickly understand the operational breadth of the product (not just the sales pitch) before deciding to request a demo, reinforcing trust through a realistic product preview

---

## Description

### Current State
The landing page (`src/app/page.tsx`) renders, in order: `Header`, `HeroSection`, `ProblemSolutionSection`, `FeaturesSection`, `PricingSection`, `Footer`. There is no section that visually breaks down the "day-to-day operation" modules (trainings, spaces, athletes/coaches) with a product-like mockup.

The design reference is the Pencil file `projectspec/designs/pencil/grit-arena.pen`, frame `Modulos Operacion Section` (node id `qbf0h`). A flattened reference screenshot is available at `projectspec/designs/landing_new_dessign/modulos-operacion.png`.

Background images for the three module cards already exist and are unused:
- `public/landing/operation/entrenamientos.png`
- `public/landing/operation/espacios-deportivos-v.png`
- `public/landing/operation/atletas-entrenadores-v-2.png`

A dashboard product screenshot also already exists and is unused:
- `public/landing/operation/dashboard-entrenamientos.png`

(Other files in that folder — `espacios-deportivos.png`, `atletas-entrenadores.png`, `atletas-entrenadores-v.png`, `*.jpeg` — are earlier alternates and must **not** be used; they should be left in place but not referenced.)

There is currently no scroll-triggered entrance animation utility anywhere in the landing components (`grep` for `IntersectionObserver`/`useInView`/`framer-motion` in `src/components/landing` returns nothing, and `framer-motion` is not a dependency). Any "simple effect on scroll into view" must be built with a small custom hook using `IntersectionObserver` — no new npm dependency should be added.

### Proposed Changes

Add a new landing section component, **`OperationSection`**, rendered in `src/app/page.tsx` immediately after `ProblemSolutionSection` and before `FeaturesSection`:

```tsx
<HeroSection />
<ProblemSolutionSection />
<OperationSection />
<FeaturesSection />
```

Follow the existing feature-slice convention (see `components/portal/servicios/` as precedent) since this section has enough internal structure to warrant sub-components, unlike the single-file `ProblemSolutionSection.tsx`:

```
components/landing/operation/
├── OperationSection.tsx          # Orchestrator, exported as default from index.ts
├── OperationDashboardImage.tsx   # Real product screenshot, tilted and "popping out" of its frame
├── OperationModuleCard.tsx       # Reusable card: icon, title, checklist, background image + gradient overlay
├── OperationConnectedBar.tsx     # Bottom "Todo conectado." bar with 5 connected steps
└── index.ts                      # Re-exports OperationSection as default
```

New shared hook for the scroll-reveal effect (reusable by any landing section, not just this one):

```
hooks/landing/useScrollReveal.ts
```

#### 1. `OperationSection.tsx` (section shell + left column copy)

- `<section id="operacion" className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">` wrapping a `mx-auto w-full max-w-[1280px]` container, dark background consistent with the rest of the landing (`--landing-bg`), matching the section padding rhythm used by `ProblemSolutionSection`/`FeaturesSection`.
- Left column (`max-w-[620px]`), reusing the same text treatment pattern as `ProblemSolutionSection`:
  - Eyebrow: `OPERACIÓN DEPORTIVA` — `font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary` (match Hero's eyebrow tracking, since this eyebrow sits alone without an accent bar variant used in ProblemSolutionSection).
  - `landing-divider` element below the eyebrow.
  - Headline (`h2`), three lines, `font-landing-display text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]`:
    - Line 1: `Gestiona toda la` — `text-landing-text`
    - Line 2: `operación deportiva` — `text-landing-primary`
    - Line 3: `desde un solo lugar` — `text-landing-text`
  - Description paragraph: `Desde la programación de entrenamientos hasta la administración del equipo y la infraestructura, toda la operación deportiva trabaja conectada para mantener el control del club.` — `font-landing-body text-base leading-8 text-landing-text-secondary sm:text-lg`.
- Right column: renders `OperationDashboardImage`, a single real screenshot (no more built-from-scratch fake UI) using `public/landing/operation/dashboard-entrenamientos.png`.
- Layout: `grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center` for the top row (copy + image), matching the two-column pattern already used in `ProblemSolutionSection`.
- Below the top row: `OperationModuleCard` × 3 in a `grid gap-6 lg:grid-cols-3` row.
- Below the cards: `OperationConnectedBar`.
- Wrap the section content (or its two major inner blocks: top row, cards row, connected bar) with the `useScrollReveal` hook so each block fades/slides in independently and slightly staggered as the user scrolls down (see §5).

#### 2. `OperationDashboardImage.tsx` (decorative, `aria-hidden="true"`)

Replaces the earlier "fake UI mockup" approach: a single real product screenshot (`public/landing/operation/dashboard-entrenamientos.png`), tilted in perspective and visually "popping out" of its containing frame, rather than a literal built-from-scratch dashboard illustration.

- Purely decorative — mark the root element `aria-hidden="true"` (the section's accessible name/description continues to come from the `h2` headline, see Non-Functional Requirements).
- Structure: a `relative` wrapping container that defines a "frame" (subtle rounded rectangle using `.landing-operation-mockup`, acting as the backdrop the image appears to break out of — e.g. a soft-bordered panel with the teal radial glow already used elsewhere, `--landing-primary` at low opacity, similar in spirit to `.landing-hero-glow`), sized responsively (e.g. `max-w-[620px]` desktop, scaling down on smaller breakpoints).
- The image itself (`next/image`, `dashboard-entrenamientos.png`) is rendered *larger than* and *offset from* that backdrop frame so it visually overflows/pops out of it:
  - Apply a 3D-ish tilt via `transform: perspective(1200px) rotateX(?) rotateY(?) rotateZ(?)` (small angles, e.g. `rotateY(-8deg) rotateX(4deg) rotateZ(-2deg)` — tune visually against the reference so it reads as a natural "leaning out of the screen" tilt, not a jarring skew).
  - Position it so part of it overflows the backdrop's edges (e.g. `absolute -right-6 -top-6 w-[110%]` or similar, using negative insets/`translate` so at least the top and one side visibly break past the frame boundary), combined with `drop-shadow`/`box-shadow` to reinforce the "popping out / floating above the page" depth effect.
  - `overflow-visible` on the wrapping container (do **not** clip the image with `overflow-hidden`, since the point is for it to spill outside its frame).
- On hover (desktop only, optional nice-to-have) the tilt may ease slightly toward flat via `transition-transform duration-500`, purely as a polish detail — not required for acceptance.
- On mobile/small screens, reduce the tilt angles and overflow amount (or set the transform to a smaller, safer tilt) so the image doesn't get clipped by the viewport or overlap adjacent content awkwardly; ensure no horizontal scrollbar is introduced by the overflow technique (constrain via the parent's `overflow-x: hidden` at the section level if needed, without clipping vertically).

#### 3. `OperationModuleCard.tsx`

Reusable presentational component, props:
```ts
interface OperationModuleCardProps {
  icon: string;        // Material Symbols icon name
  title: string;
  items: string[];      // checklist labels
  backgroundImage: string; // public path
}
```
Rendering, matching the design's `Module Card *` frames:
- `relative overflow-hidden rounded-2xl` card, fixed aspect similar to the design (`~408×420` desktop, responsive height e.g. `min-h-[420px]` on `lg`, stacking to auto height on mobile).
- Background: `next/image` with `fill` + `object-cover` using `backgroundImage`, plus a dark gradient overlay (`bg-gradient-to-t from-[#07111F] via-[#0B1526]/85 to-transparent`) so the checklist stays legible over the photo, per the design's per-card gradient stops.
- Foreground content (`relative z-10`, `flex flex-col gap-3.5 p-7`):
  - Icon circle: `size-14 rounded-full bg-landing-primary/10 border border-landing-primary/20` with the Material Symbols icon in teal.
  - Title: `font-landing-display text-[22px] font-bold italic text-landing-text`.
  - Small teal divider (reuse a `landing-divider`-style small bar, ~40px wide).
  - Checklist: each item a row with a teal `check_circle` icon + label (`text-landing-text` / `#E6EDF3`, `font-landing-body`).
- Instantiate 3 times from `OperationSection` with this content (matching the design 1:1):

| Card | Icon | Background | Checklist |
|------|------|------------|-----------|
| Entrenamientos | `calendar_month` | `/landing/operation/entrenamientos.png` | Sesiones únicas y recurrentes; Reservas y asistencia; Control de cupos; Publicación de actividades |
| Espacios deportivos | `corporate_fare` | `/landing/operation/espacios-deportivos-v.png` | Escenarios; Horarios; Disponibilidad; Optimización de infraestructura |
| Atletas y entrenadores | `group` | `/landing/operation/atletas-entrenadores-v-2.png` | Roles y permisos; Niveles deportivos; Estados; Accesos; Suspensiones |

#### 4. `OperationConnectedBar.tsx`

A single bar (`rounded-2xl border border-landing-border bg-[#16233864] px-8 py-6`), `flex` with `justify-between items-center`, wrapping on mobile:
- Left: a teal circular icon (`shield`, in a `bg-landing-primary/10 border border-landing-primary/20` circle) + two stacked lines of text: `Todo conectado.` (`text-landing-text`) and `Más control, mejor operación.` (`text-landing-primary`), both `font-landing-display italic font-bold`.
- Right: a horizontal row of 5 steps, each a small icon circle (`border border-landing-border`) + label below it, connected by short horizontal divider lines between consecutive steps (new CSS class, see below). Steps in order: `Entrenamientos` (`link`), `Espacios` (`sync_alt`), `Atletas` (`group`), `Reglas` (`gavel`), `Reportes` (`bar_chart`) — labels `text-landing-text-secondary text-[11px]` uppercase-free (sentence case, as in design).
- On small screens, stack left block above the steps row and allow the steps row to scroll horizontally or wrap centered — no design spec exists for mobile here, so use reasonable responsive judgment consistent with the rest of the landing page's mobile behavior (see US-0072 mobile responsive fixes precedent).

#### 5. `useScrollReveal` hook ("simple effects on scroll into view")

`src/hooks/landing/useScrollReveal.ts`:
```ts
'use client';
import { useEffect, useRef, useState } from 'react';

export function useScrollReveal<T extends HTMLElement>(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.2, rootMargin: options?.rootMargin ?? '0px 0px -60px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, isVisible };
}
```
- Fires once (disconnects after first intersection) — no repeated re-triggering on scroll up/down.
- Respects `prefers-reduced-motion: reduce` by rendering visible immediately, no animation.
- `OperationSection` (and/or its major inner blocks: copy+image row, module cards row, connected bar) each call this hook and apply a small stagger via inline `transitionDelay` or Tailwind `delay-*` utilities, toggling classes:
  - Hidden state: `opacity-0 translate-y-6`
  - Visible state: `opacity-100 translate-y-0`
  - Transition: `transition-all duration-700 ease-out` (new `landing-reveal` utility class added to `globals.css` for the base transition, to keep the effect consistent and avoid repeating the same duration/easing string across components).
- This must be the **only** new animation mechanism — do not add `framer-motion` or any other animation dependency.

#### 6. `globals.css` additions

Add new utility classes inside the existing `@layer utilities` block (after `.landing-summary-badge`), following the naming convention of existing `landing-*` classes:
- `.landing-reveal` — base class defining the `opacity`/`transform` transition (`transition: opacity 700ms ease-out, transform 700ms ease-out;`), combined in components with conditional `opacity-0 translate-y-6` / `opacity-100 translate-y-0` Tailwind classes based on `isVisible`.
- `.landing-operation-mockup` — backdrop "frame" treatment behind the tilted dashboard image: soft border + radial teal glow (reuse `--landing-surface-elevated`, `--landing-border`, `--landing-primary` tokens, consistent with `.landing-panel` / `.landing-hero-glow`).
- `.landing-operation-image-pop` — the tilt + depth treatment applied to `OperationDashboardImage`'s `<Image>` element: `transform: perspective(1200px) rotateY(-8deg) rotateX(4deg) rotateZ(-2deg);` plus a `drop-shadow`/`box-shadow` for the "popping out" depth cue, and `transition: transform 500ms ease-out;` for the optional hover ease.
- `.landing-step-connector` — thin 1px horizontal line (`background: rgba(33, 50, 71, 0.5)`), used between connected-bar steps, analogous in spirit to `.landing-solution-connector` but horizontal and simpler (no dot pseudo-elements needed — the design's step connectors are plain lines, not dotted with end caps).

---

## Database Changes

Not applicable — this is a static, presentational landing page section with no persisted or dynamic data. No migrations, tables, or RLS policies are required.

---

## API / Server Actions

Not applicable — no server actions, API routes, or Supabase calls are introduced. All content is hardcoded copy/icons/images, consistent with the other landing sections (`ProblemSolutionSection`, `FeaturesSection`).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/landing/operation/OperationSection.tsx` | New — section shell, left column copy, layout, wires scroll reveal + sub-components |
| Component | `src/components/landing/operation/OperationDashboardImage.tsx` | New — tilted, "popping out" dashboard screenshot |
| Component | `src/components/landing/operation/OperationModuleCard.tsx` | New — reusable module card (icon, title, checklist, background image) |
| Component | `src/components/landing/operation/OperationConnectedBar.tsx` | New — bottom "Todo conectado." bar with 5 connected steps |
| Component | `src/components/landing/operation/index.ts` | New — re-exports `OperationSection` as default |
| Hook | `src/hooks/landing/useScrollReveal.ts` | New — IntersectionObserver-based reveal hook, reduced-motion aware |
| Page | `src/app/page.tsx` | Import `OperationSection` and render it between `ProblemSolutionSection` and `FeaturesSection` |
| Styles | `src/app/globals.css` | Add `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector` utility classes |
| Assets (existing, no change) | `public/landing/operation/dashboard-entrenamientos.png` | Referenced by `OperationDashboardImage` |
| Assets (existing, no change) | `public/landing/operation/entrenamientos.png`, `espacios-deportivos-v.png`, `atletas-entrenadores-v-2.png` | Referenced by `OperationModuleCard` instances |

---

## Acceptance Criteria

1. Visiting `/` shows sections in this order: Header, Hero, Problem/Solution, **Operación deportiva (new)**, Features, Pricing, Footer.
2. The new section displays the eyebrow `OPERACIÓN DEPORTIVA`, the three-line headline with `operación deportiva` highlighted in teal (`--landing-primary`), and the description paragraph, matching the copy specified in this document.
3. The `dashboard-entrenamientos.png` screenshot renders on the right (desktop), visibly tilted in perspective (not flat/axis-aligned) and overflowing/breaking past the edges of its containing backdrop frame so it reads as "popping out" of the page, with a drop-shadow reinforcing the depth effect.
4. Three module cards render below the top row, in order **Entrenamientos**, **Espacios deportivos**, **Atletas y entrenadores**, each using its specified background image, icon, title, and full checklist (per the table in §3), with text remaining legible (sufficient contrast) over the background photo due to the gradient overlay.
5. A connected bar renders at the bottom of the section with `Todo conectado.` / `Más control, mejor operación.` on the left and 5 labeled steps (`Entrenamientos`, `Espacios`, `Atletas`, `Reglas`, `Reportes`) connected by horizontal lines on the right.
6. On first page load, section content is not yet in its final state until scrolled into view: as the user scrolls the section into the viewport, its content (top row, module cards, connected bar) transitions from `opacity-0 translate-y-6` to `opacity-100 translate-y-0` over ~700ms, without any layout shift/jank, and the animation fires only once (scrolling back up and down again does not replay it).
7. When the OS/browser has `prefers-reduced-motion: reduce` enabled, the section renders immediately at full opacity/position with no transition/animation.
8. The dashboard image is marked `aria-hidden="true"` (or equivalent) since it is a decorative illustration, and the section as a whole exposes an accessible name/description via its heading (`h2`) so screen reader users are not skipped past meaningful content.
9. On mobile viewports (< 640px), the section stacks vertically (copy above the image, image tilt/overflow reduced so it doesn't clip awkwardly or cause horizontal scrolling, cards stacked full-width, connected bar stacked).
10. No new npm dependency is added for the animation (`package.json` `dependencies` unchanged apart from what already exists); the reveal effect and image tilt/pop treatment are implemented with CSS transforms and `IntersectionObserver` respectively.
11. `npm run lint` and `npx tsc --noEmit` (or the project's equivalent type-check script) pass with no new errors introduced by this change.

---

## Implementation Steps

- [ ] Create `src/hooks/landing/useScrollReveal.ts` per the spec in §5
- [ ] Create `src/components/landing/operation/OperationModuleCard.tsx` (reusable, prop-driven)
- [ ] Create `src/components/landing/operation/OperationDashboardImage.tsx` (tilted, "popping out" screenshot, `aria-hidden`)
- [ ] Create `src/components/landing/operation/OperationConnectedBar.tsx`
- [ ] Create `src/components/landing/operation/OperationSection.tsx` composing the above, wired to `useScrollReveal` with staggered reveal on its 3 main blocks
- [ ] Create `src/components/landing/operation/index.ts` re-exporting `OperationSection`
- [ ] Add `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector` utility classes to `src/app/globals.css`
- [ ] Wire `OperationSection` into `src/app/page.tsx` between `ProblemSolutionSection` and `FeaturesSection`
- [ ] Verify responsive behavior at mobile/tablet/desktop breakpoints in a browser
- [ ] Verify `prefers-reduced-motion: reduce` (via browser dev tools emulation) disables the animation
- [ ] Run `npm run lint` and type-check; fix any issues
- [ ] Manually compare rendered section against `projectspec/designs/landing_new_dessign/modulos-operacion.png` for visual fidelity

---

## Non-Functional Requirements

- **Security**: N/A — static marketing content, no user input, no data access.
- **Performance**: Use `next/image` for the dashboard screenshot and the three module-card background photos (`fill`/explicit width-height + `sizes` set appropriately) to get automatic optimization/lazy-loading; the section is below the fold so images should lazy-load by default (do not set `priority`). Avoid layout shift by giving the image wrapper and cards explicit aspect ratios/min-heights despite the overflow/tilt treatment.
- **Accessibility**: The dashboard image is decorative (`aria-hidden="true"`); the section headline must be a real `h2` so it's announced by screen readers; checklist icons are decorative (`aria-hidden`) with the text label carrying the meaning; ensure text-over-image contrast meets WCAG AA via the gradient overlays already specified; respect `prefers-reduced-motion`.
- **Error handling**: N/A — no async operations, network calls, or user-triggered actions that can fail.
