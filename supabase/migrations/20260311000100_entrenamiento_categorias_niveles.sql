-- =============================================
-- Migration: Training Categories with Discipline Levels
-- US-0022: Nivel Disciplina, Usuario Nivel, Categorías
-- =============================================

begin;

-- =========================================================
-- 1. nivel_disciplina — per-discipline ordered level catalogue
-- =========================================================
create table public.nivel_disciplina (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  nombre        varchar(50) not null,
  orden         integer not null check (orden > 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),

  constraint uq_nivel_disciplina_nombre unique (tenant_id, disciplina_id, nombre),
  constraint uq_nivel_disciplina_orden  unique (tenant_id, disciplina_id, orden)
);

alter table public.nivel_disciplina enable row level security;

-- Index for FK lookups
create index idx_nivel_disciplina_tenant_disciplina
  on public.nivel_disciplina (tenant_id, disciplina_id);

-- RLS: SELECT — any authenticated tenant member
create policy nivel_disciplina_select_authenticated on public.nivel_disciplina
  for select to authenticated
  using (
    exists (
      select 1
      from public.miembros_tenant mt
      where mt.tenant_id = nivel_disciplina.tenant_id
        and mt.usuario_id = auth.uid()
    )
  );

-- RLS: INSERT — admin only
create policy nivel_disciplina_insert_admin on public.nivel_disciplina
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- RLS: UPDATE — admin only
create policy nivel_disciplina_update_admin on public.nivel_disciplina
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- RLS: DELETE — admin only
create policy nivel_disciplina_delete_admin on public.nivel_disciplina
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- Grant DML
grant select, insert, update, delete on public.nivel_disciplina to authenticated;


-- =========================================================
-- 2. usuario_nivel_disciplina — athlete level assignment
-- =========================================================
create table public.usuario_nivel_disciplina (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  nivel_id      uuid not null references public.nivel_disciplina(id) on delete restrict,
  asignado_por  uuid not null references public.usuarios(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint uq_usuario_nivel_disciplina unique (usuario_id, tenant_id, disciplina_id)
);

alter table public.usuario_nivel_disciplina enable row level security;

-- Indexes
create index idx_usuario_nivel_disciplina_usuario_tenant
  on public.usuario_nivel_disciplina (usuario_id, tenant_id);
create index idx_usuario_nivel_disciplina_nivel
  on public.usuario_nivel_disciplina (nivel_id);

-- RLS: SELECT — any authenticated tenant member
create policy usuario_nivel_select_authenticated on public.usuario_nivel_disciplina
  for select to authenticated
  using (
    exists (
      select 1
      from public.miembros_tenant mt
      where mt.tenant_id = usuario_nivel_disciplina.tenant_id
        and mt.usuario_id = auth.uid()
    )
  );

-- RLS: INSERT — trainer or admin
create policy usuario_nivel_insert_trainer_admin on public.usuario_nivel_disciplina
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- RLS: UPDATE — trainer or admin
create policy usuario_nivel_update_trainer_admin on public.usuario_nivel_disciplina
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- No DELETE policy — upsert only

-- Grant DML (select + insert + update only, no delete)
grant select, insert, update on public.usuario_nivel_disciplina to authenticated;


-- =========================================================
-- 3. entrenamiento_grupo_categorias — series-level categories
-- =========================================================
create table public.entrenamiento_grupo_categorias (
  id               uuid primary key default gen_random_uuid(),
  grupo_id         uuid not null references public.entrenamientos_grupo(id) on delete cascade,
  nivel_id         uuid not null references public.nivel_disciplina(id) on delete restrict,
  cupos_asignados  integer not null check (cupos_asignados >= 0),
  created_at       timestamptz not null default now(),

  constraint uq_grupo_categorias unique (grupo_id, nivel_id)
);

alter table public.entrenamiento_grupo_categorias enable row level security;

-- Index
create index idx_entrenamiento_grupo_categorias_grupo
  on public.entrenamiento_grupo_categorias (grupo_id);

-- RLS: SELECT — authenticated tenant member (join through grupo → tenant_id)
create policy grupo_categorias_select_authenticated on public.entrenamiento_grupo_categorias
  for select to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos_grupo eg
      join public.miembros_tenant mt on mt.tenant_id = eg.tenant_id
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and mt.usuario_id = auth.uid()
    )
  );

-- RLS: INSERT — trainer or admin (join through grupo → tenant_id)
create policy grupo_categorias_insert_trainer_admin on public.entrenamiento_grupo_categorias
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.entrenamientos_grupo eg
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and eg.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- RLS: UPDATE — trainer or admin
create policy grupo_categorias_update_trainer_admin on public.entrenamiento_grupo_categorias
  for update to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos_grupo eg
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and eg.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  )
  with check (
    exists (
      select 1
      from public.entrenamientos_grupo eg
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and eg.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- RLS: DELETE — trainer or admin
create policy grupo_categorias_delete_trainer_admin on public.entrenamiento_grupo_categorias
  for delete to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos_grupo eg
      where eg.id = entrenamiento_grupo_categorias.grupo_id
        and eg.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- Grant DML
grant select, insert, update, delete on public.entrenamiento_grupo_categorias to authenticated;


-- =========================================================
-- 4. entrenamiento_categorias — instance-level categories
-- =========================================================
create table public.entrenamiento_categorias (
  id                    uuid primary key default gen_random_uuid(),
  entrenamiento_id      uuid not null references public.entrenamientos(id) on delete cascade,
  nivel_id              uuid not null references public.nivel_disciplina(id) on delete restrict,
  cupos_asignados       integer not null check (cupos_asignados >= 0),
  sincronizado_grupo    boolean not null default true,
  created_at            timestamptz not null default now(),

  constraint uq_entrenamiento_categorias unique (entrenamiento_id, nivel_id)
);

alter table public.entrenamiento_categorias enable row level security;

-- Index
create index idx_entrenamiento_categorias_entrenamiento
  on public.entrenamiento_categorias (entrenamiento_id);

-- RLS: SELECT — authenticated tenant member (entrenamientos has tenant_id directly)
create policy entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias
  for select to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos e
      join public.miembros_tenant mt on mt.tenant_id = e.tenant_id
      where e.id = entrenamiento_categorias.entrenamiento_id
        and mt.usuario_id = auth.uid()
    )
  );

-- RLS: INSERT — trainer or admin
create policy entrenamiento_categorias_insert_trainer_admin on public.entrenamiento_categorias
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- RLS: UPDATE — trainer or admin
create policy entrenamiento_categorias_update_trainer_admin on public.entrenamiento_categorias
  for update to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  )
  with check (
    exists (
      select 1
      from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- RLS: DELETE — trainer or admin
create policy entrenamiento_categorias_delete_trainer_admin on public.entrenamiento_categorias
  for delete to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
    )
  );

-- Grant DML
grant select, insert, update, delete on public.entrenamiento_categorias to authenticated;


-- =========================================================
-- 5. ALTER reservas — nullable FK for forward-compatibility
-- =========================================================
alter table public.reservas
  add column entrenamiento_categoria_id uuid
  references public.entrenamiento_categorias(id)
  on delete set null;

create index idx_reservas_entrenamiento_categoria
  on public.reservas (entrenamiento_categoria_id);

commit;
