-- US-0137: team invitations are delivered through the notifications module (US-0125) instead of
-- the Supabase Auth invite email.
--
--   route (service role) ──> encolar_invitacion_tenant(id)
--        ├─ _notificar_email('invitaciones', 'invitacion_equipo')   always
--        └─ _notificar_in_app(...)                                   established accounts only
--   dispatcher ──> handler: generates the sign-in link AT SEND TIME (never stored in the queue)

begin;

-- ─────────────────────────────────────────────
-- 1. Account situation of an email. The only reader of auth.users in this flow:
--    no row = no account; ha_iniciado_sesion = false → created (by an invitation) but never used.
-- ─────────────────────────────────────────────

create or replace function public._auth_usuario_por_email(p_email text)
returns table (usuario_id uuid, ha_iniciado_sesion boolean)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.last_sign_in_at is not null
    from auth.users u
   where lower(u.email) = lower(btrim(p_email))
   limit 1;
$$;

revoke all on function public._auth_usuario_por_email(text) from public, anon, authenticated;
grant execute on function public._auth_usuario_por_email(text) to service_role;

-- ─────────────────────────────────────────────
-- 2. Enqueue the delivery of one invitation. Who may invite is decided earlier, under the
--    administrator's session, by crear_invitacion_tenant / reenviar_invitacion_tenant.
-- ─────────────────────────────────────────────

create or replace function public.encolar_invitacion_tenant(p_invitacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     public.invitaciones_tenant%rowtype;
  v_tenant  text;
  v_rol     text;
  v_rol_txt text;
  v_cuenta  record;
  v_usuario uuid;
begin
  select * into v_inv from invitaciones_tenant i where i.id = p_invitacion_id for update;
  if not found or v_inv.estado not in ('pendiente', 'enviada') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  select t.nombre into v_tenant from tenants t where t.id = v_inv.tenant_id;
  select r.nombre into v_rol from roles r where r.id = v_inv.rol_id;
  v_rol_txt := case v_rol
    when 'administrador' then 'Administrador'
    when 'entrenador' then 'Entrenador'
    when 'usuario' then 'Atleta'
    else coalesce(v_rol, 'Miembro')
  end;

  -- Only someone who can already log in will ever see the bell
  select c.usuario_id, c.ha_iniciado_sesion into v_cuenta from _auth_usuario_por_email(v_inv.email) c;
  if found and v_cuenta.ha_iniciado_sesion
     and exists (select 1 from usuarios u where u.id = v_cuenta.usuario_id) then
    v_usuario := v_cuenta.usuario_id;
  end if;

  -- No token, hash or link in the payload: the handler builds the link when it sends
  perform _notificar_email(
    v_inv.tenant_id, 'invitaciones', 'invitacion_equipo', v_inv.email, v_usuario,
    'invitacion_tenant', v_inv.id,
    jsonb_build_object(
      'invitacion_id', v_inv.id,
      'tenant_id', v_inv.tenant_id,
      'tenant_nombre', v_tenant,
      'rol', v_rol,
      'nombre', v_inv.nombre));

  if v_usuario is not null then
    perform _notificar_in_app(
      v_usuario, v_inv.tenant_id, 'invitaciones', 'invitacion_equipo',
      format('Invitación a %s', v_tenant),
      format('%s te invitó a unirte a su equipo como %s.', v_tenant, v_rol_txt),
      '/portal/invitaciones/' || v_inv.id, 'invitacion_tenant', v_inv.id);
  end if;

  -- "enviada" = handed to the delivery queue; delivery failures live in notificaciones_outbox
  update invitaciones_tenant
     set canal_entrega = 'email',
         estado = 'enviada',
         last_sent_at = now(),
         codigo_error = null
   where id = v_inv.id;
end;
$$;

revoke all on function public.encolar_invitacion_tenant(uuid) from public, anon, authenticated;
grant execute on function public.encolar_invitacion_tenant(uuid) to service_role;

-- registrar_envio_invitacion is kept, unused, so an older deployment keeps working during rollout.

commit;
