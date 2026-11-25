## Context

The complete-profile requirement (`tenants.requiere_perfil_completo`, US-0047) is checked once, client-side, inside `solicitudesService.createSolicitud`. The onboarding paths added in US-0114 never go through that function:

- `activar_invitacion_tenant` inserts `usuarios (id, email)` and an `activo` membership.
- `completar_alta_administrada` + `activar_alta_administrada` create and activate a provisioned membership.

Both end with a client navigation to `/portal/orgs/{tenant_id}`. The only server-side gate on that subtree is `src/app/portal/orgs/[tenant_id]/layout.tsx`, which calls `getCachedTenantAccess` (a React `cache()` wrapper over `tenantService.canUserAccessTenant`) and already redirects `pendiente_activacion` memberships to `/portal/activar-cuenta/{tenant_id}`.

Reusable pieces already in the codebase: `usePerfil`, `PerfilPersonalForm` with a `visibleFields?: FormularioPerfilCampo[]` filter (US-0103), the `FORMULARIO_PERFIL_CAMPOS` catalog, and the `ActivarCuentaPage` layout.

## Goals / Non-Goals

**Goals:**
- Enforce the requirement on every entry to a tenant route, independent of how the membership was created or when the flag was enabled.
- One definition of "complete profile" shared by the entry gate and the access-request guard.
- No regression for `/portal/perfil`, the booking-modal profile step, the access-request flow, or client consumers of `canUserAccessTenant`.
- No schema change.

**Non-Goals:**
- RLS / database-level enforcement.
- Per-tenant configurable field list.
- Blocking invitation acceptance or account activation.
- Notifications to existing members.

## Decisions

### Flow

```
            /portal/orgs/{tenant_id}/**            (any entry: invite accept,
                       │                            account activation, deep link)
                       ▼
        TenantLayout → getCachedTenantAccess()
                       │
   no session ─────────┼──▶ /auth/login
   pendingActivation ──┼──▶ /portal/activar-cuenta/{tenant_id}
   !allowed ───────────┼──▶ /portal/orgs
   profileIncomplete ──┼──▶ /portal/completar-perfil/{tenant_id}   ← new
                       ▼                         │ usePerfil({ requiredFields })
                 render children                 │ save own `usuarios` row
                                                 ▼
                                   router.replace(/portal/orgs/{tenant_id})
```

### Page → component → hook → service → types

**Page — `src/app/portal/completar-perfil/[tenant_id]/page.tsx`.** A server component placed outside `orgs/[tenant_id]` so the gate does not catch it (a route inside the subtree would loop). It repeats the access lookup and redirects when there is nothing to do: no session → login; `pendingActivation` → activation; `!allowed` → `/portal/orgs`; `!profileIncomplete` → the organization. It reads the tenant `nombre` and passes `tenantId`, `tenantNombre` and `missingFields` as props.
*Alternative considered:* redirect to `/portal/perfil?next=…`. Rejected — the full profile page has no notion of required fields or of the organization asking for them, and it would need tenant-aware behaviour bolted on.

**Layout — `orgs/[tenant_id]/layout.tsx`.** The new check goes last, after membership is confirmed, so a non-member never learns about a tenant's settings and a pending-activation member sets their password first.
*Alternative considered:* `middleware.ts`. Rejected — it would add DB reads to every matched request and duplicate the membership lookup the layout already performs and caches.

**Component — `CompletarPerfilPage`.** Lives in `src/components/portal/perfil/` because it is a profile screen that reuses that slice's form. It renders `PerfilPersonalForm` with `visibleFields={missingFields}`; `missingFields` comes from the server and stays fixed, so inputs do not vanish as the user fills them. Layout copies `ActivarCuentaPage` (confirmed with the user). On success it calls `router.replace` + `router.refresh` so the layout re-evaluates with fresh data and the completion URL is not left in history.

**Hook — `usePerfil(options?)`.** An optional `requiredFields` list extends `submit()` validation; `tipo_identificacion` validates both the type and number inputs, mirroring how `PerfilPersonalForm` ties their visibility. Default behaviour is untouched, which keeps `PerfilPage` and `InlineProfileCompletionStep` as they are.
*Alternative considered:* validate inside the component before calling `submit()`. Rejected — field errors live in the hook's `fieldErrors` state, so validation there avoids a second error channel.

**Service — `canUserAccessTenant`.** Extended rather than adding a second function so the result rides on the existing per-request cache and every layout sees the same decision. `allowed` stays `true` for an incomplete profile: `useTenantAccess` and `usePlanesPublicos` read only `allowed` / `role` and must keep treating the user as a member (e.g. the organization still shows as "mine" in `/portal/orgs`). The redirect is expressed as a separate flag, exactly like `pendingActivation`. The `usuarios` read runs only when the tenant flag is on.

**Lib — `perfil-completo.ts`.** A pure module (no Supabase import) usable from server components, the browser service and hooks. It returns `FormularioPerfilCampo[]` so the result plugs straight into `visibleFields`. Guard 3 in `solicitudes.service.ts` switches to it.
*Alternative considered:* a SQL function `usuario_perfil_completo()`. Rejected for this change — it needs a migration and nothing in the database consumes it while enforcement stays at navigation level.

**Types — `TenantAccessDecision`.** Two required fields (`profileIncomplete`, `profileMissingFields`), so the compiler forces every return branch to set them.

### Fail open on read errors

If reading `tenants.requiere_perfil_completo` or the caller's `usuarios` row fails, the decision reports `profileIncomplete: false` and logs with `console.error`. The gate protects data completeness, not authorization; failing closed would lock every member of the tenant out on a transient error.

### All roles are gated

Administrators and coaches are subject to the gate. Exempting them would leave the people who most need to be identifiable outside the rule, and they can always recover by completing their own profile, which needs no tenant route.

## Risks / Trade-offs

- [An administrator enables the flag with their own profile incomplete and is redirected on the next navigation] → The new toggle help text says the rule applies to all members; recovery is a single form.
- [Not an authorization boundary — a member can still call Supabase directly] → Stated as a non-goal; consistent with the `pendiente_activacion` gate. A DB-level rule can follow as a separate change if required.
- [A member of a private tenant (`publico = false`, US-0133) cannot read the tenant row, so the gate silently fails open] → Explicit verification task before sign-off.
- [Extra reads on every tenant-route request] → One primary-key read always, a second only when the flag is on; deduplicated by `getCachedTenantAccess`.
- [The user lands on the role landing page after completing, not the deep link originally requested] → Accepted; server layouts do not receive the pathname, and the common case (invitation / activation) targets the root anyway.
- [Stale router cache after saving] → `router.refresh()` after `router.replace()`, as `ActivarCuentaPage` does.

## Migration Plan

No migration. Deploying the code activates the gate for tenants that already have the flag enabled; their members with incomplete profiles are asked for the data on their next visit. Rollback is a code revert with no data to restore.

## Open Questions

None blocking. Staff exemption and fail-open behaviour were assumptions in US-0136; they are implemented as described unless the product owner says otherwise.
