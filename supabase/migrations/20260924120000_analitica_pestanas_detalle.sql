-- ============================================================================
-- Analítica: pestañas Ingresos, Operación y Equipo
-- (analitica-pestanas-ingresos-operacion-equipo)
--
-- 1. bi.fct_miembros: one row per tenant membership with the athlete name,
--    role and state. Private like the other bi.* facts.
-- 2. get_tenant_bi_dashboard(): reads ONLY bi.* fact views (plus the admin
--    check helper) and adds the detail-tab fields: revenue averages/MTD and
--    breakdowns over validated + pending payments, monthly per-training
--    averages, per-discipline/public averages, top/bottom 10 athletes,
--    athletes-only team figures, subscriptions sold split by validated payment.
--    Every field used by the Resumen tab keeps its value.
-- ============================================================================

begin;

create or replace view bi.fct_miembros as
select
  mt.id as miembro_id,
  mt.tenant_id,
  mt.usuario_id,
  coalesce(nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''), 'Sin nombre') as nombre_completo,
  mt.rol_id,
  r.nombre as rol_nombre,
  coalesce(lower(r.nombre) = 'usuario', false) as es_atleta,
  mt.estado as miembro_estado,
  mt.created_at as fecha_ingreso,
  (mt.created_at at time zone 'America/Bogota')::date as fecha_ingreso_analitica
from public.miembros_tenant mt
left join public.roles r on r.id = mt.rol_id
left join public.usuarios u on u.id = mt.usuario_id;

