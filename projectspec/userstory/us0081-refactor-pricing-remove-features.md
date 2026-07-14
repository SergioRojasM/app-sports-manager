# US-0081 — Refactor Landing Pricing Section and Remove Features Section

## ID
US-0081

## Name
Refactor Landing Pricing Section (4-Tier Plans) and Remove "Gestión de Alto Rendimiento" Features Section

## As a
Visitor evaluating GRIT Arena on the public landing page

## I Want
The pricing section to be redesigned into a 4-tier plan comparison (Gratis, Básico, Intermedio, Pro) with real COP pricing, per-plan limits and included modules, fading/sliding in as it scrolls into view — and the outdated generic "Gestión de alto rendimiento" features grid removed entirely, since its content is now superseded by the Operation/Administration sections (US-0078/US-0079)

## So That
The landing page ends with an accurate, on-brand pricing comparison instead of placeholder SaaS-style pricing copy, and visitors are not shown a redundant, visually inconsistent features grid between the new sections and pricing

---

## Description

### Current State
- `src/components/landing/PricingSection.tsx` renders 3 generic plans (`Básico $29/mes`, `Pro $79/mes`, `Elite $199/mes`) with placeholder feature lists (e.g. "Módulo de prevención de lesiones", "Marca blanca (Custom App)") that do not reflect GRIT Arena's actual product or pricing. It uses ad-hoc utility classes (`bg-card-dark`, `bg-navy-medium`, `bg-brand-gradient`, `text-accent-teal`) rather than the `landing-*` design tokens used by every other section rebuilt in US-0077–US-0080, and has no scroll-reveal animation.
- `src/components/landing/FeaturesSection.tsx` renders a generic "Gestión de alto rendimiento" 4-item feature grid (also using the old ad-hoc utility classes). Its content (centralized processes, training management, athlete management, payments, public/private trainings) is now fully covered, with real product fidelity, by `OperationSection` (US-0078) and `AdministrationSection` (US-0079). Per this story's explicit instruction, **this entire section must be removed** — component, import, and usage.
- Two existing landing links point at the section being removed and must be repointed so they don't become dead anchors:
  - `src/components/landing/Header.tsx` — nav item `{ label: 'Funciones', href: '#features' }`.
  - `src/components/landing/HeroSection.tsx` — the "Ver cómo funciona" secondary CTA, `href="#features"`.
  
  Both must point to `#operacion` instead (the first of the two sections — Operación deportiva — that now shows "cómo funciona" the product), since `#features` will no longer exist on the page.
- `src/app/page.tsx` currently renders sections in this order: `Header`, `HeroSection`, `ProblemSolutionSection`, `OperationSection`, `AdministrationSection`, `FeaturesSection`, `PricingSection`, `Footer`.

The new pricing design reference is the Pencil file `projectspec/designs/pencil/grit-arena.pen`, frame `Pricing Section Redesign` (**Node ID `RSsDS`**). It replaces the 3-plan layout with **4 plans** (`Gratis`, `Básico`, `Intermedio` — marked "MÁS ELEGIDO" — and `Pro`), each card showing: plan name, price, a short list of account **limits** (with icons), a divider, a "MÓDULOS INCLUIDOS" checklist, and a CTA button pinned to the bottom of the card regardless of content length (the design achieves equal card heights via a fixed `540px` height + a variable-height spacer; this story replaces that with an equivalent, more robust CSS approach — see §4 below).

The scroll-reveal mechanism (`useScrollReveal` hook + `.landing-reveal` CSS class, from US-0078, already reused in US-0079/US-0080) must be reused here too — no new hook, no new CSS, no new dependency.

### Proposed Changes

#### 1. Remove `FeaturesSection`
- Delete `src/components/landing/FeaturesSection.tsx`.
- Remove its import and usage (`<FeaturesSection />`) from `src/app/page.tsx`.
- Update `src/components/landing/Header.tsx`: change the nav item `{ label: 'Funciones', href: '#features' }` to `{ label: 'Funciones', href: '#operacion' }`.
- Update `src/components/landing/HeroSection.tsx`: change the "Ver cómo funciona" link's `href="#features"` to `href="#operacion"`.

#### 2. Rewrite `PricingSection.tsx`

