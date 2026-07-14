# US-0080 — Refactor Landing Problem/Solution Section

## ID
US-0080

## Name
Refactor Landing Problem/Solution Section (Solución)

## As a
Visitor evaluating GRIT Arena on the public landing page

## I Want
The "Solución" section to be redesigned into a cleaner, divided role list (instead of 5 bordered cards) with a stacked-line headline consistent with the newer Operation and Administration sections, and to fade/slide in with the same subtle entrance animation already used elsewhere on the page

## So That
The landing page reads as one coherent, professionally designed system rather than a mix of an older card-grid style (Problem/Solution) and the newer list/illustration style introduced in US-0078/US-0079

---

## Description

### Current State
`src/components/landing/ProblemSolutionSection.tsx` (built in US-0077) renders:
- A boxed outer surface (`landing-problem-solution-surface` + `landing-problem-solution-accent` classes) wrapping the whole section content in a bordered, radial-glow card.
- A headline as a single wrapped `<h2>` with an inline `<span>` for the highlighted word (`profesionalizar`).
- A right column of **5** bordered `landing-panel` cards (`Atleta`, `Entrenador`, `Operación`, `Dirección`, `Comunidad`), each with an icon circle (`landing-solution-node`), title, and description.
- A closing **filled** pill (`landing-summary-badge`) reading "Todo conectado. Todo bajo control."
- `id="trusted-by"` on the `<section>` — a leftover/mismatched id from an earlier iteration (this section is not a "trusted by" logos section; no other file references this id via anchor links, so it is safe to rename).
- No scroll-triggered entrance animation.

The updated design reference is the Pencil file `projectspec/designs/pencil/grit-arena.pen`, frame `Solucion Section Redesign` (**Node ID `ZKdpO`**). This redesign:
- Drops the boxed outer surface entirely — the section sits directly on the page background (`#07111F`), matching how `OperationSection` and `AdministrationSection` (US-0078/US-0079) already render (no card wrapper).
- Reformats the headline into 4 explicit stacked lines (matching the block-line headline pattern already used in `OperationSection`/`AdministrationSection`, instead of a single wrapped paragraph):
  1. `Un sistema`
  2. `pensado para`
  3. `profesionalizar` (teal) + ` la` (same line, inline)
  4. `gestión deportiva`
- Replaces the 5 bordered cards with **3** broader role groupings, rendered as a **divided list** (thin `1px` dividers between rows, no card borders/backgrounds) — each row: an icon circle, a title, and a description, laid out horizontally.
- Replaces the filled `landing-summary-badge` pill with an **outlined** pill (transparent background, teal border) containing a small `verified` icon and uppercase bold label.

The scroll-reveal mechanism (`useScrollReveal` hook + `.landing-reveal` CSS class) already exists at `src/hooks/landing/useScrollReveal.ts` / `src/app/globals.css` (built in US-0078, reused as-is in US-0079) — this story must reuse it, not add a new one.

