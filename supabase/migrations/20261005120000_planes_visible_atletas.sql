-- ============================================================
-- US-0126: "Activo no visible" plan status
--
-- 1. Adds planes.visible_atletas. An active plan with visible_atletas = false
--    is "Activo no visible": athletes can neither read nor acquire it; only a
--    tenant administrator assigns it (courtesy subscriptions).
-- 2. A hidden plan can never be public (check constraint).
-- 3. planes_select_authenticated / can_read_plan: the plain-membership branch
--    now requires visible_atletas; trainers and administrators of the tenant
--    read every plan (reports resolve the plan name through RLS), and holders
--    of a subscription keep reading their own plan.
-- 4. can_subscribe_to_plan: self-service purchase requires visible_atletas.
--
-- Unchanged on purpose:
--   - suscripciones_insert_admin: the path administrators use to assign a
--     hidden plan (policies are OR-ed with suscripciones_insert_own).
--   - planes insert/update/delete admin-only policies.
--   - servicios_select_authenticated: its public branch requires
--     es_publico AND activo, which the check constraint makes impossible for a
--     hidden plan.
-- ============================================================

begin;

-- ─────────────────────────────────────────────
-- 1. Column + constraint
-- ─────────────────────────────────────────────
alter table public.planes
  add column if not exists visible_atletas boolean not null default true;

comment on column public.planes.visible_atletas is
  'When false and activo, the plan is "Activo no visible": athletes cannot read or acquire it; only tenant administrators assign it. US-0126.';

alter table public.planes drop constraint if exists planes_no_visible_no_publico_ck;
alter table public.planes
  add constraint planes_no_visible_no_publico_ck
  check (visible_atletas or not es_publico);

-- ─────────────────────────────────────────────
-- 2. planes SELECT policy
--
-- Expressed over the row's OWN columns (no can_read_plan(id) self-query):
-- see 20260728000300_fix_select_policies_returning.sql — INSERT ... RETURNING
-- must pass on a row that is not in the statement snapshot yet.
-- ─────────────────────────────────────────────
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (
    -- public catalog: public AND active AND visible
    (es_publico and activo and visible_atletas)
    -- staff of the owning tenant read every plan, hidden ones included
    or tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
    -- any other member of the owning tenant: only plans visible to athletes
    or (
      visible_atletas
      and tenant_id in (
        select mt.tenant_id
        from public.get_member_tenants_for_authenticated_user() mt
      )
    )
    -- already subscribed: keeps the holder's own rows readable (courtesy plans included)
    or id in (
      select s.plan_id
      from public.suscripciones s
      where s.atleta_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 3. can_read_plan — same rule; gates plan_tipos, planes_disciplina and
--    (through can_read_plan_tipo) plan_tipos_servicios
-- ─────────────────────────────────────────────
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
          (p.es_publico and p.activo and p.visible_atletas)
          or p.tenant_id in (select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta)
          or (
            p.visible_atletas
            and p.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
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

-- ─────────────────────────────────────────────
-- 4. can_subscribe_to_plan — WITH CHECK of suscripciones_insert_own
-- ─────────────────────────────────────────────
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
      and p.visible_atletas
      and (
        p.es_publico
        or p.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
      )
  );
$$;

commit;
