## ADDED Requirements

### Requirement: Portal header breadcrumb is hidden on mobile viewports
`PortalHeader` SHALL hide the `PortalBreadcrumb` component and its preceding divider on viewports narrower than the `md` breakpoint (< 768 px). The breadcrumb wrapper MUST use Tailwind classes `hidden md:flex` so the elements are removed from both the visual layout and the accessibility tree on mobile. The `PortalBreadcrumb` component file itself MUST NOT be modified.

#### Scenario: Breadcrumb is not rendered on mobile
- **WHEN** a user views any portal page on a viewport narrower than 768 px
- **THEN** the breadcrumb and its preceding divider SHALL NOT be visible and SHALL NOT be present in the accessibility tree

#### Scenario: Breadcrumb is visible on desktop
- **WHEN** a user views any portal page on a viewport of 768 px or wider
- **THEN** the breadcrumb and its preceding divider SHALL be fully visible and behave as before

#### Scenario: Avatar and notifications remain accessible on mobile
- **WHEN** a user views any portal page on a viewport narrower than 768 px
- **THEN** the `UserAvatarMenu` and notification button in the right section of the header SHALL be fully visible and clickable
