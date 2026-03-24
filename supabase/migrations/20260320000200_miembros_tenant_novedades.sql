-- =============================================
-- Migration: Novedades audit table + cambiar_estado_miembro RPC
-- US-0037: Tenant Member Status Management
-- =============================================

begin;

-- 1. Create novedades table
create table public.miembros_tenant_novedades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  miembro_id uuid not null,
  tipo text not null,
  descripcion text,
  estado_resultante text not null,
  registrado_por uuid not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint novedades_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint novedades_miembro_id_fkey
    foreign key (miembro_id) references public.miembros_tenant(id) on delete cascade,
  constraint novedades_registrado_por_fkey
    foreign key (registrado_por) references public.usuarios(id) on delete restrict,

  constraint novedades_tipo_ck
    check (tipo in ('falta_pago', 'inasistencias_acumuladas', 'suspension_manual', 'reactivacion', 'otro')),
  constraint novedades_estado_resultante_ck
    check (estado_resultante in ('activo', 'mora', 'suspendido', 'inactivo'))
);

-- 2. Indexes
create index idx_miembros_novedades_miembro on public.miembros_tenant_novedades(miembro_id);
create index idx_miembros_novedades_tenant on public.miembros_tenant_novedades(tenant_id);

-- 3. Enable RLS
alter table public.miembros_tenant_novedades enable row level security;

grant select, insert on table public.miembros_tenant_novedades to authenticated;

-- SELECT: admins of the tenant can read
drop policy if exists novedades_select_tenant_admin on public.miembros_tenant_novedades;
create policy novedades_select_tenant_admin on public.miembros_tenant_novedades
  for select to authenticated
  using (
    tenant_id in (
      select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
    )
  );

-- INSERT: admins of the tenant can insert
drop policy if exists novedades_insert_admin on public.miembros_tenant_novedades;
create policy novedades_insert_admin on public.miembros_tenant_novedades
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
    )
  );

-- No UPDATE or DELETE policies — rows are append-only

-- 4. SECURITY DEFINER RPC: cambiar_estado_miembro
create or replace function public.cambiar_estado_miembro(
  p_miembro_id uuid,
  p_tenant_id uuid,
  p_nuevo_estado text,
  p_tipo text,
  p_descripcion text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_is_admin boolean;
  v_rows_affected int;
begin
  -- Get caller identity
  v_caller_id := auth.uid();

  -- Check that caller is admin of p_tenant_id
  select exists(
    select 1
    from public.miembros_tenant mt
    join public.roles r on r.id = mt.rol_id
    where mt.tenant_id = p_tenant_id
      and mt.usuario_id = v_caller_id
      and lower(r.nombre) = 'administrador'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Forbidden: caller is not admin of this tenant'
      using errcode = '42501';
  end if;

  -- Update estado
  update public.miembros_tenant
    set estado = p_nuevo_estado
    where id = p_miembro_id
      and tenant_id = p_tenant_id;

  get diagnostics v_rows_affected = row_count;

  if v_rows_affected = 0 then
    raise exception 'Member not found in this tenant'
      using errcode = 'P0002';
  end if;

  -- Insert novedad (audit record)
  insert into public.miembros_tenant_novedades(
    tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por
  ) values (
    p_tenant_id, p_miembro_id, p_tipo, p_descripcion, p_nuevo_estado, v_caller_id
  );
end;
$$;

grant execute on function public.cambiar_estado_miembro(uuid, uuid, text, text, text) to authenticated;

commit;
