## 1. Branch Setup

- [x] 1.1 Create branch `fix/restriction-validates-tenant-member-status`
- [x] 1.2 Validate working branch is not `main`, `master`, or `develop`

## 2. Service: Update `validateBookingRestrictions`

- [x] 2.1 In `src/services/supabase/portal/reservas.service.ts`, locate step **4a** (around line 335): the `usuarios.activo` query and `isActivo` variable
- [x] 2.2 Replace the `usuarios` query with a `miembros_tenant` query scoped to both `tenant_id` and `usuario_id`:
  ```typescript
  const { data: miembro } = await supabase
    .from('miembros_tenant')
    .select('estado')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', atletaId)
    .single();
  const miembroEstado = (miembro?.estado as string) ?? null;
  ```
- [x] 2.3 In step **5a** (around line 411), replace the boolean check with a string equality check:
  - **Before**: `if (row.usuario_estado === 'activo' && !isActivo)`
  - **After**: `if (row.usuario_estado && miembroEstado !== row.usuario_estado)`
- [x] 2.4 Add a guard for the missing-membership edge case — if `miembroEstado` is `null` and `row.usuario_estado` is non-null, return an early rejection:
  ```typescript
  if (row.usuario_estado && miembroEstado === null) {
    rowPasses = false;
    firstFailCode ??= {
      ok: false,
      code: 'USUARIO_INACTIVO',
      message: 'No se encontró tu membresía en esta organización.',
    };
  }
  ```
- [x] 2.5 Update the `USUARIO_INACTIVO` error message to include required and actual status:
  ```
  `Tu estado en esta organización no permite reservar este entrenamiento. Estado requerido: ${row.usuario_estado}. Tu estado actual: ${miembroEstado}. Contacta al administrador.`
  ```
- [x] 2.6 Remove the unused `isActivo` / `usuario` variables to keep the code clean

## 3. Verification

- [x] 3.1 Confirm the TypeScript build passes: `npx tsc --noEmit`
- [x] 3.2 Manually verify: athlete with `miembros_tenant.estado = 'activo'` can book a restricted training in their tenant
- [x] 3.3 Manually verify: athlete with `miembros_tenant.estado = 'suspendido'` is rejected with the updated error message

## 4. Documentation

- [x] 4.1 Update `projectspec/03-project-structure.md` if `validateBookingRestrictions` or the `usuario_estado` restriction behavior is documented there

## 5. Commit and PR

- [x] 5.1 Stage changes and create commit:
  ```
  fix(reservas): validate usuario_estado against miembros_tenant.estado (tenant-scoped)

  Replaces the global usuarios.activo check with miembros_tenant.estado scoped
  to tenantId + atletaId. Adds missing-membership edge case handling and updates
  the USUARIO_INACTIVO error message with required and actual status.

  Closes US-0039
  ```
- [x] 5.2 Create PR with description:
  ```
  ## Summary
  Fixes the `usuario_estado` restriction validation in `validateBookingRestrictions` to use `miembros_tenant.estado` (tenant-scoped) instead of `usuarios.activo` (global boolean).

  ## Changes
  - `reservas.service.ts`: Replace `usuarios` query with `miembros_tenant` query in step 4a
  - Update step 5a evaluation from boolean to string equality
  - Handle missing membership row edge case
  - Update `USUARIO_INACTIVO` error message to include required and actual status

  ## No DB migration required
  `miembros_tenant.estado` already exists from US-0037.

  ## Testing
  - Athlete with `estado = 'activo'` in tenant → booking passes
  - Athlete with `estado = 'suspendido'` in tenant → rejected with descriptive message
  - Athlete with no membership row → rejected with membership-not-found message
  ```
