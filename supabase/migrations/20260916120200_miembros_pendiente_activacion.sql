-- US-0114: new membership estado 'pendiente_activacion' for administrator-provisioned
-- accounts. A pending membership must grant NO tenant capability, so:
--   1. the estado / novedad tipo check constraints gain the new values;
--   2. the three tenant-capability helpers exclude pending memberships;
--   3. every policy / SECURITY DEFINER function that checked the caller's membership
--      by joining miembros_tenant directly is rewritten to go through
--      get_member_tenants_for_authenticated_user(), so the exclusion lives in one place.
-- Policies that already require mt.estado = 'activo' (storage org-assets policies,
-- formulario_respuestas_select_staff_or_owner) exclude pending members already and
-- are left unchanged. cambiar_estado_miembro is redefined in the invitations migration,
-- after altas_administradas_tenant exists.

begin;

-- 1. Check constraints -------------------------------------------------------

alter table public.miembros_tenant drop constraint if exists miembros_tenant_estado_ck;
alter table public.miembros_tenant
  add constraint miembros_tenant_estado_ck
  check (estado in ('activo', 'mora', 'suspendido', 'inactivo', 'pendiente_activacion'));

alter table public.miembros_tenant_novedades drop constraint if exists novedades_tipo_ck;
alter table public.miembros_tenant_novedades
  add constraint novedades_tipo_ck
  check (tipo in ('falta_pago', 'inasistencias_acumuladas', 'suspension_manual', 'reactivacion', 'activacion_cuenta', 'otro'));

-- 2. Capability helpers -------------------------------------------------------

create or replace function public.get_admin_tenants_for_authenticated_user()
returns setof public.tenants
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.tenants t
  join public.miembros_tenant mt on mt.tenant_id = t.id
  join public.roles r on r.id = mt.rol_id
  where mt.usuario_id = auth.uid()
    and mt.estado <> 'pendiente_activacion'
    and lower(r.nombre) = 'administrador';
$$;

create or replace function public.get_member_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  where mt.usuario_id = auth.uid()
    and mt.estado <> 'pendiente_activacion';
$$;

create or replace function public.get_trainer_or_admin_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  join public.roles r on r.id = mt.rol_id
  where mt.usuario_id = auth.uid()
    and mt.estado <> 'pendiente_activacion'
    and lower(r.nombre) in ('entrenador', 'administrador');
$$;

-- 3a. Plan access functions ----------------------------------------------------

create or replace function public.can_read_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.planes p
      where p.id = p_plan_id
        and (
          (p.es_publico and p.activo)
          or p.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
        )
    )
    or exists (
      select 1
      from public.suscripciones s
      where s.plan_id = p_plan_id
        and s.atleta_id = auth.uid()
    );
$$;

create or replace function public.can_subscribe_to_plan(p_plan_id uuid, p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planes p
    where p.id = p_plan_id
      and p.tenant_id = p_tenant_id
      and p.activo
      and (
        p.es_publico
        or p.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
      )
  );
$$;

-- 3b. Policies that checked caller membership directly ---------------------------

drop policy if exists entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias;
create policy entrenamiento_categorias_select_authenticated
  on public.entrenamiento_categorias for select to authenticated
  using (
    exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.visibilidad::text = 'publico'
    )
  );

drop policy if exists grupo_categorias_select_authenticated on public.entrenamiento_grupo_categorias;
create policy grupo_categorias_select_authenticated
  on public.entrenamiento_grupo_categorias for select to authenticated
  using (
    exists (
      select 1 from public.entrenamientos_grupo eg
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and eg.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    )
  );

drop policy if exists eg_restricciones_select_authenticated on public.entrenamiento_grupo_restricciones;
create policy eg_restricciones_select_authenticated
  on public.entrenamiento_grupo_restricciones for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

drop policy if exists entrenamiento_plantillas_select_authenticated on public.entrenamiento_plantillas;
create policy entrenamiento_plantillas_select_authenticated
  on public.entrenamiento_plantillas for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

drop policy if exists ent_restricciones_select_authenticated on public.entrenamiento_restricciones;
create policy ent_restricciones_select_authenticated
  on public.entrenamiento_restricciones for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_restricciones.entrenamiento_id
        and e.visibilidad::text = 'publico'
    )
  );

drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
create policy entrenamientos_select_authenticated
  on public.entrenamientos for select to authenticated
  using (
    visibilidad::text = 'publico'
    or tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

drop policy if exists nivel_disciplina_select_authenticated on public.nivel_disciplina;
create policy nivel_disciplina_select_authenticated
  on public.nivel_disciplina for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

drop policy if exists usuario_nivel_select_authenticated on public.usuario_nivel_disciplina;
create policy usuario_nivel_select_authenticated
  on public.usuario_nivel_disciplina for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated
  on public.reservas for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    or (
      atleta_id = auth.uid()
      and exists (
        select 1 from public.entrenamientos e
        where e.id = reservas.entrenamiento_id
          and e.visibilidad::text = 'publico'
      )
    )
  );

drop policy if exists reservas_insert_authenticated on public.reservas;
create policy reservas_insert_authenticated
  on public.reservas for insert to authenticated
  with check (
    (
      tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
      and (
        atleta_id = auth.uid()
        or tenant_id in (select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta)
      )
    )
    or (
      atleta_id = auth.uid()
      and exists (
        select 1 from public.entrenamientos e
        where e.id = reservas.entrenamiento_id
          and e.visibilidad::text = 'publico'
      )
    )
  );

commit;
