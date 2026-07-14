# US-0079 — Landing Sports Administration Section

## ID
US-0079

## Name
Landing Sports Administration Section (Administración Inteligente)

## As a
Visitor evaluating GRIT Arena on the public landing page (prospective club/organization administrator)

## I Want
To see a dedicated "Administración inteligente" section, placed right after the Operation section, that visually explains how the platform centralizes plans/subscriptions, reporting/metrics, and athlete self-service into one connected back office — with a tilted product screenshot and the same subtle entrance animation used elsewhere on the landing page

## So That
I can see, beyond day-to-day operation, that the platform also gives me administrative control and trustworthy data to make decisions, reinforcing the case for requesting a demo

---

## Description

### Current State
The landing page (`src/app/page.tsx`) currently renders, in order: `Header`, `HeroSection`, `ProblemSolutionSection`, `OperationSection` (US-0078), `FeaturesSection`, `PricingSection`, `Footer`. There is no section that covers the administrative/back-office side of the product (plans & subscriptions, reporting/KPIs, athlete self-service).

The design reference is the Pencil file `projectspec/designs/pencil/grit-arena.pen`, frame `Modulos Administracion Section` (**Node ID `U0qmSW`**). A flattened reference screenshot is available at `projectspec/designs/landing_new_dessign/modulos-administracion.png`.

As with the Operation section, the design's top-right area shows a fake, hand-drawn dashboard mockup (sidebar + stat cards + revenue chart + donut + activity feed). Per explicit instruction for this story, **that fake mockup must NOT be rebuilt as markup** — instead, use the real screenshot image already prepared at `projectspec/designs/landing_new_dessign/dashboard-general.png`, applied with the same tilted / "popping out of the frame" treatment already implemented for the Operation section's `OperationDashboardImage` (see `src/components/landing/operation/OperationDashboardImage.tsx` and the `.landing-operation-mockup` / `.landing-operation-image-pop` utility classes in `src/app/globals.css`, both introduced in US-0078). This image currently lives under `projectspec/designs/` (a design-reference folder, not served by Next.js) and must be copied into `public/` to be usable via `next/image`, following the existing convention of `public/landing/operation/*.png`.

The scroll-reveal effect must reuse the existing `src/hooks/landing/useScrollReveal.ts` hook (already built and in production use by `OperationSection`) — do **not** create a second hook or add any animation dependency.

The bottom "connected steps" bar in this design (`Connected Bar` frame, "Datos conectados." / "Decisiones más rápidas." + 7 steps) is structurally identical to the one already built for the Operation section (`OperationConnectedBar.tsx`: shield icon + two-line text on the left, a row of icon-circle + label steps connected by thin lines on the right) — only the copy, icon set, and step count differ (5 steps in Operation vs. 7 here). Rather than duplicating that markup a second time, extract the existing `OperationConnectedBar.tsx` into a shared, prop-driven component so both sections render from one implementation.

### Proposed Changes

Add a new landing section component, **`AdministrationSection`**, rendered in `src/app/page.tsx` immediately after `OperationSection` and before `FeaturesSection`:

```tsx
<OperationSection />
<AdministrationSection />
<FeaturesSection />
```

Follow the same feature-slice convention used for `components/landing/operation/`:

```
components/landing/administration/
├── AdministrationSection.tsx           # Orchestrator, exported as default from index.ts
├── AdministrationDashboardImage.tsx    # dashboard-general.png, tilted/"popping out", reusing the shared tilt classes
├── AdministrationModuleCard.tsx        # Reusable shell: icon, title, checklist (left, 150px) + arbitrary panel content (right, via children)
├── panels/
│   ├── PlanesSuscripcionesPanel.tsx    # Mini "plans + active subscriptions" illustration
│   ├── ReportesIndicadoresPanel.tsx    # Mini "bar chart + metrics + export button" illustration
│   └── AutogestionAtletaPanel.tsx      # Mini "phone app" illustration
└── index.ts                            # Re-exports AdministrationSection as default
```

New shared component (refactor, extracted from the existing Operation section so both sections reuse one implementation):

```
components/landing/shared/ConnectedStepsBar.tsx
```

#### 1. `AdministrationSection.tsx` (section shell + left column copy)

