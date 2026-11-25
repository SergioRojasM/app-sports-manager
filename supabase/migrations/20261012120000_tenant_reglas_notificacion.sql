-- US-0135: tenant notification rules + automatic subscription expiry alerts (in-app and email).
--
--   tenant_reglas_notificacion (admin-only CRUD from "Gestión de organización")
--        │
--   pg_cron 13:00 UTC (8:00 a.m. Bogotá) ──> notificar_vencimientos_suscripciones()
--        ├─ active rules × suscripciones, exact day (fecha_fin = today ± dias), renewal check
--        ├─ suscripcion_avisos_vencimiento  (one row per subscription, rule and end date → no repeats)
--        └─ _notificar_in_app / _notificar_email  → athlete and/or tenant administrators (US-0125)

begin;

-- ─────────────────────────────────────────────
-- 1. Rules
-- ─────────────────────────────────────────────

create table public.tenant_reglas_notificacion (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  tipo          varchar(30) not null,
  dias          integer not null,
  destinatarios varchar(20) not null default 'atletas',
  canal_in_app  boolean not null default true,
  canal_email   boolean not null default true,
  activo        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  -- Open list: later stories add rule types here, not new tables
  constraint tenant_reglas_notificacion_tipo_ck check (tipo in ('vencimiento_pre', 'vencimiento_pos')),
  constraint tenant_reglas_notificacion_dias_ck check (dias between 1 and 60),
  constraint tenant_reglas_notificacion_destinatarios_ck
    check (destinatarios in ('atletas', 'administradores', 'todos')),
  constraint tenant_reglas_notificacion_canal_ck check (canal_in_app or canal_email),
  constraint tenant_reglas_notificacion_uk unique (tenant_id, tipo, dias)
);

create index idx_tenant_reglas_notificacion_activas
  on public.tenant_reglas_notificacion (tipo, dias) where activo;

create trigger tenant_reglas_notificacion_set_updated_at
  before update on public.tenant_reglas_notificacion
  for each row execute function public.set_updated_at();

-- At most 3 rules per type and tenant
create or replace function public._tenant_reglas_notificacion_max()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from tenant_reglas_notificacion r
       where r.tenant_id = new.tenant_id and r.tipo = new.tipo) >= 3 then
    raise exception 'MAX_REGLAS_NOTIFICACION';
  end if;
  return new;
end;
$$;

create trigger tenant_reglas_notificacion_max
  before insert on public.tenant_reglas_notificacion
  for each row execute function public._tenant_reglas_notificacion_max();

-- A rule never changes type or tenant (that would dodge the per-type limit and the alert log)
create or replace function public._tenant_reglas_notificacion_inmutable()
returns trigger
language plpgsql
as $$
begin
  if new.tipo is distinct from old.tipo or new.tenant_id is distinct from old.tenant_id then
    raise exception 'TIPO_INMUTABLE';
  end if;
  return new;
end;
$$;

create trigger tenant_reglas_notificacion_inmutable
  before update on public.tenant_reglas_notificacion
  for each row execute function public._tenant_reglas_notificacion_inmutable();

revoke all on function public._tenant_reglas_notificacion_max() from public, anon, authenticated;
revoke all on function public._tenant_reglas_notificacion_inmutable() from public, anon, authenticated;

-- RLS: unlike tenant_reglas_suspension, nobody but the tenant's administrators needs to read these
alter table public.tenant_reglas_notificacion enable row level security;
revoke all on public.tenant_reglas_notificacion from anon, authenticated;
grant select, insert, update, delete on public.tenant_reglas_notificacion to authenticated;

create policy tenant_reglas_notificacion_select_admin on public.tenant_reglas_notificacion
  for select to authenticated
  using (tenant_id in (select id from public.get_admin_tenants_for_authenticated_user()));

create policy tenant_reglas_notificacion_insert_admin on public.tenant_reglas_notificacion
  for insert to authenticated
  with check (tenant_id in (select id from public.get_admin_tenants_for_authenticated_user()));

create policy tenant_reglas_notificacion_update_admin on public.tenant_reglas_notificacion
  for update to authenticated
  using (tenant_id in (select id from public.get_admin_tenants_for_authenticated_user()))
  with check (tenant_id in (select id from public.get_admin_tenants_for_authenticated_user()));

create policy tenant_reglas_notificacion_delete_admin on public.tenant_reglas_notificacion
  for delete to authenticated
  using (tenant_id in (select id from public.get_admin_tenants_for_authenticated_user()));

-- ─────────────────────────────────────────────
-- 2. Alert log: the duplicate guard of the daily job (job only, no client access)
-- ─────────────────────────────────────────────

create table public.suscripcion_avisos_vencimiento (
  suscripcion_id uuid not null references public.suscripciones(id) on delete cascade,
  tipo           varchar(30) not null,
  dias           integer not null,
  fecha_fin      date not null,
  created_at     timestamptz not null default now(),
  primary key (suscripcion_id, tipo, dias, fecha_fin)
);

alter table public.suscripcion_avisos_vencimiento enable row level security;
revoke all on public.suscripcion_avisos_vencimiento from anon, authenticated;

-- idx_suscripciones_estado_fecha_fin only covers 'activa'
create index if not exists idx_suscripciones_vencidas_fecha_fin
  on public.suscripciones (fecha_fin) where estado = 'vencida';

-- ─────────────────────────────────────────────
-- 3. Daily job
-- ─────────────────────────────────────────────

