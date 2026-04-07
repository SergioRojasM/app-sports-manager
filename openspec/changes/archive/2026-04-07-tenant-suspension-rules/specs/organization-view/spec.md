## ADDED Requirements

### Requirement: gestion-organizacion page includes TenantReglasSuspensionCard
The `gestion-organizacion` page (`src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`) SHALL render `<TenantReglasSuspensionCard tenantId={tenantId} />` below the existing `<TenantPaymentMethodsCard />` section.

#### Scenario: Suspension rules card appears below payment methods card
- **WHEN** an authenticated administrator opens the `gestion-organizacion` page
- **THEN** the page SHALL display the `TenantReglasSuspensionCard` section positioned below the `TenantPaymentMethodsCard` section
