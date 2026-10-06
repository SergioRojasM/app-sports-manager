## ADDED Requirements

### Requirement: Complete-profile rule SHALL have a single shared definition
`src/lib/portal/perfil-completo.ts` SHALL export `PERFIL_COMPLETO_SELECT`, `PerfilCompletoRow`, `getPerfilCamposFaltantes(row)` and `isPerfilCompleto(row)`. A profile SHALL be complete only when `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion` and `rh` are all non-null and, for text columns, non-blank after trimming. `getPerfilCamposFaltantes` SHALL return the missing fields as `FormularioPerfilCampo` keys in `FORMULARIO_PERFIL_CAMPOS` order. `peso_kg` and `altura_cm` SHALL NOT be part of the rule. Guard 3 of `solicitudesService.createSolicitud` SHALL use this module and keep its existing `incomplete_profile` error.

#### Scenario: All eight fields filled
- **WHEN** `getPerfilCamposFaltantes` receives a row with the eight fields filled
- **THEN** it SHALL return an empty array and `isPerfilCompleto` SHALL return `true`

#### Scenario: Whitespace-only text field
- **WHEN** the row has `telefono = '   '`
- **THEN** the result SHALL include `telefono`

#### Scenario: Identification number missing
- **WHEN** the row has `tipo_identificacion` filled and `numero_identificacion` null
- **THEN** the result SHALL include `tipo_identificacion`

