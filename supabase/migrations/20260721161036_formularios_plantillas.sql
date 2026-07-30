-- =============================================
-- Migration: Form Templates
-- US-0084: Admin Form Templates Module
-- =============================================

-- 1. Create formularios_plantillas table
create table if not exists public.formularios_plantillas (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(150)  not null,
  descripcion text,
  activo      boolean       not null default true,
  created_by  uuid,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint formularios_plantillas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint formularios_plantillas_created_by_fkey
    foreign key (created_by) references public.usuarios(id) on delete set null,
  constraint formularios_plantillas_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_formularios_plantillas_tenant_id
  on public.formularios_plantillas (tenant_id);

-- 2. Create formulario_plantilla_esquema table
create table if not exists public.formulario_plantilla_esquema (
  id                       uuid          primary key default gen_random_uuid(),
  formulario_plantilla_id  uuid          not null,
  campo_etiqueta           varchar(150)  not null,
  campo_nombre             varchar(100)  not null,
  campo_tipo               varchar(20)   not null,
  campo_lista_valores      text,
  campo_obligatorio        boolean       not null default false,
  campo_placeholder        varchar(200),
  orden                    integer       not null default 0,
  activo                   boolean       not null default true,
  created_at               timestamptz   not null default timezone('utc', now()),
  updated_at               timestamptz   not null default timezone('utc', now()),

  constraint formulario_plantilla_esquema_plantilla_id_fkey
    foreign key (formulario_plantilla_id) references public.formularios_plantillas(id) on delete cascade,
  constraint formulario_plantilla_esquema_plantilla_nombre_uk
    unique (formulario_plantilla_id, campo_nombre),
  constraint formulario_plantilla_esquema_campo_nombre_format_ck
    check (campo_nombre ~ '^[a-z][a-z0-9_]*$'),
  constraint formulario_plantilla_esquema_campo_tipo_ck
    check (campo_tipo in ('fecha', 'texto_corto', 'texto_largo', 'numerico', 'imagen', 'lista')),
  constraint formulario_plantilla_esquema_lista_valores_ck
    check (
      (campo_tipo = 'lista' and campo_lista_valores is not null and length(trim(campo_lista_valores)) > 0)
      or (campo_tipo <> 'lista')
    ),
  constraint formulario_plantilla_esquema_orden_ck
    check (orden >= 0)
);

create index if not exists idx_formulario_plantilla_esquema_plantilla_id
  on public.formulario_plantilla_esquema (formulario_plantilla_id);

-- 3. Enable RLS
alter table public.formularios_plantillas enable row level security;
alter table public.formulario_plantilla_esquema enable row level security;

grant select, insert, update, delete on table public.formularios_plantillas to authenticated;
grant select, insert, update, delete on table public.formulario_plantilla_esquema to authenticated;

-- formularios_plantillas: SELECT authenticated (catalog-style, matches servicios pattern)
drop policy if exists formularios_plantillas_select_authenticated on public.formularios_plantillas;
create policy formularios_plantillas_select_authenticated on public.formularios_plantillas
  for select to authenticated
  using (true);

-- formularios_plantillas: INSERT/UPDATE/DELETE admin only
drop policy if exists formularios_plantillas_insert_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_insert_admin_only on public.formularios_plantillas
  for insert to authenticated
  with check (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

drop policy if exists formularios_plantillas_update_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_update_admin_only on public.formularios_plantillas
  for update to authenticated
  using (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  )
  with check (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

drop policy if exists formularios_plantillas_delete_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_delete_admin_only on public.formularios_plantillas
  for delete to authenticated
  using (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

-- formulario_plantilla_esquema: SELECT authenticated
drop policy if exists formulario_plantilla_esquema_select_authenticated on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_select_authenticated on public.formulario_plantilla_esquema
  for select to authenticated
  using (true);

-- formulario_plantilla_esquema: INSERT/UPDATE/DELETE admin only (via parent tenant)
drop policy if exists formulario_plantilla_esquema_insert_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_insert_admin_only on public.formulario_plantilla_esquema
  for insert to authenticated
  with check (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

drop policy if exists formulario_plantilla_esquema_update_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_update_admin_only on public.formulario_plantilla_esquema
  for update to authenticated
  using (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  )
  with check (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

drop policy if exists formulario_plantilla_esquema_delete_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_delete_admin_only on public.formulario_plantilla_esquema
  for delete to authenticated
  using (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

-- 4. Attach updated_at triggers (public.set_updated_at() defined in 20260301000200_planes_gestion.sql)
drop trigger if exists formularios_plantillas_set_updated_at on public.formularios_plantillas;
create trigger formularios_plantillas_set_updated_at
  before update on public.formularios_plantillas
  for each row execute function public.set_updated_at();

drop trigger if exists formulario_plantilla_esquema_set_updated_at on public.formulario_plantilla_esquema;
create trigger formulario_plantilla_esquema_set_updated_at
  before update on public.formulario_plantilla_esquema
  for each row execute function public.set_updated_at();
