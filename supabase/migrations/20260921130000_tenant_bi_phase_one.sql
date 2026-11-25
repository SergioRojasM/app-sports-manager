-- ============================================================================
-- Phase One Tenant Business Intelligence
--
-- Fact views are intentionally private. Authenticated clients access aggregate
-- data only through get_tenant_bi_dashboard(), which verifies tenant-admin
-- membership. All timestamp-to-date bucketing uses America/Bogota. Browser time
-- zones and tenant-local overrides are deferred to a later reporting phase.
-- ============================================================================

begin;

create schema if not exists bi;

revoke all on schema bi from public, anon, authenticated;

create or replace view bi.fct_pagos as
select
  p.id as pago_id,
  p.tenant_id,
  (coalesce(p.fecha_validacion, p.fecha_pago, p.created_at) at time zone 'America/Bogota')::date
    as fecha_pago_analitica,
  (p.created_at at time zone 'America/Bogota')::date as fecha_creacion_analitica,
  p.monto,
  p.estado as pago_estado,
  s.id as suscripcion_id,
  s.atleta_id,
  pl.id as plan_id,
  pl.nombre as plan_nombre,
  pt.id as plan_tipo_id,
  pt.nombre as plan_tipo_nombre,
  p.metodo_pago_id,
  tmp.nombre as metodo_pago_nombre
from public.pagos p
join public.suscripciones s on s.id = p.suscripcion_id
join public.planes pl on pl.id = s.plan_id
left join public.plan_tipos pt on pt.id = s.plan_tipo_id
left join public.tenant_metodos_pago tmp on tmp.id = p.metodo_pago_id;

create or replace view bi.fct_entrenamientos as
select
  e.id as entrenamiento_id,
  e.tenant_id,
  e.fecha_hora as fecha_sesion,
  (e.fecha_hora at time zone 'America/Bogota')::date as fecha_sesion_analitica,
  e.estado as entrenamiento_estado,
  e.cupo_maximo,
  e.duracion_minutos,
  d.id as disciplina_id,
  d.nombre as disciplina_nombre,
  esc.id as escenario_id,
  esc.nombre as escenario_nombre,
  entrenador.id as entrenador_id,
  nullif(trim(concat_ws(' ', entrenador.nombre, entrenador.apellido)), '') as entrenador_nombre,
  ep.id is not null as es_publico
from public.entrenamientos e
left join public.disciplinas d on d.id = e.disciplina_id
left join public.escenarios esc on esc.id = e.escenario_id
left join public.usuarios entrenador on entrenador.id = e.entrenador_id
left join public.entrenamientos_publicos ep on ep.entrenamiento_id = e.id;

create or replace view bi.fct_reservas as
select
  r.id as reserva_id,
  r.tenant_id,
  r.atleta_id,
  r.entrenamiento_id,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.estado as reserva_estado,
  e.fecha_sesion,
  e.fecha_sesion_analitica,
  e.entrenamiento_estado,
  e.cupo_maximo,
  e.duracion_minutos,
  e.disciplina_id,
  e.disciplina_nombre,
  e.escenario_id,
  e.escenario_nombre,
  e.entrenador_id,
  e.entrenador_nombre,
  e.es_publico
from public.reservas r
join bi.fct_entrenamientos e on e.entrenamiento_id = r.entrenamiento_id;

create or replace view bi.fct_asistencia as
select
  a.id as asistencia_id,
  a.reserva_id,
  r.tenant_id,
  r.atleta_id,
  r.fecha_sesion,
  r.fecha_sesion_analitica,
  a.fecha_asistencia as asistencia_fecha,
  a.asistio,
  r.disciplina_id,
  r.disciplina_nombre,
  r.entrenador_id,
  r.entrenador_nombre,
  r.escenario_id,
  r.escenario_nombre
from public.asistencias a
join bi.fct_reservas r on r.reserva_id = a.reserva_id;

revoke all on all tables in schema bi from public, anon, authenticated;

