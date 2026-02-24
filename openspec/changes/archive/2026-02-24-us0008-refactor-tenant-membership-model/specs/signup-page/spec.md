## ADDED Requirements

### Requirement: Signup provisioning creates default public membership
After a successful signup user creation, the system SHALL ensure onboarding provisioning creates one default membership in `public.miembros_tenant` for tenant `public` with role `usuario`, in addition to ensuring the `public.usuarios` profile row.

#### Scenario: Signup provisions default membership
- **WHEN** signup succeeds for a newly created auth user
- **THEN** the system SHALL ensure one membership row exists for that user in tenant `public` with role `usuario`

#### Scenario: Provisioning is idempotent for repeated signup hooks
- **WHEN** provisioning logic is triggered more than once for the same user lifecycle event
- **THEN** the system MUST avoid duplicate membership rows and keep exactly one default public membership
