-- ============================================================
-- US-0019: Plan subscription feature
-- Extends suscripciones + pagos for user self-service enrollment
-- ============================================================

-- 1. Add clases_plan (snapshot of plan.clases_incluidas at subscription time)
alter table public.suscripciones
  add column if not exists clases_plan integer
    constraint suscripciones_clases_plan_ck check (clases_plan is null or clases_plan >= 0);

-- 2. Add comentarios (user free-text note at subscription request)
alter table public.suscripciones
  add column if not exists comentarios text;

-- 3. Update estado constraint to include 'pendiente'
alter table public.suscripciones
  drop constraint if exists suscripciones_estado_ck;

alter table public.suscripciones
  add constraint suscripciones_estado_ck
    check (estado in ('pendiente', 'activa', 'vencida', 'cancelada'));

-- 4. RLS: allow authenticated users to INSERT their own suscripciones
grant insert on table public.suscripciones to authenticated;

drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
  for insert to authenticated
  with check (atleta_id = auth.uid());

-- 5. RLS: allow authenticated users to SELECT their own suscripciones
grant select on table public.suscripciones to authenticated;

drop policy if exists suscripciones_select_own on public.suscripciones;
create policy suscripciones_select_own on public.suscripciones
  for select to authenticated
  using (atleta_id = auth.uid());

-- 6. RLS: allow authenticated users to INSERT pagos linked to their own suscripcion
grant insert on table public.pagos to authenticated;

drop policy if exists pagos_insert_own on public.pagos;
create policy pagos_insert_own on public.pagos
  for insert to authenticated
  with check (
    suscripcion_id in (
      select id from public.suscripciones where atleta_id = auth.uid()
    )
  );