create or replace function public.get_tenant_bi_dashboard(
  p_tenant_id uuid,
  p_date_from date,
  p_date_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public, bi, pg_temp
as $$
declare
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_previous_from date;
  v_previous_to date;
  v_revenue jsonb;
  v_operations jsonb;
  v_team jsonb;
begin
  if p_date_from is null or p_date_to is null or p_date_from > p_date_to then
    raise exception 'p_date_from must be on or before p_date_to'
      using errcode = '22007';
  end if;

  if not exists (
    select 1
    from public.get_admin_tenants_for_authenticated_user() admin_tenant
    where admin_tenant.id = p_tenant_id
  ) then
    raise exception 'Administrator access to this tenant is required'
      using errcode = '42501';
  end if;

  v_previous_to := p_date_from - 1;
  v_previous_from := p_date_from - (p_date_to - p_date_from + 1);

  with revenue_totals as (
    select
      coalesce(sum(monto) filter (
        where pago_estado = 'validado'
          and fecha_pago_analitica between p_date_from and p_date_to
      ), 0) as recognized_revenue,
      coalesce(sum(monto) filter (
        where pago_estado = 'validado'
          and fecha_pago_analitica between v_previous_from and v_previous_to
      ), 0) as previous_period_revenue,
      coalesce(sum(monto) filter (
        where pago_estado = 'validado'
          and fecha_pago_analitica between date_trunc('year', p_date_to)::date and p_date_to
      ), 0) as year_to_date_revenue,
      count(*) filter (
        where pago_estado = 'pendiente'
          and fecha_creacion_analitica between p_date_from and p_date_to
      ) as pending_payment_count,
      coalesce(sum(monto) filter (
        where pago_estado = 'pendiente'
          and fecha_creacion_analitica between p_date_from and p_date_to
      ), 0) as pending_payment_amount
    from bi.fct_pagos
    where tenant_id = p_tenant_id
  ), monthly_revenue as (
    select
      month_start,
      coalesce(sum(fp.monto) filter (
        where fp.pago_estado = 'validado'
          and fp.fecha_pago_analitica >= date_trunc('year', p_date_to)::date
          and fp.fecha_pago_analitica <= month_start + interval '1 month' - interval '1 day'
      ), 0) as cumulative_revenue,
      coalesce(sum(fp.monto) filter (
        where fp.pago_estado = 'validado'
          and fp.fecha_pago_analitica >= month_start
          and fp.fecha_pago_analitica < month_start + interval '1 month'
      ), 0) as recognized_revenue
    from generate_series(
      date_trunc('month', p_date_from)::date,
      date_trunc('month', p_date_to)::date,
      interval '1 month'
    ) month_series(month_start)
    left join bi.fct_pagos fp on fp.tenant_id = p_tenant_id
    group by month_start
    order by month_start
  ), revenue_by_plan as (
    select
      coalesce(plan_nombre, 'Sin plan') as plan_nombre,
      plan_tipo_nombre,
      count(*) as payment_count,
      coalesce(sum(monto), 0) as recognized_revenue
    from bi.fct_pagos
    where tenant_id = p_tenant_id
      and pago_estado = 'validado'
      and fecha_pago_analitica between p_date_from and p_date_to
    group by plan_nombre, plan_tipo_nombre
    order by recognized_revenue desc, plan_nombre asc, plan_tipo_nombre asc nulls first
  ), revenue_by_payment_method as (
    select
      coalesce(metodo_pago_nombre, 'Sin método') as payment_method_name,
      count(*) as payment_count,
      coalesce(sum(monto), 0) as recognized_revenue
    from bi.fct_pagos
    where tenant_id = p_tenant_id
      and pago_estado = 'validado'
      and fecha_pago_analitica between p_date_from and p_date_to
    group by coalesce(metodo_pago_nombre, 'Sin método')
    order by recognized_revenue desc, payment_method_name asc
  ), top_athletes as (
    select
      fp.atleta_id,
      coalesce(nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''), 'Sin nombre') as athlete_name,
      count(*) as payment_count,
      coalesce(sum(fp.monto), 0) as recognized_revenue
    from bi.fct_pagos fp
    left join public.usuarios u on u.id = fp.atleta_id
    where fp.tenant_id = p_tenant_id
      and fp.pago_estado = 'validado'
      and fp.fecha_pago_analitica between p_date_from and p_date_to
    group by fp.atleta_id, u.nombre, u.apellido
    order by recognized_revenue desc, athlete_name asc
    limit 5
  )
  select jsonb_build_object(
    'recognizedRevenue', recognized_revenue,
    'previousPeriodRevenue', previous_period_revenue,
    'revenueChangePercent', case
      when previous_period_revenue = 0 then null
      else round(((recognized_revenue - previous_period_revenue) / previous_period_revenue) * 100, 2)
    end,
    'yearToDateRevenue', year_to_date_revenue,
    'pendingPaymentCount', pending_payment_count,
    'pendingPaymentAmount', pending_payment_amount,
    'monthlyRevenue', coalesce((
      select jsonb_agg(jsonb_build_object(
        'monthStart', month_start::date,
        'monthKey', to_char(month_start, 'YYYY-MM'),
        'recognizedRevenue', recognized_revenue,
        'cumulativeRevenue', cumulative_revenue
      ) order by month_start)
      from monthly_revenue
    ), '[]'::jsonb),
    'revenueByPlan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planName', plan_nombre,
        'planTypeName', plan_tipo_nombre,
        'paymentCount', payment_count,
        'recognizedRevenue', recognized_revenue
      ) order by recognized_revenue desc, plan_nombre asc, plan_tipo_nombre asc nulls first)
      from revenue_by_plan
    ), '[]'::jsonb),
    'revenueByPaymentMethod', coalesce((
      select jsonb_agg(jsonb_build_object(
        'paymentMethodName', payment_method_name,
        'paymentCount', payment_count,
        'recognizedRevenue', recognized_revenue
      ) order by recognized_revenue desc, payment_method_name asc)
      from revenue_by_payment_method
    ), '[]'::jsonb),
    'topAthletesByRevenue', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteId', atleta_id,
        'athleteName', athlete_name,
        'paymentCount', payment_count,
        'recognizedRevenue', recognized_revenue
      ) order by recognized_revenue desc, athlete_name asc)
      from top_athletes
    ), '[]'::jsonb)
  ) into v_revenue
  from revenue_totals;

  with sessions as (
    select *
    from bi.fct_entrenamientos
    where tenant_id = p_tenant_id
      and fecha_sesion_analitica between p_date_from and p_date_to
  ), non_cancelled_sessions as (
    select *
    from sessions
    where entrenamiento_estado <> 'cancelado'
  ), bookings as (
    select *
    from bi.fct_reservas
    where tenant_id = p_tenant_id
      and fecha_sesion_analitica between p_date_from and p_date_to
  ), booking_counts as (
    select
      entrenamiento_id,
      count(*) filter (where reserva_estado <> 'cancelada') as valid_booking_count,
      count(*) filter (where reserva_estado = 'cancelada') as cancelled_booking_count
    from bookings
    group by entrenamiento_id
  ), operations_totals as (
    select
      (select count(*) from non_cancelled_sessions) as scheduled_training_count,
      (select coalesce(sum(cupo_maximo), 0) from non_cancelled_sessions where cupo_maximo is not null) as offered_capacity,
      (select coalesce(sum(valid_booking_count), 0) from booking_counts) as valid_booking_count,
      (select count(*) from bi.fct_reservas
       where tenant_id = p_tenant_id
         and reserva_estado = 'cancelada'
         and (fecha_cancelacion at time zone 'America/Bogota')::date between p_date_from and p_date_to) as cancelled_booking_count,
      (select count(*) from non_cancelled_sessions where cupo_maximo is null) as trainings_without_capacity
  ), capacity_by_discipline as (
    select
      coalesce(disciplina_nombre, 'Sin disciplina') as discipline_name,
      coalesce(sum(cupo_maximo) filter (where cupo_maximo is not null), 0) as offered_capacity
    from non_cancelled_sessions
    group by coalesce(disciplina_nombre, 'Sin disciplina')
  ), booking_by_discipline as (
    select
      coalesce(disciplina_nombre, 'Sin disciplina') as discipline_name,
      count(*) filter (where reserva_estado <> 'cancelada') as valid_booking_count,
      count(*) filter (where reserva_estado = 'cancelada') as cancelled_booking_count
    from bookings
    group by coalesce(disciplina_nombre, 'Sin disciplina')
  ), discipline_metrics as (
    select
      coalesce(c.discipline_name, b.discipline_name) as discipline_name,
      coalesce(b.valid_booking_count, 0) as valid_booking_count,
      coalesce(b.cancelled_booking_count, 0) as cancelled_booking_count,
      coalesce(c.offered_capacity, 0) as offered_capacity
    from capacity_by_discipline c
    full outer join booking_by_discipline b using (discipline_name)
  ), capacity_by_public_status as (
    select
      es_publico,
      coalesce(sum(cupo_maximo) filter (where cupo_maximo is not null), 0) as offered_capacity
    from non_cancelled_sessions
    group by es_publico
  ), booking_by_public_status as (
    select
      es_publico,
      count(*) filter (where reserva_estado <> 'cancelada') as valid_booking_count
    from bookings
    group by es_publico
  ), public_status_metrics as (
    select
      status_label,
      coalesce(b.valid_booking_count, 0) as valid_booking_count,
      coalesce(c.offered_capacity, 0) as offered_capacity
    from (values (true, 'Marketplace public'), (false, 'Not published to marketplace')) as statuses(es_publico, status_label)
    left join capacity_by_public_status c on c.es_publico = statuses.es_publico
    left join booking_by_public_status b on b.es_publico = statuses.es_publico
  ), top_booking_athletes as (
    select
      r.atleta_id,
      coalesce(nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''), 'Sin nombre') as athlete_name,
      count(*) filter (where r.reserva_estado <> 'cancelada') as valid_booking_count,
      count(*) filter (where r.reserva_estado = 'cancelada') as cancellation_count,
      count(a.asistencia_id) filter (where a.asistio is true) as attendance_count
    from bookings r
    left join public.usuarios u on u.id = r.atleta_id
    left join bi.fct_asistencia a on a.reserva_id = r.reserva_id
    group by r.atleta_id, u.nombre, u.apellido
    order by valid_booking_count desc, athlete_name asc
    limit 5
  ), upcoming_capacity_alerts as (
    select
      s.entrenamiento_id,
      s.fecha_sesion as session_at,
      s.disciplina_nombre as discipline_name,
      s.escenario_nombre as scenario_name,
      s.cupo_maximo as capacity,
      coalesce(b.valid_booking_count, 0) as valid_booking_count
    from bi.fct_entrenamientos s
    left join (
      select entrenamiento_id, count(*) as valid_booking_count
      from bi.fct_reservas
      where tenant_id = p_tenant_id and reserva_estado <> 'cancelada'
      group by entrenamiento_id
    ) b on b.entrenamiento_id = s.entrenamiento_id
    where s.tenant_id = p_tenant_id
      and s.entrenamiento_estado <> 'cancelado'
      and s.cupo_maximo is not null
      and s.fecha_sesion_analitica between v_today and v_today + 30
      and coalesce(b.valid_booking_count, 0)::numeric / s.cupo_maximo >= 0.8
    order by s.fecha_sesion asc
    limit 10
  )
  select jsonb_build_object(
    'scheduledTrainingCount', scheduled_training_count,
    'offeredCapacity', offered_capacity,
    'validBookingCount', valid_booking_count,
    'cancelledBookingCount', cancelled_booking_count,
    'occupancyPercent', case
      when offered_capacity = 0 then null
      else round((valid_booking_count::numeric / offered_capacity) * 100, 2)
    end,
    'trainingsWithoutCapacity', trainings_without_capacity,
    'bookingByDiscipline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'disciplineName', discipline_name,
        'validBookingCount', valid_booking_count,
        'cancelledBookingCount', cancelled_booking_count,
        'offeredCapacity', offered_capacity,
        'occupancyPercent', case when offered_capacity = 0 then null else round((valid_booking_count::numeric / offered_capacity) * 100, 2) end
      ) order by valid_booking_count desc, discipline_name asc)
      from discipline_metrics
    ), '[]'::jsonb),
    'bookingByPublicStatus', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', status_label,
        'validBookingCount', valid_booking_count,
        'occupancyPercent', case when offered_capacity = 0 then null else round((valid_booking_count::numeric / offered_capacity) * 100, 2) end
      ) order by case status_label when 'Marketplace public' then 1 else 2 end)
      from public_status_metrics
    ), '[]'::jsonb),
    'topAthletesByBookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteId', atleta_id,
        'athleteName', athlete_name,
        'validBookingCount', valid_booking_count,
        'cancellationCount', cancellation_count,
        'attendanceCount', attendance_count
      ) order by valid_booking_count desc, athlete_name asc)
      from top_booking_athletes
    ), '[]'::jsonb),
    'upcomingCapacityAlerts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'trainingId', entrenamiento_id,
        'sessionAt', session_at,
        'disciplineName', discipline_name,
        'scenarioName', scenario_name,
        'capacity', capacity,
        'validBookingCount', valid_booking_count,
        'remainingCapacity', capacity - valid_booking_count,
        'occupancyPercent', round((valid_booking_count::numeric / capacity) * 100, 2)
      ) order by session_at asc)
      from upcoming_capacity_alerts
    ), '[]'::jsonb)
  ) into v_operations
  from operations_totals;

  with member_states as (
    select state_name, coalesce(count(mt.id), 0) as member_count
    from (values ('activo'), ('mora'), ('suspendido'), ('inactivo'), ('pendiente_activacion')) as states(state_name)
    left join public.miembros_tenant mt
      on mt.tenant_id = p_tenant_id
     and mt.estado = states.state_name
    group by state_name
  ), active_athletes as (
    select distinct mt.usuario_id
    from public.miembros_tenant mt
    join public.roles r on r.id = mt.rol_id
    where mt.tenant_id = p_tenant_id
      and mt.estado = 'activo'
      and lower(r.nombre) = 'usuario'
  ), valid_subscriptions as (
    select distinct s.atleta_id, s.plan_tipo_id
    from public.suscripciones s
    where s.tenant_id = p_tenant_id
      and s.estado = 'activa'
      and (s.fecha_inicio is null or s.fecha_inicio <= v_today)
      and (s.fecha_fin is null or s.fecha_fin >= v_today)
  ), active_athletes_by_plan_type as (
    select
      coalesce(pt.nombre, 'Sin tipo de plan') as plan_type_name,
      count(distinct aa.usuario_id) as athlete_count
    from active_athletes aa
    join valid_subscriptions vs on vs.atleta_id = aa.usuario_id
    left join public.plan_tipos pt on pt.id = vs.plan_tipo_id
    group by coalesce(pt.nombre, 'Sin tipo de plan')
    order by athlete_count desc, plan_type_name asc
  ), athletes_without_subscription as (
    select aa.usuario_id as atleta_id
    from active_athletes aa
    where not exists (
      select 1 from valid_subscriptions vs where vs.atleta_id = aa.usuario_id
    )
  ), members_without_subscription as (
    select
      aws.atleta_id,
      coalesce(nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''), 'Sin nombre') as athlete_name,
      mt.estado as membership_status,
      max((r.fecha_reserva at time zone 'America/Bogota')::date) as latest_booking_date
    from athletes_without_subscription aws
    join public.miembros_tenant mt on mt.tenant_id = p_tenant_id and mt.usuario_id = aws.atleta_id
    left join public.usuarios u on u.id = aws.atleta_id
    left join public.reservas r on r.tenant_id = p_tenant_id and r.atleta_id = aws.atleta_id
    group by aws.atleta_id, u.nombre, u.apellido, mt.estado
    order by latest_booking_date asc nulls first, athlete_name asc
    limit 25
  )
  select jsonb_build_object(
    'membersByStatus', coalesce((
      select jsonb_object_agg(state_name, member_count) from member_states
    ), '{}'::jsonb),
    'activeAthleteCount', (select count(*) from active_athletes),
    'activeAthletesByPlanType', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planTypeName', plan_type_name,
        'athleteCount', athlete_count
      ) order by athlete_count desc, plan_type_name asc)
      from active_athletes_by_plan_type
    ), '[]'::jsonb),
    'activeAthletesWithoutSubscriptionCount', (select count(*) from athletes_without_subscription),
    'membersWithoutSubscription', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteId', atleta_id,
        'athleteName', athlete_name,
        'membershipStatus', membership_status,
        'latestBookingDate', latest_booking_date
      ) order by latest_booking_date asc nulls first, athlete_name asc)
      from members_without_subscription
    ), '[]'::jsonb)
  ) into v_team;

  return jsonb_build_object(
    'revenue', coalesce(v_revenue, '{}'::jsonb),
    'operations', coalesce(v_operations, '{}'::jsonb),
    'team', coalesce(v_team, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_tenant_bi_dashboard(uuid, date, date) from public;
grant execute on function public.get_tenant_bi_dashboard(uuid, date, date) to authenticated;

create index if not exists idx_pagos_tenant_estado_fecha_validacion
  on public.pagos (tenant_id, estado, fecha_validacion);

create index if not exists idx_reservas_tenant_entrenamiento_estado
  on public.reservas (tenant_id, entrenamiento_id, estado);

create index if not exists idx_entrenamientos_tenant_fecha_estado
  on public.entrenamientos (tenant_id, fecha_hora, estado);

create index if not exists idx_miembros_tenant_tenant_rol_estado
  on public.miembros_tenant (tenant_id, rol_id, estado);

create index if not exists idx_suscripciones_tenant_atleta_estado_fechas
  on public.suscripciones (tenant_id, atleta_id, estado, fecha_inicio, fecha_fin);

commit;