-- ============================================================
-- US-0093: Public plans purchasable by non-members
--
-- 1. Adds planes.es_publico so an administrator can expose a plan
--    (and its active subtypes/services) outside the organization.
-- 2. Replaces the plan-catalog SELECT policies, which were all
--    `using (true)` — i.e. every authenticated user could read every
--    plan of every tenant — with "member OR public OR already-subscribed".
-- 3. Restricts self-service subscription inserts to plans the caller
--    may legitimately buy (active, and public or own-tenant).
-- ============================================================

begin;

-- ─────────────────────────────────────────────
-- 1. es_publico flag on planes
-- ─────────────────────────────────────────────
alter table public.planes
  add column if not exists es_publico boolean not null default false;

comment on column public.planes.es_publico is
  'When true, the plan (and its active subtypes/services) is visible to and purchasable by users who are not members of the tenant. US-0093.';

-- The public catalog query is always (tenant_id, es_publico = true)
create index if not exists idx_planes_es_publico
  on public.planes (tenant_id)
  where es_publico;

-- ─────────────────────────────────────────────
-- 2. Helper functions
--
-- SECURITY DEFINER so policy expressions never re-enter RLS on the
-- tables they inspect (mirrors get_admin_tenants_for_authenticated_user).
-- STABLE so the planner can cache results within a statement.
-- ─────────────────────────────────────────────
create or replace function public.get_member_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  where mt.usuario_id = auth.uid();
$$;

-- Readable when: the plan is public AND active, OR the caller is a member of its
-- tenant, OR the caller already holds a subscription to it. The public branch
-- requires `activo` so RLS matches the catalog query exactly — a retired plan is
-- never advertised outside the organization. Members keep seeing inactive plans
-- through the membership branch (needed to reactivate them), and buyers keep
-- seeing theirs through the subscription branch after an un-publish.
create or replace function public.can_read_plan(p_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1
      from public.planes p
      where p.id = p_plan_id
        and (
          (p.es_publico and p.activo)
          or p.tenant_id in (
            select mt.tenant_id
            from public.miembros_tenant mt
            where mt.usuario_id = auth.uid()
          )
        )
    )
    or exists (
      select 1
      from public.suscripciones s
      where s.plan_id = p_plan_id
        and s.atleta_id = auth.uid()
    );
$$;

create or replace function public.can_read_plan_tipo(p_plan_tipo_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.plan_tipos pt
    where pt.id = p_plan_tipo_id
      and public.can_read_plan(pt.plan_id)
  );
$$;

-- Readable when: the caller is a member of the service's tenant, OR the service
-- is granted by some public plan's subtype, OR the caller already holds units of it.
create or replace function public.can_read_servicio(p_servicio_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1
      from public.servicios sv
      where sv.id = p_servicio_id
        and sv.tenant_id in (
          select mt.tenant_id
          from public.miembros_tenant mt
          where mt.usuario_id = auth.uid()
        )
    )
    or exists (
      select 1
      from public.plan_tipos_servicios pts
      join public.plan_tipos pt on pt.id = pts.plan_tipo_id
      join public.planes     p  on p.id  = pt.plan_id
      where pts.servicio_id = p_servicio_id
        and p.es_publico
        and p.activo
    )
    or exists (
      select 1
      from public.suscripcion_servicios ss
      join public.suscripciones su on su.id = ss.suscripcion_id
      where ss.servicio_id = p_servicio_id
        and su.atleta_id = auth.uid()
    );
$$;

-- Purchase authorization: the plan must be active and either public or
-- belong to a tenant the caller is a member of.
create or replace function public.can_subscribe_to_plan(p_plan_id uuid, p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.planes p
    where p.id = p_plan_id
      and p.tenant_id = p_tenant_id
      and p.activo
      and (
        p.es_publico
        or p.tenant_id in (
          select mt.tenant_id
          from public.miembros_tenant mt
          where mt.usuario_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.get_member_tenants_for_authenticated_user() to authenticated;
grant execute on function public.can_read_plan(uuid)                        to authenticated;
grant execute on function public.can_read_plan_tipo(uuid)                   to authenticated;
grant execute on function public.can_read_servicio(uuid)                    to authenticated;
grant execute on function public.can_subscribe_to_plan(uuid, uuid)          to authenticated;

-- ─────────────────────────────────────────────
-- 3. Replace the over-permissive SELECT policies
-- ─────────────────────────────────────────────
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (public.can_read_plan(id));

drop policy if exists plan_tipos_select_authenticated on public.plan_tipos;
create policy plan_tipos_select_authenticated on public.plan_tipos
  for select to authenticated
  using (public.can_read_plan(plan_id));

drop policy if exists plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios;
create policy plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios
  for select to authenticated
  using (public.can_read_plan_tipo(plan_tipo_id));

drop policy if exists planes_disciplina_select_authenticated on public.planes_disciplina;
create policy planes_disciplina_select_authenticated on public.planes_disciplina
  for select to authenticated
  using (public.can_read_plan(plan_id));

drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (public.can_read_servicio(id));

-- ─────────────────────────────────────────────
-- 4. Restrict self-service subscription inserts
--    (admin-on-behalf creation keeps its own policy — policies are OR-ed)
-- ─────────────────────────────────────────────
drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
  for insert to authenticated
  with check (
    atleta_id = auth.uid()
    and public.can_subscribe_to_plan(plan_id, tenant_id)
  );

commit;