- `<section id="administracion" className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">` wrapping a `mx-auto w-full max-w-[1280px]` container — same padding rhythm as `OperationSection`.
- Left column (`max-w-[620px]`):
  - Eyebrow: `ADMINISTRACIÓN INTELIGENTE` — `font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary`.
  - `landing-divider` below the eyebrow.
  - Headline (`h2`), four lines, `font-landing-display text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]`:
    - Line 1: `Centraliza la` — `text-landing-text`
    - Line 2: `administración y toma` — `text-landing-text`
    - Line 3: `decisiones con datos` — `text-landing-primary`
    - Line 4: `confiables` — `text-landing-primary`
  - Description paragraph: `Controla planes, suscripciones, pagos y métricas desde una plataforma conectada que reduce tareas administrativas y facilita el crecimiento del club.` — `font-landing-body text-base leading-8 text-landing-text-secondary sm:text-lg`.
- Right column: renders `AdministrationDashboardImage`.
- Layout: `grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center` for the top row (copy + image) — same pattern as `OperationSection`.
- Below the top row: `AdministrationModuleCard` × 3 in a `grid gap-6 lg:grid-cols-3`, each wrapping its own panel component (see §3–4).
- Below the cards: `ConnectedStepsBar` with this section's copy/steps (see §5).
- Wrap the section's three major blocks (top row, cards row, connected bar) with `useScrollReveal` exactly as `OperationSection` does: `opacity-0 translate-y-6` → `opacity-100 translate-y-0`, using the existing `.landing-reveal` class, staggered ~120ms apart, firing once, respecting `prefers-reduced-motion` (all already handled generically by the existing hook/CSS — no new reveal logic needed here).

#### 2. `AdministrationDashboardImage.tsx` (decorative, `aria-hidden="true"`)