#### Scenario: Null row
- **WHEN** `getPerfilCamposFaltantes` receives `null`
- **THEN** it SHALL return `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `fecha_exp_identificacion` and `rh`

#### Scenario: Access request still rejected for an incomplete profile
- **WHEN** a user with an incomplete profile requests access to a tenant with `requiere_perfil_completo = true`
- **THEN** `createSolicitud` SHALL throw `SolicitudesServiceError` with code `incomplete_profile`

### Requirement: Access decision SHALL report profile completeness
`TenantAccessDecision` SHALL include `profileIncomplete: boolean` and `profileMissingFields: FormularioPerfilCampo[]`. For an active membership, `tenantService.canUserAccessTenant` SHALL read `tenants.requiere_perfil_completo` and, when it is `true`, the caller's `usuarios` row, and set both fields from the shared rule. The profile result SHALL NOT change `allowed` or `role`. When there is no membership, or it is `pendiente_activacion`, `profileIncomplete` SHALL be `false` and `profileMissingFields` SHALL be empty. If either additional read fails, the error SHALL be logged and `profileIncomplete` SHALL be `false`.

#### Scenario: Flag on and profile incomplete
- **WHEN** an active member with no `telefono` is evaluated for a tenant with `requiere_perfil_completo = true`
- **THEN** the decision SHALL have `allowed = true`, the member's role, `profileIncomplete = true` and `profileMissingFields` containing `telefono`

#### Scenario: Flag off
- **WHEN** an active member with an empty profile is evaluated for a tenant with `requiere_perfil_completo = false`
- **THEN** the decision SHALL have `profileIncomplete = false` and the `usuarios` row SHALL NOT be read

#### Scenario: Flag on and profile complete
- **WHEN** an active member with a complete profile is evaluated for a tenant with the flag on
- **THEN** the decision SHALL have `profileIncomplete = false` and empty `profileMissingFields`

#### Scenario: Read failure
- **WHEN** the read of the tenant flag or of the profile returns an error
- **THEN** the decision SHALL keep `allowed = true` with `profileIncomplete = false`

#### Scenario: Client consumers unaffected
- **WHEN** `useTenantAccess` or `usePlanesPublicos` evaluates a member whose profile is incomplete
- **THEN** they SHALL still report the user as a member with their role

### Requirement: Tenant entry SHALL be gated on profile completeness
`src/app/portal/orgs/[tenant_id]/layout.tsx` SHALL redirect to `/portal/completar-perfil/{tenant_id}` when the access decision has `profileIncomplete = true`. The check SHALL run after the session, pending-activation and membership checks, and SHALL apply to the `usuario`, `entrenador` and `administrador` roles on every route under `/portal/orgs/{tenant_id}`.

#### Scenario: Invited user with an empty profile
- **WHEN** a newly registered user accepts an invitation to a tenant with the flag on and is sent to `/portal/orgs/{tenant_id}`
- **THEN** the system SHALL redirect to `/portal/completar-perfil/{tenant_id}` without rendering organization content

#### Scenario: Provisioned member after activation
- **WHEN** a provisioned member with an incomplete profile finishes `/portal/activar-cuenta/{tenant_id}` for a tenant with the flag on
- **THEN** the system SHALL redirect to `/portal/completar-perfil/{tenant_id}`

#### Scenario: Deep link
- **WHEN** a member with an incomplete profile opens `/portal/orgs/{tenant_id}/gestion-entrenamientos` directly
- **THEN** the system SHALL redirect to `/portal/completar-perfil/{tenant_id}`

#### Scenario: Administrator is gated
- **WHEN** an administrator with an incomplete profile opens any route of a tenant with the flag on
- **THEN** the system SHALL redirect to `/portal/completar-perfil/{tenant_id}`

#### Scenario: Existing member after the flag is enabled
- **WHEN** an administrator enables the flag and a previously admitted member with an incomplete profile navigates into the organization
- **THEN** the system SHALL redirect that member to `/portal/completar-perfil/{tenant_id}`

#### Scenario: Complete profile
- **WHEN** a member with a complete profile opens a tenant route
- **THEN** the system SHALL render the route with no extra step

#### Scenario: Flag off
- **WHEN** a member with an incomplete profile opens a route of a tenant with the flag off
- **THEN** the system SHALL render the route normally

#### Scenario: Pending activation takes precedence
- **WHEN** a member is `pendiente_activacion` and also has an incomplete profile
- **THEN** the system SHALL redirect to `/portal/activar-cuenta/{tenant_id}`

#### Scenario: Only the requiring tenant is gated
- **WHEN** a user with an incomplete profile belongs to tenant A (flag on) and tenant B (flag off)
- **THEN** the system SHALL gate tenant A and render tenant B normally

### Requirement: Completion route SHALL guard its own access
`/portal/completar-perfil/[tenant_id]` SHALL be a server-rendered route outside `orgs/[tenant_id]`. It SHALL redirect to the login page when there is no session, to `/portal/activar-cuenta/{tenant_id}` for a `pendiente_activacion` membership, to `/portal/orgs` for a non-member, and to `/portal/orgs/{tenant_id}` when the access decision has `profileIncomplete = false`. Otherwise it SHALL render `CompletarPerfilPage` with the tenant name and the missing fields.

#### Scenario: Non-member
- **WHEN** a user who is not a member of the tenant opens the route
- **THEN** the system SHALL redirect to `/portal/orgs`

#### Scenario: Nothing to complete
- **WHEN** a member with a complete profile, or a member of a tenant with the flag off, opens the route
- **THEN** the system SHALL redirect to `/portal/orgs/{tenant_id}`

#### Scenario: No session
- **WHEN** an unauthenticated visitor opens the route
- **THEN** the system SHALL redirect to the login page

#### Scenario: Gated member
- **WHEN** a member with an incomplete profile opens the route for a tenant with the flag on
- **THEN** the system SHALL render the completion screen

### Requirement: Completion screen SHALL collect only the missing fields
`CompletarPerfilPage` SHALL show the title "Completa tu perfil", the subtitle "{tenant name} requiere que completes tu perfil para ingresar a la organización.", and `PerfilPersonalForm` restricted to the missing fields received from the server. When the identification is missing it SHALL show both the type and number inputs. It SHALL offer a primary "Guardar y continuar" action and a "Volver a organizaciones" link to `/portal/orgs`. The breadcrumb SHALL label the `completar-perfil` segment "Completar perfil".

#### Scenario: Only missing fields are shown
- **WHEN** the member is missing `telefono` and `rh` only
- **THEN** the screen SHALL show the phone and blood-type inputs and no other profile input

#### Scenario: Leaving without saving
- **WHEN** the member follows "Volver a organizaciones"
- **THEN** the system SHALL navigate to `/portal/orgs` without saving and the tenant SHALL remain gated

### Requirement: Completion screen SHALL validate and save the required fields
`usePerfil` SHALL accept `options?: { requiredFields?: FormularioPerfilCampo[] }`. When provided, `submit()` SHALL set a field error for every listed field that is empty — for `tipo_identificacion`, on both the type and the number inputs — and SHALL NOT persist while any error exists. Without the option the hook SHALL behave as before. After a successful save `CompletarPerfilPage` SHALL replace the route with `/portal/orgs/{tenant_id}` and refresh. On a failed save it SHALL show an inline alert, keep the typed values and stay on the screen.

#### Scenario: Submitting with an empty required field
- **WHEN** the member submits with the phone input empty
- **THEN** the screen SHALL show "El teléfono es obligatorio." under that input and nothing SHALL be saved

#### Scenario: Successful completion
- **WHEN** the member fills every shown field and submits
- **THEN** the profile SHALL be saved and the member SHALL land inside the organization without being redirected back

#### Scenario: Save failure
- **WHEN** the profile update fails
- **THEN** the screen SHALL show an inline error with `role="alert"` and keep the entered values

#### Scenario: Profile page unchanged
- **WHEN** a user saves `/portal/perfil` with only `nombre` and `apellido` filled
- **THEN** the save SHALL succeed as before

#### Scenario: Field cleared later
- **WHEN** a member clears a required field in `/portal/perfil` and then opens a tenant with the flag on
- **THEN** the system SHALL redirect to `/portal/completar-perfil/{tenant_id}`