Rebuild `src/components/landing/PricingSection.tsx` in place (stays a single file, data-driven by a `plans` array, same spirit as the current implementation but restructured), using `landing-*` design tokens exclusively (no more `bg-card-dark`, `bg-navy-medium`, `bg-brand-gradient`, `text-accent-teal`, `border-brand-gradient`).

**Section shell**: `<section id="pricing" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">` wrapping `mx-auto w-full max-w-[1280px]` — same padding rhythm as `OperationSection`/`AdministrationSection`.

**Header** (centered, `mx-auto max-w-[720px] text-center`):
- Eyebrow: `PRECIOS` — `font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary`.
- Headline (`h2`), 2 lines, centered, `font-landing-display text-[40px] font-bold italic leading-[1.08] tracking-[-0.02em] sm:text-[48px]`:
  - Line 1: `Un plan que crece` — `text-landing-text`
  - Line 2: `con tu club` — `text-landing-primary`
- Description: `Elige el plan que se ajuste al tamaño de tu club y escala cuando lo necesites. Precios en pesos colombianos (COP).` — `font-landing-body mt-4 text-base leading-7 text-landing-text-secondary sm:text-lg`.

**Plans grid**: `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start` (reasonable responsive breakdown for 4 cards; the design is desktop-only 4-in-a-row).

**Per-plan data** (exact content, in this order):

| Plan | Name label | Price | Period | Limits (icon → label) | Extra "premium" items (star icon, amber) | CTA label | Popular |
|------|-----------|-------|--------|------------------------|-------------------------------------------|-----------|---------|
| Gratis | `GRATIS` | `Gratis` | *(none)* | `group` → 0-10 atletas; `admin_panel_settings` → 1 Admin; `sports` → 1 Entrenador | — | `Comenzar gratis` | No |
| Básico | `BÁSICO` | `COP $110.000` | `/mes` | `group` → Hasta 50 atletas; `admin_panel_settings` → 1 Admin; `sports` → 1 Entrenador | — | `Elegir plan` | No |
| Intermedio | `INTERMEDIO` | `COP $180.000` | `/mes` | `group` → Hasta 100 atletas; `admin_panel_settings` → 1 Admin; `sports` → 3 Entrenadores | — | `Elegir plan` | **Yes** ("MÁS ELEGIDO") |
| Pro | `PRO` | `COP $250.000` | `/mes` | `group` → Atletas ilimitados; `admin_panel_settings` → Hasta 3 Administradores; `sports` → Hasta 5 Entrenadores | `star` → Soporte prioritario; `star` → Exportación avanzada de reportes | `Elegir plan` | No |

All 4 plans share the same base "MÓDULOS INCLUIDOS" checklist (6 items, `check_circle` icon in teal, `text-landing-text` label): `Entrenamientos`, `Espacios deportivos`, `Atletas y entrenadores`, `Planes y suscripciones`, `Reportes e indicadores`, `Autogestión del atleta`. The **Pro** plan additionally appends the 2 "extra" rows listed above, using a `star` icon in `#F5B942` (amber) instead of the teal `check_circle`, still with the same light label color — visually marking them as bonus/premium inclusions rather than the shared baseline.

