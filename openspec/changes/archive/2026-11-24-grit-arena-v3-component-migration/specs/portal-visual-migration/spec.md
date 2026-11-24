# Spec Delta

## MODIFIED Requirements

### Requirement: Consistent page scaffolding
`src/app/portal/layout.tsx` SHALL wrap every Portal page in a single `GritPageContainer` (so page components MUST NOT add their own outer page padding), and each page SHALL render its title through `GritPageHeader`, producing exactly one `h1` per page. Modals SHALL use a `bg-grit-bg/70 backdrop-blur-sm` overlay and a `GritCard variant="glass"` panel with the v3 card radius (22px, `rounded-grit-2xl`) and `GritButton` actions. Inputs and selects SHALL use `gritInputClass` / `gritSelectClass`.

#### Scenario: Single h1 per page
- **WHEN** any `/portal/*` page is rendered
- **THEN** it SHALL contain exactly one `h1`, rendered by `GritPageHeader`

#### Scenario: Modal styling
- **WHEN** any Portal modal opens
- **THEN** its panel SHALL use the glass card styling with a 22px radius and its primary action SHALL be a `GritButton variant="primary"`
