-- US-0131: door check-in of event tickets.
-- A ticket is used when ingreso_at is not null. One entry per ticket; staff can undo it.
-- Writes happen only through the security definer RPCs below (evento_tickets stays read-only for clients).

-- ─────────────────────────────────────────────
-- 1. Columns, checks, index
-- ─────────────────────────────────────────────

alter table public.evento_tickets
  add column ingreso_at  timestamptz,
  add column ingreso_por uuid references auth.users(id) on delete set null,
  -- Only an activa ticket can be used, so a used ticket can never be voided or pending
  add constraint evento_tickets_ingreso_ck
    check (ingreso_at is null or estado = 'activa'),
  -- No author without an entry; the reverse is allowed because ingreso_por is set null on user delete
  add constraint evento_tickets_ingreso_por_ck
    check (ingreso_at is not null or ingreso_por is null);

create index idx_evento_tickets_evento_ingreso on public.evento_tickets (evento_id, ingreso_at);

comment on column public.evento_tickets.ingreso_at is 'Check-in time at the door (US-0131); null = not used. Written only by registrar_ingreso_evento / revertir_ingreso_evento.';
comment on column public.evento_tickets.ingreso_por is 'Staff user who recorded the check-in (US-0131).';

-- ─────────────────────────────────────────────
-- 2. Helpers (no client grants)
-- ─────────────────────────────────────────────

