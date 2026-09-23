## ADDED Requirements

### Requirement: Portal modules use only grit tokens and kit
Every component under `src/components/portal/**` and `src/app/portal/**` SHALL use `grit-*` tokens and `ui/grit` components. Mapping: `turquoise`/`accent-teal`/`portal-primary`/`portal-secondary` → `grit-cyan`; `glass-card`/`glass`/`portal-card`/`bg-navy-medium`/`bg-card-dark` → `GritCard`; `border-portal-border`/`border-white/5..10` → `border-grit-glass-border` (table separators `border-white/[.07]`); `text-slate-100/200` → `text-grit-text`, `300/400` → `text-grit-subtext`, `500/600` → `text-grit-muted`; `bg-navy-deep`/`bg-navy-soft` → `bg-grit-bg`/`bg-grit-card`; `font-display` → `font-grit-title` (headings, KPI values, prices) or `font-grit-body`; `rounded-lg`/`rounded-xl` → `rounded-grit-{md,lg,xl,2xl}`; `landing-*` in `entrenamientos-publicos` → `grit-*`; inline errors → `text-grit-danger`; success → `grit-success`; warning → `grit-discipline-run`.

#### Scenario: No legacy tokens remain
- **WHEN** `grep -rE "turquoise|portal-primary|portal-secondary|portal-card|portal-border|glass-card|navy-deep|navy-medium|navy-soft|card-dark|font-display|landing-(primary|text|bg|border|surface)|rounded-(lg|xl)\b" src/components/portal src/app/portal` is run after the migration
- **THEN** it SHALL return no matches

### Requirement: Consistent page scaffolding
`src/app/portal/layout.tsx` SHALL wrap every Portal page in a single `GritPageContainer` (so page components MUST NOT add their own outer page padding), and each page SHALL render its title through `GritPageHeader`, producing exactly one `h1` per page. Modals SHALL use a `bg-grit-bg/70 backdrop-blur-sm` overlay and a `GritCard variant="glass"` panel with 16px radius and `GritButton` actions. Inputs and selects SHALL use `gritInputClass` / `gritSelectClass`.

#### Scenario: Single h1 per page
- **WHEN** any `/portal/*` page is rendered
- **THEN** it SHALL contain exactly one `h1`, rendered by `GritPageHeader`

#### Scenario: Modal styling
- **WHEN** any Portal modal opens
- **THEN** its panel SHALL use the glass card styling and its primary action SHALL be a `GritButton variant="primary"`

### Requirement: Migration preserves functionality
The migration MUST be visual-only: no route, link target, click handler, form validation, hook or service call SHALL change. It SHALL ship in groups (a) inicio/perfil/invitaciones/PortalTenantsPage, (b) athlete modules + entrenamientos-publicos, (c) entrenamientos/gestion-reservas/planes/disciplines/scenarios/servicios, (d) tenant/gestion-equipo/gestion-suscripciones, (e) formularios, (f) analitica. Each group is compared against its `.pen` reference frame (`d41rX5`, `ql3Ij`, `P43Yo`, `zfVKC`).

#### Scenario: Type-check and lint pass per group
- **WHEN** a migration group is complete
- **THEN** type-check (`npx tsc --noEmit`) and `npm run lint` SHALL pass

#### Scenario: Core flows still work
- **WHEN** the smoke test runs after each group
- **THEN** booking a training, managing reservations, the form builder, analytics filters, team invitations and subscriptions SHALL behave as before

### Requirement: Cleanup of unused Portal-only legacy code
After group (f), `PortalSidebar.tsx` SHALL be deleted if no file imports it, and the Portal-only deprecated tokens (`portal-*`, `.sidebar-item-active`) SHALL be removed if no file references them.

#### Scenario: Unused legacy removed
- **WHEN** no file references `portal-primary` or imports `PortalSidebar`
- **THEN** those definitions and the file SHALL no longer exist
