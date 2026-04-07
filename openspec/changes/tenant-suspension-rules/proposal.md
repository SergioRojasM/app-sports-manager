## Why

Organizations currently have no way to automatically flag or suspend athletes based on accumulated absences — admins must do so manually. Configurable suspension rules allow tenants to enforce attendance accountability without constant manual oversight.

## What Changes

- A new `tenant_reglas_suspension` table stores up to 3 per-tenant rules, each defining how many consecutive absences (within a subscription or within a rolling window of days) trigger a suspension and how long that suspension lasts.
- RLS policies restrict write access to tenant admins while allowing all authenticated users to read rules.
- A new card `TenantReglasSuspensionCard` is added to the `gestion-organizacion` page, following the exact same card/list/modal pattern established by `TenantPaymentMethodsCard`.
- A slide-in `ReglaSuspensionFormModal` handles create and edit with full field validation, including the constraint that at least one of `por_suscripcion = true` or `por_dias_atras > 0` must be set.
- The "Add Rule" button is disabled with a tooltip when the tenant already has 3 active rules.

## Capabilities

### New Capabilities
- `tenant-suspension-rules`: CRUD management of per-tenant absence-based suspension rules — table, RLS, types, service, hook, list card, and form modal.

### Modified Capabilities
- `organization-view`: The `gestion-organizacion` page gains a new `TenantReglasSuspensionCard` section rendered below `TenantPaymentMethodsCard`.

## Non-goals

- Automatic execution of suspensions (applying the rules to actual athlete attendance data) is out of scope for this story — this story only covers configuring the rules.
- No DB-level trigger to enforce the 3-rule maximum (application-level guard is sufficient per the US).
- No pagination or search for rules (max 3 rows per tenant).

## Impact

**New files:**
- `supabase/migrations/20260407000100_tenant_reglas_suspension.sql`
- `src/types/portal/reglas-suspension.types.ts`
- `src/services/supabase/portal/reglas-suspension.service.ts`
- `src/hooks/portal/tenant/useReglasSuspension.ts`
- `src/components/portal/tenant/TenantReglasSuspensionCard.tsx`
- `src/components/portal/tenant/ReglaSuspensionFormModal.tsx`

**Modified files:**
- `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` — add `<TenantReglasSuspensionCard tenantId={tenantId} />`

**Dependencies:** Supabase JS client, existing `get_admin_tenants_for_authenticated_user()` RLS helper, `set_updated_at()` trigger function, toast notification system, existing card/modal UI patterns.
