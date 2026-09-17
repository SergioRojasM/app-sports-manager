-- US-0114: platform-owned per-tenant entitlements (1:1 with tenants).
-- Tenant administrators may only read their own row; writes happen through the
-- service role / SQL console. NOTE: several existing policies use "admin_tenants"
-- as a subquery alias for get_admin_tenants_for_authenticated_user(); always
-- reference this table as public.admin_tenants with a different alias.

begin;

create table if not exists public.admin_tenants (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  aprovisionamiento_administrado_habilitado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_admin_tenants_updated_at on public.admin_tenants;
create trigger trg_admin_tenants_updated_at
  before update on public.admin_tenants
  for each row execute function public.set_updated_at();

insert into public.admin_tenants (tenant_id)
select t.id from public.tenants t
on conflict (tenant_id) do nothing;

create or replace function public.ensure_admin_tenant_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_tenants (tenant_id)
  values (new.id)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.ensure_admin_tenant_row() from public, anon, authenticated;

drop trigger if exists trg_ensure_admin_tenant_row on public.tenants;
create trigger trg_ensure_admin_tenant_row
  after insert on public.tenants
  for each row execute function public.ensure_admin_tenant_row();

alter table public.admin_tenants enable row level security;

drop policy if exists admin_tenants_select_admin on public.admin_tenants;
create policy admin_tenants_select_admin
  on public.admin_tenants
  for select
  to authenticated
  using (
    tenant_id in (
      select adm.id from public.get_admin_tenants_for_authenticated_user() adm
    )
  );

revoke insert, update, delete on table public.admin_tenants from anon, authenticated;
grant select on table public.admin_tenants to authenticated;

commit;