-- 'ev-abcd2345', 'EV ABCD2345', 'ABCD2345' → 'EV-ABCD2345'. Returns null when the shape is invalid.
create or replace function public._normalizar_codigo_ticket(p_codigo text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw text := upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g'));
  v_codigo text;
begin
  if length(v_raw) = 10 and left(v_raw, 2) = 'EV' then
    v_raw := substr(v_raw, 3);
  end if;
  v_codigo := 'EV-' || v_raw;
  if v_codigo !~ '^EV-[A-HJ-NP-Z2-9]{8}$' then
    return null;
  end if;
  return v_codigo;
end;
$$;

-- Result payload shared by the check-in RPCs.
create or replace function public._ingreso_resultado(p_resultado text, p_ticket_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'resultado',          p_resultado,
    'ticket_id',          t.id,
    'codigo',             t.codigo,
    'asistente_nombre',   t.asistente_nombre,
    'asistente_email',    t.asistente_email,
    'entrada_nombre',     c.entrada_nombre,
    'evento_nombre',      e.nombre,
    'ingreso_at',         t.ingreso_at,
    'ingreso_por_nombre', case
                            when t.ingreso_por is null then null
                            else coalesce(nullif(btrim(concat_ws(' ', u.nombre, u.apellido)), ''), u.email)
                          end
  )
  from evento_tickets t
  join evento_compras c on c.id = t.compra_id
  join eventos e on e.id = t.evento_id
  left join usuarios u on u.id = t.ingreso_por
  where t.id = p_ticket_id;
$$;

-- ─────────────────────────────────────────────
-- 3. registrar_ingreso_evento (staff)
-- ─────────────────────────────────────────────

create or replace function public.registrar_ingreso_evento(p_evento_id uuid, p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento eventos%rowtype;
  v_ticket evento_tickets%rowtype;
  v_codigo text;
begin
  select * into v_evento from eventos where id = p_evento_id;
  if not found
     or v_evento.tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_codigo := _normalizar_codigo_ticket(p_codigo);
  if v_codigo is null then
    return jsonb_build_object('resultado', 'no_encontrado');
  end if;

  -- The row lock serializes concurrent scans of the same code: the second one sees ingreso_at set
  select * into v_ticket from evento_tickets where codigo = v_codigo for update;

  -- Codes of other tenants reveal nothing
  if not found or v_ticket.tenant_id <> v_evento.tenant_id then
    return jsonb_build_object('resultado', 'no_encontrado');
  end if;
  if v_ticket.evento_id <> p_evento_id then
    return _ingreso_resultado('otro_evento', v_ticket.id);
  end if;
  if v_ticket.estado = 'anulada' then
    return _ingreso_resultado('anulada', v_ticket.id);
  end if;
  if v_ticket.estado = 'pendiente' then
    return _ingreso_resultado('pendiente', v_ticket.id);
  end if;
  if v_ticket.ingreso_at is not null then
    return _ingreso_resultado('ya_ingreso', v_ticket.id);
  end if;

  update evento_tickets set ingreso_at = now(), ingreso_por = auth.uid() where id = v_ticket.id;
  return _ingreso_resultado('ok', v_ticket.id);
end;
$$;

-- ─────────────────────────────────────────────
-- 4. revertir_ingreso_evento (staff)
-- ─────────────────────────────────────────────

create or replace function public.revertir_ingreso_evento(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket evento_tickets%rowtype;
begin
  select * into v_ticket from evento_tickets where id = p_ticket_id for update;
  if not found
     or v_ticket.tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_ticket.ingreso_at is null then
    raise exception 'ESTADO_INVALIDO';
  end if;

  update evento_tickets set ingreso_at = null, ingreso_por = null where id = p_ticket_id;
  return _ingreso_resultado('revertido', p_ticket_id);
end;
$$;

-- ─────────────────────────────────────────────
-- 5. resumen_ingresos_evento (staff)
-- ─────────────────────────────────────────────

create or replace function public.resumen_ingresos_evento(p_evento_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_resumen   jsonb;
begin
  select e.tenant_id into v_tenant_id from eventos e where e.id = p_evento_id;
  if v_tenant_id is null
     or v_tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'activas',         count(*) filter (where t.estado = 'activa'),
           'ingresaron',      count(*) filter (where t.estado = 'activa' and t.ingreso_at is not null),
           'pendientes_pago', count(*) filter (where t.estado = 'pendiente')
         )
    into v_resumen
    from evento_tickets t
   where t.evento_id = p_evento_id;

  return v_resumen;
end;
$$;

-- ─────────────────────────────────────────────
-- 6. cancelar_compra_evento: a purchase with a used ticket cannot be cancelled
--    (from 20261001120100_eventos_compras_rpc.sql; only the used-ticket guard is new)
-- ─────────────────────────────────────────────

create or replace function public.cancelar_compra_evento(p_compra_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra evento_compras%rowtype;
  v_evento eventos%rowtype;
begin
  select * into v_compra from evento_compras where id = p_compra_id for update;
  if not found or v_compra.comprador_usuario_id is distinct from auth.uid() or auth.uid() is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_compra.estado not in ('en_validacion', 'confirmada') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- US-0131: once a ticket was used at the door, the purchase can no longer be cancelled
  if exists (select 1 from evento_tickets t where t.compra_id = p_compra_id and t.ingreso_at is not null) then
    raise exception 'CANCELACION_NO_PERMITIDA';
  end if;

  -- A Múltiple purchase is cancelled as a whole with the MAIN event's policy.
  -- Null policy → no cancellation and no refund.
  select * into v_evento from eventos where id = v_compra.evento_id;
  if v_evento.cancelacion_antelacion_horas is null
     or (v_evento.fecha_hora is not null
         and now() > v_evento.fecha_hora - make_interval(hours => v_evento.cancelacion_antelacion_horas)) then
    raise exception 'CANCELACION_NO_PERMITIDA';
  end if;

  update evento_compras set estado = 'cancelada', cancelado_at = now() where id = p_compra_id;
  update evento_tickets set estado = 'anulada' where compra_id = p_compra_id;
  perform _encolar_notificacion(p_compra_id, 'compra_cancelada');

  return _compra_resultado(p_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────

revoke all on function public._normalizar_codigo_ticket(text) from public, anon, authenticated;
revoke all on function public._ingreso_resultado(text, uuid) from public, anon, authenticated;

revoke all on function public.registrar_ingreso_evento(uuid, text) from public, anon;
revoke all on function public.revertir_ingreso_evento(uuid) from public, anon;
revoke all on function public.resumen_ingresos_evento(uuid) from public, anon;

grant execute on function public.registrar_ingreso_evento(uuid, text) to authenticated;
grant execute on function public.revertir_ingreso_evento(uuid) to authenticated;
grant execute on function public.resumen_ingresos_evento(uuid) to authenticated;