Several CSS utility classes in `src/app/globals.css` exist only to support the old 5-card layout being replaced here. A `grep` across `src/` confirms their only usages:
- `.landing-panel` — **keep**: also used by `src/components/landing/Header.tsx`.
- `.landing-divider` — **keep**: used broadly (Header, Hero, Operation, Administration, and this section).
- `.landing-problem-solution-surface`, `.landing-problem-solution-accent` — used only by the old `ProblemSolutionSection`; become dead after this refactor (the new design has no boxed surface).
- `.landing-solution-flow`, `.landing-solution-node`, `.landing-solution-connector` (+ its `::before`/`::after`) — used only by the old `ProblemSolutionSection`; become dead after this refactor.
- `.landing-summary-badge` — used only by the old `ProblemSolutionSection`; becomes dead after this refactor (replaced by an outlined pill, styled inline with Tailwind, no new CSS class needed for it since it's a one-off simple border+padding treatment).
- `.landing-problem-grid`, `.landing-problem-row`, `.landing-problem-icon-wrap` — **already dead code today** (defined in `globals.css`, not referenced by any component even in the current implementation) — leftover from an even earlier iteration.

All of the above dead classes must be removed as part of this refactor, per the "don't leave unused code" convention — do not leave them "just in case."

### Proposed Changes

Rewrite `src/components/landing/ProblemSolutionSection.tsx` in place (it stays a single file — the new design is simple enough that it does not warrant splitting into a feature-slice folder like `operation/`/`administration/`):

1. **Section shell**: `<section id="solucion" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">` (renamed from `id="trusted-by"`; padding rhythm aligned with `OperationSection`/`AdministrationSection` instead of the old, tighter `py-10 ... lg:py-14`). No outer boxed surface — content sits directly on the page background.
2. **Content grid**: `mx-auto grid w-full max-w-[1280px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20 lg:items-start` (approximates the design's `520px` left / fill-remaining right columns at `1280px` total width with an `80px` gap).
3. **Left column** (`max-w-[520px]`):
   - Eyebrow: `SOLUCIÓN` — `font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary` (aligned with the Operation/Administration eyebrow treatment, replacing the old `text-base ... tracking-[0.08em]`).
   - `landing-divider` below the eyebrow.
   - Headline (`h2`), 4 lines, `font-landing-display text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]` (matching the exact headline scale already used in Operation/Administration, replacing the old bespoke `text-[40px] ... sm:text-[48px] lg:text-[58px]` / `leading-[1]` / `max-w-[14ch]`):
     - Line 1: `Un sistema` — `text-landing-text`
     - Line 2: `pensado para` — `text-landing-text`
     - Line 3: `profesionalizar` (`text-landing-primary`) + ` la` (`text-landing-text`) on the same line
     - Line 4: `gestión deportiva` — `text-landing-text`
   - Description: `La plataforma conecta la operación administrativa, comercial y deportiva en un solo flujo.` — `font-landing-body mt-6 text-base leading-8 text-landing-text-secondary sm:text-lg` (copy unchanged from US-0077).
4. **Right column**: a divided list of 3 role rows plus a closing pill, replacing the 5-card grid:
   - A `divide-y divide-landing-divider border-t border-landing-divider` wrapper (the `landing-divider` **color token** already exists as the Tailwind color `landing-divider` in `tailwind.config.ts` — do not confuse this with the unrelated `.landing-divider` **utility class** used for the small teal accent bar under eyebrows; here we need the plain 1px hairline color, which is a different, pre-existing token).
   - Each row: `flex items-center gap-5 py-6` containing:
     - Icon circle: `flex size-14 shrink-0 items-center justify-center rounded-full border border-landing-primary/20 bg-landing-primary/10` with the Material Symbols icon in teal (`text-[28px]`) — same visual token as the icon circles already used in `OperationModuleCard`/`AdministrationModuleCard`.
     - Text column: title (`font-landing-display text-[20px] font-bold italic text-landing-text`) + description (`font-landing-body mt-1.5 text-[15px] leading-relaxed text-landing-text-secondary`).
   - Row content (exactly 3 rows, in this order):

     | Icon | Title | Description |
     |------|-------|--------------|
     | `group` | Atletas y entrenadores | Reservas, entrenamientos y seguimiento deportivo desde un solo flujo, dentro y fuera de tu equipo. |
     | `bar_chart` | Operación y dirección | Pagos, asistencia y métricas conectadas para decisiones más rápidas y visibilidad total del negocio. |
     | `diversity_3` | Comunidad | Publica entrenamientos y da acceso a atletas fuera de tu equipo para hacer crecer tu comunidad. |

   - Below the divided list (inside the same bottom border, per the design's final divider before the pill): a centered closing pill — `mx-auto mt-7 inline-flex items-center gap-2.5 rounded-full border border-landing-primary px-7 py-3.5` (transparent background, no new CSS class needed) containing a `verified` icon (`text-[18px] text-landing-primary`) and the label `TODO CONECTADO. TODO BAJO CONTROL.` (`font-landing-display text-[13px] font-bold uppercase tracking-[0.05em] text-landing-primary`).
5. **Scroll-reveal effect**: wrap the entire content grid (left column + right column together, as a single block — matching how `OperationSection`'s "top row" reveals as one unit) with the existing `useScrollReveal<HTMLDivElement>()` hook from `src/hooks/landing/useScrollReveal.ts`, toggling the existing `.landing-reveal` class plus `opacity-0 translate-y-6` / `opacity-100 translate-y-0`, exactly as already implemented in `OperationSection`/`AdministrationSection`. Do **not** create a new hook, a new CSS class, or a new animation dependency — this is a straight reuse.
6. **`globals.css` cleanup**: remove the now-fully-dead utility classes listed in "Current State" above: `.landing-problem-solution-surface`, `.landing-problem-solution-accent`, `.landing-problem-grid`, `.landing-problem-row` (+ its `+ .landing-problem-row` sibling selector), `.landing-problem-icon-wrap`, `.landing-solution-flow`, `.landing-solution-node`, `.landing-solution-connector` (+ its `::before`/`::after` pseudo-element rules), `.landing-summary-badge`. Do **not** touch `.landing-panel` or `.landing-divider` (both still used elsewhere).

---

## Database Changes

Not applicable — static, presentational landing page section with no persisted or dynamic data.

---

## API / Server Actions

Not applicable — no server actions, API routes, or Supabase calls. All content is hardcoded copy/icons, consistent with the rest of the landing page.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/landing/ProblemSolutionSection.tsx` | Rewrite — stacked-line headline, 3-row divided list replacing 5 cards, outlined closing pill, `id="solucion"`, wired to the existing `useScrollReveal` hook |
| Styles | `src/app/globals.css` | Remove dead classes: `.landing-problem-solution-surface`, `.landing-problem-solution-accent`, `.landing-problem-grid`, `.landing-problem-row` (+ sibling selector), `.landing-problem-icon-wrap`, `.landing-solution-flow`, `.landing-solution-node`, `.landing-solution-connector` (+ pseudo-elements), `.landing-summary-badge` |

No changes needed to `src/app/page.tsx` (the section stays in the same position — after `HeroSection`, before `OperationSection`), no changes to `src/hooks/landing/useScrollReveal.ts` (reused as-is), and no new files are created.

---

## Acceptance Criteria

1. Visiting `/` still shows sections in this order: Header, Hero, **Solución (refactored)**, Operación deportiva, Administración inteligente, Features, Pricing, Footer — only the internal content/markup of the Solución section changes, not its position.
2. The section's `<section>` element has `id="solucion"` (no longer `id="trusted-by"`).
3. The section no longer renders inside a bordered/glowing "surface" card — its content sits directly on the page background, matching the visual treatment of `OperationSection`/`AdministrationSection`.
4. The headline renders as 4 stacked lines with `profesionalizar` (and only that word, inline with the trailing ` la` on the same line) highlighted in teal (`--landing-primary`); the rest of the headline is in the default text color.
5. The right column renders exactly 3 role rows, in order **Atletas y entrenadores**, **Operación y dirección**, **Comunidad**, each with its specified icon, title, and full description text — separated by thin horizontal dividers, with no card borders/backgrounds around individual rows (list style, not a card grid).
6. A closing pill renders below the list, horizontally centered, with a transparent background, a teal border, a `verified` icon, and the uppercase label `TODO CONECTADO. TODO BAJO CONTROL.`
7. As the section scrolls into view, its content fades/slides in once (`opacity-0 translate-y-6` → `opacity-100 translate-y-0`) using the existing `.landing-reveal` class and `useScrollReveal` hook — no new animation-related code is introduced, and behavior (once-only trigger, `prefers-reduced-motion` handling) is inherited unchanged from the existing hook/CSS.
8. `src/app/globals.css` no longer contains `.landing-problem-solution-surface`, `.landing-problem-solution-accent`, `.landing-problem-grid`, `.landing-problem-row`, `.landing-problem-icon-wrap`, `.landing-solution-flow`, `.landing-solution-node`, `.landing-solution-connector` (or its pseudo-element rules), or `.landing-summary-badge`.
9. `.landing-panel` and `.landing-divider` still exist in `globals.css` and `src/components/landing/Header.tsx` still renders correctly (unaffected by the cleanup).
10. On mobile viewports (< 640px), the section stacks to a single column (copy above the role list) without horizontal overflow, and each role row wraps its icon above or beside its text in a readable way (no text truncation/overlap).
11. No new npm dependency is introduced; no new CSS utility classes are added (the closing pill and dividers are implemented with existing Tailwind utilities/tokens).
12. `npm run lint` and `npx tsc --noEmit` pass with no new errors introduced by this change (compare against the pre-existing baseline).

---

## Implementation Steps

- [ ] Rewrite `src/components/landing/ProblemSolutionSection.tsx`: section shell (`id="solucion"`, no boxed surface), stacked-line headline, 3-row divided list, outlined closing pill
- [ ] Wire the existing `useScrollReveal` hook to the section's content block, using the existing `.landing-reveal` class/transition classes (no new hook/CSS)
- [ ] Remove the now-dead CSS classes listed in §6 from `src/app/globals.css`
- [ ] Verify `Header.tsx` still renders correctly (uses `.landing-panel`, untouched)
- [ ] Verify responsive behavior at mobile/tablet/desktop breakpoints in a browser
- [ ] Verify `prefers-reduced-motion: reduce` still disables the animation for this section (inherited behavior, confirm it applies here too)
- [ ] Run `npm run lint` and type-check; fix any issues
- [ ] Manually compare the rendered section against the `Solucion Section Redesign` frame (Node ID `ZKdpO`) in `projectspec/designs/pencil/grit-arena.pen` for visual fidelity

---

## Non-Functional Requirements

- **Security**: N/A — static marketing content, no user input, no data access.
- **Performance**: No images in this section; no performance-sensitive changes beyond removing now-unused CSS (slightly reduces stylesheet size).
- **Accessibility**: The headline remains a real `h2`; role-row icons are decorative (`aria-hidden="true"`) since their meaning is carried by the adjacent title/description text; respect `prefers-reduced-motion` (inherited from the shared hook/CSS, no new work needed).
- **Error handling**: N/A — no async operations, network calls, or user-triggered actions that can fail.
