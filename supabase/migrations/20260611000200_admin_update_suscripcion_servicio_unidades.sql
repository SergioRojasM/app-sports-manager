-- ============================================================
-- US-0067: Admin override for suscripcion_servicios.unidades_restantes
-- Creates admin_update_suscripcion_servicio_unidades SECURITY DEFINER
-- function that validates admin-tenant membership before writing.
-- Direct UPDATE is blocked by existing RLS (SELECT-only policy).
-- ============================================================

create or replace function public.admin_update_suscripcion_servicio_unidades(
  p_suscripcion_id     uuid,
  p_servicio_id        uuid,
  p_unidades_restantes integer   -- NULL = unlimited
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  -- Resolve tenant for this subscription
  select tenant_id
    into v_tenant_id
    from public.suscripciones
   where id = p_suscripcion_id;

  if v_tenant_id is null then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  -- Verify caller is admin for that tenant
  if not exists (
    select 1
      from public.get_admin_tenants_for_authenticated_user() t
     where t.id = v_tenant_id
  ) then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  -- Enforce non-negative constraint before hitting DB check
  if p_unidades_restantes is not null and p_unidades_restantes < 0 then
    raise exception 'unidades_restantes cannot be negative' using errcode = '23514';
  end if;

  update public.suscripcion_servicios
     set unidades_restantes = p_unidades_restantes,
         updated_at         = timezone('utc', now())
   where suscripcion_id = p_suscripcion_id
     and servicio_id    = p_servicio_id;
end;
$$;

grant execute on function public.admin_update_suscripcion_servicio_unidades(uuid, uuid, integer)
  to authenticated;