revoke all on bi.fct_miembros from public, anon, authenticated;

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
  v_subscriptions jsonb;
  v_month_count integer;
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
  -- Calendar months overlapping the range (= number of monthly buckets).
  v_month_count := ((extract(year from p_date_to) - extract(year from p_date_from)) * 12
    + extract(month from p_date_to) - extract(month from p_date_from))::integer + 1;

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
      ), 0) as recognized_revenue,
      -- Clipped to the applied range so the series adds up to totalRevenue.
      coalesce(sum(fp.monto) filter (
        where fp.pago_estado = 'validado'
          and fp.fecha_pago_analitica between greatest(month_start::date, p_date_from)
            and least((month_start + interval '1 month' - interval '1 day')::date, p_date_to)
      ), 0) as clipped_validated_revenue,
      coalesce(sum(fp.monto) filter (
        where fp.pago_estado = 'pendiente'
          and fp.fecha_creacion_analitica between greatest(month_start::date, p_date_from)
            and least((month_start + interval '1 month' - interval '1 day')::date, p_date_to)
      ), 0) as pending_revenue
    from generate_series(
      date_trunc('month', p_date_from)::date,
      date_trunc('month', p_date_to)::date,
      interval '1 month'
    ) month_series(month_start)
    left join bi.fct_pagos fp on fp.tenant_id = p_tenant_id
    group by month_start
    order by month_start
  ), payments_in_range as (
    -- Validated by validation date + pending by creation date; rejected excluded.
    select *
    from bi.fct_pagos
    where tenant_id = p_tenant_id
      and (
        (pago_estado = 'validado' and fecha_pago_analitica between p_date_from and p_date_to)
        or (pago_estado = 'pendiente' and fecha_creacion_analitica between p_date_from and p_date_to)
      )
  ), revenue_by_plan as (
    select
      coalesce(plan_nombre, 'Sin plan') as plan_nombre,
      plan_tipo_nombre,
      count(distinct suscripcion_id) as subscription_count,
      count(*) as payment_count,
      coalesce(sum(monto), 0) as total_revenue,
      coalesce(sum(monto) filter (where pago_estado = 'validado'), 0) as recognized_revenue,
      coalesce(sum(monto) filter (where pago_estado = 'pendiente'), 0) as pending_revenue
    from payments_in_range
    group by plan_nombre, plan_tipo_nombre
  ), revenue_by_payment_method as (
    select
      coalesce(metodo_pago_nombre, 'Sin método') as payment_method_name,
      count(distinct suscripcion_id) as subscription_count,
      count(*) as payment_count,
      coalesce(sum(monto), 0) as total_revenue,
      coalesce(sum(monto) filter (where pago_estado = 'validado'), 0) as recognized_revenue,
      coalesce(sum(monto) filter (where pago_estado = 'pendiente'), 0) as pending_revenue
    from payments_in_range
    group by coalesce(metodo_pago_nombre, 'Sin método')
  ), top_athletes as (
    select
      pr.atleta_id,
      coalesce(max(fm.nombre_completo), 'Sin nombre') as athlete_name,
      count(distinct pr.suscripcion_id) as subscription_count,
      count(*) as payment_count,
      coalesce(sum(pr.monto), 0) as total_revenue,
      coalesce(sum(pr.monto) filter (where pr.pago_estado = 'validado'), 0) as recognized_revenue,
      coalesce(sum(pr.monto) filter (where pr.pago_estado = 'pendiente'), 0) as pending_revenue
    from payments_in_range pr
    left join bi.fct_miembros fm on fm.tenant_id = p_tenant_id and fm.usuario_id = pr.atleta_id
    group by pr.atleta_id
    order by total_revenue desc, athlete_name asc
    limit 5
  ), month_to_date as (
    -- From the 1st of dateTo's month to dateTo, deliberately not clipped to dateFrom.
    select coalesce(sum(monto), 0) as month_to_date_revenue
    from bi.fct_pagos
    where tenant_id = p_tenant_id
      and (
        (pago_estado = 'validado' and fecha_pago_analitica between date_trunc('month', p_date_to)::date and p_date_to)
        or (pago_estado = 'pendiente' and fecha_creacion_analitica between date_trunc('month', p_date_to)::date and p_date_to)
      )
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
    'totalRevenue', recognized_revenue + pending_payment_amount,
    'averageMonthlyRevenue', round((recognized_revenue + pending_payment_amount) / v_month_count, 2),
    'monthToDateRevenue', (select month_to_date_revenue from month_to_date),
    'monthlyRevenue', coalesce((
      select jsonb_agg(jsonb_build_object(
        'monthStart', month_start::date,
        'monthKey', to_char(month_start, 'YYYY-MM'),
        'recognizedRevenue', recognized_revenue,
        'cumulativeRevenue', cumulative_revenue,
        'pendingRevenue', pending_revenue,
        'totalRevenue', clipped_validated_revenue + pending_revenue
      ) order by month_start)
      from monthly_revenue
    ), '[]'::jsonb),
    'revenueByPlan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planName', plan_nombre,
        'planTypeName', plan_tipo_nombre,
        'subscriptionCount', subscription_count,
        'paymentCount', payment_count,
        'totalRevenue', total_revenue,
        'recognizedRevenue', recognized_revenue,
        'pendingRevenue', pending_revenue
      ) order by total_revenue desc, plan_nombre asc, plan_tipo_nombre asc nulls first)
      from revenue_by_plan
    ), '[]'::jsonb),
    'revenueByPaymentMethod', coalesce((
      select jsonb_agg(jsonb_build_object(
        'paymentMethodName', payment_method_name,
        'subscriptionCount', subscription_count,
        'paymentCount', payment_count,
        'totalRevenue', total_revenue,
        'recognizedRevenue', recognized_revenue,
        'pendingRevenue', pending_revenue
      ) order by total_revenue desc, payment_method_name asc)
      from revenue_by_payment_method
    ), '[]'::jsonb),
    'topAthletesByRevenue', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteId', atleta_id,
        'athleteName', athlete_name,
        'subscriptionCount', subscription_count,
        'paymentCount', payment_count,
        'totalRevenue', total_revenue,
        'recognizedRevenue', recognized_revenue,
        'pendingRevenue', pending_revenue
      ) order by total_revenue desc, athlete_name asc)
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
      statuses.es_publico,
      status_label,
      coalesce(b.valid_booking_count, 0) as valid_booking_count,
      coalesce(c.offered_capacity, 0) as offered_capacity
    from (values (true, 'Público'), (false, 'Privado')) as statuses(es_publico, status_label)
    left join capacity_by_public_status c on c.es_publico = statuses.es_publico
    left join booking_by_public_status b on b.es_publico = statuses.es_publico
  ), top_booking_athletes as (
    select
      r.atleta_id,
      coalesce(max(fm.nombre_completo), 'Sin nombre') as athlete_name,
      count(*) filter (where r.reserva_estado <> 'cancelada') as valid_booking_count,
      count(*) filter (where r.reserva_estado = 'cancelada') as cancellation_count,
      count(a.asistencia_id) filter (where a.asistio is true) as attendance_count
    from bookings r
    left join bi.fct_miembros fm on fm.tenant_id = p_tenant_id and fm.usuario_id = r.atleta_id
    left join bi.fct_asistencia a on a.reserva_id = r.reserva_id
    group by r.atleta_id
    order by valid_booking_count desc, athlete_name asc
    limit 10
  ), bottom_booking_athletes as (
    -- Active athletes with the fewest valid bookings in range, including 0.
    select
      fm.usuario_id as atleta_id,
      fm.nombre_completo as athlete_name,
      count(r.reserva_id) filter (where r.reserva_estado <> 'cancelada') as valid_booking_count,
      count(a.asistencia_id) filter (where a.asistio is true and r.reserva_estado <> 'cancelada') as attendance_count
    from bi.fct_miembros fm
    left join bookings r on r.atleta_id = fm.usuario_id
    left join bi.fct_asistencia a on a.reserva_id = r.reserva_id
    where fm.tenant_id = p_tenant_id
      and fm.es_atleta
      and fm.miembro_estado = 'activo'
    group by fm.usuario_id, fm.nombre_completo
    order by valid_booking_count asc, athlete_name asc
    limit 10
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
  ), session_stats as (
    -- One row per non-cancelled session in range: the base for per-training averages.
    select
      s.entrenamiento_id,
      s.fecha_sesion,
      s.fecha_sesion_analitica,
      s.cupo_maximo,
      coalesce(s.disciplina_nombre, 'Sin disciplina') as discipline_name,
      s.es_publico,
      coalesce(b.valid_booking_count, 0) as valid_booking_count,
      coalesce(b.attended_booking_count, 0) as attended_booking_count
    from non_cancelled_sessions s
    left join (
      select
        r.entrenamiento_id,
        count(distinct r.reserva_id) as valid_booking_count,
        count(distinct r.reserva_id) filter (where a.asistio is true) as attended_booking_count
      from bookings r
      left join bi.fct_asistencia a on a.reserva_id = r.reserva_id
      where r.reserva_estado <> 'cancelada'
      group by r.entrenamiento_id
    ) b on b.entrenamiento_id = s.entrenamiento_id
  ), session_averages as (
    select
      case when count(*) = 0 then 0
        else round(sum(valid_booking_count)::numeric / count(*), 2)
      end as average_bookings_per_training,
      round(avg(valid_booking_count::numeric / cupo_maximo * 100)
        filter (where cupo_maximo > 0), 2) as average_occupancy_percent,
      round(avg(attended_booking_count::numeric / valid_booking_count * 100)
        filter (where fecha_sesion < now() and valid_booking_count > 0), 2) as average_attendance_percent
    from session_stats
  ), discipline_session_averages as (
    select
      discipline_name,
      count(*) as training_count,
      round(avg(valid_booking_count::numeric / cupo_maximo * 100)
        filter (where cupo_maximo > 0), 2) as average_occupancy_percent,
      round(avg(attended_booking_count::numeric / valid_booking_count * 100)
        filter (where fecha_sesion < now() and valid_booking_count > 0), 2) as average_attendance_percent
    from session_stats
    group by discipline_name
  ), public_status_session_averages as (
    select
      es_publico,
      count(*) as training_count,
      round(avg(valid_booking_count::numeric / cupo_maximo * 100)
        filter (where cupo_maximo > 0), 2) as average_occupancy_percent,
      round(avg(attended_booking_count::numeric / valid_booking_count * 100)
        filter (where fecha_sesion < now() and valid_booking_count > 0), 2) as average_attendance_percent
    from session_stats
    group by es_publico
  ), monthly_booking_average as (
    select
      month_start,
      count(ss.entrenamiento_id) as scheduled_training_count,
      coalesce(sum(ss.valid_booking_count), 0) as valid_booking_count,
      round(avg(ss.valid_booking_count::numeric / ss.cupo_maximo * 100)
        filter (where ss.cupo_maximo > 0), 2) as average_occupancy_percent,
      round(avg(ss.attended_booking_count::numeric / ss.valid_booking_count * 100)
        filter (where ss.fecha_sesion < now() and ss.valid_booking_count > 0), 2) as average_attendance_percent
    from generate_series(
      date_trunc('month', p_date_from)::date,
      date_trunc('month', p_date_to)::date,
      interval '1 month'
    ) month_series(month_start)
    left join session_stats ss
      on ss.fecha_sesion_analitica >= month_start
     and ss.fecha_sesion_analitica < month_start + interval '1 month'
    group by month_start
  )
  select jsonb_build_object(
    'scheduledTrainingCount', scheduled_training_count,
    'averageBookingsPerTraining', (select average_bookings_per_training from session_averages),
    'averageOccupancyPercent', (select average_occupancy_percent from session_averages),
    'averageAttendancePercent', (select average_attendance_percent from session_averages),
    'monthlyBookingAverage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'monthStart', month_start::date,
        'monthKey', to_char(month_start, 'YYYY-MM'),
        'scheduledTrainingCount', scheduled_training_count,
        'validBookingCount', valid_booking_count,
        'averageBookingsPerTraining', case when scheduled_training_count = 0 then 0
          else round(valid_booking_count::numeric / scheduled_training_count, 2) end,
        'averageOccupancyPercent', average_occupancy_percent,
        'averageAttendancePercent', average_attendance_percent
      ) order by month_start)
      from monthly_booking_average
    ), '[]'::jsonb),
    'averageMonthlyTrainings', round(scheduled_training_count::numeric / v_month_count, 2),
    'averageMonthlyBookings', round(valid_booking_count::numeric / v_month_count, 2),
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
        'disciplineName', dm.discipline_name,
        'validBookingCount', dm.valid_booking_count,
        'cancelledBookingCount', dm.cancelled_booking_count,
        'offeredCapacity', dm.offered_capacity,
        'occupancyPercent', case when dm.offered_capacity = 0 then null else round((dm.valid_booking_count::numeric / dm.offered_capacity) * 100, 2) end,
        'trainingCount', coalesce(dsa.training_count, 0),
        'averageOccupancyPercent', dsa.average_occupancy_percent,
        'averageAttendancePercent', dsa.average_attendance_percent
      ) order by dm.valid_booking_count desc, dm.discipline_name asc)
      from discipline_metrics dm
      left join discipline_session_averages dsa on dsa.discipline_name = dm.discipline_name
    ), '[]'::jsonb),
    'bookingByPublicStatus', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', psm.status_label,
        'validBookingCount', psm.valid_booking_count,
        'occupancyPercent', case when psm.offered_capacity = 0 then null else round((psm.valid_booking_count::numeric / psm.offered_capacity) * 100, 2) end,
        'trainingCount', coalesce(psa.training_count, 0),
        'averageOccupancyPercent', psa.average_occupancy_percent,
        'averageAttendancePercent', psa.average_attendance_percent
      ) order by case psm.status_label when 'Público' then 1 else 2 end)
      from public_status_metrics psm
      left join public_status_session_averages psa on psa.es_publico = psm.es_publico
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
    'bottomAthletesByBookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteId', atleta_id,
        'athleteName', athlete_name,
        'validBookingCount', valid_booking_count,
        'attendanceCount', attendance_count
      ) order by valid_booking_count asc, athlete_name asc)
      from bottom_booking_athletes
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

  -- Team figures consider athletes only (bi.fct_miembros.es_atleta).
  with member_states as (
    select state_name, count(fm.miembro_id) as member_count
    from (values ('activo'), ('mora'), ('suspendido'), ('inactivo'), ('pendiente_activacion')) as states(state_name)
    left join bi.fct_miembros fm
      on fm.tenant_id = p_tenant_id
     and fm.es_atleta
     and fm.miembro_estado = states.state_name
    group by state_name
  ), active_athletes as (
    select distinct fm.usuario_id, fm.nombre_completo, fm.miembro_estado
    from bi.fct_miembros fm
    where fm.tenant_id = p_tenant_id
      and fm.es_atleta
      and fm.miembro_estado = 'activo'
  ), valid_subscriptions as (
    -- Active = estado 'activa' (kept current by the expiry cron), as in the rest of the app.
    select distinct fs.atleta_id, fs.plan_nombre, fs.plan_tipo_nombre
    from bi.fct_suscripciones fs
    where fs.tenant_id = p_tenant_id
      and fs.es_activa
  ), active_athletes_by_plan as (
    select
      coalesce(vs.plan_nombre, 'Sin plan') as plan_name,
      count(distinct aa.usuario_id) as athlete_count
    from active_athletes aa
    join valid_subscriptions vs on vs.atleta_id = aa.usuario_id
    group by coalesce(vs.plan_nombre, 'Sin plan')
  ), active_athletes_by_plan_type as (
    select
      coalesce(vs.plan_tipo_nombre, 'Sin tipo de plan') as plan_type_name,
      count(distinct aa.usuario_id) as athlete_count
    from active_athletes aa
    join valid_subscriptions vs on vs.atleta_id = aa.usuario_id
    group by coalesce(vs.plan_tipo_nombre, 'Sin tipo de plan')
  ), athletes_without_subscription as (
    select aa.usuario_id as atleta_id, aa.nombre_completo, aa.miembro_estado
    from active_athletes aa
    where not exists (
      select 1 from valid_subscriptions vs where vs.atleta_id = aa.usuario_id
    )
  ), members_without_subscription as (
    select
      aws.atleta_id,
      aws.nombre_completo as athlete_name,
      aws.miembro_estado as membership_status,
      (
        select max(fr.fecha_sesion_analitica)
        from bi.fct_reservas fr
        where fr.tenant_id = p_tenant_id
          and fr.atleta_id = aws.atleta_id
          and fr.reserva_estado <> 'cancelada'
      ) as latest_booking_date,
      (
        select max(fs.fecha_venta_analitica)
        from bi.fct_suscripciones fs
        where fs.tenant_id = p_tenant_id
          and fs.atleta_id = aws.atleta_id
      ) as latest_subscription_date
    from athletes_without_subscription aws
    order by latest_booking_date asc nulls first, athlete_name asc
    limit 25
  )
  select jsonb_build_object(
    'membersByStatus', coalesce((
      select jsonb_object_agg(state_name, member_count) from member_states
    ), '{}'::jsonb),
    'activeAthleteCount', (select count(*) from active_athletes),
    'activeAthletesByPlan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planName', plan_name,
        'athleteCount', athlete_count
      ) order by athlete_count desc, plan_name asc)
      from active_athletes_by_plan
    ), '[]'::jsonb),
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
        'latestBookingDate', latest_booking_date,
        'latestSubscriptionDate', latest_subscription_date
      ) order by latest_booking_date asc nulls first, athlete_name asc)
      from members_without_subscription
    ), '[]'::jsonb)
  ) into v_team;

  -- Subscriptions "sold" = created in range (Bogotá date), any payment state, not cancelled.
  with subscriptions_sold as (
    select
      fs.suscripcion_id as id,
      fs.fecha_venta_analitica as fecha_venta,
      coalesce(fs.plan_nombre, 'Sin plan') as plan_nombre,
      fs.pagos_validados_count > 0 as has_validated_payment
    from bi.fct_suscripciones fs
    where fs.tenant_id = p_tenant_id
      and fs.es_vendida
      and fs.fecha_venta_analitica between p_date_from and p_date_to
  ), monthly_sold as (
    select
      month_start,
      count(ss.id) as subscription_count,
      count(ss.id) filter (where ss.has_validated_payment) as with_validated_payment_count,
      count(ss.id) filter (where not ss.has_validated_payment) as without_validated_payment_count
    from generate_series(
      date_trunc('month', p_date_from)::date,
      date_trunc('month', p_date_to)::date,
      interval '1 month'
    ) month_series(month_start)
    left join subscriptions_sold ss
      on ss.fecha_venta >= month_start
     and ss.fecha_venta < month_start + interval '1 month'
    group by month_start
  ), sold_by_plan as (
    select plan_nombre, count(*) as subscription_count
    from subscriptions_sold
    group by plan_nombre
  )
  select jsonb_build_object(
    'soldCount', (select count(*) from subscriptions_sold),
    'monthlySold', coalesce((
      select jsonb_agg(jsonb_build_object(
        'monthStart', month_start::date,
        'monthKey', to_char(month_start, 'YYYY-MM'),
        'subscriptionCount', subscription_count,
        'withValidatedPaymentCount', with_validated_payment_count,
        'withoutValidatedPaymentCount', without_validated_payment_count
      ) order by month_start)
      from monthly_sold
    ), '[]'::jsonb),
    'soldByPlan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planName', plan_nombre,
        'subscriptionCount', subscription_count
      ) order by subscription_count desc, plan_nombre asc)
      from sold_by_plan
    ), '[]'::jsonb)
  ) into v_subscriptions;

  return jsonb_build_object(
    'revenue', coalesce(v_revenue, '{}'::jsonb),
    'operations', coalesce(v_operations, '{}'::jsonb),
    'team', coalesce(v_team, '{}'::jsonb),
    'subscriptions', coalesce(v_subscriptions, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_tenant_bi_dashboard(uuid, date, date) from public;
grant execute on function public.get_tenant_bi_dashboard(uuid, date, date) to authenticated;

commit;