create or replace function public.notificar_vencimientos_suscripciones()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy       date := (now() at time zone 'America/Bogota')::date;
  v           record;
  v_plan      text;
  v_atleta    text;
  v_dias      text;
  v_fecha     text;
  v_pre       boolean;
  v_payload   jsonb;
  v_admin     record;
  v_insertado integer;
  v_total     integer := 0;
begin
  for v in
    select r.tipo, r.dias, r.destinatarios, r.canal_in_app, r.canal_email,
           s.id as suscripcion_id, s.tenant_id, s.atleta_id, s.fecha_fin,
           p.nombre as plan_nombre, pt.nombre as tipo_nombre, t.nombre as tenant_nombre,
           u.email as atleta_email, u.nombre as atleta_nombre, u.apellido as atleta_apellido
      from tenant_reglas_notificacion r
      join suscripciones s
        on s.tenant_id = r.tenant_id
       and ((r.tipo = 'vencimiento_pre' and s.estado = 'activa' and s.fecha_fin = v_hoy + r.dias)
         or (r.tipo = 'vencimiento_pos' and s.estado = 'vencida' and s.fecha_fin = v_hoy - r.dias))
      join planes p on p.id = s.plan_id
      left join plan_tipos pt on pt.id = s.plan_tipo_id
      join tenants t on t.id = s.tenant_id
      join usuarios u on u.id = s.atleta_id
     where r.activo
       -- Already renewed, or a request under review: nothing to remind
       and not exists (
         select 1 from suscripciones o
          where o.tenant_id = s.tenant_id
            and o.atleta_id = s.atleta_id
            and o.id <> s.id
            and o.estado in ('activa', 'pendiente')
            and (o.fecha_fin is null or o.fecha_fin > s.fecha_fin))
     order by s.id, r.tipo, r.dias
  loop
    insert into suscripcion_avisos_vencimiento (suscripcion_id, tipo, dias, fecha_fin)
    values (v.suscripcion_id, v.tipo, v.dias, v.fecha_fin)
    on conflict do nothing;
    get diagnostics v_insertado = row_count;
    if v_insertado = 0 then
      continue;
    end if;
    v_total := v_total + 1;

    v_pre := v.tipo = 'vencimiento_pre';
    v_plan := v.plan_nombre || coalesce(' — ' || v.tipo_nombre, '');
    v_atleta := btrim(coalesce(v.atleta_nombre, '') || ' ' || coalesce(v.atleta_apellido, ''));
    if v_atleta = '' then
      v_atleta := 'Un atleta';
    end if;
    v_dias := case when v.dias = 1 then '1 día' else v.dias || ' días' end;
    v_fecha := to_char(v.fecha_fin, 'DD/MM/YYYY');
    v_payload := jsonb_build_object(
      'suscripcion_id', v.suscripcion_id,
      'tenant_id', v.tenant_id,
      'plan', v_plan,
      'tenant_nombre', v.tenant_nombre,
      'atleta_nombre', v_atleta,
      'dias', v.dias,
      'fecha_fin', v.fecha_fin);

    if v.destinatarios in ('atletas', 'todos') then
      if v.canal_in_app then
        perform _notificar_in_app(
          v.atleta_id, v.tenant_id, 'suscripciones', v.tipo,
          case when v_pre then 'Tu suscripción está por vencer' else 'Tu suscripción venció' end,
          case when v_pre
            then format('Tu suscripción a %s en %s vence en %s, el %s.', v_plan, v.tenant_nombre, v_dias, v_fecha)
            else format('Tu suscripción a %s en %s venció hace %s, el %s.', v_plan, v.tenant_nombre, v_dias, v_fecha)
          end,
          '/portal/mis-suscripciones', 'suscripcion', v.suscripcion_id);
      end if;
      if v.canal_email then
        perform _notificar_email(v.tenant_id, 'suscripciones', v.tipo, v.atleta_email, v.atleta_id,
                                 'suscripcion', v.suscripcion_id, v_payload);
      end if;
    end if;

    if v.destinatarios in ('administradores', 'todos') then
      for v_admin in select a.usuario_id, a.email from _admins_tenant(v.tenant_id) a loop
        if v.canal_in_app then
          perform _notificar_in_app(
            v_admin.usuario_id, v.tenant_id, 'suscripciones', v.tipo || '_admin',
            case when v_pre then 'Suscripción por vencer' else 'Suscripción vencida' end,
            case when v_pre
              then format('La suscripción de %s a %s vence en %s, el %s.', v_atleta, v_plan, v_dias, v_fecha)
              else format('La suscripción de %s a %s venció hace %s, el %s.', v_atleta, v_plan, v_dias, v_fecha)
            end,
            format('/portal/orgs/%s/gestion-suscripciones', v.tenant_id), 'suscripcion', v.suscripcion_id);
        end if;
        if v.canal_email then
          perform _notificar_email(v.tenant_id, 'suscripciones', v.tipo || '_admin', v_admin.email,
                                   v_admin.usuario_id, 'suscripcion', v.suscripcion_id, v_payload);
        end if;
      end loop;
    end if;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.notificar_vencimientos_suscripciones() from public, anon, authenticated;

-- 13:00 UTC = 8:00 a.m. Bogotá, after vencer-suscripciones-diarias (06:00 UTC) so "pos" rules see 'vencida'
select cron.unschedule(jobid) from cron.job where jobname = 'notificar-vencimientos-suscripciones';

select cron.schedule(
  'notificar-vencimientos-suscripciones',
  '0 13 * * *',
  $$select public.notificar_vencimientos_suscripciones();$$
);

commit;