**Card markup** (`PricingPlanCard`-equivalent, can be inlined in the `plans.map()` — no separate component file is required given the section stays a single file, but extracting a small local component/function inside the same file is acceptable if it improves readability):
- Column wrapper: `flex flex-col` (badge slot + card).
- Badge slot: for the popular plan, render the "MÁS ELEGIDO" pill (`inline-flex self-center rounded-full bg-landing-primary px-4 py-1.5 font-landing-body text-[10.5px] font-bold uppercase tracking-wide text-[#07111F]`) with a small bottom margin. For **non-popular** plans, render an empty spacer of the same height (`invisible` clone of the badge, or a fixed-height `div`, e.g. `h-[26px] mb-2`) **on `lg:` screens only**, so all 4 card tops align in the desktop row; on mobile this spacer is unnecessary (each card already stacks full-width) — use `hidden lg:block` on the spacer.
- Card: `flex h-full flex-col gap-4 rounded-2xl border bg-landing-surface-card p-7`, where the border is `border-landing-primary border-2` for the popular plan and `border-landing-border` (1px, default) for the rest.
- Plan name: `font-landing-body text-[13px] font-bold uppercase tracking-wide` — `text-landing-primary` if popular, else `text-landing-text-muted`.
- Price row: `flex items-end gap-1.5` — price in `font-landing-display text-[34px] font-bold text-landing-text`; if the plan has a period, render it as `font-landing-body text-sm font-medium text-landing-text-muted` immediately after.
- `border-t border-landing-divider` divider.
- Limits list: `flex flex-col gap-2.5`, each row `flex items-center gap-2` with a `15px` teal icon and a `text-[13.5px] font-medium text-landing-text-secondary` label.
- `border-t border-landing-divider` divider.
- `MÓDULOS INCLUIDOS` label: `font-landing-body text-[10.5px] font-bold uppercase tracking-wide text-landing-text-muted`.
- Modules list: `flex flex-col gap-2`, each row `flex items-center gap-2` with a `14px` icon (teal `check_circle` for base items, amber `#F5B942` `star` for Pro's 2 extra items) and a `text-[12.5px] text-landing-text` label.
- CTA button: `mt-auto` (pins to the bottom of the flex column regardless of how many module rows precede it — this replaces the design's fixed-`540px`-card + variable-spacer technique with a layout-driven equivalent that achieves the same visual result and is robust to content-length differences), `w-full rounded-[10px] py-3.5 text-center font-landing-body text-sm font-bold transition-colors`:
  - Popular (Intermedio): `bg-landing-primary text-[#07111F] hover:bg-landing-primary-light`.
  - All others: `border border-landing-border text-landing-text hover:border-landing-primary/60`.
  - Render as a `<button type="button">` (no real checkout/signup flow exists yet — non-functional placeholder, consistent with the current implementation which also has no `onClick`).

#### 3. Scroll-reveal effect
Reuse the existing `useScrollReveal<HTMLDivElement>()` hook and `.landing-reveal` class exactly as done in `OperationSection`/`AdministrationSection`/`ProblemSolutionSection`:
- One reveal block for the header (eyebrow + headline + description).
- One reveal block for the plans grid, staggered ~120ms after the header (matching the stagger pattern already used between `OperationSection`'s top row and cards row).
- No new hook, CSS class, or animation dependency.

#### 4. Equal card heights (implementation note)
The Pencil design achieves visually equal card heights via a fixed `540px` card height plus a per-plan spacer sized to compensate for varying content length (e.g. Pro's spacer is `4px` because it has 2 extra module rows, while the others' spacers are `50px`). Hardcoding pixel spacers this way is brittle if copy ever changes length. Instead:
- Apply `lg:items-stretch` on the plans grid (already implied by not overriding `align-items` — CSS Grid stretches items by default) so all 4 cards match the tallest card's height at each breakpoint.
- Use `mt-auto` on the CTA button (see §2) so the button stays pinned to the bottom of each card's flex column regardless of how tall the stretched card is.
- This achieves the same end result (bottom-aligned CTAs, equal card heights) without hardcoded spacer pixel values.

---

## Database Changes

Not applicable — static, presentational landing page content with no persisted or dynamic data.

---

## API / Server Actions

Not applicable — no server actions, API routes, or Supabase calls. Plan data is hardcoded copy, consistent with the rest of the landing page. CTA buttons are non-functional placeholders (no checkout/signup integration exists yet).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/landing/PricingSection.tsx` | Rewrite — 4-tier plan grid using `landing-*` tokens, wired to the existing `useScrollReveal` hook |
| Component | `src/components/landing/FeaturesSection.tsx` | **Delete** — superseded by Operation/Administration sections |
| Page | `src/app/page.tsx` | Remove `FeaturesSection` import and usage |
| Component | `src/components/landing/Header.tsx` | Change nav item `href` from `#features` to `#operacion` |
| Component | `src/components/landing/HeroSection.tsx` | Change "Ver cómo funciona" CTA `href` from `#features` to `#operacion` |

No changes needed to `src/app/globals.css` or `src/hooks/landing/useScrollReveal.ts` — both reused as-is.

---

## Acceptance Criteria

1. Visiting `/` shows sections in this order: Header, Hero, Solución, Operación deportiva, Administración inteligente, **Precios (refactored)**, Footer — the old Features section no longer appears anywhere on the page.
2. `src/components/landing/FeaturesSection.tsx` no longer exists in the repository, and nothing imports it.
3. The Header's "Funciones" nav link and the Hero's "Ver cómo funciona" button both navigate to `#operacion` (not `#features`, which no longer exists as a section id).
4. The pricing section renders the eyebrow `PRECIOS`, the two-line centered headline (`con tu club` highlighted in teal), and the description mentioning COP pricing.
5. Exactly 4 plan cards render, in order **Gratis, Básico, Intermedio, Pro**, each with the exact name, price (and `/mes` period where applicable), limits list, and modules checklist specified in this document.
6. The `Intermedio` card is visually distinguished: a "MÁS ELEGIDO" badge above it, a `2px` teal border (vs. `1px` default border on the others), and a filled teal CTA button with dark text (vs. outlined CTA buttons with light text on the others).
7. The `Pro` card shows **8** total module/extra rows (6 shared + 2 extra), with the 2 extra rows (`Soporte prioritario`, `Exportación avanzada de reportes`) using an amber `star` icon distinct from the teal `check_circle` used by the other 6 items.
8. Regardless of each plan's differing content length (Pro has more rows than the others), all 4 CTA buttons align at the same vertical position within their row on desktop (`lg:` breakpoint), achieved via equal-height cards + `mt-auto` on the CTA — not hardcoded pixel spacers.
9. As the section scrolls into view, the header and the plans grid fade/slide in using the existing `.landing-reveal` class and `useScrollReveal` hook (staggered, once-only, `prefers-reduced-motion`-aware) — no new animation code is introduced.
10. On mobile viewports (< 640px), the 4 plan cards stack in a single column without horizontal overflow, and the popular-plan spacer (used only for desktop alignment) does not introduce unwanted empty space above the other cards.
11. No leftover references to the old ad-hoc pricing utility classes (`bg-card-dark`, `bg-navy-medium`, `bg-brand-gradient`, `text-accent-teal`, `border-brand-gradient`) remain in `PricingSection.tsx`.
12. No new npm dependency is introduced; no new CSS utility classes are added.
13. `npm run lint` and `npx tsc --noEmit` pass with no new errors introduced by this change (compared against the pre-existing baseline).

---

## Implementation Steps

- [ ] Delete `src/components/landing/FeaturesSection.tsx`
- [ ] Remove the `FeaturesSection` import and `<FeaturesSection />` usage from `src/app/page.tsx`
- [ ] Update `href="#features"` → `href="#operacion"` in `src/components/landing/Header.tsx`
- [ ] Update `href="#features"` → `href="#operacion"` in `src/components/landing/HeroSection.tsx`
- [ ] Rewrite `src/components/landing/PricingSection.tsx` with the 4-plan data table, card markup, and `landing-*` tokens from §2
- [ ] Wire the existing `useScrollReveal` hook to the header and plans-grid blocks (staggered), reusing `.landing-reveal`
- [ ] Verify equal card heights / bottom-aligned CTAs across all 4 plans at the `lg:` breakpoint
- [ ] Verify responsive behavior (mobile stacked single column, no orphaned badge spacer) in a browser
- [ ] Verify `prefers-reduced-motion: reduce` still disables the animation for this section
- [ ] Run `npm run lint` and type-check; fix any issues
- [ ] Manually compare the rendered section against the `Pricing Section Redesign` frame (Node ID `RSsDS`) in `projectspec/designs/pencil/grit-arena.pen` for visual fidelity

---

## Non-Functional Requirements

- **Security**: N/A — static marketing content, no user input, no data access; CTA buttons are non-functional placeholders.
- **Performance**: No images in this section; removing `FeaturesSection` slightly reduces total page weight/DOM size.
- **Accessibility**: Headline and plan names use semantic heading levels (`h2` for the section headline, `h3` for each plan name is acceptable if it aids screen-reader navigation of the pricing table); limit/module icons are decorative (`aria-hidden="true"`) since their meaning is carried by the adjacent label text; respect `prefers-reduced-motion` (inherited, no new work needed); CTA `<button>` elements must be real, focusable, keyboard-activatable buttons (not `<div>`s).
- **Error handling**: N/A — no async operations, network calls, or user-triggered actions that can fail.
