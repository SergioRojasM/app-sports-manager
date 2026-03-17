-- Grant DELETE privilege on suscripciones to authenticated role
GRANT DELETE ON public.suscripciones TO authenticated;

-- Tenant-scoped DELETE policy for admins
DROP POLICY IF EXISTS suscripciones_delete_admin ON public.suscripciones;
CREATE POLICY suscripciones_delete_admin ON public.suscripciones
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT admin_tenants.id
      FROM public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );
