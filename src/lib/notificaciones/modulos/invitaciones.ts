import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { buildInvitacionRedirectTo, getAppUrl, isEmailAlreadyRegistered } from '@/lib/portal/privileged-route';
import { renderFilas, renderLayout, renderParrafo } from '@/lib/notificaciones/plantillas/layout';
import type { NotificacionEmail, NotificacionHandler } from '@/types/portal/notificaciones.types';

// Team invitation email (US-0137). The row is queued by `encolar_invitacion_tenant`; the sign-in
// link is generated HERE, at send time, so the queue never holds a credential and every retry gets
// a fresh one.

type Embed<T> = T | T[] | null;

type InvitacionRow = {
  id: string;
  email: string;
  nombre: string | null;
  estado: string;
  expires_at: string;
  tenant: Embed<{ nombre: string }>;
  rol: Embed<{ nombre: string }>;
};

type Cuenta = { usuario_id: string; ha_iniciado_sesion: boolean };

type ServiceClient = ReturnType<typeof createServiceClient>;

const ROL_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  entrenador: 'Entrenador',
  usuario: 'Atleta',
};

function uno<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function fechaBogota(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

async function buscarCuenta(supabase: ServiceClient, email: string): Promise<Cuenta | null> {
  const { data, error } = await supabase.rpc('_auth_usuario_por_email', { p_email: email }).maybeSingle<Cuenta>();
  if (error) throw new Error('invite_link_failed');
  return data ?? null;
}

function enlaceConfirmacion(hashedToken: string, tipo: 'invite' | 'recovery', redirectTo: string): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type: tipo, redirect_to: redirectTo });
  return `${getAppUrl()}/auth/confirm?${params.toString()}`;
}

/**
 * Link of the email by the recipient's situation:
 *  - no account          → invite link (creates the Auth user; Supabase sends nothing)
 *  - account never used  → recovery link (a retry after the user was created, or a resend to
 *                          someone who never completed an earlier invitation)
 *  - established account → plain login link, no token: a sign-in link is never issued for an
 *                          account in use
 */
async function resolverEnlace(
  supabase: ServiceClient,
  invitacion: InvitacionRow,
): Promise<{ url: string; requiereContrasena: boolean }> {
  const redirectTo = buildInvitacionRedirectTo(invitacion.id);
  let cuenta = await buscarCuenta(supabase, invitacion.email);

  if (!cuenta) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: invitacion.email,
      options: { redirectTo, data: invitacion.nombre ? { nombre: invitacion.nombre } : undefined },
    });
    if (!error && data.properties?.hashed_token) {
      return { url: enlaceConfirmacion(data.properties.hashed_token, 'invite', redirectTo), requiereContrasena: true };
    }
    // Another send created the user in the meantime: continue with the account as it is now
    if (!isEmailAlreadyRegistered(error)) throw new Error('invite_link_failed');
    cuenta = await buscarCuenta(supabase, invitacion.email);
    if (!cuenta) throw new Error('invite_link_failed');
  }

  if (!cuenta.ha_iniciado_sesion) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: invitacion.email,
      options: { redirectTo },
    });
    if (error || !data.properties?.hashed_token) throw new Error('invite_link_failed');
    return { url: enlaceConfirmacion(data.properties.hashed_token, 'recovery', redirectTo), requiereContrasena: true };
  }

  const next = encodeURIComponent(`/portal/invitaciones/${invitacion.id}`);
  return { url: `${getAppUrl()}/auth/login?next=${next}`, requiereContrasena: false };
}

const invitacionEquipo: NotificacionHandler = async (row): Promise<NotificacionEmail | null> => {
  if (!row.entidad_id) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('invitaciones_tenant')
    .select('id, email, nombre, estado, expires_at, tenant:tenants(nombre), rol:roles(nombre)')
    .eq('id', row.entidad_id)
    .maybeSingle();
  if (error) throw new Error(`invitacion_load_failed:${error.code ?? 'unknown'}`);
  if (!data) return null;

  const invitacion = data as unknown as InvitacionRow;
  // Accepted, cancelled or expired since it was queued: send nothing and create no Auth user
  if (!['pendiente', 'enviada'].includes(invitacion.estado)) return null;
  if (new Date(invitacion.expires_at).getTime() <= Date.now()) return null;

  const tenant = uno(invitacion.tenant)?.nombre ?? 'Una organización';
  const rolNombre = uno(invitacion.rol)?.nombre ?? '';
  const rol = ROL_LABELS[rolNombre] ?? (rolNombre || 'Miembro');
  const { url, requiereContrasena } = await resolverEnlace(supabase, invitacion);

  const titulo = `Te invitaron a ${tenant}`;
  const saludo = invitacion.nombre?.trim() ? `Hola ${invitacion.nombre.trim()},` : 'Hola,';
  const parrafos = [
    saludo,
    `${tenant} te invitó a unirte a su equipo en GRIT Arena como ${rol}.`,
    requiereContrasena
      ? 'Para aceptar, crea tu contraseña con el siguiente botón.'
      : 'Inicia sesión para revisar y aceptar la invitación.',
  ];
  const filas: [string, string][] = [
    ['Organización', tenant],
    ['Rol', rol],
    ['Válida hasta', fechaBogota(invitacion.expires_at)],
  ];
  const cta = { texto: requiereContrasena ? 'Crear contraseña y aceptar' : 'Ver invitación', url };
  const cierre = 'Si no esperabas esta invitación, puedes ignorar este correo.';

  return {
    asunto: `Te invitaron a ${tenant} en GRIT Arena`,
    html: renderLayout({
      titulo,
      cuerpoHtml: parrafos.map(renderParrafo).join('') + renderFilas(filas) + renderParrafo(cierre),
      cta,
    }),
    texto: [
      titulo,
      '',
      ...parrafos,
      '',
      ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      '',
      `${cta.texto}: ${cta.url}`,
      '',
      cierre,
    ].join('\n'),
    adjuntos: [],
  };
};

export const invitacionesHandlers: Record<string, NotificacionHandler> = {
  'invitaciones.invitacion_equipo': invitacionEquipo,
};
