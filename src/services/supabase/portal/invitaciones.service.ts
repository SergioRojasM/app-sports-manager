import { createClient } from '@/services/supabase/client';
import { INVITACIONES_ERROR_MESSAGES, mapInvitacionesDbError } from '@/lib/portal/invitaciones-errors';
import {
  InvitacionesServiceError,
  type AceptarInvitacionResultado,
  type AgregarMiembroInput,
  type AltaAdministradaResultado,
  type InvitacionEnviadaResultado,
  type InvitacionesErrorCode,
  type InvitacionesFiltro,
  type InvitacionParaAceptar,
  type InvitacionRow,
  type MiInvitacionPendiente,
} from '@/types/portal/invitaciones.types';

type DbError = { code?: string | null; message?: string | null } | null;

const KNOWN_CODES = new Set<InvitacionesErrorCode>(Object.keys(INVITACIONES_ERROR_MESSAGES) as InvitacionesErrorCode[]);

function toServiceError(code: InvitacionesErrorCode): InvitacionesServiceError {
  return new InvitacionesServiceError(code, INVITACIONES_ERROR_MESSAGES[code]);
}

function fromDbError(error: DbError): InvitacionesServiceError {
  return toServiceError(mapInvitacionesDbError(error).code);
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw toServiceError('unexpected');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code = (payload as { code?: string } | null)?.code;
    throw toServiceError(code && KNOWN_CODES.has(code as InvitacionesErrorCode) ? (code as InvitacionesErrorCode) : 'unexpected');
  }

  return payload as T;
}

function orgApiBase(tenantId: string): string {
  return `/api/portal/orgs/${encodeURIComponent(tenantId)}`;
}

export const invitacionesService = {
  /* ────────── Administrator ────────── */

  async getInvitacionesAdmin(tenantId: string, filtro: InvitacionesFiltro = 'activas'): Promise<InvitacionRow[]> {
    const supabase = createClient();
    let query = supabase
      .from('v_invitaciones_tenant_admin')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filtro === 'activas') {
      query = query.in('estado', ['pendiente', 'enviada']);
    } else if (filtro !== 'todas') {
      query = filtro === 'pendiente' ? query.in('estado', ['pendiente', 'enviada']) : query.eq('estado', filtro);
    }

    const { data, error } = await query;
    if (error) throw fromDbError(error);
    return (data ?? []) as InvitacionRow[];
  },

  async crearInvitacion(tenantId: string, input: AgregarMiembroInput): Promise<InvitacionEnviadaResultado> {
    return postJson<InvitacionEnviadaResultado>(`${orgApiBase(tenantId)}/invitaciones`, input);
  },

  async reenviarInvitacion(tenantId: string, invitacionId: string): Promise<InvitacionEnviadaResultado> {
    return postJson<InvitacionEnviadaResultado>(
      `${orgApiBase(tenantId)}/invitaciones/${encodeURIComponent(invitacionId)}/reenviar`,
    );
  },

  async cancelarInvitacion(invitacionId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc('cancelar_invitacion_tenant', { p_invitacion_id: invitacionId });
    if (error) throw fromDbError(error);
  },

  async aprovisionarMiembro(tenantId: string, input: AgregarMiembroInput): Promise<AltaAdministradaResultado> {
    return postJson<AltaAdministradaResultado>(`${orgApiBase(tenantId)}/miembros/aprovisionar`, input);
  },

  /* ────────── Recipient ────────── */

  async getMisInvitacionesPendientes(): Promise<MiInvitacionPendiente[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_mis_invitaciones_pendientes');
    if (error) throw fromDbError(error);
    return (data ?? []) as MiInvitacionPendiente[];
  },

  async getInvitacionParaAceptar(invitacionId: string): Promise<InvitacionParaAceptar> {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc('get_invitacion_para_aceptar', { p_invitacion_id: invitacionId })
      .maybeSingle<InvitacionParaAceptar>();
    if (error) throw fromDbError(error);
    if (!data) throw toServiceError('not_found');
    return data;
  },

  async aceptarInvitacion(invitacionId: string): Promise<AceptarInvitacionResultado> {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc('activar_invitacion_tenant', { p_invitacion_id: invitacionId })
      .maybeSingle<AceptarInvitacionResultado>();
    if (error) throw fromDbError(error);
    if (!data) throw toServiceError('unexpected');
    return data;
  },

  async activarAltaAdministrada(tenantId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc('activar_alta_administrada', { p_tenant_id: tenantId });
    if (error) throw fromDbError(error);
  },
};