Same treatment as `OperationDashboardImage.tsx`, pointed at the new image:
- Copy the source asset from `projectspec/designs/landing_new_dessign/dashboard-general.png` to `public/landing/administration/dashboard-general.png` (1536×1024, same dimensions as the Operation section's screenshot).
- Reuse the existing `.landing-operation-mockup` (backdrop frame) and `.landing-operation-image-pop` (tilt + drop-shadow treatment) utility classes as-is — do not fork new CSS classes for this section; the visual language should be identical to the Operation section's image treatment.
- `aria-hidden="true"` on the root; `next/image` with explicit `width={1536} height={1024}` and `sizes="(min-width: 1024px) 640px, 100vw"`, matching `OperationDashboardImage`'s implementation.

#### 3. `AdministrationModuleCard.tsx`

Reusable presentational shell, distinct from `OperationModuleCard` (that one has a full-bleed photo background; this one has a fixed-width text column + a separate panel illustration, per the design's `Module Card *` frames), props:
```ts
interface AdministrationModuleCardProps {
  icon: string;           // Material Symbols icon name
  title: string;
  items: string[];        // checklist labels (left column)
  children: React.ReactNode; // right-side panel illustration
}
```
Rendering:
- `rounded-2xl border border-[#0fa3ab52] bg-[#1623385d] p-6` card (translucent dark-teal background + soft teal border, per the design's `#1623385d` fill / `#0fa3ab81` stroke — approximate with Tailwind arbitrary values or new rgba values consistent with existing `--landing-primary-dark` token).
- `grid grid-cols-1 gap-6 sm:grid-cols-[150px_1fr]` — left column fixed at `150px` on `sm+`, stacking full-width on mobile.
- Left column: icon circle (`size-12 rounded-full bg-landing-primary/10 border border-landing-primary/20`, icon in teal), title (`font-landing-display text-[19px] font-bold italic text-landing-text`), small teal divider (`h-[3px] w-8 rounded-full bg-landing-primary`), then the checklist — each row a teal `check_circle` icon (`text-[13px]`) + label (`font-landing-body text-[11.5px] text-landing-text-secondary`).
- Right column: `rounded-xl border border-landing-border bg-landing-surface-elevated p-3.5` wrapping `children` (the panel illustration).
- Instantiate 3 times from `AdministrationSection`, matching the design 1:1:

| Card | Icon | Checklist | Panel |
|------|------|-----------|-------|
| Planes y suscripciones | `credit_card` | Planes y variantes; Vigencias; Pagos; Comprobantes; Validaciones; Estados | `PlanesSuscripcionesPanel` |
| Reportes e indicadores | `bar_chart` | Suscripciones activas; Pagos pendientes; Atletas activos; Entrenadores activos; Exportación de reportes; Indicadores operativos | `ReportesIndicadoresPanel` |
| Autogestión del atleta | `person` | Consulta de planes; Reservas; Próximos entrenamientos; Pagos; Comprobantes; Historial | `AutogestionAtletaPanel` |

#### 4. Panel illustrations (`components/landing/administration/panels/`)

All three are small, static, non-interactive illustrations (no real data, no charting library — plain `div`s/Tailwind, consistent with how `OperationDashboardMockup` would have been built pre-US-0078). Mark each panel root `aria-hidden="true"` since they are decorative (the checklist text to their left already conveys the meaning).

**`PlanesSuscripcionesPanel.tsx`**
- `Planes` label (`text-[9px] font-bold uppercase text-landing-text-muted`) + a 3-column row of plan chips (`rounded-md p-1.5`, each showing a plan name + price):
  | Plan | Price | Style |
  |------|-------|-------|
  | Premium | $180.000 | highlighted — teal border + `bg-landing-primary/10`, name in teal |
  | Standard | $120.000 | default — `bg-landing-surface-card`, border `landing-border` |
  | Básico | $70.000 | default — same as Standard |
- `Suscripciones activas` label, then 3 rows, each: a small circular avatar placeholder (`bg-landing-secondary`), a name + plan sub-label stacked, and a right-aligned status:
  | Name | Plan | Status |
  |------|------|--------|
  | Ana García | Premium Anual | Activa (teal) |
  | Luis Fernández | Standard Mensual | Activa (teal) |
  | María López | Básico Mensual | Pendiente (amber, `#F5B942`) |

**`ReportesIndicadoresPanel.tsx`**
- `Indicadores operativos` label + a mini bar chart: 6 vertical teal bars (`rounded-t-sm bg-landing-primary`) with these relative heights (px, out of a ~38px-tall row): `12, 20, 15, 24, 18, 28`.
- `Principales métricas` label + 3 metric rows, each a label+value header row and a thin progress track/fill underneath:
  | Metric | Value | Fill % |
  |--------|-------|--------|
  | Tasa de ocupación | 78% | 78% |
  | Asistencia promedio | 82% | 82% |
  | Renovación de planes | 68% | 68% |
- `Crecimiento mensual +16%` line in teal.
- An export button/pill: bordered teal, `download` icon + label `Exportar reporte` (decorative, non-interactive — do not wire to a real download).

**`AutogestionAtletaPanel.tsx`** (phone-frame illustration)
- Greeting `Hola, Ana 👋` + subtitle `Bienvenida a tu espacio`.
- A plan card: label `Mi plan actual`, row with `Premium Anual` + a small teal `Activo` pill badge, and caption `Vence el 12/06/2025`.
- Two buttons side by side: `Reservar` (filled teal, dark text) and `Mis reservas` (outlined).
- Label `Próximo entrenamiento` + a row: teal `fitness_center` icon in a circle, `Fuerza funcional` title, caption `Mié, 22 de mayo · 08:00 AM`.
- A bottom nav row with 4 items, `Inicio` marked active (teal icon+label), `Reservas`, `Pagos`, `Perfil` muted (`text-landing-text-muted`) — icons `home`, `calendar_month`, `payments`, `person` respectively. Purely decorative, non-interactive (no real navigation).

#### 5. Extract `ConnectedStepsBar.tsx` (shared, replaces `OperationConnectedBar.tsx`)

Move the bar shell from `src/components/landing/operation/OperationConnectedBar.tsx` into a new shared component:

```
src/components/landing/shared/ConnectedStepsBar.tsx
```

```ts
interface ConnectedStepsBarProps {
  title: string;
  highlightedSubtitle: string;
  steps: { icon: string; label: string }[];
}
```
- Same markup/classes as the current `OperationConnectedBar` (shield circle + two-line text on the left; steps row with `.landing-step-connector` dividers on the right), just parameterized by `title`, `highlightedSubtitle`, and `steps` instead of hardcoded values.
- Update `OperationSection.tsx` to import `ConnectedStepsBar` from `@/components/landing/shared/ConnectedStepsBar` and render it with the Operation section's existing copy/steps (`Todo conectado.` / `Más control, mejor operación.` / the 5 Operation steps), then **delete** `src/components/landing/operation/OperationConnectedBar.tsx` (fully superseded, no remaining references).
- `AdministrationSection.tsx` renders the same `ConnectedStepsBar` with:
  - `title="Datos conectados."`, `highlightedSubtitle="Decisiones más rápidas."`
  - `steps`: `Planes` (`credit_card`), `Suscripciones` (`receipt_long`), `Pagos` (`payments`), `Validaciones` (`verified`), `Indicadores` (`bar_chart`), `Reportes` (`description`), `Crecimiento` (`trending_up`) — **7 steps** (one more than Operation's 5); `ConnectedStepsBar` must render however many steps/connectors are passed in without assuming a fixed count of 5.

---

## Database Changes

Not applicable — static, presentational landing page section with no persisted or dynamic data.

---

## API / Server Actions

Not applicable — no server actions, API routes, or Supabase calls. All content is hardcoded copy/icons/images, consistent with the other landing sections.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/landing/administration/AdministrationSection.tsx` | New — section shell, left column copy, layout, wires scroll reveal + sub-components |
| Component | `src/components/landing/administration/AdministrationDashboardImage.tsx` | New — tilted, "popping out" screenshot (`dashboard-general.png`), reusing existing tilt CSS classes |
| Component | `src/components/landing/administration/AdministrationModuleCard.tsx` | New — reusable card shell (icon, title, checklist, arbitrary right-side panel via `children`) |
| Component | `src/components/landing/administration/panels/PlanesSuscripcionesPanel.tsx` | New — plans + active subscriptions mini illustration |
| Component | `src/components/landing/administration/panels/ReportesIndicadoresPanel.tsx` | New — bar chart + metrics + export button mini illustration |
| Component | `src/components/landing/administration/panels/AutogestionAtletaPanel.tsx` | New — phone-frame athlete self-service mini illustration |
| Component | `src/components/landing/administration/index.ts` | New — re-exports `AdministrationSection` as default |
| Component | `src/components/landing/shared/ConnectedStepsBar.tsx` | New — extracted, prop-driven connected-steps bar shared by Operation and Administration sections |
| Component | `src/components/landing/operation/OperationSection.tsx` | Modify — import and render `ConnectedStepsBar` (from `shared/`) instead of `OperationConnectedBar`, passing Operation's existing copy/steps |
| Component | `src/components/landing/operation/OperationConnectedBar.tsx` | Delete — fully superseded by `ConnectedStepsBar` |
| Page | `src/app/page.tsx` | Import `AdministrationSection` and render it between `OperationSection` and `FeaturesSection` |
| Assets | `public/landing/administration/dashboard-general.png` | New — copied from `projectspec/designs/landing_new_dessign/dashboard-general.png` so it can be served via `next/image` |

No changes needed to `src/app/globals.css` — this story reuses `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, and `.landing-step-connector`, all already added in US-0078. No changes needed to `src/hooks/landing/useScrollReveal.ts` — reused as-is.

---

## Acceptance Criteria

1. Visiting `/` shows sections in this order: Header, Hero, Problem/Solution, Operación deportiva, **Administración inteligente (new)**, Features, Pricing, Footer.
2. The new section displays the eyebrow `ADMINISTRACIÓN INTELIGENTE`, the four-line headline with the last two lines (`decisiones con datos` / `confiables`) highlighted in teal, and the description paragraph, matching the copy specified in this document.
3. The `dashboard-general.png` screenshot renders on the right (desktop), tilted in perspective and overflowing its backdrop frame — visually consistent with the Operation section's image treatment (same CSS classes reused, not a new pattern).
4. Three module cards render below the top row, in order **Planes y suscripciones**, **Reportes e indicadores**, **Autogestión del atleta**, each showing its icon, title, full checklist, and its corresponding panel illustration with the exact content specified in §4 (plan prices, subscriber rows, bar chart, metrics, phone-frame content).
5. The `PlanesSuscripcionesPanel` visibly distinguishes the `Premium` plan chip from `Standard`/`Básico` (teal highlight), and shows `María López` with a `Pendiente` status in amber while the other two subscribers show `Activa` in teal.
6. The `ReportesIndicadoresPanel` shows a 6-bar mini chart, 3 metric rows each with a label, a percentage value, and a proportionally-filled progress track, plus the `Crecimiento mensual +16%` line and an `Exportar reporte` button.
7. The `AutogestionAtletaPanel` renders as a phone-shaped illustration with the greeting, plan card (with `Activo` badge), two action buttons, next-training row, and a 4-item bottom nav with `Inicio` marked active.
8. A connected bar renders at the bottom with `Datos conectados.` / `Decisiones más rápidas.` on the left and all 7 labeled steps (`Planes`, `Suscripciones`, `Pagos`, `Validaciones`, `Indicadores`, `Reportes`, `Crecimiento`) connected by horizontal lines on the right.
9. The Operation section (US-0078) is visually unchanged after the `ConnectedStepsBar` extraction — it still renders `Todo conectado.` / `Más control, mejor operación.` with its original 5 steps, sourced from the new shared component instead of the deleted `OperationConnectedBar.tsx`.
10. As the section scrolls into view, its three blocks (copy+image, module cards, connected bar) fade/slide in using the existing reveal behavior (once, staggered, `prefers-reduced-motion`-aware) — no new animation code was written for this, it is inherited from `useScrollReveal`/`.landing-reveal`.
11. The dashboard image and the three panel illustrations are marked `aria-hidden="true"`; the section exposes an accessible name via its `h2` heading.
12. On mobile viewports (< 640px), each module card's left column (icon/title/checklist) stacks above its panel illustration, and the connected bar's steps wrap/scroll without introducing horizontal page overflow.
13. No new npm dependency is introduced, and no new CSS utility classes are added beyond what US-0078 already created.
14. `npm run lint` and `npx tsc --noEmit` pass with no new errors introduced by this change (baseline pre-existing errors excluded).

---

## Implementation Steps

- [ ] Copy `projectspec/designs/landing_new_dessign/dashboard-general.png` to `public/landing/administration/dashboard-general.png`
- [ ] Extract `src/components/landing/shared/ConnectedStepsBar.tsx` from the existing `OperationConnectedBar.tsx`, parameterized by `title`, `highlightedSubtitle`, `steps`
- [ ] Update `src/components/landing/operation/OperationSection.tsx` to use `ConnectedStepsBar` with the Operation section's original copy/steps; delete `OperationConnectedBar.tsx`
- [ ] Verify the Operation section still renders identically after the extraction (regression check against US-0078's acceptance criteria)
- [ ] Create `src/components/landing/administration/AdministrationDashboardImage.tsx` (reusing `.landing-operation-mockup` / `.landing-operation-image-pop`)
- [ ] Create `src/components/landing/administration/AdministrationModuleCard.tsx` (reusable shell)
- [ ] Create the 3 panel components under `src/components/landing/administration/panels/`
- [ ] Create `src/components/landing/administration/AdministrationSection.tsx` composing the above, wired to the existing `useScrollReveal` hook with staggered reveal on its 3 main blocks
- [ ] Create `src/components/landing/administration/index.ts` re-exporting `AdministrationSection`
- [ ] Wire `AdministrationSection` into `src/app/page.tsx` between `OperationSection` and `FeaturesSection`
- [ ] Verify responsive behavior at mobile/tablet/desktop breakpoints in a browser
- [ ] Verify `prefers-reduced-motion: reduce` still disables the animation (inherited behavior, but confirm on this section too)
- [ ] Run `npm run lint` and type-check; fix any issues
- [ ] Manually compare rendered section against `projectspec/designs/landing_new_dessign/modulos-administracion.png` for visual fidelity (ignoring the dashboard mockup area, which intentionally uses the real screenshot instead)

---

## Non-Functional Requirements

- **Security**: N/A — static marketing content, no user input, no data access.
- **Performance**: Use `next/image` for `dashboard-general.png` with explicit `width`/`height` (no layout shift); the section is below the fold so images should lazy-load by default (no `priority`).
- **Accessibility**: Dashboard image and panel illustrations are decorative (`aria-hidden="true"`); the section headline is a real `h2`; checklist icons are decorative with the text label carrying the meaning; respect `prefers-reduced-motion` (inherited from the shared hook/CSS).
- **Error handling**: N/A — no async operations, network calls, or user-triggered actions that can fail.
